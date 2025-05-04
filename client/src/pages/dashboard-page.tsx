import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Sidebar, 
  Header, 
  Widget, 
  WidgetArea, 
  WidgetGallery,
  TasksOverviewWidget 
} from "@/components";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { WidgetType } from "@/components/dashboard/WidgetGallery";

// Define a widget instance type for state management
type WidgetInstance = {
  id: string;
  type: string;
  title: string;
  projectId?: number;
  width: string;
  height: string;
};

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [isWidgetGalleryOpen, setIsWidgetGalleryOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user's projects
  const { data: projects } = useQuery({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      const response = await fetch('/api/user-projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    }
  });

  // Default project ID (first project in list)
  const defaultProjectId = projects && projects.length > 0 ? projects[0].id : undefined;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Add a new widget to the dashboard
  const handleAddWidget = (widgetType: WidgetType) => {
    const newWidget: WidgetInstance = {
      id: uuidv4(),
      type: widgetType.id,
      title: widgetType.name,
      projectId: defaultProjectId,
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
    switch (widget.type) {
      case "tasks-overview":
        return <TasksOverviewWidget projectId={widget.projectId} />;
      // Add cases for other widget types here as they are implemented
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Widget content not implemented</p>
          </div>
        );
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">My Dashboard</h1>
              <Button onClick={() => setIsWidgetGalleryOpen(true)} className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Add Widget
              </Button>
            </div>
            
            {widgets.length === 0 ? (
              <div className="bg-muted/30 border border-dashed border-muted rounded-lg p-8 text-center">
                <h3 className="font-medium text-lg mb-2">Your dashboard is empty</h3>
                <p className="text-muted-foreground mb-4">
                  Add widgets to customize your dashboard experience
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setIsWidgetGalleryOpen(true)}
                  className="gap-1"
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