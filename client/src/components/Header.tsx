import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, HelpCircle, Menu, Search, ChevronDown } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProject } from "@/contexts/ProjectContext";

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
  const isMobile = useMobile();
  
  // Använd ProjectContext om det finns, annars fallback till props
  const { 
    currentProject: contextCurrentProject, 
    projects: contextProjects, 
    changeProject: contextChangeProject 
  } = useProject();
  
  // Kombinera kontext och props med prioritet till kontext
  const currentProject = contextCurrentProject || propCurrentProject;
  const availableProjects = contextProjects.length > 0 ? contextProjects : (propAvailableProjects || []);
  const onProjectChange = contextChangeProject || propOnProjectChange;

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
        
        {currentProject && onProjectChange && availableProjects.length > 0 && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
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
          </div>
        )}
        
        {!currentProject && availableProjects.length > 0 && onProjectChange && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
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
