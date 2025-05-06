# Architecture Documentation

## Overview

This application is a full-stack project management system built with React and Express. It provides features like user authentication, project management, file handling, task tracking with Kanban boards, Gantt charts, time tracking, and team collaboration. The system follows a client-server architecture with a RESTful API.

## System Architecture

The application follows a modern web application architecture with the following components:

1. **Frontend**: React-based single-page application (SPA) with TypeScript
2. **Backend**: Express.js server with TypeScript
3. **Database**: PostgreSQL database accessed via Drizzle ORM
4. **Authentication**: Session-based authentication with Passport.js
5. **File Storage**: Local file storage with potential for cloud storage integration

### Architecture Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│    Frontend     │◄─────►│    Backend      │◄─────►│    Database     │
│    (React)      │       │    (Express)    │       │   (PostgreSQL)  │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

## Key Components

### Frontend Components

1. **Client Application**
   - Built with React and TypeScript
   - Uses the shadcn/ui component library
   - Implements a responsive design for various device sizes
   - Includes dashboard, kanban, file management, and other project management interfaces

2. **State Management**
   - Uses React Query for server state management
   - Context API for application state (auth, theme)
   - Form state managed with React Hook Form and Zod validation

3. **UI Components**
   - Leverages shadcn/ui components built on Radix UI primitives
   - Custom components for specific features (PDF Viewer, Kanban Board, Gantt Chart)
   - Tailwind CSS for styling with a consistent design system

### Backend Components

1. **Express Server**
   - Handles HTTP requests and routing
   - Serves the frontend application in production
   - Implements REST API endpoints
   - Middleware for authentication, logging, and error handling

2. **Authentication System**
   - Session-based authentication with Passport.js
   - Password hashing with scrypt
   - Session storage in PostgreSQL

3. **Data Access Layer**
   - Drizzle ORM for database interactions
   - Schema definitions with type safety

4. **File Handling**
   - Multer for file uploads
   - Local storage for uploaded files

### Database Schema

The database schema includes the following main entities:

1. **Users**
   - Core user data and authentication information
   - Role-based permissions (admin, project_leader, user)

2. **Projects**
   - Project metadata and ownership
   - Many-to-many relationship with users through user_projects table

3. **Tasks**
   - Task details, status, assignments
   - Kanban board implementation

4. **Files and Folders**
   - File metadata and organization
   - Hierarchical folder structure

5. **Additional Entities**
   - Comments, Wiki pages, Calendar events, Time entries

## Data Flow

### Authentication Flow

1. User submits login credentials (username/password)
2. Server validates credentials and creates a session
3. Session ID is stored in a cookie and returned to the client
4. Subsequent requests include the session cookie for authentication
5. Server validates the session on protected routes

### Project Management Flow

1. User creates or selects a project
2. Server validates user's access to the project
3. User interacts with project components (tasks, files, wiki)
4. Client sends API requests for CRUD operations
5. Server processes requests and updates the database
6. Client refreshes data using React Query for real-time updates

### File Handling Flow

1. User uploads a file through the UI
2. File is sent to the server
3. Server stores the file and creates a database record
4. File metadata is returned to the client for display
5. Users can view or download files through the application

## External Dependencies

### Frontend Dependencies

1. **Core Libraries**
   - React: UI library
   - TypeScript: Type safety
   - Tailwind CSS: Styling

2. **UI Components**
   - Radix UI: Accessible UI primitives
   - shadcn/ui: Component library built on Radix UI
   - Lucide React: Icon library

3. **Data Management**
   - TanStack Query (React Query): Data fetching and caching
   - Zod: Schema validation
   - React Hook Form: Form handling

4. **Specialized Components**
   - dnd-kit: Drag-and-drop functionality for Kanban
   - react-pdf: PDF viewing
   - Three.js: 3D rendering

### Backend Dependencies

1. **Core Framework**
   - Express: Web server framework
   - TypeScript: Type safety

2. **Database**
   - PostgreSQL: Database
   - Drizzle ORM: Database ORM
   - connect-pg-simple: Session storage

3. **Authentication**
   - Passport.js: Authentication middleware
   - express-session: Session management

4. **File Handling**
   - Multer: File upload handling

## Deployment Strategy

The application is configured for deployment on Replit with automatic scaling:

1. **Build Process**
   - Frontend: Vite bundles the React application
   - Backend: esbuild bundles the server code
   - Combined bundle in the dist directory

2. **Deployment Configuration**
   - Deployment target: autoscale
   - Port mapping: 5000 to 80
   - Build command: `npm run build`
   - Start command: `npm run start`

3. **Environment Configuration**
   - Required environment variables:
     - DATABASE_URL: PostgreSQL connection string
     - SESSION_SECRET: Secret for session encryption
   - Node.js version: 20

4. **Database Provisioning**
   - Using Neon Serverless PostgreSQL
   - Connection through WebSocket for serverless environments
   - Migration and seeding scripts for database setup

## Development Workflow

1. **Local Development**
   - Combined frontend/backend dev server with `npm run dev`
   - Database migrations with Drizzle Kit
   - Hot module replacement for frontend changes

2. **Type Safety**
   - Shared schema definitions between frontend and backend
   - TypeScript for type checking
   - Zod for runtime validation

3. **Code Organization**
   - Clear separation between client, server, and shared code
   - Component-based architecture for frontend
   - Middleware pattern for backend

## Security Considerations

1. **Authentication**
   - Secure password hashing with scrypt
   - Session-based authentication
   - CSRF protection with SameSite cookies

2. **Authorization**
   - Role-based access control
   - Project-level permissions
   - API route protection

3. **Data Validation**
   - Input validation with Zod
   - Type checking with TypeScript
   - Parameterized queries for database access