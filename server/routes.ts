import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { eq, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  files, 
  folders, 
  tasks, 
  comments, 
  projects, 
  wikiPages,
  taskTimeEntries
} from "@shared/schema";

// Set up multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage_config,
  fileFilter: (req, file, cb) => {
    // Accept PDF files and common document/image types
    const allowedFileTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and Office documents are allowed.'), false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // API routes
  const apiPrefix = "/api";

  // Projects API
  app.get(`${apiPrefix}/projects`, async (req, res) => {
    try {
      const userProjects = await storage.getUserProjects(req.user!.id);
      res.json(userProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post(`${apiPrefix}/projects`, async (req, res) => {
    try {
      const project = await storage.createProject({
        ...req.body,
        createdById: req.user!.id
      });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.get(`${apiPrefix}/projects/:id`, async (req, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  // Folders API
  app.get(`${apiPrefix}/folders`, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }
      
      const folderList = await storage.getFolders(projectId);
      res.json(folderList);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Failed to fetch folders" });
    }
  });

  app.post(`${apiPrefix}/folders`, async (req, res) => {
    try {
      const folder = await storage.createFolder({
        ...req.body,
        createdById: req.user!.id
      });
      res.status(201).json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  // Files API
  app.get(`${apiPrefix}/files`, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
      
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }
      
      const fileList = await storage.getFiles(projectId, folderId);
      res.json(fileList);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post(`${apiPrefix}/files`, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { projectId, folderId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // Get file information
      const fileType = req.file.mimetype;
      const fileName = req.file.originalname;
      const fileSize = req.file.size;
      const filePath = req.file.path;

      // Create file record in database
      const file = await storage.createFile({
        name: fileName,
        fileType,
        fileSize,
        filePath,
        projectId: parseInt(projectId),
        folderId: folderId ? parseInt(folderId) : undefined,
        uploadedById: req.user!.id,
        uploadDate: new Date()
      });

      res.status(201).json(file);
    } catch (error) {
      console.error("Error creating file:", error);
      res.status(500).json({ error: "Failed to create file" });
    }
  });

  app.get(`${apiPrefix}/files/:id`, async (req, res) => {
    try {
      const file = await storage.getFile(parseInt(req.params.id));
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error fetching file:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });
  
  // Serve uploaded files
  app.get(`${apiPrefix}/files/:id/content`, async (req, res) => {
    try {
      const file = await storage.getFile(parseInt(req.params.id));
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Check if file exists on disk
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ error: "File content not found" });
      }
      
      // Set content type
      res.type(file.fileType);
      
      // Stream the file
      const fileStream = fs.createReadStream(file.filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error streaming file:", error);
      res.status(500).json({ error: "Failed to stream file" });
    }
  });

  // Comments API
  app.get(`${apiPrefix}/comments`, async (req, res) => {
    try {
      const fileId = req.query.fileId ? parseInt(req.query.fileId as string) : undefined;
      const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
      
      if (!fileId && !taskId) {
        return res.status(400).json({ error: "File ID or Task ID is required" });
      }
      
      const commentsList = await storage.getComments(fileId, taskId);
      res.json(commentsList);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post(`${apiPrefix}/comments`, async (req, res) => {
    try {
      const comment = await storage.createComment({
        ...req.body,
        userId: req.user!.id
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Tasks API
  app.get(`${apiPrefix}/tasks`, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }
      
      const taskList = await storage.getTasks(projectId);
      res.json(taskList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post(`${apiPrefix}/tasks`, async (req, res) => {
    try {
      const task = await storage.createTask({
        ...req.body,
        createdById: req.user!.id
      });
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch(`${apiPrefix}/tasks/:id`, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.updateTask(taskId, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Time entries API
  app.get(`${apiPrefix}/time-entries`, async (req, res) => {
    try {
      const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user!.id;
      
      const timeEntries = await storage.getTimeEntries(userId, taskId);
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  });

  app.post(`${apiPrefix}/time-entries`, async (req, res) => {
    try {
      const timeEntry = await storage.createTimeEntry({
        ...req.body,
        userId: req.user!.id
      });
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  // Wiki pages API
  app.get(`${apiPrefix}/wiki-pages`, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }
      
      const wikiPagesList = await storage.getWikiPages(projectId);
      res.json(wikiPagesList);
    } catch (error) {
      console.error("Error fetching wiki pages:", error);
      res.status(500).json({ error: "Failed to fetch wiki pages" });
    }
  });

  app.post(`${apiPrefix}/wiki-pages`, async (req, res) => {
    try {
      const wikiPage = await storage.createWikiPage({
        ...req.body,
        createdById: req.user!.id
      });
      res.status(201).json(wikiPage);
    } catch (error) {
      console.error("Error creating wiki page:", error);
      res.status(500).json({ error: "Failed to create wiki page" });
    }
  });

  app.get(`${apiPrefix}/wiki-pages/:id`, async (req, res) => {
    try {
      const wikiPage = await storage.getWikiPage(parseInt(req.params.id));
      if (!wikiPage) {
        return res.status(404).json({ error: "Wiki page not found" });
      }
      res.json(wikiPage);
    } catch (error) {
      console.error("Error fetching wiki page:", error);
      res.status(500).json({ error: "Failed to fetch wiki page" });
    }
  });

  app.patch(`${apiPrefix}/wiki-pages/:id`, async (req, res) => {
    try {
      const wikiPageId = parseInt(req.params.id);
      const wikiPage = await storage.updateWikiPage(wikiPageId, req.body);
      res.json(wikiPage);
    } catch (error) {
      console.error("Error updating wiki page:", error);
      res.status(500).json({ error: "Failed to update wiki page" });
    }
  });

  // User projects and roles
  app.get(`${apiPrefix}/user-projects`, async (req, res) => {
    try {
      const userProjects = await storage.getUserProjects(req.user!.id);
      res.json(userProjects);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      res.status(500).json({ error: "Failed to fetch user projects" });
    }
  });
  
  // Calendar events API
  app.get(`${apiPrefix}/calendar-events`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
      
      const userId = req.user!.id;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      const events = await storage.getCalendarEvents(userId, projectId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.get(`${apiPrefix}/calendar-events/:id`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
      
      const eventId = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      
      // Make sure the user has access to this event
      if (event.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "You don't have access to this event" });
      }
      
      res.json(event);
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      res.status(500).json({ error: "Failed to fetch calendar event" });
    }
  });

  app.post(`${apiPrefix}/calendar-events`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
      
      const userId = req.user!.id;
      
      // Ensure the creator is set to the current user
      const event = await storage.createCalendarEvent({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  app.patch(`${apiPrefix}/calendar-events/:id`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
      
      const eventId = parseInt(req.params.id);
      
      // Make sure the event exists and belongs to the user
      const existingEvent = await storage.getCalendarEvent(eventId);
      
      if (!existingEvent) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      
      if (existingEvent.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "You don't have permission to update this event" });
      }
      
      const updatedEvent = await storage.updateCalendarEvent(eventId, req.body);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  app.delete(`${apiPrefix}/calendar-events/:id`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
      
      const eventId = parseInt(req.params.id);
      
      // Make sure the event exists and belongs to the user
      const existingEvent = await storage.getCalendarEvent(eventId);
      
      if (!existingEvent) {
        return res.status(404).json({ error: "Calendar event not found" });
      }
      
      if (existingEvent.createdBy !== req.user!.id) {
        return res.status(403).json({ error: "You don't have permission to delete this event" });
      }
      
      await storage.deleteCalendarEvent(eventId);
      res.sendStatus(204); // No content, successful deletion
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
