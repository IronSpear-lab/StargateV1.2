
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
      const rootFilesOnly = req.query.rootFilesOnly === "true";
      
      // DIAGNOSTIK: Logga tydligt anropet för att underlätta debugging 
      console.log(`/api/files - ANROP MED PARAMETRAR:`, { 
        projectId, 
        folderId: rawFolderId,
        rootFilesOnly,
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
            // FÖRBÄTTRAD MAPPFILTRERING: Visa endast filer som tillhör denna mapp med strikt filtrering
            whereCondition = and(
              eq(files.projectId, projectId),
              eq(files.folderId, folderId) // Använd exakt matchning av mappID
            );
            
            console.log(`/api/files - FÖRBÄTTRAD MAPPFILTRERING: Visar endast filer i mapp ${folderId} för projekt ${projectId}`);
            
            // UTÖKAD DIAGNOSTIK: Verifiera att mappfiltrering fungerar korrekt med SQL
            try {
              // Direkt SQL-fråga för att bekräfta att mappfiltrering fungerar korrekt
              const folderFilesSql = await db.execute(
                sql`SELECT id, name, "folderId" FROM files 
                    WHERE "projectId" = ${projectId} 
                    AND "folderId" = ${folderId} 
                    LIMIT 5`
              );
              
              console.log(`/api/files - SQL DIAGNOSTIK (MAPP): Hittade ${folderFilesSql.rows.length} filer i mapp ${folderId} med direkt SQL`, 
                folderFilesSql.rows.map((f: any) => ({id: f.id, name: f.name, folderId: f.folderId})));
                
              // Standard ORM-fråga för jämförelse
              const folderFilesOrm = await db.query.files.findMany({
                where: and(
                  eq(files.projectId, projectId),
                  eq(files.folderId, folderId)
                ),
                limit: 5
              });
              
              console.log(`/api/files - ORM DIAGNOSTIK (MAPP): Hittade ${folderFilesOrm.length} filer i mapp ${folderId} med ORM:`, 
                folderFilesOrm.map(f => ({id: f.id, name: f.name, folderId: f.folderId})));
              
              // Jämför resultat för att bekräfta konsistens mellan SQL och ORM
              if (folderFilesSql.rows.length !== folderFilesOrm.length) {
                console.error(`/api/files - VARNING: Inkonsekvens i mappfiltreringsresultat mellan SQL och ORM!`);
              }
            } catch (sqlError) {
              console.error(`/api/files - FEL VID SQL-MAPPDIAGNOSTIK:`, sqlError);
            }
          } else {
            console.error(`/api/files - VARNING: Angiven mapp ${folderId} existerar inte i projekt ${projectId}, visar alla filer`);
            // Om mappen inte existerar, visa alla filer i projektet istället
            whereCondition = eq(files.projectId, projectId);
          }
        } else {
          console.error(`/api/files - VARNING: Ogiltigt mappID-format: ${rawFolderId}, visar alla filer`);
          whereCondition = eq(files.projectId, projectId);
        }
      } else if (rootFilesOnly) {
        // FÖRBÄTTRAD ROTFILTRERING: Visa endast filer som inte har någon mapp (folderId är null)
        // Extra kontroller för att garantera korrekt filtrering
        whereCondition = and(
          eq(files.projectId, projectId),
          isNull(files.folderId) // NULL i databasen betyder ingen mapp
        );
        console.log(`/api/files - VISAR ENDAST ROTFILER: Strikt filtrering för filer utan mapptillhörighet`);
        
        // EXTRA DIAGNOSTIK: Verifiera att WHERE-villkoret är korrekt för SQL
        try {
          // Gör en direkt SQL-fråga för att bekräfta att rotfilerna filtreras korrekt
          const rootFilesSql = await db.execute(
            sql`SELECT id, name, "folderId" FROM files 
                WHERE "projectId" = ${projectId} 
                AND "folderId" IS NULL 
                LIMIT 5`
          );
          
          console.log(`/api/files - SQL DIAGNOSTIK: Hittade ${rootFilesSql.rows.length} rotfiler med direkt SQL:`, 
            rootFilesSql.rows.map((f: any) => ({id: f.id, name: f.name, folderId: f.folderId})));
            
          // Gör också vanlig ORM-fråga för jämförelse
          const rootFilesOrm = await db.query.files.findMany({
            where: and(
              eq(files.projectId, projectId),
              isNull(files.folderId)
            ),
            limit: 5
          });
          
          console.log(`/api/files - ORM DIAGNOSTIK: Hittade ${rootFilesOrm.length} rotfiler med ORM:`, 
            rootFilesOrm.map(f => ({id: f.id, name: f.name, folderId: f.folderId})));
          
          // Jämför antal resultat för att verifiera konsistens
          if (rootFilesSql.rows.length !== rootFilesOrm.length) {
            console.error(`/api/files - VARNING: Inkonsekvens i resultat mellan SQL och ORM!`);
          }
        } catch (sqlError) {
          console.error(`/api/files - FEL VID SQL-DIAGNOSTIK:`, sqlError);
        }
      } else {
        // Om inget mappID anges eller "all" är true, visa alla filer i projektet
        whereCondition = eq(files.projectId, projectId);
        console.log(`/api/files - VISAR ALLA FILER: Inget mappfilter eller "all=true" angett`);
      }
      
      // Hämta filerna enligt de specificerade villkoren
      // Gör en enkel SQL-fråga direkt utan orderBy för att undvika SQL-syntaxfel
      let fileList = await db.query.files.findMany({
        where: whereCondition
      });
      
      // Sortera resultaten efter uppladdningsdatum i minnet istället
      fileList = fileList.sort((a, b) => {
        const dateA = new Date(a.uploadDate);
        const dateB = new Date(b.uploadDate);
        return dateB.getTime() - dateA.getTime(); // Fallande ordning (nyast först)
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
        createdAt: new Date(),
        createdById: userId // Vi använder namnen exakt som i schema.ts
      }).returning();

      // Automatiskt tilldela skaparen till projektet
      await db.insert(userProjects).values({
        userId: userId, // Använd userId (camelCase enligt schema.ts)
        projectId: newProject.id,
        role: "project_leader" // Vi behöver också lägga till roll enligt schemadefinitionen
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
        orderBy: [desc(projects.createdAt)]
      });
      
      return res.json(userProjs);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      return res.status(500).json({ error: "Failed to fetch user projects" });
    }
  });
  
  // Folders API
  app.get(`${apiPrefix}/folders`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: "Unauthorized" });
    }
    
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }
      
      // Check user access to project
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      // Check if user is superuser or has access to the project
      const isSuperuserOrAdmin = userInfo && (userInfo.role === "superuser" || userInfo.role === "admin");
      
      let hasAccess = false;
      
      if (isSuperuserOrAdmin) {
        hasAccess = true;
      } else {
        // Check project membership for regular users
        const projectAccess = await db.query.userProjects.findFirst({
          where: and(
            eq(userProjects.userId, req.user!.id),
            eq(userProjects.projectId, projectId)
          )
        });
        
        hasAccess = !!projectAccess;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "No access to this project" });
      }
      
      // Fetch folders for the project
      const folderList = await db.query.folders.findMany({
        where: eq(folders.projectId, projectId),
        orderBy: [asc(folders.name)]
      });
      
      return res.json(folderList);
    } catch (error) {
      console.error("Error fetching folders:", error);
      return res.status(500).json({ error: "Failed to fetch folders" });
    }
  });
  
  app.post(`${apiPrefix}/folders`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: "Unauthorized" });
    }
    
    try {
      const { name, projectId, parentId, parent, sidebarParent } = req.body;
      
      if (!name || !projectId) {
        return res.status(400).json({ error: "Name and projectId are required" });
      }
      
      // Check if user can create folders (project_leader, admin, or superuser)
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      if (!userInfo || !(userInfo.role === "project_leader" || userInfo.role === "admin" || userInfo.role === "superuser")) {
        return res.status(403).json({ error: "No permission to create folders" });
      }
      
      // Check if project exists and user has access
      let hasAccess = false;
      
      if (userInfo.role === "superuser" || userInfo.role === "admin") {
        hasAccess = true;
      } else {
        // Check project membership for project_leader
        const projectAccess = await db.query.userProjects.findFirst({
          where: and(
            eq(userProjects.userId, req.user!.id),
            eq(userProjects.projectId, projectId)
          )
        });
        
        hasAccess = !!projectAccess;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "No access to this project" });
      }
      
      // Check if parent folder exists if parentId is provided
      if (parentId) {
        const parentFolder = await db.query.folders.findFirst({
          where: and(
            eq(folders.id, parentId),
            eq(folders.projectId, projectId)
          )
        });
        
        if (!parentFolder) {
          return res.status(404).json({ error: "Parent folder not found" });
        }
      }
      
      // Create the folder
      const [newFolder] = await db.insert(folders).values({
        name,
        projectId,
        parentId: parentId || null,
        createdById: req.user!.id
      }).returning();
      
      console.log(`Ny mapp skapad: ${name} (ID: ${newFolder.id}) i projekt ${projectId} av användare ${req.user!.id}`);
      
      return res.status(200).json(newFolder);
    } catch (error) {
      console.error("Error creating folder:", error);
      return res.status(500).json({ error: "Failed to create folder" });
    }
  });

  // Files upload API
  app.post(`${apiPrefix}/files`, upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      // Kontrollera att filen laddades upp korrekt
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Validera projektID
      const projectId = parseInt(req.body.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }
      
      // Kontrollera användaråtkomst till projektet
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      // Kontrollera behörighet
      let hasAccess = false;
      
      if (userInfo && (userInfo.role === "superuser" || userInfo.role === "admin")) {
        hasAccess = true;
      } else {
        const projectAccess = await db.query.userProjects.findFirst({
          where: and(
            eq(userProjects.userId, req.user!.id),
            eq(userProjects.projectId, projectId)
          )
        });
        
        hasAccess = !!projectAccess;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "No access to this project" });
      }
      
      // FÖRBÄTTRAD VALIDERING AV FOLDER ID: Garanterar korrekta värden för folder
      // Standardvärde är null (ingen mapp/rotmapp)
      let folderId = null;
      
      // Tydlig loggning av ursprunglig folderId från klienten
      console.log(`Filuppladdning: Inkommande folderId="${req.body.folderId}" av typen ${typeof req.body.folderId}`);
      
      // Hanterar fallet när folderId skickas och inte är 'null' (sträng), undefined, eller tom sträng
      if (req.body.folderId && 
          req.body.folderId !== 'null' && 
          req.body.folderId !== 'undefined' && 
          req.body.folderId !== '') {
          
        // Konvertera alltid till nummer - detta säkerställer att folderId är en siffra
        const parsedFolderId = parseInt(req.body.folderId);
        
        // Om parsning lyckades och vi har ett giltigt nummer
        if (!isNaN(parsedFolderId) && parsedFolderId > 0) {
          console.log(`Filuppladdning: Validerar mapp med ID ${parsedFolderId} för projekt ${projectId}`);
          
          // Kontrollera att mappen existerar och tillhör projektet
          const folderExists = await db.query.folders.findFirst({
            where: and(
              eq(folders.id, parsedFolderId),
              eq(folders.projectId, projectId)
            )
          });
          
          if (folderExists) {
            // Sätt folderId endast om mappen faktiskt existerar
            folderId = parsedFolderId;
            console.log(`Filuppladdning: Mapp bekräftad giltig - fil associeras med mapp ${folderId}`);
          } else {
            console.error(`Filuppladdning: Mapp ${parsedFolderId} existerar inte i projekt ${projectId}!`);
            return res.status(404).json({ 
              error: "Folder not found in this project",
              details: `The specified folder with ID ${parsedFolderId} does not exist or is not part of project ${projectId}`
            });
          }
        } else {
          // Ogiltigt mappID-format
          console.error(`Filuppladdning: Ogiltigt format på mappID: "${req.body.folderId}" - ignorerar`);
          folderId = null;
        }
      } else {
        // Explicit loggning av rotfilsuppladdning för debugging
        console.log(`Filuppladdning: Ingen giltig mapp angiven, fil placeras i ROT (folderId=null)`);
      }
      
      // FÖRBÄTTRAD VALIDERING: Kontrollera att folderId är korrekt formaterat
      console.log(`Filuppladdning: Kontrollerar folderId="${folderId}" av typen ${typeof folderId}`);
      
      // Om folderId är "null" (som string) från formuläret, se till att det blir riktigt null
      if (folderId === "null") folderId = null;
      
      // Om folderId är tomt, gör det till null
      if (folderId === "") folderId = null;
      
      // Konvertera siffersträngar till nummer
      if (typeof folderId === "string" && !isNaN(Number(folderId))) {
        folderId = Number(folderId);
      }
      
      // Extra kontroll: Se till att 0 blir null (många system skickar 0 för att indikera null)
      if (folderId === 0) folderId = null;
      
      console.log(`Filuppladdning: Slutlig folderId=${folderId} av typen ${typeof folderId}`);
      
      // EXTRA VALIDERING: Gör en extra SQL-kontroll för att bekräfta mappens existens
      if (folderId !== null) {
        console.log(`Filuppladdning: Dubbelkontrollerar att mapp ${folderId} existerar med SQL-fråga`);
        const folderCheck = await db.execute(
          sql`SELECT id, name, "projectId" FROM folders 
              WHERE id = ${folderId} AND "projectId" = ${projectId}`
        );
        
        if (folderCheck.rows.length === 0) {
          console.error(`Filuppladdning: KRITISKT FEL - Mapp ${folderId} existerar inte i projekt ${projectId} enligt SQL-fråga`);
          // Fallback till null om mappen inte finns (för att undvika foreign key error)
          folderId = null;
        } else {
          console.log(`Filuppladdning: Mapp ${folderId} bekräftad giltig via SQL`);
        }
      }
      
      // Skapa filpost i databasen
      const [newFile] = await db.insert(files).values({
        name: req.file.originalname,
        fileType: req.file.mimetype.split('/')[1] || 'unknown',
        fileSize: req.file.size,
        filePath: req.file.path,
        projectId,
        folderId,  // Använder validerad folderId
        uploadedById: req.user!.id,
        uploadDate: new Date()
      }).returning();
      
      console.log(`Ny fil uppladdad: ${req.file.originalname} (ID: ${newFile.id}) till projekt ${projectId} ${folderId ? `i mapp ${folderId}` : 'utan mapp (NULL)'}`);
      
      // Dubbelkolla att den sparade filen har rätt folderId genom att hämta den direkt
      const savedFile = await db.query.files.findFirst({
        where: eq(files.id, newFile.id)
      });
      
      console.log(`Verifierar sparad fil: ID=${savedFile?.id}, name=${savedFile?.name}, folderId=${savedFile?.folderId} (${typeof savedFile?.folderId})`);
      
      // KRITISK VALIDERING: Kontrollera att matchningen för folderId är korrekt
      const expectedFolderId = folderId;
      const actualFolderId = savedFile?.folderId;
      
      if (expectedFolderId !== actualFolderId) {
        console.error(`KRITISKT DATAFEL: Oväntad mismatch på folderId vid filuppladdning:
          - Förväntad folderId: ${expectedFolderId} (typ: ${typeof expectedFolderId})
          - Faktisk folderId: ${actualFolderId} (typ: ${typeof actualFolderId})
        `);
      } else {
        console.log(`✅ Verifiering slutförd: Fil ${newFile.id} har korrekt folderId=${actualFolderId}`);
      }
      
      // Returnera JSON-data
      return res.status(200).json(newFile);
    } catch (error) {
      console.error("Error uploading file:", error);
      return res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}

