import { db } from "@db";
import session from "express-session";
import { pool } from "@db";
import createMemoryStore from "memorystore";
import fs from "fs";
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
  pdfVersions,
  pdfAnnotations,
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
  insertPdfVersionSchema,
  insertPdfAnnotationSchema,
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
  InsertCalendarEvent,
  PdfVersion,
  PdfAnnotation
} from "@shared/schema";
import { eq, and, or, isNull, gte, lte, desc } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id">): Promise<User>;
  
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
  deleteFile(id: number): Promise<{ success: boolean, filePath: string | null }>;
  getRecentFiles(projectId: number, limit?: number): Promise<File[]>;
  
  // PDF Handling
  getPDFVersions(fileId: number): Promise<PdfVersion[]>;
  getPDFVersion(versionId: number): Promise<PdfVersion | undefined>;
  createPDFVersion(version: Omit<PdfVersion, "id" | "uploadedAt">): Promise<PdfVersion>;
  getPDFAnnotations(versionId: number): Promise<PdfAnnotation[]>;
  getPDFAnnotation(annotationId: number): Promise<PdfAnnotation | undefined>;
  createPDFAnnotation(annotation: Omit<PdfAnnotation, "id" | "createdAt">): Promise<PdfAnnotation>;
  updatePDFAnnotation(id: number, annotation: Partial<PdfAnnotation>): Promise<PdfAnnotation>;
  deletePDFAnnotation(id: number): Promise<{ success: boolean, versionId: number }>;
  
  // Tasks
  getTasks(projectId: number): Promise<Task[]>;
  getTasksAssignedToUser(userId: number): Promise<Task[]>;
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
  getTimeEntries(userId: number, projectId?: number, taskId?: number, startDate?: Date, endDate?: Date): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: Omit<TimeEntry, "id" | "createdAt">): Promise<TimeEntry>;
  deleteTimeEntry(id: number): Promise<void>;
  getProjectTimeEntries(projectId: number): Promise<TimeEntry[]>;
  
  // User Projects (Roles)
  assignUserToProject(userProject: Omit<UserProject, "id">): Promise<UserProject>;
  getProjectMembers(projectId: number): Promise<{ id: number; username: string }[]>;
  
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
  sessionStore: any; // Change from session.SessionStore to any to resolve type issues

  // Använd den vanliga MemoryStore från memorystore
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
  
  // PDF handling methods
  async getPDFVersions(fileId: number): Promise<PdfVersion[]> {
    return await db
      .select()
      .from(pdfVersions)
      .where(eq(pdfVersions.fileId, fileId))
      .orderBy(pdfVersions.versionNumber);
  }
  
  async getPDFVersion(versionId: number): Promise<PdfVersion | undefined> {
    const result = await db.select().from(pdfVersions).where(eq(pdfVersions.id, versionId));
    return result[0];
  }
  
  async createPDFVersion(version: Omit<PdfVersion, "id" | "uploadedAt">): Promise<PdfVersion> {
    const validatedData = insertPdfVersionSchema.parse({
      ...version,
      uploadedAt: new Date()
    });
    const result = await db.insert(pdfVersions).values(validatedData).returning();
    return result[0];
  }
  
  async getPDFAnnotations(versionId: number): Promise<PdfAnnotation[]> {
    return await db
      .select()
      .from(pdfAnnotations)
      .where(eq(pdfAnnotations.pdfVersionId, versionId));
  }
  
  async getPDFAnnotation(annotationId: number): Promise<PdfAnnotation | undefined> {
    const result = await db.select().from(pdfAnnotations).where(eq(pdfAnnotations.id, annotationId));
    return result[0];
  }
  
  async createPDFAnnotation(annotation: Omit<PdfAnnotation, "id" | "createdAt">): Promise<PdfAnnotation> {
    console.log("createPDFAnnotation: Sparar ny annotation med data:", JSON.stringify(annotation, null, 2));
    
    // Förbereder data för validering
    let annotationData = { ...annotation };
    
    // Garantera att assignedTo existerar som ett giltigt värde
    if (annotationData.assignedTo === undefined) {
      annotationData.assignedTo = null;
    }
    
    // Säkerställ att taskId är ett tal eller null, inte undefined
    if (annotationData.taskId === undefined) {
      annotationData.taskId = null;
    } else if (typeof annotationData.taskId === 'string' && !isNaN(parseInt(annotationData.taskId))) {
      // Om taskId är en sträng med ett tal, konvertera till nummer
      annotationData.taskId = parseInt(annotationData.taskId);
    }
    
    // Konvertera deadline string till Date-objekt om den finns
    if (typeof annotationData.deadline === 'string') {
      annotationData.deadline = new Date(annotationData.deadline);
    }
    
    console.log("createPDFAnnotation: Förberedd data:", JSON.stringify(annotationData, null, 2));
    
    // Validera och skapa
    const validatedData = insertPdfAnnotationSchema.parse({
      ...annotationData,
      createdAt: new Date()
    });
    
    const result = await db.insert(pdfAnnotations).values(validatedData).returning();
    console.log("createPDFAnnotation: Sparad annotation:", JSON.stringify(result[0], null, 2));
    return result[0];
  }
  
  async updatePDFAnnotation(id: number, annotation: Partial<PdfAnnotation>): Promise<PdfAnnotation> {
    console.log("updatePDFAnnotation: Uppdaterar annotation", id, "med data:", JSON.stringify(annotation, null, 2));
    
    // Hanterar deadline och taskId
    let updateData = { ...annotation };
    
    // Konvertera deadline sträng till Date-objekt om den finns
    if (typeof annotation.deadline === 'string') {
      updateData.deadline = new Date(annotation.deadline);
    }
    
    // Säkerställ att taskId är ett tal eller null, inte undefined
    if (annotation.taskId === undefined) {
      updateData.taskId = null;
    } else if (typeof annotation.taskId === 'string' && !isNaN(parseInt(annotation.taskId))) {
      // Om taskId är en sträng med ett tal, konvertera till nummer
      updateData.taskId = parseInt(annotation.taskId);
    }
    
    console.log("updatePDFAnnotation: Förberedd data:", JSON.stringify(updateData, null, 2));
    
    const result = await db
      .update(pdfAnnotations)
      .set(updateData)
      .where(eq(pdfAnnotations.id, id))
      .returning();
      
    console.log("updatePDFAnnotation: Uppdaterad annotation:", JSON.stringify(result[0], null, 2));
    return result[0];
  }
  
  async deletePDFAnnotation(id: number): Promise<{ success: boolean, versionId: number }> {
    // First get the version ID so we can return it after deletion
    const annotation = await this.getPDFAnnotation(id);
    if (!annotation) {
      throw new Error(`Annotation with ID ${id} not found`);
    }
    
    const versionId = annotation.pdfVersionId;
    
    await db
      .delete(pdfAnnotations)
      .where(eq(pdfAnnotations.id, id));
    
    return { success: true, versionId };
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

  async createUser(user: Omit<User, "id">): Promise<User> {
    const validatedData = insertUserSchema.parse(user);
    // Make sure role is set to a default if not provided
    const result = await db.insert(users).values({
      ...validatedData,
      role: user.role || "user", // Använd angiven roll eller "user" som standard
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      email: user.email || null
    }).returning();
    return result[0];
  }

  // Projects methods
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async getUserProjects(userId: number): Promise<(Project & { role: string })[]> {
    // Först, kontrollera om användaren finns och vilken roll
    const user = await this.getUser(userId);
    
    if (!user) {
      console.log(`User with ID ${userId} not found in getUserProjects`);
      return [];
    }
    
    console.log(`Fetching projects for user ${userId} with role ${user.role}`);
    
    if (user.role === "admin") {
      // Admin: Hämta alla projekt och sätt rollen till admin för alla
      console.log("User is admin, fetching all projects");
      const allProjects = await db
        .select()
        .from(projects);
        
      return allProjects.map(project => ({
        ...project,
        role: "admin"
      }));
    } else if (user.role === "project_leader") {
      // Project_leader: Hämta alla projekt där användaren är medlem, men också kolla userProjects för specifika projektroller
      console.log("User is project_leader, fetching assigned projects");
      const result = await db
        .select({
          ...projects,
          role: userProjects.role
        })
        .from(projects)
        .innerJoin(userProjects, eq(projects.id, userProjects.projectId))
        .where(eq(userProjects.userId, userId));
      
      return result;
    } else {
      // Normal användare: Hämta bara projekt där användaren är medlem
      console.log("User is a regular user, fetching assigned projects");
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
    console.log(`storage.getFolders: Hämtar mappar för projekt ${projectId}`);
    
    if (!projectId || isNaN(projectId)) {
      console.error('storage.getFolders: Ogiltigt projektID:', projectId);
      return [];
    }
    
    try {
      const folderList = await db
        .select()
        .from(folders)
        .where(eq(folders.projectId, projectId));
      
      console.log(`storage.getFolders: Hittade ${folderList.length} mappar för projekt ${projectId}`);
      
      // Dubbelkontrollera att alla hämtade mappar faktiskt tillhör detta projekt
      const filteredList = folderList.filter(folder => {
        if (folder.projectId !== projectId) {
          console.error(`storage.getFolders: VARNING - Mapp ${folder.id} tillhör projekt ${folder.projectId}, inte begärt projekt ${projectId}`);
          return false;
        }
        return true;
      });
      
      if (filteredList.length !== folderList.length) {
        console.error(`storage.getFolders: Filtrerade bort ${folderList.length - filteredList.length} mappar som inte tillhör projekt ${projectId}`);
      }
      
      return filteredList;
    } catch (error) {
      console.error('storage.getFolders: Fel vid hämtning av mappar:', error);
      return [];
    }
  }

  async createFolder(folder: Omit<Folder, "id">): Promise<Folder> {
    console.log(`createFolder: Skapar mapp "${folder.name}" med föräldermapp: ${folder.parentId || 'ingen (rot)'} i projekt ${folder.projectId}`);
    
    // Om föräldermapp-ID finns, verifiera att den finns i databasen
    if (folder.parentId) {
      // Kontrollera om föräldermapp-ID finns i databasen
      const parentFolder = await db.select()
        .from(folders)
        .where(eq(folders.id, folder.parentId))
        .limit(1);
      
      // Om föräldermappen inte finns, sätt parentId till null
      if (parentFolder.length === 0) {
        console.log(`Varning: Föräldermapp med ID ${folder.parentId} finns inte, sätter parentId till null`);
        folder.parentId = null;
      } else {
        console.log(`Föräldermapp hittad: ${parentFolder[0].name} (ID: ${parentFolder[0].id})`);
      }
    }
    
    const validatedData = insertFolderSchema.parse(folder);
    console.log("createFolder: Validerad data:", JSON.stringify(validatedData, null, 2));
    
    const result = await db.insert(folders).values(validatedData).returning();
    console.log(`createFolder: Skapad mapp: ID=${result[0].id}, name=${result[0].name}, parentId=${result[0].parentId || 'null'}`);
    
    return result[0];
  }
  
  async deleteFolder(folderId: number): Promise<{ success: boolean }> {
    try {
      // Först hämta alla filer i denna mapp för att kunna radera dem
      const folderFiles = await db
        .select()
        .from(files)
        .where(eq(files.folderId, folderId));
      
      // Radera alla filer från databasen
      if (folderFiles.length > 0) {
        await db
          .delete(files)
          .where(eq(files.folderId, folderId));
      }

      // Ta bort mappar rekursivt - först ta reda på alla undermappar
      const subFolders = await db
        .select()
        .from(folders)
        .where(eq(folders.parentId, folderId));
      
      // Radera undermappar rekursivt
      for (const subFolder of subFolders) {
        await this.deleteFolder(subFolder.id);
      }
      
      // Slutligen radera själva mappen
      await db
        .delete(folders)
        .where(eq(folders.id, folderId));
      
      return { success: true };
    } catch (error) {
      console.error("Error deleting folder:", error);
      return { success: false };
    }
  }

  // Ny funktion för att hämta rotfiler (filer utan mapp)
  async getRootFiles(projectId: number): Promise<File[]> {
    console.log(`storage.getRootFiles: Hämtar rotfiler för projekt ${projectId}`);
    
    if (!projectId || isNaN(projectId)) {
      console.error('storage.getRootFiles: Ogiltigt projektID:', projectId);
      return [];
    }
    
    try {
      // I förberedning för tillgång till kolumner som använder snake_case (i databasen) istället för camelCase
      const projectIdColumn = 'project_id';
      const folderIdColumn = 'folder_id';
      
      const fileList = await db.query.files.findMany({
        where: and(
          eq(files.projectId, projectId),
          isNull(files.folderId)
        )
      });
      
      console.log(`storage.getRootFiles: Hittade ${fileList.length} rotfiler för projekt ${projectId}`);
      return fileList;
    } catch (error) {
      console.error("Error fetching root files:", error);
      return [];
    }
  }

  // Funktion för att hämta filer för en specifik mapp
  async getFilesByFolder(projectId: number, folderId: number): Promise<File[]> {
    console.log(`storage.getFilesByFolder: Hämtar filer för projekt ${projectId} och mapp ${folderId}`);
    
    if (!projectId || isNaN(projectId) || !folderId || isNaN(folderId)) {
      console.error('storage.getFilesByFolder: Ogiltigt projekt-ID eller mapp-ID');
      return [];
    }
    
    try {
      const fileList = await db.query.files.findMany({
        where: and(
          eq(files.projectId, projectId),
          eq(files.folderId, folderId)
        )
      });
      
      console.log(`storage.getFilesByFolder: Hittade ${fileList.length} filer i mapp ${folderId} för projekt ${projectId}`);
      return fileList;
    } catch (error) {
      console.error("Error fetching files by folder:", error);
      return [];
    }
  }

  // Funktion för att hämta alla filer i ett projekt
  async getFilesByProject(projectId: number): Promise<File[]> {
    console.log(`storage.getFilesByProject: Hämtar alla filer för projekt ${projectId}`);
    
    if (!projectId || isNaN(projectId)) {
      console.error('storage.getFilesByProject: Ogiltigt projektID:', projectId);
      return [];
    }
    
    try {
      const fileList = await db.query.files.findMany({
        where: eq(files.projectId, projectId)
      });
      
      console.log(`storage.getFilesByProject: Hittade ${fileList.length} filer för projekt ${projectId}`);
      return fileList;
    } catch (error) {
      console.error("Error fetching all project files:", error);
      return [];
    }
  }
  
  // Funktion för att hämta de senaste filerna för ett projekt
  async getRecentFiles(projectId: number, limit: number = 10): Promise<File[]> {
    console.log(`storage.getRecentFiles: Hämtar de ${limit} senaste filerna för projekt ${projectId}`);
    
    if (!projectId || isNaN(projectId)) {
      console.error('storage.getRecentFiles: Ogiltigt projektID:', projectId);
      return [];
    }
    
    try {
      const fileList = await db.query.files.findMany({
        where: eq(files.projectId, projectId),
        orderBy: [desc(files.uploadDate)],
        limit: limit
      });
      
      console.log(`storage.getRecentFiles: Hittade ${fileList.length} senaste filer för projekt ${projectId}`);
      return fileList;
    } catch (error) {
      console.error("Error fetching recent files for project:", error);
      return [];
    }
  }

  async getFiles(projectId: number, folderId?: number, allProjectFiles: boolean = false): Promise<File[]> {
    console.log(`storage.getFiles: Hämtar filer för projekt ${projectId}${folderId ? ` och mapp ${folderId}` : ''}${allProjectFiles ? ' (alla projektfiler)' : ''}`);
    
    if (!projectId || isNaN(projectId)) {
      console.error('storage.getFiles: Ogiltigt projektID:', projectId);
      return [];
    }
    
    try {
      if (allProjectFiles) {
        // Om allProjectFiles är true, hämta alla filer för projektet oavsett mapp
        return this.getFilesByProject(projectId);
      } else if (folderId !== undefined) {
        // Om folderId är angivet, hämta bara filer för den specifika mappen
        return this.getFilesByFolder(projectId, folderId);
      } else {
        // Om ingen folderId och inte allProjectFiles, hämta bara rotfiler (utan mapp)
        return this.getRootFiles(projectId);
      }
    } catch (error) {
      console.error('storage.getFiles: Fel vid hämtning av filer:', error);
      return [];
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
  
  async deleteFile(id: number): Promise<{ success: boolean, filePath: string | null }> {
    try {
      // Get the file to retrieve the file path before deletion
      const fileToDelete = await this.getFile(id);
      
      if (!fileToDelete) {
        return { success: false, filePath: null };
      }
      
      // Hämta alla versioner av filen
      const versions = await db.select()
        .from(pdfVersions)
        .where(eq(pdfVersions.fileId, id));
      
      // Ta bort alla annotationer för varje version
      for (const version of versions) {
        await db.delete(pdfAnnotations)
          .where(eq(pdfAnnotations.pdfVersionId, version.id));
          
        // Ta bort fysiska filen om den finns
        if (version.filePath && fs.existsSync(version.filePath)) {
          try {
            fs.unlinkSync(version.filePath);
          } catch (err) {
            console.error(`Kunde inte ta bort filen: ${version.filePath}`, err);
            // Fortsätt oavsett om filen inte kunde tas bort
          }
        }
      }
      
      // Ta bort alla versioner
      await db.delete(pdfVersions)
        .where(eq(pdfVersions.fileId, id));
      
      // Delete the file record
      await db.delete(files).where(eq(files.id, id));
      
      return { success: true, filePath: fileToDelete.filePath };
    } catch (error) {
      console.error("Error deleting file:", error);
      return { success: false, filePath: null };
    }
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
  
  async getTasksAssignedToUser(userId: number): Promise<Task[]> {
    console.log(`Hämtar uppgifter tilldelade till användare ${userId}`);
    
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.assigneeId, userId));
    
    console.log(`Hittade ${result.length} uppgifter för användare ${userId}`);
    
    if (result.length > 0) {
      console.log("Exempel på uppgift:", {
        id: result[0].id,
        title: result[0].title,
        status: result[0].status,
        assigneeId: result[0].assigneeId,
        type: result[0].type
      });
    }
    
    // Statuskarta för Gantt-specifika statusvärden
    const statusMap = {
      "New": "todo", // Mappa 'New' till todo/backlog
      "Ongoing": "in_progress", // Mappa 'Ongoing' till in_progress
      "Completed": "done", // Mappa 'Completed' till done
      "Delayed": "todo" // Mappa 'Delayed' till backlog/todo
    };
    
    // Process dependencies as JSON for the frontend and standardize status values
    return result.map(task => {
      let processedTask = { ...task };
      
      // Standardisera Gantt-specifika statusvärden
      if (processedTask.status && statusMap[processedTask.status as keyof typeof statusMap]) {
        processedTask.status = statusMap[processedTask.status as keyof typeof statusMap];
        console.log(`Konverterade Gantt-status '${task.status}' till '${processedTask.status}' för uppgift ${task.id}`);
      }
      
      // Parsa dependencies JSON-sträng till array
      if (processedTask.dependencies) {
        try {
          const deps = JSON.parse(processedTask.dependencies);
          processedTask.dependencies = deps;
        } catch (e) {
          console.error("Error parsing task dependencies:", e);
          processedTask.dependencies = [];
        }
      } else {
        processedTask.dependencies = [];
      }
      
      return processedTask;
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
  
  async deleteTask(id: number): Promise<boolean> {
    try {
      // Kontrollera om uppgiften är kopplad till en PDF-annotering
      const relatedAnnotation = await db.query.pdfAnnotations.findFirst({
        where: eq(pdfAnnotations.taskId, id)
      });
      
      // Om det finns en kopplad annotation, sätt bara taskId till null
      if (relatedAnnotation) {
        await db.update(pdfAnnotations)
          .set({ taskId: null })
          .where(eq(pdfAnnotations.taskId, id));
      }
      
      // Ta bort relaterade tidsregistreringar
      await db.delete(taskTimeEntries)
        .where(eq(taskTimeEntries.taskId, id));
      
      // Ta bort relaterade kommentarer
      await db.delete(comments)
        .where(eq(comments.taskId, id));
      
      // Ta bort själva uppgiften
      const result = await db.delete(tasks)
        .where(eq(tasks.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting task:", error);
      return false;
    }
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

  // Tidsrapportering metoder
  async getTimeEntries(
    userId: number, 
    projectId?: number, 
    taskId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<TimeEntry[]> {
    let query = db.select().from(taskTimeEntries);
    
    // Lägg till grundläggande filter för användare
    query = query.where(eq(taskTimeEntries.userId, userId));
    
    // Lägg till projektfilter om det finns
    if (projectId) {
      query = query.where(eq(taskTimeEntries.projectId, projectId));
    }
    
    // Lägg till uppgiftsfilter om det finns
    if (taskId) {
      query = query.where(eq(taskTimeEntries.taskId, taskId));
    }
    
    // Lägg till datumfilter om de finns
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(taskTimeEntries.reportDate, startDate),
          lte(taskTimeEntries.reportDate, endDate)
        )
      );
    } else if (startDate) {
      query = query.where(gte(taskTimeEntries.reportDate, startDate));
    } else if (endDate) {
      query = query.where(lte(taskTimeEntries.reportDate, endDate));
    }
    
    // Sortera efter rapportdatum (nyaste först)
    query = query.orderBy(desc(taskTimeEntries.reportDate));
    
    return await query;
  }

  async createTimeEntry(timeEntry: Omit<TimeEntry, "id" | "createdAt">): Promise<TimeEntry> {
    const validatedData = insertTimeEntrySchema.parse({
      ...timeEntry,
      createdAt: new Date()
    });
    const result = await db.insert(taskTimeEntries).values(validatedData).returning();
    return result[0];
  }
  
  async deleteTimeEntry(id: number): Promise<void> {
    await db.delete(taskTimeEntries).where(eq(taskTimeEntries.id, id));
  }
  
  async getProjectTimeEntries(projectId: number): Promise<TimeEntry[]> {
    return await db
      .select()
      .from(taskTimeEntries)
      .where(eq(taskTimeEntries.projectId, projectId))
      .orderBy(desc(taskTimeEntries.reportDate));
  }

  // User Projects (Roles) methods
  async assignUserToProject(userProject: Omit<UserProject, "id">): Promise<UserProject> {
    const validatedData = insertUserProjectSchema.parse(userProject);
    const result = await db.insert(userProjects).values(validatedData).returning();
    return result[0];
  }
  
  async getProjectMembers(projectId: number): Promise<{ id: number; username: string }[]> {
    const result = await db
      .select({
        id: users.id,
        username: users.username
      })
      .from(users)
      .innerJoin(userProjects, eq(users.id, userProjects.userId))
      .where(eq(userProjects.projectId, projectId));
    
    return result;
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
