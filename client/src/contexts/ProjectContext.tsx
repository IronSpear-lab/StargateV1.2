import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export interface Project {
  id: number;
  name: string;
  description?: string;
  role?: string;
}

export interface ProjectMember {
  id: number;
  username: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  setCurrentProject: (project: Project) => void;
  changeProject: (projectId: number) => void;
  projectMembers: ProjectMember[];
  isLoadingMembers: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // Hämta alla projekt som användaren har tillgång till
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects, 
    error: projectsError 
  } = useQuery<Project[]>({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch('/api/user-projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return await response.json();
    },
    enabled: !!user,
  });

  // Hämta användare för det aktuella projektet
  const { 
    data: projectMembers = [], 
    isLoading: isLoadingMembers 
  } = useQuery<ProjectMember[]>({
    queryKey: ['/api/project-members', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return [];
      const response = await fetch(`/api/project-members/${currentProject.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project members');
      }
      return await response.json();
    },
    enabled: !!currentProject,
  });

  // Ladda valda projekt från localStorage eller använd det första tillgängliga
  useEffect(() => {
    if (projects.length > 0) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      
      if (savedProjectId) {
        const parsedId = parseInt(savedProjectId);
        const savedProject = projects.find(p => p.id === parsedId);
        if (savedProject) {
          setCurrentProject(savedProject);
        } else {
          // Om det sparade projektet inte finns i användarens projektlista, använd det första
          setCurrentProject(projects[0]);
          localStorage.setItem('currentProjectId', String(projects[0].id));
        }
      } else {
        // Om inget projekt var sparat, använd det första
        setCurrentProject(projects[0]);
        localStorage.setItem('currentProjectId', String(projects[0].id));
      }
    }
  }, [projects]);

  // Funktion för att byta projekt
  const changeProject = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      localStorage.setItem('currentProjectId', String(projectId));
      
      toast({
        title: "Projekt ändrat",
        description: `Du arbetar nu i "${project.name}"`,
      });
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        isLoading: isLoadingProjects,
        error: projectsError as Error | null,
        setCurrentProject,
        changeProject,
        projectMembers,
        isLoadingMembers,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};