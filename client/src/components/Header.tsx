import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, HelpCircle, Menu, Search, ChevronDown, Plus } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
  // Dessa är nu valfria eftersom vi prioriterar ProjectContext
  currentProject?: { id: number; name: string };
  availableProjects?: { id: number; name: string }[];
  onProjectChange?: (projectId: number) => void;
}

export function Header({ 
  title, 
  onToggleSidebar, 
  currentProject: propCurrentProject, 
  availableProjects: propAvailableProjects,
  onProjectChange: propOnProjectChange 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const isMobile = useMobile();
  
  // Använd ProjectContext om det finns, annars fallback till props
  const { 
    currentProject: contextCurrentProject, 
    projects: contextProjects, 
    changeProject: contextChangeProject,
    createProject,
    isCreatingProject
  } = useProject();
  
  // Hämta användarens roll för att avgöra om de kan skapa projekt
  const { user } = useAuth();
  const canCreateProject = user?.role === 'project_leader' || user?.role === 'admin';
  
  // Kombinera kontext och props med prioritet till kontext
  const currentProject = contextCurrentProject || propCurrentProject;
  
  // Använd endast projekt från ProjectContext som är hämtade via storage.getUserProjects som nu
  // korrekt filtrerar baserat på användarens behörigheter
  const availableProjects = contextProjects.length > 0 ? contextProjects : (propAvailableProjects || []);
  
  const onProjectChange = contextChangeProject || propOnProjectChange;
  
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim()
      });
      
      // Återställ formuläret och stäng dialogen
      setNewProjectName("");
      setNewProjectDescription("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  // Define the create project dialog to reuse
  const createProjectDialog = (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 flex items-center justify-center">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Skapa nytt projekt</DialogTitle>
          <DialogDescription>
            Fyll i information om det nya projektet. Alla projekt börjar med tomma dashboards, filer och uppgifter.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Namn
            </Label>
            <Input
              id="name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="col-span-3"
              placeholder="Projektnamn"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Beskrivning
            </Label>
            <Textarea
              id="description"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="col-span-3"
              placeholder="Projektbeskrivning"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
            Avbryt
          </Button>
          <Button onClick={handleCreateProject} disabled={isCreatingProject || !newProjectName.trim()}>
            {isCreatingProject ? "Skapar..." : "Skapa projekt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <header className="bg-background border-b border-border shadow-sm p-4 flex items-center">
      {isMobile && (
        <Button 
          variant="ghost" 
          size="icon"
          className="mr-4 text-muted-foreground"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      <div className="flex-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        
        {currentProject && onProjectChange && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div 
                  className="flex items-center gap-1 px-3 py-2 text-base font-medium bg-transparent hover:bg-muted/50 rounded cursor-pointer"
                  onClick={() => document.getElementById('project-selector')?.click()}
                >
                  {currentProject.name}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </div>
                
                <select 
                  id="project-selector"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={currentProject.id}
                  onChange={(e) => onProjectChange(Number(e.target.value))}
                >
                  {availableProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Visa endast skapa projekt-knappen om användaren har behörighet */}
              {canCreateProject && createProjectDialog}
            </div>
          </div>
        )}
        
        {!currentProject && availableProjects.length > 0 && onProjectChange && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div 
                  className="flex items-center gap-1 px-3 py-2 text-base font-medium bg-transparent hover:bg-muted/50 rounded cursor-pointer"
                  onClick={() => document.getElementById('project-selector')?.click()}
                >
                  Välj projekt
                  <ChevronDown className="h-4 w-4 ml-1" />
                </div>
                
                <select 
                  id="project-selector"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value=""
                  onChange={(e) => onProjectChange(Number(e.target.value))}
                >
                  <option value="" disabled>Välj projekt</option>
                  {availableProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Visa endast skapa projekt-knappen om användaren har behörighet */}
              {canCreateProject && createProjectDialog}
            </div>
          </div>
        )}
        
        {!currentProject && availableProjects.length === 0 && onProjectChange !== undefined && canCreateProject && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Skapa ditt första projekt</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Skapa ditt första projekt</DialogTitle>
                  <DialogDescription>
                    Fyll i information om ditt projekt för att komma igång.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Namn
                    </Label>
                    <Input
                      id="name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="col-span-3"
                      placeholder="Projektnamn"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Beskrivning
                    </Label>
                    <Textarea
                      id="description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="col-span-3"
                      placeholder="Projektbeskrivning"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleCreateProject} disabled={isCreatingProject || !newProjectName.trim()}>
                    {isCreatingProject ? "Skapar..." : "Skapa projekt"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
        
        {!currentProject && availableProjects.length === 0 && onProjectChange !== undefined && !canCreateProject && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <div className="text-center text-muted-foreground text-sm">
              Du har inte behörighet till något projekt än
            </div>
          </div>
        )}
      </div>
      
      <div className={cn("flex items-center gap-4", isMobile ? "gap-2" : "gap-4")}>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "px-4 py-2 text-sm focus:ring-primary focus:border-primary",
              isMobile ? "w-[120px]" : "w-auto"
            )}
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        </div>
        
        <ModeToggle />
        
        <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-muted relative">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-brand-red rounded-full"></span>
        </Button>
        
        <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-muted">
          <HelpCircle className="h-5 w-5 text-foreground" />
        </Button>
      </div>
    </header>
  );
}
