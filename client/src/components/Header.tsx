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

export interface Project {
  id: number;
  name: string;
}

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
  currentProject?: Project;
  availableProjects?: Project[];
  onProjectChange?: (projectId: number) => void;
}

export function Header({ 
  title, 
  onToggleSidebar, 
  currentProject, 
  availableProjects = [],
  onProjectChange 
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useMobile();

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
