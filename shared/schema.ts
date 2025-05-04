import { pgTable, text, serial, integer, boolean, timestamp, date, time, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Define role enum for users
export const userRoleEnum = pgEnum('user_role', ['admin', 'project_leader', 'user']);

// Define task status enum
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'review', 'done']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default('user'),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User to Projects many-to-many relationship with roles
export const userProjects = pgTable("user_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  role: text("role").notNull(), // admin, project_leader, user
});

// Folders table
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  parentId: integer("parent_id").references(() => folders.id),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
});

// Files table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  folderId: integer("folder_id").references(() => folders.id),
  uploadedById: integer("uploaded_by_id").references(() => users.id).notNull(),
  uploadDate: timestamp("upload_date").notNull(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default('todo'),
  priority: text("priority"),
  type: text("type"),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  assigneeId: integer("assignee_id").references(() => users.id),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull(),
  dueDate: date("due_date"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  dependencies: text("dependencies"), // JSON string array of task IDs this task depends on
});

// Time entries for tasks
export const taskTimeEntries = pgTable("task_time_entries", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Duration in minutes
  notes: text("notes"),
});

// Comments for files or tasks
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  fileId: integer("file_id").references(() => files.id),
  taskId: integer("task_id").references(() => tasks.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull(),
});

// Wiki pages
export const wikiPages = pgTable("wiki_pages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  parentId: integer("parent_id").references(() => wikiPages.id),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  updatedById: integer("updated_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Define table relationships
export const usersRelations = relations(users, ({ many }) => ({
  createdProjects: many(projects),
  userProjects: many(userProjects),
  createdTasks: many(tasks, { relationName: 'createdTasks' }),
  assignedTasks: many(tasks, { relationName: 'assignedTasks' }),
  timeEntries: many(taskTimeEntries),
  comments: many(comments),
  createdFolders: many(folders),
  uploadedFiles: many(files),
  createdWikiPages: many(wikiPages, { relationName: 'createdWikiPages' }),
  updatedWikiPages: many(wikiPages, { relationName: 'updatedWikiPages' }),
  calendarEvents: many(calendarEvents),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id]
  }),
  userProjects: many(userProjects),
  folders: many(folders),
  files: many(files),
  tasks: many(tasks),
  wikiPages: many(wikiPages),
  calendarEvents: many(calendarEvents),
}));

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
  user: one(users, {
    fields: [userProjects.userId],
    references: [users.id]
  }),
  project: one(projects, {
    fields: [userProjects.projectId],
    references: [projects.id]
  }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  project: one(projects, {
    fields: [folders.projectId],
    references: [projects.id]
  }),
  createdBy: one(users, {
    fields: [folders.createdById],
    references: [users.id]
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id]
  }),
  children: many(folders),
  files: many(files),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id]
  }),
  folder: one(folders, {
    fields: [files.folderId],
    references: [folders.id]
  }),
  uploadedBy: one(users, {
    fields: [files.uploadedById],
    references: [users.id]
  }),
  comments: many(comments),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
    relationName: 'assignedTasks'
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: 'createdTasks'
  }),
  timeEntries: many(taskTimeEntries),
  comments: many(comments),
}));

export const taskTimeEntriesRelations = relations(taskTimeEntries, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTimeEntries.taskId],
    references: [tasks.id]
  }),
  user: one(users, {
    fields: [taskTimeEntries.userId],
    references: [users.id]
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  file: one(files, {
    fields: [comments.fileId],
    references: [files.id]
  }),
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id]
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id]
  }),
}));

export const wikiPagesRelations = relations(wikiPages, ({ one, many }) => ({
  project: one(projects, {
    fields: [wikiPages.projectId],
    references: [projects.id]
  }),
  parent: one(wikiPages, {
    fields: [wikiPages.parentId],
    references: [wikiPages.id]
  }),
  children: many(wikiPages),
  createdBy: one(users, {
    fields: [wikiPages.createdById],
    references: [users.id],
    relationName: 'createdWikiPages'
  }),
  updatedBy: one(users, {
    fields: [wikiPages.updatedById],
    references: [users.id],
    relationName: 'updatedWikiPages'
  }),
}));

// Define schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects);
export const insertFolderSchema = createInsertSchema(folders);
export const insertFileSchema = createInsertSchema(files);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertTimeEntrySchema = createInsertSchema(taskTimeEntries);
export const insertCommentSchema = createInsertSchema(comments);
export const insertWikiPageSchema = createInsertSchema(wikiPages);
export const insertUserProjectSchema = createInsertSchema(userProjects);

// Define types for use in the application
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TimeEntry = typeof taskTimeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type WikiPage = typeof wikiPages.$inferSelect;
export type InsertWikiPage = z.infer<typeof insertWikiPageSchema>;

export type UserProject = typeof userProjects.$inferSelect;
export type InsertUserProject = z.infer<typeof insertUserProjectSchema>;

// Calendar events
export const calendarEventTypeEnum = pgEnum('calendar_event_type', ['meeting', 'task', 'reminder', 'milestone']);
export const calendarEventStatusEnum = pgEnum('calendar_event_status', ['scheduled', 'in_progress', 'completed', 'canceled']);

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  start: timestamp("start").notNull(),
  end: timestamp("end").notNull(),
  type: calendarEventTypeEnum("type").notNull(),
  status: calendarEventStatusEnum("status").default("scheduled"),
  allDay: boolean("all_day").default(false),
  location: text("location"),
  projectId: integer("project_id").references(() => projects.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  project: one(projects, {
    fields: [calendarEvents.projectId],
    references: [projects.id]
  }),
  creator: one(users, {
    fields: [calendarEvents.createdBy],
    references: [users.id]
  })
}));

export const insertCalendarEventSchema = createInsertSchema(calendarEvents);
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
