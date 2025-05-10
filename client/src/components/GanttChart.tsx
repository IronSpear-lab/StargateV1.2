import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Filter, 
  ZoomIn, 
  ZoomOut, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Link as LinkIcon,
  Link2Off,
  Pencil,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays, addMonths, differenceInDays, parseISO, isSameDay, isWithinInterval } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Task } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface GanttTask {
  id: number | string;
  title: string;
  description?: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  dueDate?: Date | string | null;
  status: string;
  assigneeId?: number | null;
  assigneeName?: string;
  type?: string;
  priority?: string;
  estimatedHours?: number | null;
  dependencies?: number[] | null;
  dependents?: number[] | null;
  color: string;
  projectId: number;
}

type ViewMode = 'day' | 'week' | 'month';
type TimelineItem = { date: Date; label: string; isMonth?: boolean };

interface TaskFormValues {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: string;
  assigneeId: string;
  priority: string;
  type: string;
  estimatedHours: string;
  dependencies: string[];
}

export function GanttChart({ projectId = 1, focusTaskId = null }: { projectId?: number, focusTaskId?: string | null }) {
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState<number | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<GanttTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [users, setUsers] = useState<{ id: number; username: string }[]>([]);
  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [draggedTask, setDraggedTask] = useState<GanttTask | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragType, setDragType] = useState<'move' | 'resize-left' | 'resize-right' | null>(null);
  const [taskOriginalDates, setTaskOriginalDates] = useState<{ start: Date | null, end: Date | null } | null>(null);
  const { toast } = useToast();

  // Fetch tasks data from API
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: ['/api/tasks', { projectId }],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/tasks?projectId=${projectId}`);
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
      }
    }
  });

  // Fetch users for assignee dropdown
  const { data: usersData } = useQuery({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user-projects');
        return await response.json();
      } catch (error) {
        console.error("Error fetching users:", error);
        return [];
      }
    }
  });

  // Handle task updates (when dragging/resizing ends)
  const updateTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task> & { id: number }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, task);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create new task
  const createTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const response = await apiRequest('POST', '/api/tasks', task);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task created",
        description: "New task has been created successfully",
      });
      setIsTaskDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Initialize timeline based on view mode and start date
  useEffect(() => {
    const getTimelineItems = (): TimelineItem[] => {
      const items: TimelineItem[] = [];
      let current = new Date(startDate);
      
      switch (viewMode) {
        case 'day':
          // Show 30 days
          for (let i = 0; i < 30; i++) {
            const date = addDays(current, i);
            items.push({ 
              date, 
              label: format(date, 'dd'),
              isMonth: date.getDate() === 1 || i === 0
            });
          }
          break;
        case 'week':
          // Show 12 weeks (about 3 months)
          for (let i = 0; i < 12; i++) {
            const weekStart = addDays(current, i * 7);
            items.push({ 
              date: weekStart, 
              label: `W${format(weekStart, 'w')}`,
              isMonth: weekStart.getDate() <= 7 || i === 0
            });
          }
          break;
        case 'month':
          // Show 12 months
          for (let i = 0; i < 12; i++) {
            const monthStart = addMonths(current, i);
            items.push({ 
              date: monthStart, 
              label: format(monthStart, 'MMM'),
              isMonth: true
            });
          }
          break;
      }
      return items;
    };

    setTimeline(getTimelineItems());
  }, [viewMode, startDate]);

  // Process task data from API
  useEffect(() => {
    if (tasksData) {
      const processedTasks: GanttTask[] = tasksData.map((task: any) => {
        // Determine color based on status
        let color = 'bg-primary-500';
        switch (task.status) {
          case 'todo':
            color = 'bg-neutral-400';
            break;
          case 'in_progress':
            color = 'bg-amber-500';
            break;
          case 'review':
            color = 'bg-blue-500';
            break;
          case 'done':
            color = 'bg-green-500';
            break;
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          startDate: task.startDate ? parseISO(task.startDate) : null,
          endDate: task.endDate ? parseISO(task.endDate) : null,
          dueDate: task.dueDate ? parseISO(task.dueDate) : null,
          status: task.status,
          assigneeId: task.assigneeId,
          type: task.type,
          priority: task.priority,
          estimatedHours: task.estimatedHours,
          dependencies: task.dependencies || [],
          dependents: task.dependents || [],
          color,
          projectId: task.projectId
        };
      });

      setTasks(processedTasks);
    }
  }, [tasksData]);

  // Process users data for assignee dropdown
  useEffect(() => {
    if (usersData) {
      const uniqueUsers = new Map();
      usersData.forEach((project: any) => {
        if (project.user && !uniqueUsers.has(project.user.id)) {
          uniqueUsers.set(project.user.id, project.user);
        }
      });
      
      setUsers(Array.from(uniqueUsers.values()));
    }
  }, [usersData]);
  
  // Handle focus on specific task when focusTaskId changes
  useEffect(() => {
    if (focusTaskId && tasks.length > 0) {
      const taskToFocus = tasks.find(task => task.id.toString() === focusTaskId);
      
      if (taskToFocus) {
        console.log("Focusing on Gantt task:", taskToFocus);
        
        // Open task dialog for editing
        setEditingTask(taskToFocus);
        setIsTaskDialogOpen(true);
        
        // Highlight the task in the Gantt chart
        setTimeout(() => {
          const taskElement = document.querySelector(`[data-task-id="${taskToFocus.id}"]`);
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: "smooth", block: "center" });
            taskElement.classList.add("highlight-task");
            setTimeout(() => {
              taskElement.classList.remove("highlight-task");
            }, 3000);
          }
        }, 300);
      } else {
        console.log(`Task with ID ${focusTaskId} not found in Gantt chart`);
      }
    }
  }, [focusTaskId, tasks]);

  // Calculate task position and width based on timeline
  const getTaskPosition = (task: GanttTask) => {
    if (!task.startDate || !task.endDate || timeline.length === 0) {
      return { left: 0, width: 0, display: 'none' };
    }

    const startDate = typeof task.startDate === 'string' ? parseISO(task.startDate) : task.startDate;
    const endDate = typeof task.endDate === 'string' ? parseISO(task.endDate) : task.endDate;
    
    // Check if task is within the visible timeline
    const timelineStart = timeline[0].date;
    const timelineEnd = timeline[timeline.length - 1].date;
    
    if (!isWithinInterval(startDate, { start: timelineStart, end: timelineEnd }) &&
        !isWithinInterval(endDate, { start: timelineStart, end: timelineEnd })) {
      // Task is outside the visible timeline
      return { display: 'none' };
    }
    
    // Calculate position
    const totalDays = differenceInDays(timeline[timeline.length - 1].date, timeline[0].date);
    const startOffset = Math.max(0, differenceInDays(startDate, timeline[0].date));
    const taskDuration = differenceInDays(endDate, startDate) + 1; // +1 to include the end date
    
    const left = (startOffset / totalDays) * 100;
    const width = (taskDuration / totalDays) * 100;
    
    return {
      left: `${left}%`,
      width: `${Math.max(width, 2)}%`, // Minimum width of 2% for visibility
    };
  };

  // Draw dependencies lines between tasks
  const drawDependencyLines = () => {
    if (!ganttContainerRef.current) return null;

    const dependencyLines: JSX.Element[] = [];
    
    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          const sourceTask = tasks.find(t => t.id === depId);
          if (sourceTask && sourceTask.endDate && task.startDate) {
            // Get task bar positions
            const taskElements = ganttContainerRef.current?.querySelectorAll('.task-bar');
            const sourceEl = Array.from(taskElements || []).find(el => el.getAttribute('data-task-id') === depId.toString());
            const targetEl = Array.from(taskElements || []).find(el => el.getAttribute('data-task-id') === task.id.toString());
            
            if (sourceEl && targetEl) {
              const sourceRect = sourceEl.getBoundingClientRect();
              const targetRect = targetEl.getBoundingClientRect();
              const containerRect = ganttContainerRef.current?.getBoundingClientRect();
              
              if (containerRect) {
                // Calculate relative positions
                const x1 = sourceRect.right - containerRect.left;
                const y1 = sourceRect.top + (sourceRect.height / 2) - containerRect.top;
                const x2 = targetRect.left - containerRect.left;
                const y2 = targetRect.top + (targetRect.height / 2) - containerRect.top;
                
                // Create SVG line
                dependencyLines.push(
                  <svg key={`dep-${depId}-${task.id}`} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="6"
                        markerHeight="4"
                        refX="6"
                        refY="2"
                        orient="auto"
                      >
                        <path d="M0,0 L6,2 L0,4 Z" fill="currentColor" className="text-neutral-400" />
                      </marker>
                    </defs>
                    <path
                      d={`M${x1},${y1} C${x1 + (x2 - x1) / 2},${y1} ${x1 + (x2 - x1) / 2},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="4"
                      className="text-neutral-400"
                      markerEnd="url(#arrowhead)"
                    />
                  </svg>
                );
              }
            }
          }
        });
      }
    });
    
    return dependencyLines.length > 0 ? <div className="absolute inset-0">{dependencyLines}</div> : null;
  };

  // Handle mouse down on task bar (start drag/resize)
  const handleTaskMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    task: GanttTask,
    type: 'move' | 'resize-left' | 'resize-right'
  ) => {
    e.stopPropagation();
    if (!task.startDate || !task.endDate) return;
    
    setDraggedTask(task);
    setDragType(type);
    setDragStartX(e.clientX);
    setTaskOriginalDates({
      start: typeof task.startDate === 'string' ? parseISO(task.startDate) : task.startDate,
      end: typeof task.endDate === 'string' ? parseISO(task.endDate) : task.endDate
    });
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse move during drag/resize
  const handleMouseMove = (e: MouseEvent) => {
    if (!draggedTask || !dragType || !taskOriginalDates || !taskOriginalDates.start || !taskOriginalDates.end) return;
    
    // Calculate movement in days
    const containerRect = ganttContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const totalDays = differenceInDays(timeline[timeline.length - 1].date, timeline[0].date);
    const daysPerPixel = totalDays / containerRect.width;
    const daysShifted = Math.round((e.clientX - dragStartX) * daysPerPixel);
    
    const updatedTask = { ...draggedTask };
    
    if (dragType === 'move') {
      // Move the entire task
      const start = addDays(taskOriginalDates.start, daysShifted);
      const end = addDays(taskOriginalDates.end, daysShifted);
      
      updatedTask.startDate = start;
      updatedTask.endDate = end;
    } else if (dragType === 'resize-left') {
      // Resize from left (change start date)
      const newStart = addDays(taskOriginalDates.start, daysShifted);
      if (differenceInDays(taskOriginalDates.end, newStart) >= 0) {
        updatedTask.startDate = newStart;
      }
    } else if (dragType === 'resize-right') {
      // Resize from right (change end date)
      const newEnd = addDays(taskOriginalDates.end, daysShifted);
      if (differenceInDays(newEnd, taskOriginalDates.start) >= 0) {
        updatedTask.endDate = newEnd;
      }
    }
    
    // Update the task in state for visual feedback during drag
    setTasks(prev => prev.map(t => t.id === draggedTask.id ? updatedTask : t));
  };

  // Handle mouse up after drag/resize
  const handleMouseUp = () => {
    if (draggedTask && dragType && taskOriginalDates) {
      const updatedStart = typeof draggedTask.startDate === 'string' 
        ? draggedTask.startDate 
        : draggedTask.startDate ? format(draggedTask.startDate, 'yyyy-MM-dd') : null;
      
      const updatedEnd = typeof draggedTask.endDate === 'string'
        ? draggedTask.endDate
        : draggedTask.endDate ? format(draggedTask.endDate, 'yyyy-MM-dd') : null;
      
      // Check if dates actually changed
      const originalStart = taskOriginalDates.start ? format(taskOriginalDates.start, 'yyyy-MM-dd') : null;
      const originalEnd = taskOriginalDates.end ? format(taskOriginalDates.end, 'yyyy-MM-dd') : null;
      
      if (updatedStart !== originalStart || updatedEnd !== originalEnd) {
        // Dates changed, update in database
        updateTaskMutation.mutate({
          id: Number(draggedTask.id),
          startDate: updatedStart,
          endDate: updatedEnd
        });
      }
    }
    
    // Clean up
    setDraggedTask(null);
    setDragType(null);
    setTaskOriginalDates(null);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully",
      });
      setSelectedTask(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle delete task confirmation
  const handleDeleteTask = () => {
    if (selectedTask) {
      deleteTaskMutation.mutate(Number(selectedTask.id));
    }
  };

  // Handle background click to deselect task
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the container, not on task bars or other elements
    if (e.target === e.currentTarget) {
      setSelectedTask(null);
    }
  };

  // Handle task bar click (different behavior based on linkMode)
  const handleTaskClick = (e: React.MouseEvent, task: GanttTask) => {
    e.stopPropagation();
    
    if (linkMode) {
      // In link mode, we're creating dependencies
      if (linkSource === null) {
        // Start linking from this task
        setLinkSource(Number(task.id));
      } else if (linkSource !== task.id) {
        // Complete the link to this task
        const sourceTask = tasks.find(t => t.id === linkSource);
        const targetTask = task;
        
        if (sourceTask && targetTask) {
          // Ensure target task starts after source task ends
          const sourceEndDate = typeof sourceTask.endDate === 'string' 
            ? parseISO(sourceTask.endDate) 
            : sourceTask.endDate;
          
          const targetStartDate = typeof targetTask.startDate === 'string'
            ? parseISO(targetTask.startDate)
            : targetTask.startDate;
          
          if (sourceEndDate && targetStartDate && differenceInDays(targetStartDate, sourceEndDate) >= 0) {
            // Update dependencies
            const updatedDependencies = [...(targetTask.dependencies || []), linkSource];
            
            updateTaskMutation.mutate({
              id: Number(targetTask.id),
              dependencies: JSON.stringify(updatedDependencies)
            });
          } else {
            toast({
              title: "Invalid dependency",
              description: "Target task must start after the source task ends",
              variant: "destructive",
            });
          }
        }
        
        // Reset link mode
        setLinkSource(null);
      }
    } else {
      // Select task for highlighting
      setSelectedTask(task);
    }
  };
  
  // Handle edit task
  const handleEditTask = () => {
    if (selectedTask) {
      setEditingTask(selectedTask);
      setIsTaskDialogOpen(true);
    } else {
      toast({
        title: "No task selected",
        description: "Please select a task to edit",
      });
    }
  };

  // Handle submitting the task form (create or update)
  const handleTaskSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const taskData: any = {
      title: formData.get('title'),
      description: formData.get('description'),
      status: formData.get('status'),
      priority: formData.get('priority'),
      type: formData.get('type'),
      projectId
    };
    
    // Handle dates
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const dueDate = formData.get('dueDate') as string;
    
    if (startDate) taskData.startDate = startDate;
    if (endDate) taskData.endDate = endDate;
    if (dueDate) taskData.dueDate = dueDate;
    
    // Handle estimated hours
    const estimatedHours = formData.get('estimatedHours') as string;
    if (estimatedHours && estimatedHours.trim() !== '') {
      taskData.estimatedHours = Number(estimatedHours);
    }
    
    // Handle assignee
    const assigneeId = formData.get('assigneeId');
    if (assigneeId && assigneeId !== 'unassigned') {
      taskData.assigneeId = Number(assigneeId);
    }
    
    if (editingTask) {
      // Update existing task
      updateTaskMutation.mutate({
        id: Number(editingTask.id),
        ...taskData
      });
    } else {
      // Create new task
      createTaskMutation.mutate(taskData);
    }
    
    setIsTaskDialogOpen(false);
  };

  // Navigate timeline
  const navigateTimeline = (direction: 'prev' | 'next') => {
    let newStartDate;
    
    switch (viewMode) {
      case 'day':
        newStartDate = direction === 'prev' 
          ? addDays(startDate, -30) 
          : addDays(startDate, 30);
        break;
      case 'week':
        newStartDate = direction === 'prev'
          ? addDays(startDate, -12 * 7)
          : addDays(startDate, 12 * 7);
        break;
      case 'month':
        newStartDate = direction === 'prev'
          ? addMonths(startDate, -12)
          : addMonths(startDate, 12);
        break;
    }
    
    setStartDate(newStartDate);
  };

  // Add new task button handler
  const addNewTask = () => {
    setEditingTask(null);
    setIsTaskDialogOpen(true);
  };

  // CSS styles for task bars
  const taskStyles = {
    height: '24px',
    borderRadius: '4px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    position: 'absolute' as 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'white',
    whiteSpace: 'nowrap' as 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Project Timeline</h2>
        <div className="flex space-x-2">
          <div className="flex bg-neutral-100 rounded-md overflow-hidden">
            <Button 
              variant="ghost" 
              className={cn("rounded-none border-r border-neutral-200", viewMode === 'day' && "bg-neutral-200")}
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button 
              variant="ghost" 
              className={cn("rounded-none border-r border-neutral-200", viewMode === 'week' && "bg-neutral-200")}
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button 
              variant="ghost" 
              className={cn("rounded-none", viewMode === 'month' && "bg-neutral-200")}
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>
          
          <Button variant="outline" className="gap-1" onClick={() => navigateTimeline('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="gap-1" onClick={() => navigateTimeline('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={linkMode ? "default" : "outline"} 
                  className="gap-1"
                  onClick={() => {
                    setLinkMode(!linkMode);
                    setLinkSource(null);
                  }}
                >
                  {linkMode ? <Link2Off className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {linkMode ? "Cancel linking" : "Create task dependencies"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button variant="outline" className="gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          
          <Button onClick={addNewTask} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            Add Task
          </Button>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  className="gap-1" 
                  onClick={handleEditTask}
                  disabled={!selectedTask}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedTask ? "Edit selected task" : "Select a task to edit"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline"
                  className="gap-1 text-red-500 hover:bg-red-50"
                  onClick={() => selectedTask && setIsDeleteDialogOpen(true)}
                  disabled={!selectedTask}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {selectedTask ? "Delete selected task" : "Select a task to delete"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-max">
            {/* Header Row with timeline */}
            <div className="flex border-b border-neutral-200">
              <div className="w-64 p-3 border-r border-neutral-200 font-medium bg-neutral-50 sticky left-0 z-10">
                Task
              </div>
              <div className="flex-1 flex relative">
                {/* Month/Year labels */}
                <div className="absolute top-0 left-0 right-0 flex h-7 border-b border-neutral-200 bg-neutral-50">
                  {timeline.map((item, i) => (
                    item.isMonth && (
                      <div 
                        key={`month-${i}`}
                        className="h-full flex items-center justify-center font-semibold text-xs text-neutral-500"
                        style={{ 
                          position: 'absolute',
                          left: `${(i / timeline.length) * 100}%`,
                          width: 'auto'
                        }}
                      >
                        {format(item.date, 'MMMM yyyy')}
                      </div>
                    )
                  ))}
                </div>
                
                {/* Day/Week labels */}
                {timeline.map((item, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "p-3 pt-8 font-medium text-center border-r border-neutral-200",
                      i === timeline.length - 1 && "border-r-0"
                    )}
                    style={{ width: `${100 / timeline.length}%` }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Today line */}
            <div className="relative">
              {timeline.length > 0 && (
                <div 
                  className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10"
                  style={{
                    left: (() => {
                      const today = new Date();
                      const totalDays = differenceInDays(timeline[timeline.length - 1].date, timeline[0].date);
                      const daysSinceStart = differenceInDays(today, timeline[0].date);
                      return `${(daysSinceStart / totalDays) * 100}%`;
                    })()
                  }}
                />
              )}
            </div>
            
            {/* Gantt Chart Rows */}
            <div className="relative" ref={ganttContainerRef}>
              {isTasksLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="flex justify-center items-center h-40 text-neutral-500">
                  No tasks found. Click "Add Task" to create one.
                </div>
              ) : (
                <>
                  {drawDependencyLines()}
                  
                  {tasks.map(task => (
                    <div key={task.id} className="flex border-b border-neutral-200 hover:bg-neutral-50 h-16">
                      <div className="w-64 p-3 border-r border-neutral-200 sticky left-0 bg-white z-10">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-sm text-neutral-500 truncate">
                          {task.assigneeName || 'Unassigned'} • {task.status}
                        </p>
                      </div>
                      
                      {/* Task bar container */}
                      <div className="flex-1 relative h-16">
                        {/* Task bar */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                data-task-id={task.id}
                                className={cn(
                                  "task-bar", 
                                  task.color,
                                  selectedTask?.id === task.id && "ring-2 ring-blue-500 ring-offset-1" // Highlight selected task
                                )}
                                style={{
                                  ...taskStyles,
                                  ...getTaskPosition(task)
                                }}
                                onClick={(e) => handleTaskClick(e, task)}
                                onMouseDown={(e) => handleTaskMouseDown(e, task, 'move')}
                              >
                                {/* Resize handles */}
                                <div 
                                  className="absolute left-0 top-0 w-2 h-full cursor-ew-resize"
                                  onMouseDown={(e) => handleTaskMouseDown(e, task, 'resize-left')}
                                />
                                
                                <span className="px-1 truncate">{task.title}</span>
                                
                                <div 
                                  className="absolute right-0 top-0 w-2 h-full cursor-ew-resize"
                                  onMouseDown={(e) => handleTaskMouseDown(e, task, 'resize-right')}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-semibold">{task.title}</p>
                                {task.startDate && task.endDate && (
                                  <p className="text-xs">
                                    {format(typeof task.startDate === 'string' ? parseISO(task.startDate) : task.startDate, 'MMM d')} - 
                                    {format(typeof task.endDate === 'string' ? parseISO(task.endDate) : task.endDate, 'MMM d, yyyy')}
                                  </p>
                                )}
                                {task.description && <p className="text-xs max-w-xs">{task.description}</p>}
                                <p className="text-xs">Status: {task.status}</p>
                                {task.assigneeName && <p className="text-xs">Assigned to: {task.assigneeName}</p>}
                                {task.estimatedHours !== null && task.estimatedHours !== undefined && 
                                  <p className="text-xs">Uppskattat antal timmar: {task.estimatedHours}</p>}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Task Create/Edit Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask 
                ? "Update the details for this task" 
                : "Add a new task to your project timeline"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editingTask?.title || ""}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={editingTask?.description || ""}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={editingTask?.startDate 
                      ? (typeof editingTask.startDate === 'string' 
                          ? editingTask.startDate.substring(0, 10) 
                          : format(editingTask.startDate, 'yyyy-MM-dd'))
                      : format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={editingTask?.endDate 
                      ? (typeof editingTask.endDate === 'string' 
                          ? editingTask.endDate.substring(0, 10) 
                          : format(editingTask.endDate, 'yyyy-MM-dd'))
                      : format(addDays(new Date(), 7), 'yyyy-MM-dd')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={editingTask?.dueDate 
                      ? (typeof editingTask.dueDate === 'string' 
                          ? editingTask.dueDate.substring(0, 10) 
                          : format(editingTask.dueDate, 'yyyy-MM-dd'))
                      : ""}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={editingTask?.status || "todo"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assigneeId">Assignee</Label>
                  <Select name="assigneeId" defaultValue={editingTask?.assigneeId?.toString() || "unassigned"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select name="priority" defaultValue={editingTask?.priority || "medium"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select name="type" defaultValue={editingTask?.type || "feature"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="documentation">Documentation</SelectItem>
                      <SelectItem value="setup">Setup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedHours">Uppskattat antal timmar</Label>
                  <Input
                    id="estimatedHours"
                    name="estimatedHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Uppskatta antal timmar för uppgiften"
                    defaultValue={editingTask?.estimatedHours?.toString() || ""}
                  />
                </div>
              </div>
              
              {editingTask && (
                <div className="space-y-2">
                  <Label>Dependencies</Label>
                  <div className="border rounded-md p-2 text-sm">
                    {(editingTask.dependencies || []).length > 0 ? (
                      <div className="space-y-1">
                        {(editingTask.dependencies || []).map(depId => {
                          const depTask = tasks.find(t => t.id === depId);
                          return (
                            <div key={depId} className="flex justify-between items-center">
                              <span>{depTask?.title || `Task ${depId}`}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newDeps = (editingTask.dependencies || []).filter(id => id !== depId);
                                  updateTaskMutation.mutate({
                                    id: Number(editingTask.id),
                                    dependencies: JSON.stringify(newDeps)
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-neutral-500">No dependencies. Use the link tool in the Gantt chart to add dependencies.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={updateTaskMutation.isPending || createTaskMutation.isPending}>
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Task Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border p-3 rounded-md">
            {selectedTask && (
              <div>
                <p className="font-medium">{selectedTask.title}</p>
                <p className="text-sm text-neutral-500 mt-1">
                  {selectedTask.startDate && selectedTask.endDate && (
                    <span>
                      {format(typeof selectedTask.startDate === 'string' ? parseISO(selectedTask.startDate) : selectedTask.startDate, 'MMM d')} - 
                      {format(typeof selectedTask.endDate === 'string' ? parseISO(selectedTask.endDate) : selectedTask.endDate, 'MMM d, yyyy')}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteTask}
              disabled={deleteTaskMutation.isPending}
            >
              {deleteTaskMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Deleting...
                </>
              ) : "Delete Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
