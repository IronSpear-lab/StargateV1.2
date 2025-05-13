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

  // Projects API
  app.get(`${apiPrefix}/projects`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    
    const userInfo = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id)
    });
    
    // If user is superuser or admin, return all projects
    if (userInfo && (userInfo.role === 'superuser' || userInfo.role === 'admin')) {
      const allProjects = await db.query.projects.findMany({
        orderBy: [desc(projects.updatedAt)]
      });
      return res.json(allProjects);
    }
    
    // Otherwise, return only projects the user is a member of
    const userProj = await db.query.userProjects.findMany({
      where: eq(userProjects.userId, req.user!.id),
      with: {
        project: true
      }
    });
    
    const userProjects = userProj.map(up => up.project).filter(Boolean);
    
    return res.json(userProjects);
  });

  app.post(`${apiPrefix}/projects`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    
    // Basic validation
    if (!req.body.name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    // Check if user can create projects (only admin, superuser, project_leader)
    const userInfo = await db.query.users.findFirst({
      where: eq(users.id, req.user!.id)
    });
    
    const allowedRoles = ['admin', 'superuser', 'project_leader'];
    if (userInfo && !allowedRoles.includes(userInfo.role)) {
      return res.status(403).json({ error: 'You do not have permission to create projects' });
    }
    
    try {
      // Create the project
      const [newProject] = await db.insert(projects).values({
        name: req.body.name,
        description: req.body.description || '',
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
        status: req.body.status || 'active', 
        budget: req.body.budget || null,
        clientName: req.body.clientName || null,
        contactPerson: req.body.contactPerson || null,
        contactEmail: req.body.contactEmail || null
      }).returning();
      
      // Add the creator as a member of the project
      await db.insert(userProjects).values({
        userId: req.user!.id,
        projectId: newProject.id,
        role: 'project_leader' // Creator is automatically a project leader
      });
      
      // Create default folders for the project
      const defaultFolders = [
        { name: "Dokument", projectId: newProject.id },
        { name: "Bilder", projectId: newProject.id },
        { name: "Rapporter", projectId: newProject.id }
      ];
      
      await db.insert(folders).values(defaultFolders);
      
      return res.status(201).json(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      return res.status(500).json({ error: 'Error creating project' });
    }
  });

  // Files API - BALANSERAD VERSION MED MAPPFILTRERING
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

  // User-Projects API
  app.get(`${apiPrefix}/user-projects`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    
    try {
      const userProjects = await db.query.userProjects.findMany({
        where: eq(userProjects.userId, req.user!.id),
        with: {
          project: true
        }
      });
      
      res.json(userProjects);
    } catch (error) {
      console.error('Error fetching user projects:', error);
      res.status(500).json({ error: 'Error fetching user projects' });
    }
  });

  // Folders API
  app.get(`${apiPrefix}/folders`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      // Check user access to the project
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      const isSuperuserOrAdmin = userInfo && (userInfo.role === 'superuser' || userInfo.role === 'admin');
      
      if (!isSuperuserOrAdmin) {
        const projectAccess = await db.query.userProjects.findFirst({
          where: and(
            eq(userProjects.userId, req.user!.id),
            eq(userProjects.projectId, projectId)
          )
        });
        
        if (!projectAccess) {
          return res.status(403).json({ error: 'No access to this project' });
        }
      }
      
      const foldersList = await db.query.folders.findMany({
        where: eq(folders.projectId, projectId),
        orderBy: [asc(folders.id)]
      });
      
      res.json(foldersList);
    } catch (error) {
      console.error('Error fetching folders:', error);
      res.status(500).json({ error: 'Error fetching folders' });
    }
  });

  app.post(`${apiPrefix}/folders`, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    
    try {
      const { name, projectId, parentId } = req.body;
      
      if (!name || !projectId) {
        return res.status(400).json({ error: 'Name and Project ID are required' });
      }
      
      // Check if user has permission to create folders
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      const allowedRoles = ['admin', 'project_leader', 'superuser'];
      const isUserAllowed = userInfo && allowedRoles.includes(userInfo.role);
      
      if (!isUserAllowed) {
        return res.status(403).json({ error: 'No permission to create folders' });
      }
      
      // Check if the project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Create the folder
      const [newFolder] = await db.insert(folders).values({
        name,
        projectId,
        parentId: parentId || null
      }).returning();
      
      res.status(201).json(newFolder);
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ error: 'Error creating folder' });
    }
  });

  // Upload a file
  app.post(`${apiPrefix}/upload`, upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send({ error: 'Unauthorized' });
    }
    
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { projectId, folderId, description } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Check if the project exists and user has access
    try {
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, parseInt(projectId))
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Check user access to the project
      const userInfo = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id)
      });
      
      const isSuperuserOrAdmin = userInfo && (userInfo.role === 'superuser' || userInfo.role === 'admin');
      
      if (!isSuperuserOrAdmin) {
        const projectAccess = await db.query.userProjects.findFirst({
          where: and(
            eq(userProjects.userId, req.user!.id),
            eq(userProjects.projectId, parseInt(projectId))
          )
        });
        
        if (!projectAccess) {
          return res.status(403).json({ error: 'No access to this project' });
        }
      }
      
      // If a folder is specified, check if it exists
      let folder = null;
      
      if (folderId) {
        folder = await db.query.folders.findFirst({
          where: and(
            eq(folders.id, parseInt(folderId)),
            eq(folders.projectId, parseInt(projectId))
          )
        });
        
        if (!folder) {
          return res.status(404).json({ error: 'Folder not found in the specified project' });
        }
      }
      
      // Create the file record
      const [newFile] = await db.insert(files).values({
        name: file.originalname,
        path: file.path,
        projectId: parseInt(projectId),
        folderId: folder ? parseInt(folderId) : null,
        description: description || '',
        uploadedBy: req.user!.id,
        fileType: file.mimetype,
        size: file.size,
        createdAt: new Date()
      }).returning();
      
      // If the file is a PDF, create a PDF version record
      if (file.mimetype === 'application/pdf') {
        await db.insert(pdfVersions).values({
          fileId: newFile.id,
          version: 1,
          path: file.path,
          uploadedBy: req.user!.id,
          createdAt: new Date(),
          isActive: true
        });
      }
      
      return res.status(201).json(newFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Error saving file' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
