import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Calendar,
  ClipboardList,
  FileText,
  Book,
  FolderOpen,
  Clock,
  Users,
  Edit,
  Share
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GanttChart } from "@/components/GanttChart";
import { KanbanBoard } from "@/components/KanbanBoard";
import { WikiEditor } from "@/components/WikiEditor";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link, useRoute, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectDetailPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [match, params] = useRoute("/projects/:id");
  const projectId = params?.id ? parseInt(params.id) : 0;
  
  // Parsa query-parametrar från URL:en
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const tabParam = urlParams.get('tab');
  const taskIdParam = urlParams.get('taskId');
  
  // Sätt default-fliken baserat på URL-parametrar
  const [activeTab, setActiveTab] = useState(tabParam || "overview");
  
  // Håll koll på taskId som ska fokuseras
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(taskIdParam);
  
  // Hämta uppgiftstyp för att kunna dirigera till rätt flik
  const { data: taskTypeData } = useQuery<{ type: string; id: number; title: string } | null>({
    queryKey: ['/api/tasks/type', { taskId: taskIdParam }],
    queryFn: async () => {
      if (!taskIdParam) return null;
      try {
        const response = await apiRequest('GET', `/api/tasks/${taskIdParam}/type`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching task type:", error);
        return null;
      }
    },
    enabled: !!taskIdParam
  });
  
  // Lyssna efter förändringar i URL-parametrar och uppdatera state
  useEffect(() => {
    // Uppdatera URL-parametrarna om användaren ändrar flik manuellt
    const newUrlParams = new URLSearchParams(location.split('?')[1] || '');
    const newTabParam = newUrlParams.get('tab');
    const newTaskIdParam = newUrlParams.get('taskId');
    
    if (newTaskIdParam && (!newTabParam || newTabParam === "overview")) {
      // Om vi har ett taskId men ingen specificerad flik eller overview är vald, 
      // försök identifiera korrekt flik baserat på cachelagrad uppgiftstyp
      const cachedTaskType = queryClient.getQueryData<{ type: string; id: number; title: string } | null>(['/api/tasks/type', { taskId: newTaskIdParam }]);
      
      // Utred vilken flik vi bör navigera till baserat på uppgiftstyp
      if (cachedTaskType) {
        if (cachedTaskType.type === "gantt") {
          console.log(`Automatisk navigering till Gantt-fliken för uppgift: ${newTaskIdParam}`);
          // Ändra till timeline-fliken för Gantt-uppgifter
          setActiveTab("timeline");
          return; // Avsluta tidigt så vi inte dubbeluppdaterar tab
        } else {
          console.log(`Automatisk navigering till Kanban-fliken för uppgift: ${newTaskIdParam}`);
          // Ändra till tasks-fliken för andra typer (kanban, etc.)
          setActiveTab("tasks");
          return; // Avsluta tidigt så vi inte dubbeluppdaterar tab
        }
      }
    }
    
    if (newTabParam && newTabParam !== activeTab) {
      console.log(`Uppdaterar aktiv flik från ${activeTab} till ${newTabParam}`);
      setActiveTab(newTabParam);
    }
    
    if (newTaskIdParam !== focusedTaskId) {
      console.log(`Uppdaterar fokuserad uppgift: ${newTaskIdParam}`);
      setFocusedTaskId(newTaskIdParam);
    }
  }, [location, taskTypeData]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch project details
  const { 
    data: project, 
    isLoading, 
    isError 
  } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    queryFn: async () => {
      if (!projectId) return null;
      try {
        const response = await apiRequest('GET', `/api/projects/${projectId}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching project:", error);
        throw error;
      }
    },
    enabled: !!projectId
  });

  // Fetch tasks for the project
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks', { projectId }],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const response = await apiRequest('GET', `/api/tasks?projectId=${projectId}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
    },
    enabled: !!projectId
  });

  // Setup form with project data
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });

  // Update form values when project data is loaded
  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name || "",
        description: project.description || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
      });
    }
  }, [project, form]);

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (projectData: ProjectFormValues) => {
      const response = await apiRequest('PATCH', `/api/projects/${projectId}`, projectData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({
        title: "Project updated",
        description: "Project has been updated successfully",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: ProjectFormValues) => {
    updateProjectMutation.mutate(values);
  };

  // Open edit project dialog
  const openEditDialog = () => {
    if (project) {
      form.reset({
        name: project.name || "",
        description: project.description || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
      });
      setIsEditDialogOpen(true);
    }
  };

  if (isError) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar className={isSidebarOpen ? "" : "hidden"} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Project Details" onToggleSidebar={toggleSidebar} />
          
          <main className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col items-center justify-center h-full">
              <div className="max-w-md text-center">
                <h1 className="text-xl font-semibold mb-2">Project Not Found</h1>
                <p className="text-neutral-500 mb-4">
                  The project you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button asChild>
                  <Link href="/projects">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Projects
                  </Link>
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={project?.name || "Project Details"} onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="mb-6">
              <div className="flex justify-between mb-4">
                <div>
                  <Skeleton className="h-8 w-[200px] mb-2" />
                  <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[100px] rounded-md" />
              </div>
              <Card className="mb-6">
                <CardHeader>
                  <Skeleton className="h-6 w-[150px] mb-2" />
                  <Skeleton className="h-4 w-[250px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-[80%]" />
                </CardContent>
              </Card>
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <Button variant="ghost" asChild className="mb-2 -ml-3 text-neutral-500 hover:text-primary-500 hover:bg-neutral-100">
                      <Link href="/projects">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Projects
                      </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">{project?.name}</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                      Created on {format(new Date(project?.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Share className="h-4 w-4" />
                      Share
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={openEditDialog}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
              
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Project Overview</CardTitle>
                  <CardDescription>
                    Key information about this project
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-neutral-500">Description</h4>
                    <p className="text-sm">{project?.description || "No description provided"}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-neutral-500">Status</h4>
                    <div className="flex">
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                        In Progress
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-neutral-500">Team</h4>
                    <div className="flex -space-x-2">
                      <Avatar className="h-8 w-8 border-2 border-white">
                        <AvatarFallback className="bg-primary-100 text-primary-600 text-xs">
                          AS
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-8 w-8 border-2 border-white">
                        <AvatarFallback className="bg-warning-100 text-warning-600 text-xs">
                          JD
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-8 w-8 border-2 border-white">
                        <AvatarFallback className="bg-success-100 text-success-600 text-xs">
                          MK
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardContent>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-neutral-50 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary-500" />
                        <span className="text-sm font-medium">Tasks</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">{tasks?.length || 0}</p>
                      <p className="text-xs text-neutral-500">
                        {tasks?.filter((t: any) => t.status === 'done').length || 0} completed
                      </p>
                    </div>
                    
                    <div className="bg-neutral-50 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        <span className="text-sm font-medium">Time Tracked</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">0h</p>
                      <p className="text-xs text-neutral-500">
                        No time entries
                      </p>
                    </div>
                    
                    <div className="bg-neutral-50 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium">Files</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">0</p>
                      <p className="text-xs text-neutral-500">
                        No files uploaded
                      </p>
                    </div>
                    
                    <div className="bg-neutral-50 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">Team Members</span>
                      </div>
                      <p className="text-2xl font-bold mt-2">3</p>
                      <p className="text-xs text-neutral-500">
                        Active collaborators
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start bg-transparent p-0 mb-4">
                  <TabsTrigger 
                    value="overview" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:shadow-none"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tasks" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:shadow-none"
                  >
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger 
                    value="timeline" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:shadow-none"
                  >
                    Gantt Chart
                  </TabsTrigger>
                  <TabsTrigger 
                    value="wiki" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:shadow-none"
                  >
                    Wiki
                  </TabsTrigger>
                  <TabsTrigger 
                    value="files" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary-500 data-[state=active]:shadow-none"
                  >
                    Files
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="pt-2">
                  <div className="bg-neutral-50 p-4 border rounded-md text-center">
                    <p className="text-neutral-500">
                      Project dashboard showing key metrics and recent activities will appear here.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="tasks" className="pt-2">
                  <KanbanBoard 
                    projectId={projectId} 
                    focusTaskId={activeTab === "tasks" ? focusedTaskId : null} 
                  />
                </TabsContent>
                
                <TabsContent value="timeline" className="pt-2">
                  <GanttChart 
                    projectId={projectId} 
                    focusTaskId={activeTab === "timeline" ? focusedTaskId : null} 
                  />
                </TabsContent>
                
                <TabsContent value="wiki" className="pt-2">
                  <WikiEditor />
                </TabsContent>
                
                <TabsContent value="files" className="pt-2">
                  <div className="bg-neutral-50 p-4 border rounded-md text-center">
                    <FolderOpen className="h-12 w-12 mx-auto text-neutral-400" />
                    <h3 className="text-lg font-medium mt-2">No files yet</h3>
                    <p className="text-neutral-500 mt-1 mb-4">
                      Upload files to this project to start collaborating.
                    </p>
                    <Button variant="outline">
                      Upload Files
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </main>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
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
                      <Textarea 
                        placeholder="Describe the project" 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProjectMutation.isPending}>
                  {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}