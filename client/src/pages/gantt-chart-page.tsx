import React from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import ModernGanttChart from '@/components/ModernGanttChart';
import { useQuery } from '@tanstack/react-query';

function GanttChartPage() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  
  // Viktigt: detta är ett "dummy" anrop bara för att ladda data, men vi använder inte datan
  // Detta ser till att React Query fortfarande laddar data i bakgrunden vilket är nödvändigt
  // för att useAuth med ProtectedRoute ska fungera, men vi använder inte själva dataresultatet
  // i denna komponent då vår Gantt Chart har helt egen, separerad demo-data
  const { isLoading } = useQuery({
    queryKey: ['/api/fake-gantt-data'],
    queryFn: async () => {
      return undefined; // Returnera undefined för att undvika att spara data i cachen
    },
    retry: false,
    staleTime: Infinity, // Förhindra automatisk omfråga
  });
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-950">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Gantt Chart" 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 bg-gray-100 dark:bg-slate-950">
          <div className="container mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Project Timeline</h1>
              <p className="text-gray-600 dark:text-gray-300">
                Visualize and manage project tasks, milestones, and phases using the Gantt chart below.
                This Gantt Chart is completely separate from the Kanban board and uses its own dedicated data.
              </p>
            </div>
            
            <ModernGanttChart />
          </div>
        </main>
      </div>
    </div>
  );
}

export default GanttChartPage;