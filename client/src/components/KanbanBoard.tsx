import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Calendar,
  User,
  Clock,
  AlertCircle,
  X,
  Trash2,
  Loader2
} from "lucide-react";
import { 
  DndContext, 
  DragOverlay, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { Draggable } from '@/lib/dnd-utils';
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Task } from "@shared/schema";
import { useFormValidation } from "@/hooks/use-form-validation";
import { FormValidationError } from "@/components/ui/form-validation-error";

// Droppable Column Component
function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id
  });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`${className || ''} ${isOver ? 'bg-opacity-70 border-2 border-dashed border-blue-400' : ''}`}
    >
      {children}
    </div>
  );
}

// Type to represent a task in the Kanban board
interface KanbanTask {
  id: number | string;
  title: string;
  description: string | null;
  type: string | null;
  typeBg: string;
  typeColor: string;
  priority: string | null;
  priorityColor: string;
  assignee: string | null;
  assigneeId: number | null;
  assigneeInitials: string;
  dueDate: string | null;
  dueDateDisplay: string;
  status: string;
  borderColor: string;
  startDate: string | null;
  endDate: string | null;
  projectId: number;
  createdAt: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
  bgColor: string;
}

// Form validation schema for task creation/editing
const taskFormSchema = z.object({
  title: z.string().min(1, "Titel krävs"),
  description: z.string().optional(),
  status: z.string(),
  priority: z.string().optional(),
  type: z.string().optional().transform(val => val === "none" ? null : val),
  assigneeId: z.string().optional().transform(val => val === "none" ? null : val),
  projectId: z.string(),
  dueDate: z.string().optional().transform(val => val === "" ? null : val),
  startDate: z.string().optional().transform(val => val === "" ? null : val),
  endDate: z.string().optional().transform(val => val === "" ? null : val),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface KanbanBoardProps {
  projectId?: number;
  focusTaskId?: string | null;
}

export function KanbanBoard({ projectId = 1, focusTaskId = null }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: 'backlog',
      title: 'Backlog',
      tasks: [],
      bgColor: 'bg-muted'
    },
    {
      id: 'todo',
      title: 'Att göra',
      tasks: [],
      bgColor: 'bg-amber-100 dark:bg-amber-950/30'
    },
    {
      id: 'in_progress',
      title: 'Pågående',
      tasks: [],
      bgColor: 'bg-blue-100 dark:bg-blue-950/30'
    },
    {
      id: 'review',
      title: 'Testning',
      tasks: [],
      bgColor: 'bg-purple-100 dark:bg-purple-950/30'
    },
    {
      id: 'done',
      title: 'Klart',
      tasks: [],
      bgColor: 'bg-green-100 dark:bg-green-950/30'
    }
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const { toast } = useToast();

  // Query to fetch tasks
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

  // Query to fetch project members for assignee dropdown
  const { data: projectMembersData } = useQuery({
    queryKey: ['/api/project-members', projectId],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/project-members/${projectId}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching project members:", error);
        return [];
      }
    },
    // Only fetch if projectId is valid
    enabled: !!projectId && projectId > 0
  });

  // Handle task creation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const response = await apiRequest('POST', '/api/tasks', taskData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Invalidera alla field-tasks queries för att uppdatera dashboardwidgets
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      
      toast({
        title: "Uppgift skapad",
        description: "En ny uppgift har skapats",
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

  // Handle task updates (when dragging/resizing ends)
  const updateTaskMutation = useMutation({
    mutationFn: async (task: Partial<Task> & { id: number }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, task);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Invalidera alla field-tasks queries för att uppdatera dashboardwidgets
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      
      toast({
        title: "Uppgift uppdaterad",
        description: "Uppgiften har uppdaterats",
      });
    },
    onError: (error) => {
      toast({
        title: "Kunde inte uppdatera uppgiften",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation för att radera uppgifter
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Invalidera alla field-tasks queries oavsett parameter för att uppdatera dashboardwidgets
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });  // Detta matchar alla field-tasks queries
      toast({
        title: "Uppgift borttagen",
        description: "Uppgiften har tagits bort",
      });
      setIsTaskDialogOpen(false);
    },
    onError: (error) => {
      console.error('Fel vid radering av uppgift:', error);
      toast({
        title: "Kunde inte ta bort uppgiften",
        description: "Ett fel uppstod när uppgiften skulle raderas",
        variant: "destructive",
      });
    }
  });
  
  // Function to handle task deletion
  const handleDeleteTask = () => {
    if (selectedTask && typeof selectedTask.id === 'number') {
      console.log("Raderar uppgift med ID:", selectedTask.id);
      deleteTaskMutation.mutate(selectedTask.id);
    } else {
      console.error("Kan inte radera uppgift: Inget giltigt ID");
      toast({
        title: "Kunde inte ta bort uppgiften",
        description: "Inget giltigt uppgifts-ID",
        variant: "destructive",
      });
    }
  };

  // Setup for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag begins - helps prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Lyssna efter förändringar i focusTaskId och öppna uppgiften om den finns
  useEffect(() => {
    if (focusTaskId && tasksData) {
      console.log(`Letar efter fokuserad uppgift med ID: ${focusTaskId}`);
      const focusedTask = tasksData.find((task: any) => task.id.toString() === focusTaskId);
      
      if (focusedTask) {
        console.log("Fokuserad uppgift hittad:", focusedTask);
        // Formatera uppgiften för att passa KanbanTask-gränssnittet
        const colors = getTaskColors(focusedTask);
        
        // Skapa assigneeInitials
        let assigneeInitials = '--';
        if (focusedTask.assignee) {
          assigneeInitials = focusedTask.assignee.username
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        }
        
        // Formatera dueDateDisplay
        let dueDateDisplay = 'Inget slutdatum';
        if (focusedTask.dueDate) {
          const dueDate = new Date(focusedTask.dueDate);
          const today = new Date();
          
          if (isAfter(dueDate, today)) {
            dueDateDisplay = `Klart ${format(dueDate, 'd MMM')}`;
          } else if (isBefore(dueDate, today)) {
            dueDateDisplay = 'Försenad';
          } else {
            dueDateDisplay = 'Klart idag';
          }
        }
        
        // Skapa KanbanTask-objekt
        const formattedTask: KanbanTask = {
          id: focusedTask.id,
          title: focusedTask.title,
          description: focusedTask.description,
          type: focusedTask.type,
          typeBg: colors.typeBg,
          typeColor: colors.typeColor,
          priority: focusedTask.priority,
          priorityColor: colors.priorityColor,
          assignee: focusedTask.assignee ? focusedTask.assignee.username : null,
          assigneeId: focusedTask.assigneeId,
          assigneeInitials,
          dueDate: focusedTask.dueDate,
          dueDateDisplay,
          status: focusedTask.status,
          borderColor: colors.borderColor,
          startDate: focusedTask.startDate,
          endDate: focusedTask.endDate,
          projectId: focusedTask.projectId,
          createdAt: focusedTask.createdAt
        };
        
        // Öppna uppgiftsdetaljer för den fokuserade uppgiften
        setSelectedTask(formattedTask);
        setIsTaskDialogOpen(true);
      } else {
        console.log(`Uppgift med ID ${focusTaskId} hittades inte i projektet`);
      }
    }
  }, [focusTaskId, tasksData]);

  // Process task data from API
  useEffect(() => {
    if (tasksData) {
      const processedTasks = tasksData.map((task: any) => {
        // Determine color based on task attributes
        const colors = getTaskColors(task);
        
        // Format due date for display
        let dueDateDisplay = 'Inget slutdatum';
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const today = new Date();
          
          if (isAfter(dueDate, today)) {
            dueDateDisplay = `Klart ${format(dueDate, 'd MMM')}`;
          } else if (isBefore(dueDate, today)) {
            dueDateDisplay = 'Försenad';
          } else {
            dueDateDisplay = 'Klart idag';
          }
        }
        
        // Get assignee initials
        let assigneeInitials = '--';
        if (task.assignee) {
          assigneeInitials = task.assignee.username
            .split(' ')
            .map((part: string) => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        }
        
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type,
          typeBg: colors.typeBg,
          typeColor: colors.typeColor,
          priority: task.priority,
          priorityColor: colors.priorityColor,
          assignee: task.assignee ? task.assignee.username : null,
          assigneeId: task.assigneeId,
          assigneeInitials,
          dueDate: task.dueDate,
          dueDateDisplay,
          status: task.status,
          borderColor: colors.borderColor,
          startDate: task.startDate,
          endDate: task.endDate,
          projectId: task.projectId,
          createdAt: task.createdAt
        };
      });

      // Group tasks by status
      const newColumns = [...columns];
      
      // Reset task lists
      newColumns.forEach(column => {
        column.tasks = [];
      });
      
      // Populate columns with tasks
      processedTasks.forEach((task: KanbanTask) => {
        const columnIndex = newColumns.findIndex(col => col.id === task.status);
        if (columnIndex !== -1) {
          newColumns[columnIndex].tasks.push(task);
        }
      });
      
      setColumns(newColumns);
    }
  }, [tasksData, projectMembersData]);

  // Get colors for task attributes
  const getTaskColors = (task: any) => {
    let typeBg = 'bg-primary/20';
    let typeColor = 'text-primary';
    let borderColor = 'border-muted-foreground';
    let priorityColor = 'text-muted-foreground';
    
    // Type colors - using theme tokens for better dark mode support
    if (task.type) {
      switch (task.type.toLowerCase()) {
        case 'feature':
          typeBg = 'bg-primary/20 dark:bg-primary/30';
          typeColor = 'text-primary dark:text-primary-foreground';
          break;
        case 'bug':
          typeBg = 'bg-destructive/20 dark:bg-destructive/30';
          typeColor = 'text-destructive dark:text-destructive-foreground';
          break;
        case 'design':
          typeBg = 'bg-purple-200 dark:bg-purple-900/30';
          typeColor = 'text-purple-700 dark:text-purple-300';
          break;
        case 'research':
          typeBg = 'bg-blue-200 dark:bg-blue-900/30';
          typeColor = 'text-blue-700 dark:text-blue-300';
          break;
        case 'setup':
          typeBg = 'bg-emerald-200 dark:bg-emerald-900/30';
          typeColor = 'text-emerald-700 dark:text-emerald-300';
          break;
        case 'planning':
          typeBg = 'bg-amber-200 dark:bg-amber-900/30';
          typeColor = 'text-amber-700 dark:text-amber-300';
          break;
      }
    }
    
    // Priority colors with dark mode support
    if (task.priority) {
      switch (task.priority.toLowerCase()) {
        case 'high':
          priorityColor = 'text-red-600 dark:text-red-400';
          break;
        case 'medium':
          priorityColor = 'text-amber-600 dark:text-amber-400';
          break;
        case 'low':
          priorityColor = 'text-green-600 dark:text-green-400';
          break;
      }
    }
    
    // Status colors for the border with dark mode support
    switch (task.status) {
      case 'backlog':
        borderColor = 'border-neutral-500 dark:border-neutral-400';
        break;
      case 'todo':
        borderColor = 'border-amber-500 dark:border-amber-400';
        break;
      case 'in_progress':
        borderColor = 'border-blue-500 dark:border-blue-400';
        break;
      case 'review':
        borderColor = 'border-purple-500 dark:border-purple-400';
        break;
      case 'done':
        borderColor = 'border-green-500 dark:border-green-400';
        break;
    }
    
    return { typeBg, typeColor, borderColor, priorityColor };
  };

  // Handle drag start
  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Find the task that's being dragged
    for (const column of columns) {
      const task = column.tasks.find(t => t.id.toString() === active.id);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };

  // Handle drag end
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    // Extract column ID from the over.id (which is in format "column-columnId")
    let targetColumnId: string = '';
    
    if (over.id.toString().startsWith('column-')) {
      targetColumnId = over.id.toString().replace('column-', '');
      console.log("Dropping on column:", targetColumnId);
    } else {
      console.log("Not dropping on a column, ignoring");
      setActiveId(null);
      setActiveTask(null);
      return;
    }
    
    if (!targetColumnId) {
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    // Find the task being dragged
    let sourceColumnId: string | null = null;
    let taskToMove: KanbanTask | null = null;
    
    const newColumns = [...columns];
    
    for (const column of newColumns) {
      const taskIndex = column.tasks.findIndex(t => t.id.toString() === active.id);
      if (taskIndex !== -1) {
        sourceColumnId = column.id;
        taskToMove = { ...column.tasks[taskIndex] };
        column.tasks.splice(taskIndex, 1);
        break;
      }
    }

    if (sourceColumnId && taskToMove) {
      // Only update if the column changed
      if (targetColumnId !== sourceColumnId) {
        // Update the task's status in the database
        updateTaskMutation.mutate({
          id: Number(taskToMove.id),
          status: targetColumnId
        });
        
        // Update the task's status locally
        taskToMove.status = targetColumnId;
        
        // Update border color based on new status
        const colors = getTaskColors({...taskToMove, status: targetColumnId});
        taskToMove.borderColor = colors.borderColor;
      }
      
      // Add the task to the target column
      const targetColumnIndex = newColumns.findIndex(col => col.id === targetColumnId);
      if (targetColumnIndex !== -1) {
        newColumns[targetColumnIndex].tasks.push(taskToMove);
      }
      
      setColumns(newColumns);
    }

    setActiveId(null);
    setActiveTask(null);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
    setActiveTask(null);
  };

  // New task form
  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      type: "none",
      assigneeId: "none",
      projectId: projectId.toString(),
      dueDate: "",
      startDate: "",
      endDate: ""
    },
    mode: "onChange" // Enable validation as fields change
  });
  
  // Use our form validation hook
  const { validationResult, handleValidationErrors } = useFormValidation(taskForm);

  // Handle creating a new task
  const onCreateTask = (values: TaskFormValues) => {
    try {
      const taskData = {
        ...values,
        type: "kanban", // Explicit sätta typen till "kanban" för uppgifter i Kanban-vyn
        projectId: parseInt(values.projectId),
        assigneeId: values.assigneeId && values.assigneeId !== "none" ? parseInt(values.assigneeId) : null,
      };
      
      createTaskMutation.mutate(taskData);
    } catch (error) {
      // Handle validation errors
      handleValidationErrors(error);
    }
  };

  // Open dialog to create a new task
  const addNewTask = () => {
    setSelectedTask(null);
    taskForm.reset({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      type: "none",
      assigneeId: "none",
      projectId: projectId.toString(),
      dueDate: "",
      startDate: "",
      endDate: ""
    });
    setIsTaskDialogOpen(true);
  };

  // Handle task card click to view/edit details
  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask(task);
    
    taskForm.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority || "medium",
      type: task.type || "none",
      assigneeId: task.assigneeId ? task.assigneeId.toString() : "none",
      projectId: task.projectId.toString(),
      dueDate: task.dueDate || "",
      startDate: task.startDate || "",
      endDate: task.endDate || ""
    });
    
    setIsTaskDialogOpen(true);
  };

  // Handle updating an existing task
  const onUpdateTask = (values: TaskFormValues) => {
    if (!selectedTask) return;
    
    try {
      const taskData = {
        ...values,
        id: Number(selectedTask.id),
        type: "kanban", // Behåll typen som "kanban" även vid uppdatering
        projectId: parseInt(values.projectId),
        assigneeId: values.assigneeId && values.assigneeId !== "none" ? parseInt(values.assigneeId) : null
      };
      
      updateTaskMutation.mutate(taskData);
      setIsTaskDialogOpen(false);
    } catch (error) {
      // Handle validation errors
      handleValidationErrors(error);
    }
  };
  
  // Denna duplicerade metod tas bort

  // Use project members data directly
  const projectMembers = projectMembersData || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Kanban-tavla</h2>
        <Button onClick={addNewTask} className="gap-1">
          <PlusCircle className="h-4 w-4" />
          Lägg till uppgift
        </Button>
      </div>
      
      {isTasksLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex overflow-x-auto pb-4 kanban-container gap-4">
            {columns.map(column => (
              <div key={column.id} className={`kanban-column rounded-md shadow-sm min-w-[280px] max-w-[320px] w-full flex flex-col`}>
                <div className={`flex items-center justify-between p-3 ${column.bgColor} rounded-t-md`}>
                  <h3 className="font-medium text-foreground">{column.title}</h3>
                  <span className="text-sm bg-background/50 dark:bg-background/30 rounded-full px-2 text-foreground">{column.tasks.length}</span>
                </div>
                
                <DroppableColumn id={`column-${column.id}`} className={`space-y-3 min-h-[100px] flex-1 p-3 ${column.bgColor} rounded-b-md droppable-area`}>
                  <SortableContext
                    items={column.tasks.map(task => task.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {column.tasks.map(task => (
                      <Draggable key={task.id} id={task.id.toString()}>
                        <Card 
                          className={`kanban-card shadow-sm border-l-4 ${task.borderColor} hover:shadow-md transition-shadow bg-card dark:bg-card/95`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(task);
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              {task.type ? (
                                <span className={`text-xs font-medium px-2 py-1 rounded bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground`}>
                                  {task.type}
                                </span>
                              ) : (
                                <span></span>
                              )}
                              {task.priority && (
                                <span className={`text-xs font-medium ${task.priorityColor}`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium mt-2 text-foreground">{task.title}</h4>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              {task.assigneeId ? (
                                <div className="flex">
                                  <div className={`w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary`}>
                                    {task.assigneeInitials}
                                  </div>
                                </div>
                              ) : (
                                <div></div>
                              )}
                              <div className="text-xs text-muted-foreground">{task.dueDateDisplay}</div>
                            </div>
                          </CardContent>
                        </Card>
                      </Draggable>
                    ))}
                  </SortableContext>
                  
                  <button 
                    onClick={() => {
                      setSelectedTask(null);
                      taskForm.reset({
                        title: "",
                        description: "",
                        status: column.id,
                        priority: "medium",
                        type: "none",
                        assigneeId: "none",
                        projectId: projectId.toString(),
                        dueDate: "",
                        startDate: "",
                        endDate: ""
                      });
                      setIsTaskDialogOpen(true);
                    }}
                    className="w-full text-center py-2 px-3 bg-background hover:bg-muted rounded-md text-muted-foreground text-sm flex items-center justify-center gap-1 mt-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Lägg till kort
                  </button>
                </DroppableColumn>
              </div>
            ))}
          </div>
          
          <DragOverlay>
            {activeId && activeTask && (
              <Card className={`kanban-card shadow-md border-l-4 ${activeTask.borderColor} cursor-grabbing w-[280px] bg-card dark:bg-card/95`}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    {activeTask.type ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-foreground`}>
                        {activeTask.type}
                      </span>
                    ) : (
                      <span></span>
                    )}
                    {activeTask.priority && (
                      <span className={`text-xs font-medium ${activeTask.priorityColor}`}>
                        {activeTask.priority.charAt(0).toUpperCase() + activeTask.priority.slice(1)}
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium mt-2 text-foreground">{activeTask.title}</h4>
                  {activeTask.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activeTask.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    {activeTask.assigneeId ? (
                      <div className="flex">
                        <div className={`w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary`}>
                          {activeTask.assigneeInitials}
                        </div>
                      </div>
                    ) : (
                      <div></div>
                    )}
                    <div className="text-xs text-muted-foreground">{activeTask.dueDateDisplay}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task Creation/Edit Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTask ? "Redigera uppgift" : "Skapa ny uppgift"}</DialogTitle>
            <DialogDescription>
              {selectedTask 
                ? "Uppdatera uppgiftens detaljer och attribut." 
                : "Fyll i detaljerna för att skapa en ny uppgift."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(selectedTask ? onUpdateTask : onCreateTask)} className="space-y-6">
              {/* Display form validation errors */}
              {validationResult.hasErrors && (
                <FormValidationError
                  validationResult={validationResult}
                  displayMode="inline"
                  className="mb-4"
                />
              )}
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel</FormLabel>
                    <FormControl>
                      <Input placeholder="Uppgiftens titel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beskrivning</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Uppgiftens beskrivning" 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="backlog">Backlog</SelectItem>
                          <SelectItem value="todo">Att göra</SelectItem>
                          <SelectItem value="in_progress">Pågående</SelectItem>
                          <SelectItem value="review">Granskning</SelectItem>
                          <SelectItem value="done">Klar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioritet</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj prioritet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">Hög</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Låg</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ingen typ</SelectItem>
                          <SelectItem value="Feature">Funktion</SelectItem>
                          <SelectItem value="Bug">Bugg</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Research">Utredning</SelectItem>
                          <SelectItem value="Setup">Konfiguration</SelectItem>
                          <SelectItem value="Planning">Planering</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="assigneeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ansvarig</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Välj ansvarig" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Ej tilldelad</SelectItem>
                          {projectMembers.map((member: any) => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={taskForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Startdatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slutdatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Förfallodatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" type="button" onClick={() => setIsTaskDialogOpen(false)}>
                    Avbryt
                  </Button>
                  {selectedTask && (
                    <Button 
                      type="button" 
                      variant="destructive" 
                      onClick={handleDeleteTask}
                      disabled={deleteTaskMutation.isPending}
                    >
                      {deleteTaskMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Tar bort...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Ta bort
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                  {createTaskMutation.isPending || updateTaskMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {selectedTask ? "Uppdaterar..." : "Skapar..."}
                    </>
                  ) : (
                    selectedTask ? "Uppdatera" : "Skapa"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}