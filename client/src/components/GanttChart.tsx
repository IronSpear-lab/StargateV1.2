import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface GanttTask {
  id: string;
  title: string;
  assignee: string;
  start: number; // percentage
  duration: number; // percentage
  color: string;
}

interface Month {
  id: string;
  name: string;
  width: number; // percentage
}

export function GanttChart() {
  const [months, setMonths] = useState<Month[]>([
    { id: "jan", name: "January", width: 25 },
    { id: "feb", name: "February", width: 25 },
    { id: "mar", name: "March", width: 25 },
    { id: "apr", name: "April", width: 25 }
  ]);
  
  const [tasks, setTasks] = useState<GanttTask[]>([
    {
      id: "task-1",
      title: "Research & Requirements",
      assignee: "John Doe",
      start: 5,
      duration: 30,
      color: "bg-primary-500"
    },
    {
      id: "task-2",
      title: "UI Design",
      assignee: "Maria Kim",
      start: 25,
      duration: 40,
      color: "bg-warning-500"
    },
    {
      id: "task-3",
      title: "Frontend Development",
      assignee: "Alex Smith",
      start: 40,
      duration: 45,
      color: "bg-info-500"
    },
    {
      id: "task-4",
      title: "Backend Development",
      assignee: "Sam Taylor",
      start: 45,
      duration: 50,
      color: "bg-success-500"
    }
  ]);
  
  const addNewTask = () => {
    // Functionality to add a new task would go here
    console.log("Add new task");
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Project Timeline</h2>
        <div className="flex space-x-2">
          <Button variant="outline" className="gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button onClick={addNewTask} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>
      
      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-max">
            {/* Header Row */}
            <div className="flex border-b border-neutral-200">
              <div className="w-64 p-3 border-r border-neutral-200 font-medium">Task</div>
              <div className="flex-1 flex">
                {months.map(month => (
                  <div 
                    key={month.id}
                    className={cn(
                      "p-3 font-medium text-center border-r border-neutral-200",
                      month.id === "apr" && "border-r-0"
                    )}
                    style={{ width: `${month.width}%` }}
                  >
                    {month.name}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Gantt Chart Rows */}
            <div>
              {tasks.map(task => (
                <div key={task.id} className="flex border-b border-neutral-200 hover:bg-neutral-50">
                  <div className="w-64 p-3 border-r border-neutral-200">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-neutral-500">{task.assignee}</p>
                  </div>
                  <div className="flex-1 p-2 relative h-16">
                    <div 
                      className={cn("gantt-chart task-bar absolute", task.color)}
                      style={{ 
                        left: `${task.start}%`, 
                        width: `${task.duration}%`, 
                        top: '50%', 
                        transform: 'translateY(-50%)' 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
