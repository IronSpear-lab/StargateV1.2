import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface NewProjectData {
  name: string;
  description: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  setCurrentProject: (project: Project) => void;
  changeProject: (projectId: number) => void;
  createProject: (data: NewProjectData) => Promise<Project>;
  isCreatingProject: boolean;
  projectMembers: ProjectMember[];
  isLoadingMembers: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
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
  
  // Mutation för att skapa nytt projekt
  const { 
    mutateAsync: createProjectMutation,
    isPending: isCreatingProject
  } = useMutation({
    mutationFn: async (data: NewProjectData) => {
      console.log('Creating project with data:', data);
      
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          credentials: 'include' // Viktigt för att inkludera sessions-cookies
        });
        
        const responseText = await response.text();
        console.log('Project creation response:', response.status, responseText);
        
        if (!response.ok) {
          throw new Error(`Failed to create project: ${responseText}`);
        }
        
        try {
          return JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse response JSON', e);
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Project creation fetch error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Project created successfully:', data);
      // Invalidera projektcachen så att listan uppdateras
      queryClient.invalidateQueries({ queryKey: ['/api/user-projects'] });
    },
    onError: (error) => {
      console.error('Project creation mutation error:', error);
      toast({
        title: "Fel vid skapande av projekt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funktion för att skapa nytt projekt
  const createProject = async (data: NewProjectData): Promise<Project> => {
    try {
      const newProject = await createProjectMutation(data);
      
      toast({
        title: "Projekt skapat",
        description: `Projektet "${data.name}" har skapats`,
      });
      
      // Byt till det nya projektet automatiskt
      setCurrentProject(newProject);
      localStorage.setItem('currentProjectId', String(newProject.id));
      
      return newProject;
    } catch (error) {
      console.error("Error creating project:", error);
      throw error;
    }
  };

  // Ladda valda projekt från localStorage
  useEffect(() => {
    if (projects.length > 0) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      
      if (savedProjectId) {
        const parsedId = parseInt(savedProjectId);
        const savedProject = projects.find(p => p.id === parsedId);
        if (savedProject) {
          setCurrentProject(savedProject);
        }
        // Annars behåll currentProject som null för att visa ursprungligt innehåll
      }
      // Viktigt: Välj inte automatiskt ett projekt, låt användaren välja när de vill
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
        createProject,
        isCreatingProject,
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