import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting seed process...");

    // Check if users already exist
    const existingUsers = await db.select().from(schema.users);
    if (existingUsers.length > 0) {
      console.log("Database already seeded with users. Skipping user creation.");
    } else {
      console.log("Creating users...");
      
      // Create admin user
      const adminUser = await db.insert(schema.users).values({
        username: "admin",
        password: await hashPassword("admin123"),
        role: "admin"
      }).returning();
      
      // Create project leader
      const projectLeader = await db.insert(schema.users).values({
        username: "John Doe",
        password: await hashPassword("password123"),
        role: "project_leader"
      }).returning();
      
      // Create regular users
      const regularUsers = await db.insert(schema.users).values([
        {
          username: "Alex Smith",
          password: await hashPassword("password123"),
          role: "user"
        },
        {
          username: "Maria Kim",
          password: await hashPassword("password123"),
          role: "user"
        },
        {
          username: "Sam Taylor",
          password: await hashPassword("password123"),
          role: "user"
        }
      ]).returning();
      
      console.log(`Created ${1 + 1 + regularUsers.length} users`);
      
      // Create a project
      console.log("Creating project...");
      const project = await db.insert(schema.projects).values({
        name: "ValvXlstart Development",
        description: "A comprehensive project management platform designed to streamline collaboration and document workflows.",
        createdById: projectLeader[0].id,
        createdAt: new Date()
      }).returning();
      
      // Assign users to project
      console.log("Assigning users to project...");
      await db.insert(schema.userProjects).values([
        {
          userId: adminUser[0].id,
          projectId: project[0].id,
          role: "admin"
        },
        {
          userId: projectLeader[0].id,
          projectId: project[0].id,
          role: "project_leader"
        },
        {
          userId: regularUsers[0].id,
          projectId: project[0].id,
          role: "user"
        },
        {
          userId: regularUsers[1].id,
          projectId: project[0].id,
          role: "user"
        },
        {
          userId: regularUsers[2].id,
          projectId: project[0].id,
          role: "user"
        }
      ]);
      
      // Create folders
      console.log("Creating folders...");
      const projectDocFolder = await db.insert(schema.folders).values({
        name: "Project Documentation",
        projectId: project[0].id,
        createdById: projectLeader[0].id
      }).returning();
      
      const designFolder = await db.insert(schema.folders).values({
        name: "Design Files",
        projectId: project[0].id,
        parentId: projectDocFolder[0].id,
        createdById: regularUsers[1].id
      }).returning();
      
      await db.insert(schema.folders).values([
        {
          name: "Meeting Notes",
          projectId: project[0].id,
          createdById: projectLeader[0].id
        },
        {
          name: "Reference Materials",
          projectId: project[0].id,
          createdById: regularUsers[0].id
        }
      ]);
      
      // Create files
      console.log("Creating files...");
      const requirementsFile = await db.insert(schema.files).values({
        name: "Requirements.pdf",
        fileType: "application/pdf",
        fileSize: 1024 * 1024 * 2, // 2MB
        filePath: "/storage/requirements.pdf",
        projectId: project[0].id,
        folderId: projectDocFolder[0].id,
        uploadedById: projectLeader[0].id,
        uploadDate: new Date()
      }).returning();
      
      await db.insert(schema.files).values([
        {
          name: "Architecture.pdf",
          fileType: "application/pdf",
          fileSize: 1024 * 1024 * 3, // 3MB
          filePath: "/storage/architecture.pdf",
          projectId: project[0].id,
          folderId: projectDocFolder[0].id,
          uploadedById: regularUsers[0].id,
          uploadDate: new Date()
        },
        {
          name: "Mockups.pdf",
          fileType: "application/pdf",
          fileSize: 1024 * 1024 * 5, // 5MB
          filePath: "/storage/mockups.pdf",
          projectId: project[0].id,
          folderId: designFolder[0].id,
          uploadedById: regularUsers[1].id,
          uploadDate: new Date()
        }
      ]);
      
      // Create tasks
      console.log("Creating tasks...");
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(now.getDate() - 14);
      
      const inOneWeek = new Date(now);
      inOneWeek.setDate(now.getDate() + 7);
      
      const inTwoWeeks = new Date(now);
      inTwoWeeks.setDate(now.getDate() + 14);
      
      const inThreeWeeks = new Date(now);
      inThreeWeeks.setDate(now.getDate() + 21);
      
      const inFourWeeks = new Date(now);
      inFourWeeks.setDate(now.getDate() + 28);
      
      // 1. First create the completed tasks
      const setupTask = await db.insert(schema.tasks).values({
        title: "Project setup and configuration",
        description: "Initialize React project with Joy UI components",
        status: "done",
        priority: "high",
        type: "setup",
        projectId: project[0].id,
        assigneeId: regularUsers[0].id,
        createdById: projectLeader[0].id,
        createdAt: twoWeeksAgo,
        startDate: twoWeeksAgo,
        endDate: oneWeekAgo
      }).returning();
      
      const requirementsTask = await db.insert(schema.tasks).values({
        title: "Gather Requirements",
        description: "Collect and document all project requirements and specifications",
        status: "done",
        priority: "high",
        type: "planning",
        projectId: project[0].id,
        assigneeId: projectLeader[0].id,
        createdById: projectLeader[0].id,
        createdAt: twoWeeksAgo,
        startDate: twoWeeksAgo,
        endDate: new Date(oneWeekAgo.getTime() - 2 * 24 * 60 * 60 * 1000) // 9 days ago
      }).returning();
      
      // 2. Create in-progress tasks
      const dbDesignTask = await db.insert(schema.tasks).values({
        title: "Database Design",
        description: "Design database schema and entity relationships",
        status: "in_progress",
        priority: "high",
        type: "design",
        projectId: project[0].id,
        assigneeId: regularUsers[0].id,
        createdById: projectLeader[0].id,
        createdAt: oneWeekAgo,
        startDate: oneWeekAgo,
        endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        dependencies: JSON.stringify([requirementsTask[0].id])
      }).returning();
      
      const uiDesignTask = await db.insert(schema.tasks).values({
        title: "UI/UX Design",
        description: "Create mockups and UI components following design guidelines",
        status: "in_progress",
        priority: "high",
        type: "design",
        projectId: project[0].id,
        assigneeId: regularUsers[1].id,
        createdById: projectLeader[0].id,
        createdAt: oneWeekAgo,
        startDate: oneWeekAgo,
        endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        dependencies: JSON.stringify([requirementsTask[0].id])
      }).returning();
      
      // 3. Create upcoming tasks (dependencies on in-progress tasks)
      const backendTask = await db.insert(schema.tasks).values({
        title: "Backend API Implementation",
        description: "Implement RESTful API endpoints with Express",
        status: "todo",
        priority: "high",
        type: "development",
        projectId: project[0].id,
        assigneeId: regularUsers[0].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        endDate: inTwoWeeks,
        dependencies: JSON.stringify([dbDesignTask[0].id])
      }).returning();
      
      const frontendTask = await db.insert(schema.tasks).values({
        title: "Frontend Implementation",
        description: "Develop React components for user interface",
        status: "todo",
        priority: "high",
        type: "development",
        projectId: project[0].id,
        assigneeId: regularUsers[1].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endDate: inTwoWeeks,
        dependencies: JSON.stringify([uiDesignTask[0].id])
      }).returning();
      
      // 4. Create dependent tasks
      const integrationTask = await db.insert(schema.tasks).values({
        title: "Frontend-Backend Integration",
        description: "Connect frontend to API endpoints",
        status: "todo",
        priority: "high",
        type: "development",
        projectId: project[0].id,
        assigneeId: projectLeader[0].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: inTwoWeeks,
        endDate: inThreeWeeks,
        dependencies: JSON.stringify([backendTask[0].id, frontendTask[0].id])
      }).returning();
      
      // 5. Testing tasks
      const testingTask = await db.insert(schema.tasks).values({
        title: "Testing and QA",
        description: "Perform unit tests, integration tests, and QA",
        status: "todo",
        priority: "medium",
        type: "testing",
        projectId: project[0].id,
        assigneeId: regularUsers[2].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: inThreeWeeks,
        endDate: inFourWeeks,
        dependencies: JSON.stringify([integrationTask[0].id])
      }).returning();
      
      // 6. Final tasks
      const deploymentTask = await db.insert(schema.tasks).values({
        title: "Deployment",
        description: "Deploy application to production environment",
        status: "todo",
        priority: "high",
        type: "deployment",
        projectId: project[0].id,
        assigneeId: projectLeader[0].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: inFourWeeks,
        endDate: new Date(inFourWeeks.getTime() + 2 * 24 * 60 * 60 * 1000), // 30 days from now
        dependencies: JSON.stringify([testingTask[0].id])
      }).returning();
      
      // Additional tasks for File Management Features 
      const fileUploadTask = await db.insert(schema.tasks).values({
        title: "Implement file upload system",
        description: "Create drag & drop file upload component with progress indicator",
        status: "todo",
        priority: "high",
        type: "feature",
        projectId: project[0].id,
        assigneeId: regularUsers[2].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
        endDate: inTwoWeeks,
        dependencies: JSON.stringify([frontendTask[0].id])
      }).returning();
      
      const pdfTask = await db.insert(schema.tasks).values({
        title: "Evaluate PDF annotation libraries",
        description: "Research options for PDF annotation and compare features",
        status: "todo",
        priority: "medium",
        type: "research",
        projectId: project[0].id,
        assigneeId: regularUsers[0].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: inOneWeek,
        endDate: new Date(inOneWeek.getTime() + 2 * 24 * 60 * 60 * 1000), // 9 days from now
        dependencies: JSON.stringify([])
      }).returning();
      
      const authTask = await db.insert(schema.tasks).values({
        title: "Implement user authentication",
        description: "Set up JWT-based auth with role-based permissions",
        status: "review",
        priority: "high",
        type: "feature",
        projectId: project[0].id,
        assigneeId: projectLeader[0].id,
        createdById: projectLeader[0].id,
        createdAt: now,
        startDate: oneWeekAgo,
        endDate: now
      }).returning();
      
      // Add time entries
      console.log("Creating time entries...");
      await db.insert(schema.taskTimeEntries).values([
        {
          taskId: setupTask[0].id,
          userId: regularUsers[0].id,
          startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // +4 hours
          duration: 4 * 60, // 4 hours in minutes
          notes: "Initial project setup and configuration"
        },
        {
          taskId: uiDesignTask[0].id,
          userId: regularUsers[1].id,
          startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // +6 hours
          duration: 6 * 60, // 6 hours in minutes
          notes: "Started work on UI designs and components"
        },
        {
          taskId: uiDesignTask[0].id,
          userId: regularUsers[1].id,
          startTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          endTime: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000), // +7 hours
          duration: 7 * 60, // 7 hours in minutes
          notes: "Continue working on UI designs and components"
        }
      ]);
      
      // Add file comments
      console.log("Creating comments...");
      await db.insert(schema.comments).values([
        {
          content: "We need to clarify the access control requirements on page 5.",
          fileId: requirementsFile[0].id,
          userId: projectLeader[0].id,
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          content: "Added a note about the technical requirements section. Let's discuss tomorrow.",
          fileId: requirementsFile[0].id,
          userId: regularUsers[0].id,
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
        }
      ]);
      
      // Create wiki pages
      console.log("Creating wiki pages...");
      const overviewPage = await db.insert(schema.wikiPages).values({
        title: "Project Overview",
        content: `# Project Overview

ValvXlstart is a comprehensive project management platform designed to streamline collaboration and document workflows. This wiki serves as the central knowledge base for all project-related information.

## Key Features

- File Management System with PDF annotation and commenting
- Task and Project Management with Kanban and Gantt views
- Team Collaboration tools including wiki and real-time notifications
- Role-based access control for secure document handling

## Project Timeline

| Phase | Timeline | Status |
|-------|----------|--------|
| Research & Planning | Jan - Feb 2023 | Completed |
| Design & Prototyping | Mar - Apr 2023 | Completed |
| Development | May - Aug 2023 | In Progress |
| Testing | Sep - Oct 2023 | Not Started |
| Deployment | November 2023 | Not Started |`,
        projectId: project[0].id,
        createdById: projectLeader[0].id,
        createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      }).returning();
      
      const techArchPage = await db.insert(schema.wikiPages).values({
        title: "Technical Architecture",
        content: `# Technical Architecture

This page describes the technical architecture of the ValvXlstart platform.

## System Overview

The ValvXlstart platform is built using a modern tech stack with React.js for the frontend and Express.js for the backend.

## Tech Stack

- **Frontend**: React, React Router, Tailwind CSS, Shadcn/UI
- **Backend**: Express.js, PostgreSQL, Drizzle ORM
- **Authentication**: JWT-based auth with role-based permissions
- **File Handling**: Multer for uploads, PDF.js for viewing`,
        projectId: project[0].id,
        createdById: regularUsers[0].id,
        createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      }).returning();
      
      await db.insert(schema.wikiPages).values([
        {
          title: "Frontend",
          content: `# Frontend Architecture

The ValvXlstart frontend is built with React and uses a component-based architecture.

## Key Components

- File Explorer with tree view
- PDF Viewer with annotation support
- Kanban Board with drag-drop functionality
- Gantt Chart for project planning
- Rich text editor for Wiki pages`,
          projectId: project[0].id,
          parentId: techArchPage[0].id,
          createdById: regularUsers[1].id,
          createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
          updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          title: "Backend",
          content: `# Backend Architecture

The backend API is built with Express.js and uses PostgreSQL for data storage.

## API Structure

- RESTful API endpoints
- JWT authentication
- Role-based access control
- File storage and management
- WebSocket for real-time updates`,
          projectId: project[0].id,
          parentId: techArchPage[0].id,
          createdById: regularUsers[0].id,
          createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
          updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          title: "Database",
          content: `# Database Design

The database is designed to efficiently store and retrieve project-related data.

## Schema

- Users and authentication
- Projects and permissions
- Files and folders
- Tasks and time tracking
- Comments and annotations
- Wiki pages`,
          projectId: project[0].id,
          parentId: techArchPage[0].id,
          createdById: projectLeader[0].id,
          createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          updatedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        }
      ]);
      
      console.log("Seed completed successfully!");
    }
  } catch (error) {
    console.error("Error during seed:", error);
  }
}

seed();
