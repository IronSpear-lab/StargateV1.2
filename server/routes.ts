import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { eq, and } from "drizzle-orm";
import { 
  files, 
  folders, 
  tasks, 
  comments, 
  projects, 
  wikiPages,
  taskTimeEntries
} from "@shared/schema";

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

  app.post(`${apiPrefix}/files`, async (req, res) => {
    try {
      // In a real implementation, this would handle file uploads with multer
      const file = await storage.createFile({
        ...req.body,
        uploadedById: req.user!.id
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

  const httpServer = createServer(app);
  return httpServer;
}
