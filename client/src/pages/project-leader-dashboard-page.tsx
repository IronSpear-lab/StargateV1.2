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
  AiForecastWidget,
  FolderManagementWidget,
  TaskHoursWidget
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
    title: "INTÄKTSÖVERSIKT",
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
    type: "folder-management",
    title: "MAPPHANTERING",
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
      title: "Widget tillagd",
      description: `${widgetType.name} har lagts till i din dashboard`,
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
          console.log("Project updated successfully:", response);
          
          // Uppdatera projektet i context via changeProject
          if (changeProject) {
            // Anropa changeProject för att refresha alla projektdata
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
      title: "Widget borttagen",
      description: "Widgeten har tagits bort från din dashboard",
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
        return <RevenueOverviewWidget projectId={projectId} />;
      case "kpi-metrics":
        return <KpiMetricsWidget projectId={projectId} />;
      case "ai-forecast":
        return <AiForecastWidget projectId={projectId} />;
      case "folder-management":
        return <FolderManagementWidget />;
      case "task-hours":
        return <TaskHoursWidget projectId={projectId || 0} width="half" height="medium" />;
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
        <div className="text-center p-8 bg-card rounded-lg border border-border/30 shadow-lg backdrop-blur-sm">
          <h1 className="text-2xl font-bold mb-3 text-primary">Åtkomst nekad</h1>
          <p className="mb-5 text-muted-foreground">Du måste vara Projektledare för att komma åt denna dashboard.</p>
          <Link href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90 transition-all">
              Gå till Standarddashboard
            </Button>
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
          title="Projektledardashboard" 
          onToggleSidebar={toggleSidebar}
        />
        
        <main 
          className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background relative"
          style={{
            background: "linear-gradient(135deg, var(--background) 0%, var(--card-foreground-rgb)/0.01 100%)",
          }}
        >
          {/* Dekorativa element för futuristisk känsla */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 20%, var(--primary)/0.15 0%, transparent 40%)",
              zIndex: 0
            }}
          />
          <div 
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: "radial-gradient(circle at 80% 80%, var(--primary)/0.2 0%, transparent 40%)",
              zIndex: 0
            }}
          />
          
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 relative z-10">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm mb-5">
              <Link href="/" className="text-primary hover:text-primary/80 transition-colors">
                <Home className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">Projektledardashboard</span>
              {currentProject && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-medium">{currentProject.name}</span>
                </>
              )}
            </div>
            
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-xl font-bold text-foreground flex items-center space-x-2">
                <span className="bg-primary/10 p-2 rounded-full">
                  <Settings className="h-5 w-5 text-primary" />
                </span>
                <span>
                  Projektledardashboard {currentProject && `- ${currentProject.name}`}
                </span>
              </h1>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    localStorage.removeItem('project-leader-dashboard-widgets');
                    setWidgets(defaultProjectLeaderWidgets);
                    toast({
                      title: "Dashboard återställd",
                      description: "Din dashboard har återställts till standardinställningarna",
                    });
                  }}
                  variant="outline"
                  className="gap-1 text-sm transition-all"
                >
                  Återställ dashboard
                </Button>
                {currentProject && (
                  <Button 
                    onClick={handleManageProjectClick}
                    variant="outline"
                    className="gap-1 text-sm transition-all"
                  >
                    <Settings className="h-4 w-4" />
                    Hantera projekt
                  </Button>
                )}
                <Button 
                  onClick={handleAddWidgetClick} 
                  className="gap-1 bg-primary hover:bg-primary/90 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  Lägg till widget
                </Button>
              </div>
            </div>
            
            {widgets.length === 0 ? (
              <div className="bg-card/80 border border-dashed border-border rounded-lg p-10 text-center shadow-md backdrop-blur-sm">
                <div className="mb-5 text-primary/70">
                  <Settings className="h-12 w-12 mx-auto animate-pulse opacity-70" />
                </div>
                <h3 className="font-medium text-lg mb-2 text-foreground">Din dashboard är tom</h3>
                <p className="text-muted-foreground mb-5">
                  Lägg till widgets för att anpassa din dashboard
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleAddWidgetClick}
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10 transition-all px-5 py-2 h-auto"
                >
                  <PlusCircle className="h-4 w-4" />
                  Lägg till din första widget
                </Button>
              </div>
            ) : (
              <WidgetArea 
                onWidgetPositionChange={handleWidgetPositionChange}
                className="gap-5 p-1"
              >
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
        <DialogContent className="sm:max-w-[800px] bg-card/95 backdrop-blur-md border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <span className="bg-primary/10 p-1.5 rounded-full">
                <Settings className="h-5 w-5 text-primary" />
              </span>
              <span>Hantera projekt: <span className="text-primary">{currentProject?.name}</span></span>
            </DialogTitle>
            <DialogDescription>
              Uppdatera projektinställningar och hantera deltagare
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="settings" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20">Projektinställningar</TabsTrigger>
              <TabsTrigger value="team" className="data-[state=active]:bg-primary/20">Teamhantering</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="pt-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitProjectSettings)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projektnamn</FormLabel>
                        <FormControl>
                          <Input {...field} className="backdrop-blur-sm bg-background/70" />
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
                        <FormLabel>Beskrivning</FormLabel>
                        <FormControl>
                          <Textarea {...field} className="backdrop-blur-sm bg-background/70 min-h-[100px]" />
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
                        <FormLabel>Slutdatum</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="backdrop-blur-sm bg-background/70" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-5 flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      type="button" 
                      onClick={() => setIsProjectSettingsOpen(false)}
                      className="transition-all"
                    >
                      Avbryt
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-primary hover:bg-primary/90 transition-all"
                    >
                      Spara ändringar
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="team" className="pt-5">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span className="bg-primary/10 p-1.5 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </span>
                  <span>Teammedlemmar</span>
                </h3>
                <p className="text-sm text-muted-foreground ml-8 mt-1">
                  Lägg till eller ta bort medlemmar från detta projekt.
                </p>
              </div>
              
              <Separator className="my-5" />
              
              {currentProject?.id ? (
                <ProjectTeamWidget projectId={currentProject.id} />
              ) : (
                <div className="py-8 text-center text-muted-foreground bg-background/30 rounded-lg backdrop-blur-sm">
                  Spara projektet först innan du lägger till teammedlemmar.
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setIsProjectSettingsOpen(false)}
                  className="transition-all"
                >
                  Stäng
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}