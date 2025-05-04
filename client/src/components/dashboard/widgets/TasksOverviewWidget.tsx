import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Circle, Clock, ListTodo, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

interface TaskGroup {
  status: string;
  count: number;
  color: string;
}

interface TasksOverviewWidgetProps {
  projectId?: number;
}

export function TasksOverviewWidget({ projectId }: TasksOverviewWidgetProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks-overview', projectId],
    queryFn: async () => {
      // In real implementation, fetch tasks from API
      try {
        const response = await fetch(`/api/tasks${projectId ? `?projectId=${projectId}` : ''}`);
        if (!response.ok) {
          return {
            taskGroups: [],
            totalCount: 0,
            completedCount: 0,
            tasksByStatus: {}
          };
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching tasks:", error);
        return {
          taskGroups: [],
          totalCount: 0,
          completedCount: 0,
          tasksByStatus: {}
        };
      }
    }
  });
  
  // Task group status colors
  const statusColors: Record<string, { color: string, bg: string, text: string }> = {
    todo: { color: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    in_progress: { color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
    review: { color: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700" },
    done: { color: "bg-green-500", bg: "bg-green-50", text: "text-green-700" }
  };
  
  // Get default task groups if none from API
  const getDefaultTaskGroups = (): TaskGroup[] => [
    { status: "todo", count: 4, color: statusColors.todo.color },
    { status: "in_progress", count: 5, color: statusColors.in_progress.color },
    { status: "review", count: 2, color: statusColors.review.color },
    { status: "done", count: 8, color: statusColors.done.color }
  ];
  
  // Derived data
  const taskGroups = tasks?.taskGroups || getDefaultTaskGroups();
  const totalCount = tasks?.totalCount || taskGroups.reduce((sum: number, group: TaskGroup) => sum + group.count, 0);
  const completedCount = tasks?.completedCount || taskGroups.find((g: TaskGroup) => g.status === "done")?.count || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Format status label (todo → To Do)
  const formatStatusLabel = (status: string) => {
    return status
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <ListTodo className="h-4 w-4 text-blue-500" />
          <span>Tasks Overview</span>
        </div>
      </div>
      
      {/* Progress section */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-sm font-medium text-gray-900">Overall Progress</div>
          <div className="text-sm font-medium text-gray-900">{completionPercentage}%</div>
        </div>
        <Progress value={completionPercentage} className="h-2" />
        <div className="mt-1.5 text-xs text-gray-500 flex justify-between">
          <span>Total Tasks: {totalCount}</span>
          <span>Completed: {completedCount}</span>
        </div>
      </div>
      
      {/* Task status breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {taskGroups.map((group) => (
          <button
            key={group.status}
            className={cn(
              "p-3 rounded-md border border-gray-100 flex flex-col transition-colors",
              statusColors[group.status]?.bg,
              selectedStatus === group.status && "ring-2 ring-offset-1",
              statusColors[group.status]?.text
            )}
            onClick={() => setSelectedStatus(selectedStatus === group.status ? null : group.status)}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs">{formatStatusLabel(group.status)}</div>
              <div 
                className={cn(
                  "h-2 w-2 rounded-full",
                  group.color
                )}
              />
            </div>
            <div className="text-xl font-semibold mt-1">{group.count}</div>
          </button>
        ))}
      </div>
      
      {/* Recent tasks list */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-gray-500">RECENT TASKS</div>
          {selectedStatus && (
            <button 
              className="text-xs text-blue-600"
              onClick={() => setSelectedStatus(null)}
            >
              Clear filter
            </button>
          )}
        </div>
        
        <ScrollArea className="flex-1 pr-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-sm text-gray-500">Loading tasks...</span>
            </div>
          ) : tasks?.tasksByStatus && Object.keys(tasks.tasksByStatus).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(tasks.tasksByStatus)
                .filter(([status]) => !selectedStatus || status === selectedStatus)
                .flatMap(([status, taskList]) => 
                  taskList.map((task: any) => (
                    <div key={task.id} className="group">
                      <div className="flex py-2 px-3 rounded-md hover:bg-gray-50 cursor-pointer">
                        <div 
                          className={cn(
                            "mt-0.5 h-4 w-4 rounded-full flex items-center justify-center border",
                            status === "done" 
                              ? "border-green-500 bg-green-50" 
                              : "border-gray-300"
                          )}
                        >
                          {status === "done" && (
                            <CheckSquare className="h-3 w-3 text-green-500" />
                          )}
                          {status === "in_progress" && (
                            <Clock className="h-3 w-3 text-amber-500" />
                          )}
                          {status === "todo" && (
                            <Circle className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                        
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="flex items-center">
                            <div 
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded font-medium",
                                statusColors[status]?.bg,
                                statusColors[status]?.text
                              )}
                            >
                              {formatStatusLabel(status)}
                            </div>
                          </div>
                          
                          <div className="text-sm font-medium mt-0.5 text-gray-900 truncate">
                            {task.title}
                          </div>
                        </div>
                      </div>
                      <Separator className="my-1" />
                    </div>
                  ))
                )
              }
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
              <h3 className="text-sm font-medium text-gray-600">No tasks found</h3>
              <p className="text-xs text-gray-500 mt-1">
                {selectedStatus 
                  ? `No tasks with status ${formatStatusLabel(selectedStatus)}`
                  : "There are no tasks in this project yet."
                }
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}