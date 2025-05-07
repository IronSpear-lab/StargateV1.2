import React from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import ModernGanttChart from '@/components/ModernGanttChart';
import { useQuery } from '@tanstack/react-query';
import { useProject } from '@/contexts/ProjectContext';
import { Loader2 } from 'lucide-react';

function GanttChartPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const { currentProject } = useProject();
  
  // Hämta Gantt-data baserat på aktuellt projekt
  const { isLoading } = useQuery({
    queryKey: ['/api/gantt-data', currentProject?.id],
    queryFn: async () => {
      // I framtiden skulle vi hämta projektspecifik Gantt-data här
      if (!currentProject) return undefined;
      
      try {
        // Här skulle du anropa API:et med projektets ID
        // const response = await fetch(`/api/gantt-data?projectId=${currentProject.id}`);
        // return await response.json();
        return undefined; // För nu returnerar vi undefined som placeholder
      } catch (error) {
        console.error('Error fetching gantt data:', error);
        return undefined;
      }
    },
    enabled: !!currentProject,
    staleTime: 60000, // Uppfräscha data varje minut
  });
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950">
      <Sidebar className={sidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gantt Chart" 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 bg-gray-100 dark:bg-slate-950">
          <div className="container mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Project Timeline
                {currentProject && <span className="ml-2 text-gray-500 dark:text-gray-400">
                  {currentProject.name}
                </span>}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Visualize and manage project tasks, milestones, and phases using the Gantt chart below.
                Each project has its own independent Gantt chart data.
              </p>
            </div>
            
            {!currentProject ? (
              <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">
                  Select a project to view its Gantt chart
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No project is currently selected. Choose a project from the dropdown in the header.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <ModernGanttChart projectId={currentProject.id} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default GanttChartPage;