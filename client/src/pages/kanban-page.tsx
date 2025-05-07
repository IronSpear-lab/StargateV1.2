import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { KanbanBoard } from "@/components/KanbanBoard";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProject } from "@/contexts/ProjectContext";

export default function KanbanPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { currentProject, projects, changeProject } = useProject();
  
  // Använd projektID från projektkontext om det finns
  const projectId = currentProject?.id;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleProjectChange = (value: string) => {
    const projectId = parseInt(value);
    changeProject(projectId);
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
                <div className="text-sm font-medium">
                  {currentProject ? currentProject.name : 'No Project Selected'}
                </div>
              </div>
            </div>
          </div>
          
          {!currentProject ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-lg text-muted-foreground mb-4">
                Select a project to view its tasks
              </p>
              <p className="text-sm text-muted-foreground">
                No project is currently selected. Choose a project from the dropdown in the header.
              </p>
            </div>
          ) : (
            <KanbanBoard projectId={currentProject.id} />
          )}
        </main>
      </div>
    </div>
  );
}
