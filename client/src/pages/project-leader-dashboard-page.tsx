import { useState, useEffect } from "react";
import { 
  Sidebar, 
  Header, 
  Widget, 
  WidgetArea, 
  WidgetGallery
} from "@/components";
import ProjectTeamWidget from "@/components/ProjectTeamWidget";
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
import { PlusCircle, Home, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/contexts/ProjectContext";
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
  const { currentProject, projects, changeProject } = useProject();

  // Form för att hantera projektinställningar
  const form = useForm<ProjectSettingsFormValues>({
    defaultValues: {
      name: currentProject?.name || "Namnlöst projekt",
      description: currentProject?.description || "",
      deadline: ""
    }
  });

  // Uppdatera formuläret när aktuellt projekt ändras
  useEffect(() => {
    if (currentProject) {
      form.setValue('name', currentProject.name);
      form.setValue('description', currentProject.description || '');
      // Deadline can be set if needed
    }
  }, [currentProject, form]);

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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Add a new widget to the dashboard
  const handleAddWidget = (widgetType: WidgetType) => {
    const newWidget: WidgetInstance = {
      id: uuidv4(),
      type: widgetType.id,
      title: widgetType.name,
      projectId: currentProject?.id,
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
    if (currentProject) {
      form.setValue('name', currentProject.name);
      form.setValue('description', currentProject.description || '');
      form.setValue('deadline', ''); // Reset deadline field
    }
    
    setIsProjectSettingsOpen(true);
  };

  // Handle project settings form submission
  const onSubmitProjectSettings = async (data: ProjectSettingsFormValues) => {
    if (data.name.trim() && currentProject?.id) {
      try {
        // Anropa API för att uppdatera projektet
        const response = await fetch(`/api/projects/${currentProject.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: data.name.trim(),
            description: data.description.trim(),
            deadline: data.deadline || null
          })
        });
        
        if (response.ok) {
          // Uppdatera projektet i context via refetch
          if (changeProject) {
            // Byt till samma projekt för att refresha data
            changeProject(currentProject.id);
          }
          
          toast({
            title: "Project settings updated",
            description: "The project settings have been saved successfully",
          });
        } else {
          const errorData = await response.json();
          toast({
            title: "Failed to update project",
            description: errorData.error || "An error occurred while updating the project",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error updating project:", error);
        toast({
          title: "Failed to update project",
          description: "An error occurred while updating the project",
          variant: "destructive"
        });
      }
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
    // Always use the current selected project ID from context
    const projectId = currentProject?.id;
    
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
        {/* Använd bara ProjectContext för Header-komponenten */}
        <Header 
          title="Project Leader Dashboard" 
          onToggleSidebar={toggleSidebar}
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
              {currentProject && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium">{currentProject.name}</span>
                </>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-foreground">
                Project Leader Dashboard {currentProject && `- ${currentProject.name}`}
              </h1>
              
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
                {currentProject && (
                  <Button 
                    onClick={handleManageProjectClick}
                    variant="outline"
                    className="gap-1 text-sm"
                  >
                    <Settings className="h-4 w-4" />
                    Manage Project
                  </Button>
                )}
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
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Manage Project: {currentProject?.name}</DialogTitle>
            <DialogDescription>
              Update project settings and manage participants
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="settings" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Project Settings</TabsTrigger>
              <TabsTrigger value="team">Team Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="pt-4">
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
                          <Textarea {...field} />
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
                  
                  <div className="pt-4 flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsProjectSettingsOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="team" className="pt-4">
              <div>
                <h3 className="text-lg font-medium">Team Members</h3>
                <p className="text-sm text-muted-foreground">
                  Add or remove members from this project.
                </p>
              </div>
              
              <Separator className="my-4" />
              
              {currentProject?.id ? (
                <ProjectTeamWidget projectId={currentProject.id} />
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  Save the project first before adding team members.
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => setIsProjectSettingsOpen(false)}>
                  Close
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}