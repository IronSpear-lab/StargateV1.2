import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Sidebar, 
  Header, 
  Widget, 
  WidgetArea, 
  WidgetGallery
} from "@/components";
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
import { Link } from "wouter";
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

// Define pre-configured dashboard widgets based on the screenshot
const defaultWidgets: WidgetInstance[] = [
  {
    id: uuidv4(),
    type: "custom-text",
    title: "CUSTOM TEXT",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "calendar",
    title: "CALENDAR",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "messages",
    title: "MESSAGES",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "deadlines",
    title: "UPCOMING DEADLINES",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "field-tasks",
    title: "MY FIELD TASKS",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "recent-files",
    title: "RECENT FILES IN BOX",
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

  // Load saved widgets from localStorage on first render
  // or use default widgets if none exist
  useEffect(() => {
    const savedWidgets = localStorage.getItem('dashboard-widgets');
    if (savedWidgets) {
      try {
        setWidgets(JSON.parse(savedWidgets));
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

  // Fetch user's projects
  const { data: projects } = useQuery({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      const response = await fetch('/api/user-projects');
      if (!response.ok) {
        return [];
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
    switch (widget.type) {
      case "custom-text":
        return <CustomTextWidget id={widget.id} />;
      case "calendar":
        return <CalendarWidget projectId={widget.projectId} />;
      case "messages":
        return <MessagesWidget limit={5} />;
      case "deadlines":
        return <DeadlinesWidget projectId={widget.projectId} />;
      case "field-tasks":
        return <FieldTasksWidget limit={5} />;
      case "recent-files":
        return <RecentFilesWidget projectId={widget.projectId} />;
      case "tasks-overview":
        return <TasksOverviewWidget projectId={widget.projectId} />;
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
        <Header title="Dashboard" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm mb-5">
              <Link href="/" className="text-blue-600 hover:text-blue-700">
                <Home className="h-4 w-4" />
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-500">Dashboard</span>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
              
              <Button 
                onClick={handleAddWidgetClick} 
                className="gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <PlusCircle className="h-4 w-4" />
                Add widget
              </Button>
            </div>
            
            {widgets.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-lg p-8 text-center shadow-sm">
                <h3 className="font-medium text-lg mb-2 text-gray-700">Your dashboard is empty</h3>
                <p className="text-gray-500 mb-4">
                  Add widgets to customize your dashboard experience
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleAddWidgetClick}
                  className="gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
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