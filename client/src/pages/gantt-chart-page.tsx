import React, { useState } from 'react';
import { ModernGanttChart } from '@/components/ModernGanttChart';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function GanttChartPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Modern Gantt Chart" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Project Timeline</h1>
            <p className="text-gray-500">Visualize task dependencies and project progress</p>
          </div>
          
          <ModernGanttChart />
        </main>
      </div>
    </div>
  );
}