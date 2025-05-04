import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, isAfter, differenceInDays } from "date-fns";

interface Deadline {
  id: string;
  title: string;
  description?: string;
  dueDate: string; // ISO date string
  category: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

interface DeadlinesWidgetProps {
  limit?: number;
  projectId?: number;
}

export function DeadlinesWidget({ limit = 5, projectId }: DeadlinesWidgetProps) {
  // Fetch deadlines from API
  const { data: deadlines, isLoading } = useQuery({
    queryKey: ['deadlines', projectId],
    queryFn: async () => {
      // Simulate API call - in real implementation, replace with actual API call
      try {
        const response = await fetch(`/api/deadlines${projectId ? `?projectId=${projectId}` : ''}`);
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching deadlines:", error);
        return [];
      }
    }
  });
  
  // Check if a deadline is overdue
  const isOverdue = (deadline: Deadline) => {
    const now = new Date();
    const dueDate = parseISO(deadline.dueDate);
    return isAfter(now, dueDate);
  };
  
  // Get days until deadline
  const getDaysUntil = (dateString: string) => {
    const now = new Date();
    const date = parseISO(dateString);
    return differenceInDays(date, now);
  };
  
  // Get badge color based on days until deadline
  const getDeadlineBadgeStyle = (deadline: Deadline) => {
    if (deadline.completed) {
      return "bg-green-100 text-green-800";
    }
    
    if (isOverdue(deadline)) {
      return "bg-red-100 text-red-800";
    }
    
    const daysUntil = getDaysUntil(deadline.dueDate);
    
    if (daysUntil <= 2) {
      return "bg-orange-100 text-orange-800";
    }
    
    if (daysUntil <= 7) {
      return "bg-amber-100 text-amber-800";
    }
    
    return "bg-blue-100 text-blue-800";
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span>Upcoming Deadlines</span>
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
            <span className="ml-2 text-sm text-gray-500">Loading deadlines...</span>
          </div>
        ) : deadlines && deadlines.length > 0 ? (
          <div className="space-y-1">
            {deadlines.slice(0, limit).map((deadline: Deadline) => (
              <div key={deadline.id}>
                <div className="flex items-center py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">{deadline.category}</div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        getDeadlineBadgeStyle(deadline)
                      )}>
                        {isOverdue(deadline) && !deadline.completed 
                          ? "Overdue" 
                          : deadline.completed 
                            ? "Completed"
                            : `Due in ${getDaysUntil(deadline.dueDate)} days`
                        }
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium mt-0.5 text-gray-900">{deadline.title}</div>
                    
                    <div className="mt-1 flex items-center">
                      <div className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(parseISO(deadline.dueDate), "dd MMM yyyy")}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <Separator className="my-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
            <h3 className="text-sm font-medium text-gray-600">No upcoming deadlines</h3>
            <p className="text-xs text-gray-500 mt-1">You don't have any deadlines at the moment.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}