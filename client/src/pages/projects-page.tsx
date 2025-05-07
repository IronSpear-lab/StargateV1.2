import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Folder, Calendar, Clock, Users, ArrowUpRight } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Fetch projects that the user has access to
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user-projects');
        return await response.json();
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    }
  });

  // Setup form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: ProjectFormValues) => {
      const response = await apiRequest('POST', '/api/projects', projectData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-projects'] });
      toast({
        title: "Project created",
        description: "Project has been created successfully",
      });
      setIsCreateDialogOpen(false);
      navigate(`/projects/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (values: ProjectFormValues) => {
    createProjectMutation.mutate(values);
  };

  // Open create project dialog
  const openCreateDialog = () => {
    form.reset();
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Projects" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                <p className="text-sm text-neutral-500 mt-1">
                  Create and manage your projects and collaborate with team members.
                </p>
              </div>
              <Button onClick={openCreateDialog} className="gap-1">
                <PlusCircle className="h-4 w-4" />
                Create Project
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-0">
                    <Skeleton className="h-6 w-[200px] mb-2" />
                    <Skeleton className="h-4 w-[150px]" />
                  </CardHeader>
                  <CardContent className="py-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-[80%]" />
                  </CardContent>
                  <CardFooter className="border-t pt-3 pb-5 px-6 flex justify-between">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-8 w-[80px] rounded-md" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {projects && projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project: any) => (
                    <Card key={project.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between items-start">
                          <div className="truncate">{project.name}</div>
                          <Folder className="h-5 w-5 flex-shrink-0 text-primary-500" />
                        </CardTitle>
                        <CardDescription>
                          {new Date(project.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm text-neutral-600 line-clamp-2">
                          {project.description || "No description provided"}
                        </p>
                      </CardContent>
                      <CardFooter className="border-t pt-3 pb-5 px-6 flex justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-neutral-100">
                            <Users className="h-3 w-3 mr-1" />
                            <span className="text-xs">{project.role}</span>
                          </Badge>
                        </div>
                        <Button 
                          asChild 
                          size="sm" 
                          variant="outline" 
                          className="gap-1 text-xs"
                        >
                          <Link href={`/projects/${project.id}`}>
                            View Details
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Folder className="mx-auto h-12 w-12 text-neutral-400" />
                  <h3 className="mt-3 text-lg font-semibold">No projects yet</h3>
                  <p className="mt-2 text-sm text-neutral-500">
                    Get started by creating your first project.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4" 
                    onClick={openCreateDialog}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Project
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new project.
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
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}