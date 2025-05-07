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
      const response = await fetch('/api/user-projects', {
        credentials: 'include'  // Lägg till för att säkerställa att cookies skickas med
      });
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
      const response = await fetch(`/api/project-members/${currentProject.id}`, {
        credentials: 'include'  // Lägg till för att säkerställa att cookies skickas med
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

  // Ladda valda projekt från localStorage och säkerställ att currentProject är giltigt
  useEffect(() => {
    console.log("Projects or user changed, checking currentProject validity:", { 
      projects, 
      currentProjectId: currentProject?.id,
      projectsLength: projects.length
    });
    
    if (projects.length > 0) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      
      // Om currentProject är satt (finns i minnet), kontrollera om det fortfarande är giltigt
      if (currentProject) {
        const projectStillValid = projects.some(p => p.id === currentProject.id);
        
        if (!projectStillValid) {
          console.log("Current project no longer valid (user lost access), resetting...");
          
          // Om användaren förlorat behörighet, sätt första tillgängliga projekt som aktiv
          const firstAvailableProject = projects[0];
          setCurrentProject(firstAvailableProject);
          localStorage.setItem('currentProjectId', String(firstAvailableProject.id));
          
          // Visa toast-meddelande
          toast({
            title: "Projekt bytt",
            description: `Du har inte längre tillgång till det tidigare projektet. Nu arbetar du i "${firstAvailableProject.name}"`,
          });
          
          return;
        }
      }
      
      // Om inget projekt är valt men det finns ett sparat
      if (!currentProject && savedProjectId) {
        const parsedId = parseInt(savedProjectId);
        const savedProject = projects.find(p => p.id === parsedId);
        
        if (savedProject) {
          setCurrentProject(savedProject);
        } else {
          // Om det sparade projektet inte finns i listan, välj det första projektet
          const firstAvailableProject = projects[0];
          setCurrentProject(firstAvailableProject);
          localStorage.setItem('currentProjectId', String(firstAvailableProject.id));
        }
      }
      
      // Om inget projekt är valt och inget finns i localStorage, använd första tillgängliga
      if (!currentProject && !savedProjectId && projects.length > 0) {
        const firstAvailableProject = projects[0];
        setCurrentProject(firstAvailableProject);
        localStorage.setItem('currentProjectId', String(firstAvailableProject.id));
      }
    } else {
      // Om projektlistan är tom, säkerställ att currentProject återställs
      setCurrentProject(null);
      localStorage.removeItem('currentProjectId');
    }
  }, [projects, user, currentProject, toast]);

  // Funktion för att byta projekt
  const changeProject = (projectId: number) => {
    // Kontrollera först om projektet finns i befintlig lista med behöriga projekt
    const projectExists = projects.some(p => p.id === projectId);
    
    if (!projectExists) {
      toast({
        title: "Åtkomst nekad",
        description: "Du saknar behörighet till detta projekt",
        variant: "destructive",
      });
      return;
    }
    
    // Hämta projektet med färsk data från API:et endast om användaren har behörighet
    fetch(`/api/projects/${projectId}`, {
      credentials: 'include'  // Lägg till för att säkerställa att cookies skickas med
    })
      .then(response => {
        if (!response.ok) {
          // Om svaret inte är OK (t.ex. 403 vid behörighetsfel eller 404 för projektet existerar inte),
          // behöver vi uppdatera projektlistan för att säkerställa att UI:t är i synk
          queryClient.invalidateQueries({ queryKey: ['/api/user-projects'] });
          
          if (response.status === 403) {
            throw new Error('Du saknar behörighet till detta projekt');
          } else if (response.status === 404) {
            throw new Error('Projektet kunde inte hittas');
          } else {
            throw new Error('Ett fel uppstod vid hämtning av projekt');
          }
        }
        return response.json();
      })
      .then(freshProject => {
        // Uppdatera currentProject med den färska datan
        setCurrentProject(freshProject);
        localStorage.setItem('currentProjectId', String(projectId));
        
        // Invalidera även medlemsfrågan för att få färska medlemmar och projekt
        queryClient.invalidateQueries({ queryKey: ['/api/project-members', projectId] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-projects'] });
        
        toast({
          title: "Projekt ändrat",
          description: `Du arbetar nu i "${freshProject.name}"`,
        });
      })
      .catch(error => {
        console.error('Error changing project:', error);
        toast({
          title: "Fel vid byte av projekt",
          description: error.message,
          variant: "destructive",
        });
        
        // Viktigt: Kontrollera igen om projektet finns i den uppdaterade listan efter att vi invaliderat cachen
        queryClient.invalidateQueries({ queryKey: ['/api/user-projects'] })
          .then(() => {
            // Vi uppdaterar inte currentProject här längre - låt useEffect-hooken hantera detta baserat
            // på om projektet faktiskt existerar i den uppdaterade listan eller inte
          });
      });
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