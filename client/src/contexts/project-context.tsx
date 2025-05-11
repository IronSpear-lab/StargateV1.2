import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

// Interface för projektdata
export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  budget?: number;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectMember {
  id: number;
  userId: number;
  projectId: number;
  role: string;
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

interface NewProjectData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  budget?: number;
}

interface ProjectContextType {
  projects: Project[];
  currentProject: Project | null;
  projectMembers: ProjectMember[];
  setCurrentProject: (project: Project | null) => void;
  isLoadingProjects: boolean;
  isLoadingMembers: boolean;
  projectsError: Error | null;
  createProject: (data: NewProjectData) => Promise<Project>;
  isCreatingProject: boolean;
}

// Skapa context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Provider-komponent
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      const response = await fetch('/api/user-projects', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return await response.json();
    },
    enabled: !!user
  });

  // Hämta användare för det aktuella projektet
  const { 
    data: projectMembers = [], 
    isLoading: isLoadingMembers 
  } = useQuery<ProjectMember[]>({
    queryKey: ['/api/project-members', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return [];
      const response = await fetch(`/api/project-members/${currentProject.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch project members');
      }
      return await response.json();
    },
    enabled: !!currentProject,
  });
  
  // Mutation för att skapa nytt projekt
  const { 
    mutateAsync: createProjectMutation,
    isPending: isCreatingProject
  } = useMutation({
    mutationFn: async (data: NewProjectData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Uppdatera projektkö efter framgångsrikt skapande
      queryClient.invalidateQueries({ queryKey: ['/api/user-projects'] });
    }
  });

  // Sätt aktuellt projekt vid uppstart utifrån localStorage om möjligt
  useEffect(() => {
    const savedProjectId = localStorage.getItem('currentProjectId');
    
    if (savedProjectId && projects.length > 0) {
      const saved = projects.find(p => p.id === parseInt(savedProjectId, 10));
      if (saved) {
        setCurrentProject(saved);
      } else if (projects.length > 0) {
        // Om sparat projekt inte finns, välj första tillgängliga
        setCurrentProject(projects[0]);
      }
    } else if (projects.length > 0 && !currentProject) {
      // Inget sparat projekt, välj första tillgängliga
      setCurrentProject(projects[0]);
    }
  }, [projects]);

  // Spara valt projekt när det ändras
  useEffect(() => {
    if (currentProject) {
      localStorage.setItem('currentProjectId', currentProject.id.toString());
    }
  }, [currentProject]);
  
  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        projectMembers,
        setCurrentProject,
        isLoadingProjects,
        isLoadingMembers,
        projectsError,
        createProject: createProjectMutation,
        isCreatingProject
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

// Hook för att använda projekt-context
export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext måste användas inom en ProjectProvider');
  }
  return context;
};