import { db } from "@db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";
import { 
  users, 
  files, 
  folders, 
  tasks, 
  comments, 
  projects, 
  wikiPages,
  taskTimeEntries,
  userProjects,
  calendarEvents,
  insertUserSchema,
  insertFileSchema,
  insertFolderSchema,
  insertTaskSchema,
  insertCommentSchema,
  insertProjectSchema,
  insertWikiPageSchema,
  insertTimeEntrySchema,
  insertUserProjectSchema,
  insertCalendarEventSchema,
  User,
  File,
  Folder,
  Task,
  Comment,
  Project,
  WikiPage,
  TimeEntry,
  UserProject,
  CalendarEvent,
  InsertCalendarEvent
} from "@shared/schema";
import { eq, and, or, isNull } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "role">): Promise<User>;
  
  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getUserProjects(userId: number): Promise<(Project & { role: string })[]>;
  createProject(project: Omit<Project, "id">): Promise<Project>;
  
  // Files & Folders
  getFolders(projectId: number): Promise<Folder[]>;
  createFolder(folder: Omit<Folder, "id">): Promise<Folder>;
  getFiles(projectId: number, folderId?: number): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: Omit<File, "id" | "uploadDate">): Promise<File>;
  
  // Tasks
  getTasks(projectId: number): Promise<Task[]>;
  createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task>;
  
  // Comments
  getComments(fileId?: number, taskId?: number): Promise<Comment[]>;
  createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment>;
  
  // Wiki
  getWikiPages(projectId: number): Promise<WikiPage[]>;
  getWikiPage(id: number): Promise<WikiPage | undefined>;
  createWikiPage(wikiPage: Omit<WikiPage, "id" | "createdAt" | "updatedAt">): Promise<WikiPage>;
  updateWikiPage(id: number, wikiPage: Partial<WikiPage>): Promise<WikiPage>;
  
  // Time Tracking
  getTimeEntries(userId: number, taskId?: number): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: Omit<TimeEntry, "id">): Promise<TimeEntry>;
  
  // User Projects (Roles)
  assignUserToProject(userProject: Omit<UserProject, "id">): Promise<UserProject>;
  
  // Calendar Events
  getCalendarEvents(userId: number, projectId?: number): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;
  
  // Session store
  sessionStore: session.SessionStore;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Auth methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: Omit<User, "id" | "role">): Promise<User> {
    const validatedData = insertUserSchema.parse(user);
    const result = await db.insert(users).values({
      ...validatedData,
      role: "user" // Default role is "user"
    }).returning();
    return result[0];
  }

  // Projects methods
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async getUserProjects(userId: number): Promise<(Project & { role: string })[]> {
    const result = await db
      .select({
        ...projects,
        role: userProjects.role
      })
      .from(projects)
      .innerJoin(userProjects, eq(projects.id, userProjects.projectId))
      .where(eq(userProjects.userId, userId));
    
    return result;
  }

  async createProject(project: Omit<Project, "id">): Promise<Project> {
    const validatedData = insertProjectSchema.parse(project);
    const result = await db.insert(projects).values(validatedData).returning();
    
    // Automatically assign creator as project leader
    await this.assignUserToProject({
      userId: project.createdById,
      projectId: result[0].id,
      role: "project_leader"
    });
    
    return result[0];
  }

  // Files & Folders methods
  async getFolders(projectId: number): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .where(eq(folders.projectId, projectId));
  }

  async createFolder(folder: Omit<Folder, "id">): Promise<Folder> {
    const validatedData = insertFolderSchema.parse(folder);
    const result = await db.insert(folders).values(validatedData).returning();
    return result[0];
  }

  async getFiles(projectId: number, folderId?: number): Promise<File[]> {
    if (folderId) {
      return await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.projectId, projectId),
            eq(files.folderId, folderId)
          )
        );
    } else {
      return await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.projectId, projectId),
            isNull(files.folderId)
          )
        );
    }
  }

  async getFile(id: number): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id));
    return result[0];
  }

  async createFile(file: Omit<File, "id" | "uploadDate">): Promise<File> {
    const validatedData = insertFileSchema.parse({
      ...file,
      uploadDate: new Date()
    });
    const result = await db.insert(files).values(validatedData).returning();
    return result[0];
  }

  // Tasks methods
  async getTasks(projectId: number): Promise<Task[]> {
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    
    // Process dependencies as JSON for the frontend
    return result.map(task => {
      if (task.dependencies) {
        try {
          // Parse the dependencies JSON string into an array
          const deps = JSON.parse(task.dependencies);
          return {
            ...task,
            dependencies: deps
          };
        } catch (e) {
          console.error("Error parsing task dependencies:", e);
        }
      }
      return {
        ...task,
        dependencies: []
      };
    });
  }

  async createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task> {
    // Handle dependencies - convert array to JSON string
    let processedTask = { ...task };
    if (task.dependencies && Array.isArray(task.dependencies)) {
      processedTask.dependencies = JSON.stringify(task.dependencies);
    }
    
    const validatedData = insertTaskSchema.parse({
      ...processedTask,
      createdAt: new Date()
    });
    
    const result = await db.insert(tasks).values(validatedData).returning();
    const createdTask = result[0];
    
    // Convert JSON string back to array for the response
    if (createdTask.dependencies) {
      try {
        return {
          ...createdTask,
          dependencies: JSON.parse(createdTask.dependencies)
        };
      } catch (e) {
        console.error("Error parsing task dependencies:", e);
      }
    }
    
    return {
      ...createdTask,
      dependencies: []
    };
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    // Handle dependencies - convert array to JSON string
    let processedTask = { ...task };
    if (task.dependencies && Array.isArray(task.dependencies)) {
      processedTask.dependencies = JSON.stringify(task.dependencies);
    }
    
    const result = await db
      .update(tasks)
      .set(processedTask)
      .where(eq(tasks.id, id))
      .returning();
    
    const updatedTask = result[0];
    
    // Convert JSON string back to array for the response
    if (updatedTask.dependencies) {
      try {
        return {
          ...updatedTask,
          dependencies: JSON.parse(updatedTask.dependencies)
        };
      } catch (e) {
        console.error("Error parsing task dependencies:", e);
      }
    }
    
    return {
      ...updatedTask,
      dependencies: []
    };
  }

  // Comments methods
  async getComments(fileId?: number, taskId?: number): Promise<Comment[]> {
    if (!fileId && !taskId) {
      throw new Error("Either fileId or taskId must be provided");
    }

    if (fileId) {
      return await db
        .select()
        .from(comments)
        .where(eq(comments.fileId, fileId))
        .orderBy(comments.createdAt);
    } else {
      return await db
        .select()
        .from(comments)
        .where(eq(comments.taskId, taskId!))
        .orderBy(comments.createdAt);
    }
  }

  async createComment(comment: Omit<Comment, "id" | "createdAt">): Promise<Comment> {
    const validatedData = insertCommentSchema.parse({
      ...comment,
      createdAt: new Date()
    });
    const result = await db.insert(comments).values(validatedData).returning();
    return result[0];
  }

  // Wiki methods
  async getWikiPages(projectId: number): Promise<WikiPage[]> {
    return await db
      .select()
      .from(wikiPages)
      .where(eq(wikiPages.projectId, projectId));
  }

  async getWikiPage(id: number): Promise<WikiPage | undefined> {
    const result = await db.select().from(wikiPages).where(eq(wikiPages.id, id));
    return result[0];
  }

  async createWikiPage(wikiPage: Omit<WikiPage, "id" | "createdAt" | "updatedAt">): Promise<WikiPage> {
    const now = new Date();
    const validatedData = insertWikiPageSchema.parse({
      ...wikiPage,
      createdAt: now,
      updatedAt: now
    });
    const result = await db.insert(wikiPages).values(validatedData).returning();
    return result[0];
  }

  async updateWikiPage(id: number, wikiPage: Partial<WikiPage>): Promise<WikiPage> {
    const result = await db
      .update(wikiPages)
      .set({
        ...wikiPage,
        updatedAt: new Date()
      })
      .where(eq(wikiPages.id, id))
      .returning();
    
    return result[0];
  }

  // Time Tracking methods
  async getTimeEntries(userId: number, taskId?: number): Promise<TimeEntry[]> {
    if (taskId) {
      return await db
        .select()
        .from(taskTimeEntries)
        .where(
          and(
            eq(taskTimeEntries.userId, userId),
            eq(taskTimeEntries.taskId, taskId)
          )
        );
    } else {
      return await db
        .select()
        .from(taskTimeEntries)
        .where(eq(taskTimeEntries.userId, userId));
    }
  }

  async createTimeEntry(timeEntry: Omit<TimeEntry, "id">): Promise<TimeEntry> {
    const validatedData = insertTimeEntrySchema.parse(timeEntry);
    const result = await db.insert(taskTimeEntries).values(validatedData).returning();
    return result[0];
  }

  // User Projects (Roles) methods
  async assignUserToProject(userProject: Omit<UserProject, "id">): Promise<UserProject> {
    const validatedData = insertUserProjectSchema.parse(userProject);
    const result = await db.insert(userProjects).values(validatedData).returning();
    return result[0];
  }

  // Calendar Events methods
  async getCalendarEvents(userId: number, projectId?: number): Promise<CalendarEvent[]> {
    let query = db.select().from(calendarEvents);

    if (projectId) {
      query = query.where(
        and(
          eq(calendarEvents.createdBy, userId),
          eq(calendarEvents.projectId, projectId)
        )
      );
    } else {
      query = query.where(eq(calendarEvents.createdBy, userId));
    }

    return await query;
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const result = await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.id, id));
    return result[0];
  }

  async createCalendarEvent(event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">): Promise<CalendarEvent> {
    const now = new Date();
    const validatedData = insertCalendarEventSchema.parse({
      ...event,
      createdAt: now,
      updatedAt: now
    });
    
    const result = await db
      .insert(calendarEvents)
      .values(validatedData)
      .returning();
      
    return result[0];
  }

  async updateCalendarEvent(id: number, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const result = await db
      .update(calendarEvents)
      .set({
        ...event,
        updatedAt: new Date()
      })
      .where(eq(calendarEvents.id, id))
      .returning();
      
    return result[0];
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id));
  }
}

// Create and export a singleton instance
export const storage = new DatabaseStorage();
