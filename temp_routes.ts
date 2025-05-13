
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

  // Files API - NY HELT OMARBETAD VERSION MED STRIKT MAPPISOLERING
  app.get(`${apiPrefix}/files`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    try {
      // Steg 1: Extrahera och validera alla förfrågningsparametrar
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const rawFolderId = req.query.folderId;
      
      console.log(`/api/files - ANROP MED PARAMETRAR (STRIKT MAPPISOLERING):`, { 
        projectId, 
        folderId: rawFolderId,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Steg 2: Validera projektID
      if (!projectId) {
        console.error("/api/files - KRITISKT FEL: SAKNAR PROJECT_ID");
        return res.status(400).json({ 
          error: "Projekt-ID krävs för att hämta filer",
          details: "Ange ett giltigt projekt-ID i din förfrågan"
        });
      }
      
      if (isNaN(projectId)) {
        console.error(`/api/files - KRITISKT FEL: OGILTIGT PROJEKT-ID FORMAT: ${req.query.projectId}`);
        return res.status(400).json({ 
          error: "Ogiltigt format på Projekt-ID", 
          details: `Projekt-ID måste vara ett nummer, fick: ${req.query.projectId}`
        });
      }
      
      // Steg 3: ❌ VALIDERA OBLIGATORISK MAPP - filer måste alltid tillhöra en mapp
      if (!rawFolderId || rawFolderId === "null") {
        console.error(`/api/files - KRITISKT FEL: SAKNAR MAPP-ID - filer MÅSTE tillhöra en mapp`);
        return res.status(400).json({
          error: "Mapp-ID är obligatoriskt",
          details: "Filer måste tillhöra en mapp, ange ett giltigt mapp-ID"
        });
      }
      
      // Konvertera till nummer och validera
      const folderId = parseInt(rawFolderId as string);
      if (isNaN(folderId)) {
        console.error(`/api/files - KRITISKT FEL: OGILTIGT MAPP-ID FORMAT: ${req.query.folderId}`);
        return res.status(400).json({ 
          error: "Ogiltigt format på Mapp-ID", 
          details: `Mapp-ID måste vara ett nummer, fick: ${req.query.folderId}`
        });
      }
      
      // Kontrollera att mappen faktiskt existerar innan vi fortsätter
      const folderCheck = await db.query.folders.findFirst({
        where: and(
          eq(folders.id, folderId),
          eq(folders.projectId, projectId)
        )
      });
      
      if (!folderCheck) {
        console.error(`/api/files - KRITISKT FEL: MAPP FINNS INTE ELLER TILLHÖR INTE PROJEKTET: Mapp ${folderId}, Projekt ${projectId}`);
        return res.status(404).json({ 
          error: "Mappen hittades inte eller tillhör inte detta projekt", 
          details: "Kontrollera mapp-ID och projektets tillhörighet"
        });
      }
      
      console.log(`/api/files - MAPPVERIFIERING OK: Mapp "${folderCheck.name}" (ID: ${folderId}) bekräftad i projekt ${projectId}`);
      
      // Steg 4: Kontrollera användaråtkomst till projektet
      // Hämta användarinformation för att kontrollera rollen först
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      // Superusers och admins har tillgång till alla projekt
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
      
      console.log(`/api/files - BEHÖRIGHETSKONTROLL OK: Användare ${req.user!.id} (${isSuperuserOrAdmin ? userInfo!.role : "regular"}) har tillgång till projekt ${projectId}`);
      
      // Steg 5: Hämta filer med strikt filtrering
      let whereCondition = and(
        eq(files.projectId, projectId),
        eq(files.folderId, folderId)  // OBLIGATORISKT - alla filer MÅSTE ha en mapp
      );
      
      console.log(`/api/files - STRIKT FOLDER CHECK: Söker exakt mappID=${folderId} i projekt ${projectId}`);
      
      // Hämta filerna enligt de specificerade villkoren
      const fileList = await db.query.files.findMany({
        where: whereCondition,
        orderBy: [desc(files.createdAt)]
      });
      
      // STATISTIK OCH LOGGNING
      console.log(`/api/files - HITTADE ${fileList.length} filer i mapp ${folderId}, projekt ${projectId}`);
      
      // Returnera filerna
      return res.json(fileList);
      
    } catch (error) {
      console.error("/api/files - DATABASFRÅGEFEL:", error);
      return res.status(500).json({ error: "Ett fel uppstod vid hämtning av filer" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}

