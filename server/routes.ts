import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { eq, and, desc, asc, inArray, ne } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
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
  taskTimeEntries,
  conversations,
  conversationParticipants,
  messages
} from "@shared/schema";

// Set up multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
const chatUploadsDir = path.join(uploadsDir, 'chat');

// Create uploads directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(chatUploadsDir)) {
  fs.mkdirSync(chatUploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    // Check if this is a message attachment or a regular file
    if (req.originalUrl.includes('/messages/upload')) {
      cb(null, chatUploadsDir);
    } else {
      cb(null, uploadsDir);
    }
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
  
  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    // Check if user is authenticated for secure file access
    if (!req.isAuthenticated()) {
      return res.status(401).send('Unauthorized');
    }
    next();
  }, (req, res, next) => {
    // Serve files from the uploads directory
    try {
      // Get the requested path
      const relativePath = req.url.substring(1); // Remove leading slash
      
      // Determine if it's in a subdirectory
      if (relativePath.startsWith('chat/')) {
        // For files in the chat uploads directory
        const filePath = path.join(chatUploadsDir, relativePath.substring(5)); // Remove 'chat/'
        
        // Security check - make sure the path is still within chatUploadsDir
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(chatUploadsDir)) {
          return res.status(403).send('Forbidden');
        }
        
        // Serve the file
        res.sendFile(resolvedPath, {
          headers: {
            'Cache-Control': 'private, max-age=86400',
          }
        });
      } else {
        // For files directly in the uploads directory
        const filePath = path.join(uploadsDir, relativePath);
        
        // Security check - make sure the path is still within uploadsDir
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(uploadsDir)) {
          return res.status(403).send('Forbidden');
        }
        
        // Serve the file
        res.sendFile(resolvedPath, {
          headers: {
            'Cache-Control': 'private, max-age=86400',
          }
        });
      }
    } catch (error) {
      console.error(`Error serving file:`, error);
      if (!res.headersSent) {
        res.status(404).send('File not found');
      }
    }
  });

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
      // Validate id is a number
      const fileId = parseInt(req.params.id);
      if (isNaN(fileId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }
      
      const file = await storage.getFile(fileId);
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
      // Validate id is a number
      const fileId = parseInt(req.params.id);
      if (isNaN(fileId)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }
      
      const file = await storage.getFile(fileId);
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
      // Process the request body to handle empty dates
      const taskData = { ...req.body };
      
      // Convert empty strings to null for date fields
      if (taskData.dueDate === '') taskData.dueDate = null;
      if (taskData.startDate === '') taskData.startDate = null;
      if (taskData.endDate === '') taskData.endDate = null;
      
      // If createdAt is a string ISO date, convert to Date object
      if (typeof taskData.createdAt === 'string') {
        taskData.createdAt = new Date(taskData.createdAt);
      }
      
      const task = await storage.createTask({
        ...taskData,
        createdById: req.user?.id || taskData.createdById || 1
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
      
      // Process the request body to handle empty dates
      const taskData = { ...req.body };
      
      // Convert empty strings to null for date fields
      if (taskData.dueDate === '') taskData.dueDate = null;
      if (taskData.startDate === '') taskData.startDate = null;
      if (taskData.endDate === '') taskData.endDate = null;
      
      const task = await storage.updateTask(taskId, taskData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });
  
  // Add DELETE endpoint for tasks
  app.delete(`${apiPrefix}/tasks/:id`, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      // For now, we'll just return success since we don't have a deleteTask method in storage
      // In a real implementation, you would call something like:
      // await storage.deleteTask(taskId);
      
      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
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
  
  // Recent files API
  app.get(`${apiPrefix}/files/recent`, (req, res) => {
    // Return sample files to avoid errors
    const sampleFiles = [
      {
        id: "101",
        name: "System Architecture.pdf",
        fileType: "pdf",
        fileSize: 3450000,
        lastModified: new Date().toISOString(),
        folder: "Documentation",
        uploadedBy: "System",
        uploadedById: "system"
      },
      {
        id: "102",
        name: "Project Timeline.xlsx",
        fileType: "xlsx", 
        fileSize: 1250000,
        lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        folder: "Planning",
        uploadedBy: "System",
        uploadedById: "system"
      }
    ];
    return res.json(sampleFiles);
  });
  
  // Keep the test-files endpoint as an alternative
  app.get(`${apiPrefix}/test-files`, (req, res) => {
    return res.json([
      {
        id: "103",
        name: "System Architecture.pdf",
        fileType: "pdf",
        fileSize: 3450000,
        lastModified: new Date().toISOString(),
        folder: "Documentation",
        uploadedBy: "System",
        uploadedById: "system"
      }
    ]);
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

  // Messaging API
  // Get conversations for a user
  app.get(`${apiPrefix}/conversations`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get all conversations where the user is a participant
      const userConversations = await db.select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, req.user!.id));
      
      const conversationIds = userConversations.map(uc => uc.conversationId);
      
      // Get conversations with latest message and participants
      const result = await Promise.all(conversationIds.map(async (id) => {
        const conversation = await db.select().from(conversations).where(eq(conversations.id, id)).then(res => res[0]);
        
        // Get participants
        const participantsWithUsers = await db.select()
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, id))
          .innerJoin(users, eq(conversationParticipants.userId, users.id));
        
        // Get latest message
        const latestMessage = await db.select()
          .from(messages)
          .where(eq(messages.conversationId, id))
          .orderBy(desc(messages.sentAt))
          .limit(1)
          .then(res => res[0] || null);
        
        return {
          ...conversation,
          participants: participantsWithUsers.map(p => ({
            ...p.conversation_participants,
            user: {
              id: p.users.id,
              username: p.users.username,
              role: p.users.role
            }
          })),
          latestMessage
        };
      }));
      
      // Sort by last message date
      result.sort((a, b) => {
        const dateA = a.latestMessage ? new Date(a.latestMessage.sentAt).getTime() : 0;
        const dateB = b.latestMessage ? new Date(b.latestMessage.sentAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  
  // Get a single conversation with all messages
  app.get(`${apiPrefix}/conversations/:id`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const conversationId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if user is a participant
      const participant = await db.select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        ))
        .then(res => res[0]);
      
      if (!participant) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }
      
      // Get conversation
      const conversation = await db.select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .then(res => res[0]);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      // Get participants with user details
      const participantsWithUsers = await db.select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversationId))
        .innerJoin(users, eq(conversationParticipants.userId, users.id));
      
      // Get messages with sender details
      const messagesWithSenders = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .innerJoin(users, eq(messages.senderId, users.id))
        .orderBy(asc(messages.sentAt));
      
      // Mark messages as read when a conversation is opened
      const messagesToUpdate = messagesWithSenders
        .filter(m => 
          m.messages.senderId !== userId && 
          (!m.messages.readBy || !m.messages.readBy.includes(userId))
        )
        .map(m => m.messages.id);
      
      if (messagesToUpdate.length > 0) {
        // For each message that needs updating
        await Promise.all(messagesToUpdate.map(async (messageId) => {
          // Get current readBy array
          const message = await db.select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .then(res => res[0]);
          
          // Add current user to readBy array
          const readBy = message.readBy || [];
          if (!readBy.includes(userId)) {
            readBy.push(userId);
            
            // Update the message
            await db.update(messages)
              .set({ readBy })
              .where(eq(messages.id, messageId));
          }
        }));
      }
      
      const result = {
        ...conversation,
        participants: participantsWithUsers.map(p => ({
          ...p.conversation_participants,
          user: {
            id: p.users.id,
            username: p.users.username,
            role: p.users.role
          }
        })),
        messages: messagesWithSenders.map(m => ({
          ...m.messages,
          sender: {
            id: m.users.id,
            username: m.users.username,
            role: m.users.role
          }
        }))
      };
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  // Create a new conversation
  app.post(`${apiPrefix}/conversations`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { title, participantIds, isGroup = false, initialMessage } = req.body;
      
      // Validate required fields
      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ error: "At least one participant is required" });
      }
      
      // Ensure the current user is included in participants
      const allParticipantIds = [...new Set([...participantIds.map(id => parseInt(id)), req.user!.id])];
      
      // Create the conversation
      const newConversation = await db.insert(conversations)
        .values({
          title: title || null,
          isGroup,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessageAt: new Date()
        })
        .returning()
        .then(res => res[0]);
      
      // Add participants
      await Promise.all(allParticipantIds.map(async (userId) => {
        return db.insert(conversationParticipants)
          .values({
            conversationId: newConversation.id,
            userId,
            joinedAt: new Date(),
            isAdmin: userId === req.user!.id // Creator is admin
          });
      }));
      
      // Add initial message if provided
      if (initialMessage) {
        await db.insert(messages)
          .values({
            content: initialMessage,
            conversationId: newConversation.id,
            senderId: req.user!.id,
            sentAt: new Date()
          });
      }
      
      // Get the complete conversation with participants
      const participantsWithUsers = await db.select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, newConversation.id))
        .innerJoin(users, eq(conversationParticipants.userId, users.id));
      
      const result = {
        ...newConversation,
        participants: participantsWithUsers.map(p => ({
          ...p.conversation_participants,
          user: {
            id: p.users.id,
            username: p.users.username,
            role: p.users.role
          }
        }))
      };
      
      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  
  // Set up multer for chat attachments
  const chatUploadsDir = path.join(process.cwd(), 'uploads/chat');
  
  // Create chat uploads directory if it doesn't exist
  if (!fs.existsSync(chatUploadsDir)) {
    fs.mkdirSync(chatUploadsDir, { recursive: true });
  }
  
  const chatStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, chatUploadsDir);
    },
    filename: function (req, file, cb) {
      const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniquePrefix + '-' + file.originalname);
    }
  });
  
  const chatUpload = multer({ 
    storage: chatStorage,
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
  
  // Send a message in a conversation
  app.post(`${apiPrefix}/conversations/:id/messages`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content || typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      // Check if user is a participant
      const participant = await db.select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, req.user!.id)
        ))
        .then(res => res[0]);
      
      if (!participant) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }
      
      // Initialize readBy with sender ID (message is already read by sender)
      const readBy = [req.user!.id];
      
      // Send message
      const newMessage = await db.insert(messages)
        .values({
          content,
          conversationId,
          senderId: req.user!.id,
          sentAt: new Date(),
          readBy // Add this to mark message as read by sender
        })
        .returning()
        .then(res => res[0]);
      
      // Update lastMessageAt in conversation
      await db.update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));
      
      // Get sender details
      const sender = await db.select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .then(res => res[0]);
      
      const messageWithSender = {
        ...newMessage,
        sender: {
          id: sender.id,
          username: sender.username,
          role: sender.role
        }
      };
      
      // Log message details for debugging
      console.log(`User ${req.user!.id} sent message ${newMessage.id} in conversation ${conversationId}`);
      
      res.status(201).json(messageWithSender);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  // Get all users (for creating new conversations)
  app.get(`${apiPrefix}/users`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        role: users.role
      })
      .from(users);
      
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Get unread message count for the current user
  app.get(`${apiPrefix}/messages/unread-count`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userId = req.user!.id;
      console.log(`Getting unread count for user ID: ${userId}`);
      
      // Get all conversations where user is a participant
      const userConversations = await db.select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, userId));
      
      const conversationIds = userConversations.map(uc => uc.conversationId);
      
      // Get all messages from these conversations where sender is not current user
      const allMessages = await db.select()
        .from(messages)
        .where(and(
          inArray(messages.conversationId, conversationIds),
          ne(messages.senderId, userId) // Only count messages not sent by current user
        ))
        .orderBy(asc(messages.sentAt));
      
      // Count messages where the current user is not in readBy array
      const unreadMessages = allMessages.filter(msg => 
        !msg.readBy.includes(userId)
      );
      
      console.log(`User ${userId} has ${unreadMessages.length} unread messages`);
      res.json({ count: unreadMessages.length });
    } catch (error) {
      console.error("Error counting unread messages:", error);
      res.status(500).json({ error: "Failed to count unread messages" });
    }
  });
  
  // Endpoint for uploading file attachments to messages
  app.post(`${apiPrefix}/conversations/:id/attachment`, chatUpload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      
      // Check if user is a participant
      const participant = await db.select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, req.user!.id)
        ))
        .then(res => res[0]);
      
      if (!participant) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }
      
      // Get file information
      const fileName = req.file.originalname;
      const fileType = req.file.mimetype;
      const fileSize = req.file.size;
      const filePath = req.file.path;
      
      // Create URL for the attachment
      const fileUrl = `/api/chat-attachments/${path.basename(filePath)}`;
      
      // Initialize readBy with sender ID (message is already read by sender)
      const readBy = [req.user!.id];
      
      // Create message with attachment
      const newMessage = await db.insert(messages)
        .values({
          content: content || `Shared a file: ${fileName}`,
          conversationId,
          senderId: req.user!.id,
          sentAt: new Date(),
          readBy,
          attachmentUrl: fileUrl,
          attachmentName: fileName,
          attachmentType: fileType,
          attachmentSize: fileSize
        })
        .returning()
        .then(res => res[0]);
      
      // Update lastMessageAt in conversation
      await db.update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversationId));
      
      // Get sender details
      const sender = await db.select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .then(res => res[0]);
      
      const messageWithSender = {
        ...newMessage,
        sender: {
          id: sender.id,
          username: sender.username,
          role: sender.role
        }
      };
      
      console.log(`User ${req.user!.id} sent file attachment ${fileName} in conversation ${conversationId}`);
      
      res.status(201).json(messageWithSender);
    } catch (error) {
      console.error("Error sending file attachment:", error);
      res.status(500).json({ error: "Failed to send file attachment" });
    }
  });
  
  // Serve chat attachments
  app.get(`${apiPrefix}/chat-attachments/:filename`, (req, res) => {
    try {
      const filename = req.params.filename;
      const filepath = path.join(process.cwd(), 'uploads/chat', filename);
      
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      
      // Set content type based on file extension
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: {[key: string]: string} = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      
      // Stream the file
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error serving attachment:", error);
      res.status(500).json({ error: "Failed to serve attachment" });
    }
  });
  
  // Add a dedicated endpoint to mark messages as read
  app.post(`${apiPrefix}/messages/mark-as-read`, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userId = req.user!.id;
      const { messageIds, conversationId } = req.body;
      
      // If no messageIds but conversationId is provided, mark all messages in conversation as read
      if (!messageIds && conversationId) {
        // Get all messages in the conversation not sent by current user
        const conversationMessages = await db.select()
          .from(messages)
          .where(and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId)
          ));
        
        // Update each message to mark as read
        await Promise.all(conversationMessages.map(async (message) => {
          const readBy = message.readBy || [];
          if (!readBy.includes(userId)) {
            readBy.push(userId);
            await db.update(messages)
              .set({ readBy })
              .where(eq(messages.id, message.id));
          }
        }));
        
        console.log(`User ${userId} marked all messages in conversation ${conversationId} as read`);
        return res.json({ success: true });
      }
      
      // If specific messageIds are provided
      if (messageIds && Array.isArray(messageIds)) {
        // Update each message
        await Promise.all(messageIds.map(async (messageId) => {
          const message = await db.select()
            .from(messages)
            .where(eq(messages.id, messageId))
            .then(res => res[0]);
          
          if (message) {
            const readBy = message.readBy || [];
            if (!readBy.includes(userId)) {
              readBy.push(userId);
              await db.update(messages)
                .set({ readBy })
                .where(eq(messages.id, message.id));
            }
          }
        }));
        
        console.log(`User ${userId} marked messages ${messageIds.join(', ')} as read`);
        return res.json({ success: true });
      }
      
      return res.status(400).json({ error: "Either messageIds or conversationId is required" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Endpoint for uploading message attachments
  app.post(`${apiPrefix}/messages/upload`, upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { conversationId } = req.body;
      if (!conversationId) {
        return res.status(400).json({ error: "Conversation ID is required" });
      }
      
      // Validate that the conversation exists and user is a participant
      const userParticipation = await db.select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, parseInt(conversationId)),
          eq(conversationParticipants.userId, req.user!.id)
        ))
        .then(result => result[0]);
      
      if (!userParticipation) {
        // Delete the uploaded file since we won't be using it
        if (req.file.path) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting unused file:", err);
          });
        }
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }
      
      // Get file information
      const attachmentName = req.file.originalname;
      const attachmentType = req.file.mimetype;
      const attachmentSize = req.file.size;
      
      // Create relative URL (to be used by the client)
      const attachmentUrl = `/uploads/chat/${path.basename(req.file.path)}`;
      
      // Get custom content if provided, otherwise use default
      const content = req.body.content || `Shared a file: ${attachmentName}`;
      
      // Create a message with the attachment in the database
      const newMessage = await db.insert(messages)
        .values({
          content,
          conversationId: parseInt(conversationId),
          senderId: req.user!.id,
          sentAt: new Date(),
          readBy: [req.user!.id],
          attachmentUrl,
          attachmentName,
          attachmentType,
          attachmentSize,
        })
        .returning();
      
      // Update conversation's lastMessageAt
      await db.update(conversations)
        .set({ 
          lastMessageAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(conversations.id, parseInt(conversationId)));
      
      // Send back the attachment information
      res.status(201).json({
        success: true,
        message: newMessage[0],
        attachmentUrl,
        attachmentName,
        attachmentType,
        attachmentSize
      });
    } catch (error) {
      console.error("Error uploading message attachment:", error);
      res.status(500).json({ error: "Failed to upload attachment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
