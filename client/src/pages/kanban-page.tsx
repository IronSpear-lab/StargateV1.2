import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function KanbanPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [, params] = useRoute('/kanban/:projectId?');
  const projectId = params?.projectId ? parseInt(params.projectId) : 1;
  const [selectedProjectId, setSelectedProjectId] = useState<number>(projectId);

  // Fetch projects for the selector
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

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(parseInt(value));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Kanban Board" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-neutral-500">
                Manage your tasks visually using the Kanban board.
                Drag tasks between columns to update their status.
              </div>
              <div className="flex items-center">
                <span className="mr-2 text-sm">Project:</span>
                {isProjectsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Select 
                    value={selectedProjectId.toString()} 
                    onValueChange={handleProjectChange}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
          
          <KanbanBoard projectId={selectedProjectId} />
        </main>
      </div>
    </div>
  );
}
