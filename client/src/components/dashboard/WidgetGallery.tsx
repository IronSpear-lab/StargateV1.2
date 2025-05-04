import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Plus, 
  BarChart2, 
  CalendarDays, 
  ListTodo, 
  Users, 
  Kanban, 
  Clock, 
  FileText, 
  Activity,
  MessageSquare,
  Check,
  Calendar,
  FolderOpen,
  Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type WidgetType = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  defaultWidth: string;
  defaultHeight: string;
  minWidth?: string;
  minHeight?: string;
  requiresProjectId?: boolean;
  roles?: string[];
  available: boolean;
};

interface WidgetGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectWidget: (widgetType: WidgetType) => void;
  userRole?: string;
}

export function WidgetGallery({ 
  open, 
  onOpenChange, 
  onSelectWidget,
  userRole = 'admin' 
}: WidgetGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  
  // Define all possible widgets
  const widgetTypes: WidgetType[] = [
    {
      id: "tasks-overview",
      name: "Tasks Overview",
      description: "Shows task completion status and upcoming deadlines",
      icon: <ListTodo className="h-6 w-6" />,
      category: "tasks",
      defaultWidth: "half",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "custom-text",
      name: "Custom Text",
      description: "Add your own notes and important information",
      icon: <Pencil className="h-6 w-6" />,
      category: "notes",
      defaultWidth: "half",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "calendar",
      name: "Calendar",
      description: "Weekly view of events and important dates",
      icon: <Calendar className="h-6 w-6" />,
      category: "calendar",
      defaultWidth: "half",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "messages",
      name: "Messages",
      description: "View your recent messages and notifications",
      icon: <MessageSquare className="h-6 w-6" />,
      category: "communication",
      defaultWidth: "half",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "deadlines",
      name: "Upcoming Deadlines",
      description: "View important upcoming deadlines for your projects",
      icon: <Clock className="h-6 w-6" />,
      category: "planning",
      defaultWidth: "half",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "field-tasks",
      name: "My Field Tasks",
      description: "View and manage your assigned field tasks",
      icon: <Check className="h-6 w-6" />,
      category: "tasks",
      defaultWidth: "half",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "recent-files",
      name: "Recent Files in Vault",
      description: "View recently added or modified files from the vault",
      icon: <FolderOpen className="h-6 w-6" />,
      category: "files",
      defaultWidth: "half",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "project-stats",
      name: "Project Statistics",
      description: "Displays key metrics about the current project",
      icon: <BarChart2 className="h-6 w-6" />,
      category: "analytics",
      defaultWidth: "half",
      defaultHeight: "medium",
      requiresProjectId: true,
      available: true,
    },
    {
      id: "team-members",
      name: "Team Members",
      description: "Shows all team members with roles and contact info",
      icon: <Users className="h-6 w-6" />,
      category: "team",
      defaultWidth: "third",
      defaultHeight: "medium",
      roles: ["admin", "project_leader"],
      available: true,
    },
    {
      id: "kanban-preview",
      name: "Kanban Preview",
      description: "Compact kanban board showing current sprint",
      icon: <Kanban className="h-6 w-6" />,
      category: "tasks",
      defaultWidth: "full",
      defaultHeight: "large",
      available: true,
    },
    {
      id: "time-tracking",
      name: "Time Tracking",
      description: "Track time spent on tasks and projects",
      icon: <Clock className="h-6 w-6" />,
      category: "time",
      defaultWidth: "third",
      defaultHeight: "medium",
      available: true,
    },
    {
      id: "activity-feed",
      name: "Activity Feed",
      description: "Recent activity from team members",
      icon: <Activity className="h-6 w-6" />,
      category: "activity",
      defaultWidth: "third",
      defaultHeight: "medium",
      available: true,
    }
  ];
  
  // Filter widgets based on search query and category
  const filteredWidgets = widgetTypes.filter(widget => {
    const matchesSearch = 
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === "all" || widget.category === activeCategory;
    
    // Filter by user role if the widget has role restrictions
    const hasAccess = !widget.roles || widget.roles.includes(userRole);
    
    return matchesSearch && matchesCategory && hasAccess && widget.available;
  });
  
  // Group available categories from the widgets
  const categories = Array.from(
    new Set(widgetTypes.map(widget => widget.category))
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Browse and add widgets to your dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative my-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search widgets..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-4 h-12 mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-3">
              {filteredWidgets.map((widget) => (
                <div 
                  key={widget.id}
                  className={cn(
                    "border rounded-lg p-3 cursor-pointer transition-colors",
                    "hover:border-primary/50 hover:bg-muted"
                  )}
                  onClick={() => onSelectWidget(widget)}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-md">
                      {widget.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{widget.name}</h3>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 mb-2">
                        {widget.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {widget.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {widget.defaultWidth === "full" ? "Full width" : 
                           widget.defaultWidth === "half" ? "Half width" : 
                           "One third"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredWidgets.length === 0 && (
                <div className="col-span-2 p-4 text-center text-muted-foreground">
                  No widgets found. Try adjusting your search or filters.
                </div>
              )}
            </div>
          </div>
        </Tabs>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}