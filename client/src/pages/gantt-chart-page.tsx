import React from 'react';
import { ModernGanttChart } from '@/components/ModernGanttChart';

export default function GanttChartPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Project Gantt Chart</h1>
      <ModernGanttChart />
    </div>
  );
}