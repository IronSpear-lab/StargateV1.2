import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { GanttChart } from "@/components/GanttChart";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function GanttPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [, params] = useLocation();

  // Fetch projects for the dropdown
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/projects');
        return await response.json();
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
    }
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // When projects are loaded, set the initial selected project
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(Number(value));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Gantt Chart" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-64">
                    <Label htmlFor="project-select" className="mb-2 block">
                      Select Project
                    </Label>
                    <Select
                      value={selectedProjectId?.toString()}
                      onValueChange={handleProjectChange}
                      disabled={isProjectsLoading || !projects || projects.length === 0}
                    >
                      <SelectTrigger id="project-select" className="w-full">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects && projects.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    {selectedProjectId && projects && (
                      <div>
                        <h3 className="font-medium">
                          {projects.find((p: any) => p.id === selectedProjectId)?.name || 'Loading project...'}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {projects.find((p: any) => p.id === selectedProjectId)?.description || ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {selectedProjectId && (
            <GanttChart projectId={selectedProjectId} />
          )}
        </main>
      </div>
    </div>
  );
}