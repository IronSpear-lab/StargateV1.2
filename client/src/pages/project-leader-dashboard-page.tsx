import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Sidebar, 
  Header, 
  Widget, 
  WidgetArea, 
  WidgetGallery,
  ProjectTeamWidget
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
import { PlusCircle, Home, BarChart4, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import type { WidgetType } from "@/components/dashboard/WidgetGallery";
import {
  BudgetCostWidget,
  RevenueOverviewWidget,
  KpiMetricsWidget,
  AiForecastWidget
} from "@/components/dashboard/widgets/leader";

// Define a widget instance type for state management
type WidgetInstance = {
  id: string;
  type: string;
  title: string;
  projectId?: number;
  width: WidthType;
  height: HeightType;
};

// Define pre-configured dashboard widgets for project leaders
const defaultProjectLeaderWidgets: WidgetInstance[] = [
  {
    id: uuidv4(),
    type: "budget-cost",
    title: "BUDGET VS COST",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "revenue-overview",
    title: "REVENUE OVERVIEW",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "kpi-metrics",
    title: "KPI METRICS",
    width: "half",
    height: "medium"
  },
  {
    id: uuidv4(),
    type: "ai-forecast",
    title: "AI FORECAST",
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
    type: "tasks-overview",
    title: "TASKS OVERVIEW",
    width: "half",
    height: "medium"
  }
];

interface ProjectSettingsFormValues {
  name: string;
  description: string;
  deadline: string;
}

export default function ProjectLeaderDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [isWidgetGalleryOpen, setIsWidgetGalleryOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Track user's projects
  const [userProjects, setUserProjects] = useState<{id: number; name: string}[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | undefined>();
  
  // Mock project for when there are no projects (for demo purposes)
  const defaultProject = { id: 1, name: "Demo Project" };

  const form = useForm<ProjectSettingsFormValues>({
    defaultValues: {
      name: "ValvXlstart Development",
      description: "A comprehensive project management platform designed to streamline collaboration and document workflows.",
      deadline: "2023-12-31"
    }
  });

  // Load saved widgets from localStorage on first render
  // or use default widgets if none exist
  useEffect(() => {
    const savedWidgets = localStorage.getItem('project-leader-dashboard-widgets');
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
        setWidgets(defaultProjectLeaderWidgets);
      }
    } else {
      setWidgets(defaultProjectLeaderWidgets);
    }
  }, []);

  // Save widgets to localStorage when they change
  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('project-leader-dashboard-widgets', JSON.stringify(widgets));
    }
  }, [widgets]);

  // Fetch user's projects
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      const response = await fetch('/api/user-projects');
      if (!response.ok) {
        return [];
      }
      return response.json();
    }
  });

  // Update projects when data is loaded
  useEffect(() => {
    // Update userProjects from fetched data
    if (projects && projects.length > 0) {
      // Use data from server
      setUserProjects(projects);
      
      // Set current project if not already set
      if (!currentProjectId) {
        setCurrentProjectId(projects[0].id);
      }
    } else if (userProjects.length === 0) {
      // Create a default project if no projects exist
      setUserProjects([defaultProject]);
      if (!currentProjectId) {
        setCurrentProjectId(defaultProject.id);
      }
    }
  }, [projects, currentProjectId]);
  
  // Get current project object
  const currentProject = userProjects.find(p => p.id === currentProjectId) || 
    (userProjects.length > 0 ? userProjects[0] : defaultProject);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Add a new widget to the dashboard
  const handleAddWidget = (widgetType: WidgetType) => {
    const newWidget: WidgetInstance = {
      id: uuidv4(),
      type: widgetType.id,
      title: widgetType.name,
      projectId: currentProjectId || (userProjects.length > 0 ? userProjects[0].id : defaultProject.id),
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

  // Open project settings modal
  const handleManageProjectClick = () => {
    // Set form values based on current project
    form.setValue('name', currentProject.name);
    form.setValue('description', '');
    form.setValue('deadline', '');
    
    setIsProjectSettingsOpen(true);
  };

  // Handle project settings form submission
  const onSubmitProjectSettings = (data: ProjectSettingsFormValues) => {
    // Update current project name in the list
    if (data.name.trim()) {
      // Create a new project object with the updated name
      if (currentProjectId) {
        // Update existing project
        const updatedProjects = userProjects.map(p => 
          p.id === currentProjectId ? { ...p, name: data.name.trim() } : p
        );
        
        setUserProjects(updatedProjects);
        
        toast({
          title: "Project settings updated",
          description: "The project settings have been saved successfully",
        });
      } else {
        // Create a new project
        const newProject = {
          id: userProjects.length > 0 ? Math.max(...userProjects.map(p => p.id)) + 1 : 1,
          name: data.name.trim()
        };
        
        const updatedProjects = [...userProjects, newProject];
        setUserProjects(updatedProjects);
        setCurrentProjectId(newProject.id);
        
        toast({
          title: "Project created",
          description: `Project "${data.name}" has been created`,
        });
      }
      
      // In a real app, this would also save to the backend via API call
    }
    
    setIsProjectSettingsOpen(false);
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
    const projectId = currentProjectId || (userProjects.length > 0 ? userProjects[0].id : defaultProject.id);
    
    switch (widget.type) {
      case "budget-cost":
        return <BudgetCostWidget projectId={projectId} />;
      case "revenue-overview":
        return <RevenueOverviewWidget />;
      case "kpi-metrics":
        return <KpiMetricsWidget projectId={projectId} />;
      case "ai-forecast":
        return <AiForecastWidget projectId={projectId} />;
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
  
  if (user?.role !== "project_leader" && user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="mb-4">You need to be a Project Leader to access this dashboard.</p>
          <Link href="/dashboard">
            <Button>Go to Standard Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Project Leader Dashboard" 
          onToggleSidebar={toggleSidebar}
          currentProject={currentProject}
          availableProjects={userProjects}
          onProjectChange={(projectId) => {
            setCurrentProjectId(projectId);
            // Load project-specific data when changing projects
            toast({
              title: "Project changed",
              description: `Switched to ${userProjects.find((p) => p.id === projectId)?.name || 'new project'}`,
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
              <span className="text-muted-foreground">Project Leader Dashboard</span>
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-foreground">Project Leader Dashboard</h1>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    localStorage.removeItem('project-leader-dashboard-widgets');
                    setWidgets(defaultProjectLeaderWidgets);
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
                  onClick={handleManageProjectClick}
                  variant="outline"
                  className="gap-1 text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Manage Project
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

      <Dialog open={isProjectSettingsOpen} onOpenChange={setIsProjectSettingsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Project</DialogTitle>
            <DialogDescription>
              Update project settings and manage participants
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitProjectSettings)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsProjectSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}