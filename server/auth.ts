import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Generera en fast secret för hela sessionen istället för en ny vid varje start
  const SESSION_SECRET = "valvx-super-duper-fixed-secret-key-development-only";
  
  // Förenkla sessionshanteringen till det absolut minimala
  const sessionSettings: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    rolling: true,
    store: new MemoryStore({ // Use MemoryStore directly here
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dagar
      sameSite: 'none',
      path: '/'
    },
    name: "valvx.sid",
    proxy: true
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    console.log('User logged in:', req.user);
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    
    // Sätt explicit cookie för att säkerställa att sessionen följer med
    // Detta åsidosätter sessionsinställningarna, men är nödvändigt i vissa miljöer
    res.cookie(sessionSettings.name!, req.sessionID, {
      secure: true,
      httpOnly: true, 
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 dagar
    });
    
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('/api/user - session ID:', req.sessionID);
    console.log('/api/user - isAuthenticated:', req.isAuthenticated());
    console.log('/api/user - cookies:', req.headers.cookie);
    
    if (!req.isAuthenticated()) {
      console.log('/api/user - ej autentiserad, returnerar 401');
      return res.sendStatus(401);
    }
    
    // Sätt cookie igen för att hålla sessionen levande
    res.cookie(sessionSettings.name!, req.sessionID, {
      secure: true,
      httpOnly: true, 
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });
    
    console.log('/api/user - autentiserad, returnerar user:', req.user);
    res.json(req.user);
  });
}
