import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FieldTask {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "canceled";
  location?: string;
  priority: "high" | "medium" | "low";
  assignee?: string;
}

interface FieldTasksWidgetProps {
  limit?: number;
}

export function FieldTasksWidget({ limit = 5 }: FieldTasksWidgetProps) {
  // Fetch field tasks from API
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['field-tasks'],
    queryFn: async () => {
      // Simulate API call - in real implementation, replace with actual API call
      try {
        const response = await fetch('/api/field-tasks');
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching field tasks:", error);
        return [];
      }
    }
  });
  
  // Mark task as completed
  const handleCompleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In real implementation, make API call to mark task as completed
    console.log(`Marking task ${id} as completed`);
  };
  
  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "canceled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  
  // Get priority indicator style
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };
  
  // Task card component
  const TaskCard = ({ task }: { task: FieldTask }) => (
    <div className="relative hover:bg-gray-50 rounded-md transition-colors cursor-pointer group">
      <div className="flex py-2.5 px-3">
        <div 
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 rounded-l-md",
            getPriorityStyle(task.priority)
          )}
        />
        
        <div className="flex-1 pl-1.5">
          <div className="flex items-center justify-between">
            <Badge 
              variant="outline" 
              className={cn(
                "px-2 py-0.5 text-xs font-normal border",
                getStatusBadgeStyle(task.status)
              )}
            >
              {task.status.replace('_', ' ')}
            </Badge>
            
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 rounded-full",
                task.status === "completed" 
                  ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                  : "text-gray-400 hover:text-gray-500 hover:bg-gray-50"
              )}
              onClick={(e) => handleCompleteTask(task.id, e)}
              disabled={task.status === "completed"}
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          </div>
          
          <h4 className="text-sm font-medium mt-1.5 text-gray-900">{task.title}</h4>
          
          {task.location && (
            <div className="text-xs text-gray-500 mt-1">
              Location: {task.location}
            </div>
          )}
          
          {task.assignee && (
            <div className="text-xs text-gray-500 mt-0.5">
              Assigned to: {task.assignee}
            </div>
          )}
        </div>
        
        <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2" />
      </div>
      <Separator className="my-1" />
    </div>
  );
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <CheckSquare className="h-4 w-4 text-blue-500" />
          <span>My Field Tasks</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-blue-600 text-xs font-normal"
        >
          View All
        </Button>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500">Loading tasks...</span>
          </div>
        ) : tasks && tasks.length > 0 ? (
          <div>
            {tasks.slice(0, limit).map((task: FieldTask) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
            <h3 className="text-sm font-medium text-gray-600">No field tasks</h3>
            <p className="text-xs text-gray-500 mt-1">You don't have any field tasks assigned.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}