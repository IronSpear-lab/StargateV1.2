import { useState, useEffect } from "react";
import { 
  Sidebar, 
  Header, 
  Widget, 
  WidgetArea, 
  WidgetGallery
} from "@/components";
import { WidthType, HeightType } from "@/components/dashboard/Widget";
import {
  CustomTextWidget,
  CalendarWidget,
  MessagesWidget,
  DeadlinesWidget,
  FieldTasksWidget,
  RecentFilesWidget,
  TasksOverviewWidget
} from "@/components/dashboard/widgets";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/contexts/ProjectContext";
import { Link } from "wouter";
import type { WidgetType } from "@/components/dashboard/WidgetGallery";

// Define a widget instance type for state management
type WidgetInstance = {
  id: string;
  type: string;
  title: string;
  projectId?: number;
  width: WidthType;
  height: HeightType;
};

// Define pre-configured dashboard widgets based on the screenshot
const defaultWidgets: WidgetInstance[] = [
  {
    id: uuidv4(),
    type: "custom-text",
    title: "Anpassad text",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "calendar",
    title: "Kalender",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "messages",
    title: "Meddelanden",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "deadlines",
    title: "Kommande deadlines",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "field-tasks",
    title: "Mina fältuppgifter",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "recent-files",
    title: "Senaste filer i valvet",
    width: "half",
    height: "medium"
  }
];

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [isWidgetGalleryOpen, setIsWidgetGalleryOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { projects, currentProject, changeProject } = useProject();
  
  // Convert to the local project format used by dashboard
  const userProjects = projects.map(p => ({ id: p.id, name: p.name }));
  const currentProjectId = currentProject?.id;
  
  // Local project object for components that need this format
  const localCurrentProject = currentProject 
    ? { id: currentProject.id, name: currentProject.name }
    : { id: 0, name: "No Project" };

  // Load saved widgets from localStorage on first render
  // or use default widgets if none exist
  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboard-widgets');
    if (savedWidgets) {
      try {
        // Parse and ensure types are correct
        const parsedWidgets = JSON.parse(savedWidgets) as WidgetInstance[];
        // Validate widget properties have correct types
        const validatedWidgets = parsedWidgets.map(widget => ({
          ...widget,
          width: (widget.width as WidthType) || "half",
          height: (widget.height as HeightType) || "medium"
        }));
        setWidgets(validatedWidgets);
      } catch (error) {
        console.error('Failed to parse saved widgets:', error);
        setWidgets(defaultWidgets);
      }
    } else {
      setWidgets(defaultWidgets);
    }
  }, []);

  // Save widgets to localStorage when they change
  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('dashboard-widgets', JSON.stringify(widgets));
    }
  }, [widgets]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Add a new widget to the dashboard
  const handleAddWidget = (widgetType: WidgetType) => {
    // Always use the current project ID
    const projectId = currentProjectId || (userProjects.length > 0 ? userProjects[0].id : undefined);

    const newWidget: WidgetInstance = {
      id: uuidv4(),
      type: widgetType.id,
      title: widgetType.name,
      projectId: projectId,
      width: widgetType.defaultWidth,
      height: widgetType.defaultHeight
    };
    
    setWidgets([...widgets, newWidget]);
    setIsWidgetGalleryOpen(false);
    
    toast({
      title: "Widget added",
      description: `${widgetType.name} has been added to your dashboard`,
    });
  };

  // Add widget button trigger
  const handleAddWidgetClick = () => {
    setIsWidgetGalleryOpen(true);
  };

  // Remove a widget from the dashboard
  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(widgets.filter(widget => widget.id !== widgetId));
    
    toast({
      title: "Widget removed",
      description: "The widget has been removed from your dashboard",
    });
  };

  // Handle widget position changes
  const handleWidgetPositionChange = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    
    const sourceIndex = widgets.findIndex(w => w.id === sourceId);
    const targetIndex = widgets.findIndex(w => w.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) return;
    
    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(sourceIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);
    
    setWidgets(newWidgets);
  };

  // Render the appropriate widget component based on type
  const renderWidget = (widget: WidgetInstance) => {
    // Always use the current selected project ID
    const projectId = currentProjectId || (userProjects.length > 0 ? userProjects[0].id : undefined);
    
    switch (widget.type) {
      case "custom-text":
        return <CustomTextWidget id={widget.id} />;
      case "calendar":
        return <CalendarWidget projectId={projectId} />;
      case "messages":
        return <MessagesWidget limit={5} />;
      case "deadlines":
        return <DeadlinesWidget projectId={projectId} />;
      case "field-tasks":
        return <FieldTasksWidget limit={5} />;
      case "recent-files":
        return <RecentFilesWidget projectId={projectId} />;
      case "tasks-overview":
        return <TasksOverviewWidget projectId={projectId} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Widget content not implemented</p>
          </div>
        );
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard" 
          onToggleSidebar={toggleSidebar} 
          currentProject={localCurrentProject}
          availableProjects={userProjects} 
          onProjectChange={(projectId) => {
            // Use central project change function from ProjectContext
            changeProject(projectId);
            
            toast({
              title: "Project changed",
              description: `Switched to ${userProjects.find(p => p.id === projectId)?.name || 'new project'}`,
            });
          }}
        />
        
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background">
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm mb-5">
              <Link href="/" className="text-primary hover:text-primary/80">
                <Home className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">Dashboard</span>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    localStorage.removeItem('dashboard-widgets');
                    setWidgets(defaultWidgets);
                    toast({
                      title: "Dashboard reset",
                      description: "Your dashboard has been reset to defaults",
                    });
                  }}
                  variant="outline"
                  className="gap-1 text-sm"
                >
                  Reset dashboard
                </Button>
                <Button 
                  onClick={handleAddWidgetClick} 
                  className="gap-1 bg-primary hover:bg-primary/90"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add widget
                </Button>
              </div>
            </div>
            
            {widgets.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center shadow-sm">
                <h3 className="font-medium text-lg mb-2 text-foreground">Your dashboard is empty</h3>
                <p className="text-muted-foreground mb-4">
                  Add widgets to customize your dashboard experience
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleAddWidgetClick}
                  className="gap-1 border-primary/20 text-primary hover:bg-primary/10"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Your First Widget
                </Button>
              </div>
            ) : (
              <WidgetArea onWidgetPositionChange={handleWidgetPositionChange}>
                {widgets.map((widget) => (
                  <Widget
                    key={widget.id}
                    id={widget.id}
                    title={widget.title}
                    type={widget.type}
                    width={widget.width}
                    height={widget.height}
                    onRemove={handleRemoveWidget}
                    onResize={(id, newWidth, newHeight) => {
                      // Update widget size when resized
                      const updatedWidgets = widgets.map(w => 
                        w.id === id ? { ...w, width: newWidth, height: newHeight } : w
                      );
                      setWidgets(updatedWidgets);
                    }}
                  >
                    {renderWidget(widget)}
                  </Widget>
                ))}
              </WidgetArea>
            )}
          </div>
        </main>
      </div>
      
      <WidgetGallery
        open={isWidgetGalleryOpen}
        onOpenChange={setIsWidgetGalleryOpen}
        onSelectWidget={handleAddWidget}
        userRole={user?.role || "user"}
      />
    </div>
  );
}