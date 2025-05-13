
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { eq, and, desc, asc, inArray, ne, sql, gte, lte, isNull } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { 
  files, 
  folders, 
  tasks, 
  comments, 
  projects, 
  wikiPages,
  taskTimeEntries,
  conversations,
  conversationParticipants,
  userInvitations,
  invitationStatusEnum,
  pdfVersions,
  pdfAnnotations,
  messages,
  userProjects
} from "@shared/schema";

// Set up multer for file uploads
const uploadsDir = path.join(process.cwd(), "uploads");
const chatUploadsDir = path.join(uploadsDir, "chat");

// Create uploads directories if they dont exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    // Check if this is a message attachment or a regular file
    if (req.originalUrl.includes("/messages/upload")) {
      cb(null, chatUploadsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + "-" + file.originalname);
  }
});

const upload = multer({ 
  storage: storage_config,
  fileFilter: (req, file, cb) => {
    // Accept PDF files and common document/image types
    const allowedFileTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, images, and Office documents are allowed."), false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  const apiPrefix = "/api";

  // Files API - BALANSERAD VERSION SOM FUNGERAR MED BÅDE PROJEKT OCH MAPPAR
  app.get(`${apiPrefix}/files`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    try {
      // Extrahera och validera alla förfrågningsparametrar
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const rawFolderId = req.query.folderId;
      const all = req.query.all === "true";
      
      console.log(`/api/files - ANROP MED PARAMETRAR:`, { 
        projectId, 
        folderId: rawFolderId,
        all,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Validera projektID
      if (!projectId) {
        console.error("/api/files - SAKNAR PROJECT_ID");
        return res.status(400).json({ 
          error: "Projekt-ID krävs för att hämta filer",
          details: "Ange ett giltigt projekt-ID i din förfrågan"
        });
      }
      
      if (isNaN(projectId)) {
        console.error(`/api/files - OGILTIGT PROJEKT-ID FORMAT: ${req.query.projectId}`);
        return res.status(400).json({ 
          error: "Ogiltigt format på Projekt-ID", 
          details: `Projekt-ID måste vara ett nummer, fick: ${req.query.projectId}`
        });
      }
      
      // Kontrollera användaråtkomst till projektet
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      const isSuperuserOrAdmin = userInfo && (userInfo.role === "superuser" || userInfo.role === "admin");
      
      let hasAccess = false;
      
      if (isSuperuserOrAdmin) {
        // Superuser/admin har automatiskt tillgång
        hasAccess = true;
      } else {
        // För vanliga användare, kontrollera projekttillhörighet
        const projectAccess = await db.query.userProjects.findFirst({
          where: and(
            eq(userProjects.userId, req.user!.id),
            eq(userProjects.projectId, projectId)
          )
        });
        
        hasAccess = !!projectAccess;
      }
      
      if (!hasAccess) {
        console.error(`/api/files - ÅTKOMSTFEL: Användare ${req.user!.id} saknar behörighet till projekt ${projectId}`);
        return res.status(403).json({ 
          error: "Ingen åtkomst till detta projekt", 
          details: "Du har inte behörighet att se filer i detta projekt" 
        });
      }
      
      // Hämta filer med filtrering baserad på folderId om det anges
      let whereCondition = all 
        ? eq(files.projectId, projectId)  // Om "all" är true, visa alla filer i projektet
        : undefined;  // Annars kommer vi att specificera det baserat på mappID
        
      // Om ett specifikt folderId anges och "all" inte är true, använd det för filtrering
      if (rawFolderId && rawFolderId !== "null" && !all) {
        const folderId = parseInt(rawFolderId as string);
        
        if (!isNaN(folderId)) {
          // Kontrollera att mappen existerar innan vi försöker filtrera
          const folderExists = await db.query.folders.findFirst({
            where: and(
              eq(folders.id, folderId),
              eq(folders.projectId, projectId)
            )
          });
          
          if (folderExists) {
            // MAPPFILTRERING: Visa endast filer som tillhör denna mapp
            whereCondition = and(
              eq(files.projectId, projectId),
              eq(files.folderId, folderId)
            );
            
            console.log(`/api/files - ANVÄNDER MAPPFILTRERING: Visar endast filer i mapp ${folderId}`);
          } else {
            console.error(`/api/files - VARNING: Angiven mapp ${folderId} existerar inte i projekt ${projectId}, visar alla filer`);
            // Om mappen inte existerar, visa alla filer i projektet istället
            whereCondition = eq(files.projectId, projectId);
          }
        } else {
          console.error(`/api/files - VARNING: Ogiltigt mappID-format: ${rawFolderId}, visar alla filer`);
          whereCondition = eq(files.projectId, projectId);
        }
      } else {
        // Om inget mappID anges eller "all" är true, visa alla filer i projektet
        whereCondition = eq(files.projectId, projectId);
        console.log(`/api/files - VISAR ALLA FILER: Inget mappfilter eller "all=true" angett`);
      }
      
      // Hämta filerna enligt de specificerade villkoren
      const fileList = await db.query.files.findMany({
        where: whereCondition,
        orderBy: [desc(files.createdAt)]
      });
      
      // Returnera filerna
      return res.json(fileList);
      
    } catch (error) {
      console.error("/api/files - FEL:", error);
      return res.status(500).json({ error: "Ett fel uppstod vid hämtning av filer" });
    }
  });

  // Projects API
  app.post(`${apiPrefix}/projects`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    try {
      const { name, description } = req.body;

      // Debugging - skriver ut användarinformation
      console.log("User object in /api/projects:", req.user);
      console.log("User ID in /api/projects:", req.user?.id);
      console.log("Is authenticated:", req.isAuthenticated());
      console.log("Session:", req.session);

      // Skapa projektet med explicit ID-konvertering
      const userId = req.user?.id;
      if (!userId) {
        return res.status(400).json({ error: "User ID not available" });
      }

      // Skapa projektet
      const [newProject] = await db.insert(projects).values({
        name,
        description,
        created_at: new Date(),
        updated_at: new Date(),
        created_by_id: userId // Anpassat för databasnamnet
      }).returning();

      // Automatiskt tilldela skaparen till projektet
      await db.insert(userProjects).values({
        user_id: userId, // Använd samma userId som vi verifierade ovan
        project_id: newProject.id,
        created_at: new Date()
      });

      console.log(`Nytt projekt skapat: ${name} (ID: ${newProject.id}) av användare ${req.user!.id}`);
      
      return res.status(200).json(newProject);
    } catch (error) {
      console.error("Error creating project:", error);
      return res.status(500).json({ error: "Failed to create project" });
    }
  });

  // User-Projects API
  app.get(`${apiPrefix}/user-projects`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    try {
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      // Superusers och admins får tillgång till alla projekt
      if (userInfo && (userInfo.role === "superuser" || userInfo.role === "admin")) {
        const allProjects = await db.query.projects.findMany({
          orderBy: [desc(projects.updatedAt)]
        });
        return res.json(allProjects);
      }
      
      // Vanliga användare får bara tillgång till sina projekt
      const userProjectIds = await db.query.userProjects.findMany({
        where: eq(userProjects.userId, req.user!.id),
        columns: { projectId: true }
      });
      
      const projectIds = userProjectIds.map(up => up.projectId);
      
      if (projectIds.length === 0) {
        return res.json([]);
      }
      
      const userProjs = await db.query.projects.findMany({
        where: inArray(projects.id, projectIds),
        orderBy: [desc(projects.updatedAt)]
      });
      
      return res.json(userProjs);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      return res.status(500).json({ error: "Failed to fetch user projects" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}

