import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Calendar, 
  Circle,
  Loader2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface TasksOverviewWidgetProps {
  projectId?: number;
}

interface TasksStats {
  completed: number;
  inProgress: number;
  todo: number;
  review: number;
  totalTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
}

const initialStats: TasksStats = {
  completed: 0,
  inProgress: 0,
  todo: 0,
  review: 0,
  totalTasks: 0,
  overdueTasks: 0,
  dueSoonTasks: 0
};

export function TasksOverviewWidget({ projectId }: TasksOverviewWidgetProps) {
  const [stats, setStats] = useState<TasksStats>(initialStats);
  
  // Fetch tasks data
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['/api/tasks', { projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks${projectId ? `?projectId=${projectId}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    enabled: !!projectId
  });
  
  // Process tasks data to compute stats
  useEffect(() => {
    if (!tasks) return;
    
    const now = new Date();
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(now.getDate() + 2);
    
    // Count tasks by status
    const completed = tasks.filter((task: any) => task.status === 'done').length;
    const inProgress = tasks.filter((task: any) => task.status === 'in_progress').length;
    const todo = tasks.filter((task: any) => task.status === 'todo').length;
    const review = tasks.filter((task: any) => task.status === 'review').length;
    
    // Count overdue and due soon tasks
    const overdueTasks = tasks.filter((task: any) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate < now && task.status !== 'done';
    }).length;
    
    const dueSoonTasks = tasks.filter((task: any) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= twoDaysFromNow && task.status !== 'done';
    }).length;
    
    setStats({
      completed,
      inProgress,
      todo,
      review,
      totalTasks: tasks.length,
      overdueTasks,
      dueSoonTasks
    });
  }, [tasks]);
  
  // Calculate completion percentage
  const completionPercentage = stats.totalTasks > 0 
    ? Math.round((stats.completed / stats.totalTasks) * 100) 
    : 0;
    
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="ml-2">Loading tasks data...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <h3 className="font-medium">Failed to load tasks</h3>
        <p className="text-sm text-muted-foreground mt-1">
          There was an error loading tasks data.
        </p>
      </div>
    );
  }
  
  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
        <h3 className="font-medium">No project selected</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select a project to view tasks overview.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">Task Completion</h3>
        <div className="flex items-end justify-between mb-2">
          <div>
            <span className="text-2xl font-bold">{completionPercentage}%</span>
            <span className="text-sm text-muted-foreground ml-1">completed</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {stats.completed} of {stats.totalTasks} tasks
          </div>
        </div>
        <Progress 
          value={completionPercentage} 
          className="h-2" 
        />
      </div>
      
      <Separator />
      
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Task Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex flex-col items-center p-2 bg-green-50 rounded-md">
            <CheckCircle2 className="h-5 w-5 text-green-500 mb-1" />
            <span className="text-xl font-semibold">{stats.completed}</span>
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-blue-50 rounded-md">
            <Clock className="h-5 w-5 text-blue-500 mb-1" />
            <span className="text-xl font-semibold">{stats.inProgress}</span>
            <span className="text-xs text-muted-foreground">In Progress</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-purple-50 rounded-md">
            <Circle className="h-5 w-5 text-purple-500 mb-1" />
            <span className="text-xl font-semibold">{stats.todo}</span>
            <span className="text-xs text-muted-foreground">To Do</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-amber-50 rounded-md">
            <AlertTriangle className="h-5 w-5 text-amber-500 mb-1" />
            <span className="text-xl font-semibold">{stats.review}</span>
            <span className="text-xs text-muted-foreground">In Review</span>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Deadline Status</h3>
        <div className="space-y-2">
          <div className={cn(
            "flex items-center justify-between p-2 rounded-md",
            stats.overdueTasks > 0 ? "bg-red-50" : "bg-neutral-50"
          )}>
            <div className="flex items-center">
              <XCircle className={cn(
                "h-5 w-5 mr-2",
                stats.overdueTasks > 0 ? "text-red-500" : "text-neutral-400"
              )} />
              <span>Overdue tasks</span>
            </div>
            <Badge 
              variant={stats.overdueTasks > 0 ? "destructive" : "secondary"}
              className="text-xs"
            >
              {stats.overdueTasks}
            </Badge>
          </div>
          
          <div className={cn(
            "flex items-center justify-between p-2 rounded-md",
            stats.dueSoonTasks > 0 ? "bg-amber-50" : "bg-neutral-50"
          )}>
            <div className="flex items-center">
              <Calendar className={cn(
                "h-5 w-5 mr-2",
                stats.dueSoonTasks > 0 ? "text-amber-500" : "text-neutral-400"
              )} />
              <span>Due in next 48 hours</span>
            </div>
            <Badge 
              variant={stats.dueSoonTasks > 0 ? "outline" : "secondary"}
              className={stats.dueSoonTasks > 0 ? "text-amber-500 border-amber-500" : ""}
            >
              {stats.dueSoonTasks}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}