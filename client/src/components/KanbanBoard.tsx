import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Calendar,
  User,
  Clock,
  AlertCircle,
  X
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
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string(),
  priority: z.string().optional(),
  type: z.string().optional(),
  assigneeId: z.string().optional(),
  projectId: z.string(),
  dueDate: z.string().optional().transform(val => val === "" ? null : val),
  startDate: z.string().optional().transform(val => val === "" ? null : val),
  endDate: z.string().optional().transform(val => val === "" ? null : val),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface KanbanBoardProps {
  projectId?: number;
}

export function KanbanBoard({ projectId = 1 }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: 'backlog',
      title: 'Backlog',
      tasks: [],
      bgColor: 'bg-neutral-100'
    },
    {
      id: 'todo',
      title: 'To Do',
      tasks: [],
      bgColor: 'bg-yellow-100'
    },
    {
      id: 'in_progress',
      title: 'In Progress',
      tasks: [],
      bgColor: 'bg-blue-100'
    },
    {
      id: 'review',
      title: 'Testing',
      tasks: [],
      bgColor: 'bg-purple-100'
    },
    {
      id: 'done',
      title: 'Done',
      tasks: [],
      bgColor: 'bg-green-100'
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

  // Query to fetch users for assignee dropdown
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

  // Handle task creation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const response = await apiRequest('POST', '/api/tasks', taskData);
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

  // Process task data from API
  useEffect(() => {
    if (tasksData) {
      const processedTasks = tasksData.map((task: any) => {
        // Determine color based on task attributes
        const colors = getTaskColors(task);
        
        // Format due date for display
        let dueDateDisplay = 'No due date';
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const today = new Date();
          
          if (isAfter(dueDate, today)) {
            dueDateDisplay = `Due ${format(dueDate, 'MMM d')}`;
          } else if (isBefore(dueDate, today)) {
            dueDateDisplay = 'Overdue';
          } else {
            dueDateDisplay = 'Due today';
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
  }, [tasksData]);

  // Get colors for task attributes
  const getTaskColors = (task: any) => {
    let typeBg = 'bg-neutral-100';
    let typeColor = 'text-neutral-700';
    let borderColor = 'border-neutral-500';
    let priorityColor = 'text-neutral-500';
    
    // Type colors
    if (task.type) {
      switch (task.type.toLowerCase()) {
        case 'feature':
          typeBg = 'bg-primary-100';
          typeColor = 'text-primary-700';
          break;
        case 'bug':
          typeBg = 'bg-red-100';
          typeColor = 'text-red-700';
          break;
        case 'design':
          typeBg = 'bg-purple-100';
          typeColor = 'text-purple-700';
          break;
        case 'research':
          typeBg = 'bg-info-100';
          typeColor = 'text-info-700';
          break;
        case 'setup':
          typeBg = 'bg-success-100';
          typeColor = 'text-success-700';
          break;
        case 'planning':
          typeBg = 'bg-warning-100';
          typeColor = 'text-warning-700';
          break;
      }
    }
    
    // Priority colors
    if (task.priority) {
      switch (task.priority.toLowerCase()) {
        case 'high':
          priorityColor = 'text-red-600';
          break;
        case 'medium':
          priorityColor = 'text-amber-600';
          break;
        case 'low':
          priorityColor = 'text-green-600';
          break;
      }
    }
    
    // Status colors for the border
    switch (task.status) {
      case 'backlog':
        borderColor = 'border-neutral-500';
        break;
      case 'todo':
        borderColor = 'border-yellow-500';
        break;
      case 'in_progress':
        borderColor = 'border-blue-500';
        break;
      case 'review':
        borderColor = 'border-purple-500';
        break;
      case 'done':
        borderColor = 'border-green-500';
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
      type: "",
      assigneeId: "",
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
        projectId: parseInt(values.projectId),
        assigneeId: values.assigneeId ? parseInt(values.assigneeId) : null,
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
      type: "",
      assigneeId: "",
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
      priority: task.priority || "",
      type: task.type || "",
      assigneeId: task.assigneeId ? task.assigneeId.toString() : "",
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
        projectId: parseInt(values.projectId),
        assigneeId: values.assigneeId ? parseInt(values.assigneeId) : null
      };
      
      updateTaskMutation.mutate(taskData);
      setIsTaskDialogOpen(false);
    } catch (error) {
      // Handle validation errors
      handleValidationErrors(error);
    }
  };

  // Extract unique users from project data
  const uniqueUsers = new Map();
  
  if (usersData) {
    usersData.forEach((project: any) => {
      if (project.user && !uniqueUsers.has(project.user.id)) {
        uniqueUsers.set(project.user.id, project.user);
      }
    });
  }
  
  const users = Array.from(uniqueUsers.values());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Kanban Board</h2>
        <Button onClick={addNewTask} className="gap-1">
          <PlusCircle className="h-4 w-4" />
          Add Task
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
                  <h3 className="font-medium">{column.title}</h3>
                  <span className="text-sm bg-white bg-opacity-50 rounded-full px-2">{column.tasks.length}</span>
                </div>
                
                <DroppableColumn id={`column-${column.id}`} className={`space-y-3 min-h-[100px] flex-1 p-3 ${column.bgColor} rounded-b-md droppable-area`}>
                  <SortableContext
                    items={column.tasks.map(task => task.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    {column.tasks.map(task => (
                      <Draggable key={task.id} id={task.id.toString()}>
                        <Card 
                          className={`kanban-card shadow-sm border-l-4 ${task.borderColor} cursor-grab hover:shadow-md transition-shadow bg-white`}
                          onClick={() => handleTaskClick(task)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              {task.type ? (
                                <span className={`text-xs font-medium px-2 py-1 rounded ${task.typeBg} ${task.typeColor}`}>
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
                            <h4 className="font-medium mt-2">{task.title}</h4>
                            {task.description && (
                              <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              {task.assigneeId ? (
                                <div className="flex">
                                  <div className={`w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700`}>
                                    {task.assigneeInitials}
                                  </div>
                                </div>
                              ) : (
                                <div></div>
                              )}
                              <div className="text-xs text-neutral-500">{task.dueDateDisplay}</div>
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
                        type: "",
                        assigneeId: "",
                        projectId: projectId.toString(),
                        dueDate: "",
                        startDate: "",
                        endDate: ""
                      });
                      setIsTaskDialogOpen(true);
                    }}
                    className="w-full text-center py-2 px-3 bg-white bg-opacity-60 hover:bg-opacity-80 rounded-md text-neutral-600 text-sm flex items-center justify-center gap-1 mt-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add new card
                  </button>
                </DroppableColumn>
              </div>
            ))}
          </div>
          
          <DragOverlay>
            {activeId && activeTask && (
              <Card className={`kanban-card shadow-md border-l-4 ${activeTask.borderColor} cursor-grabbing w-[280px]`}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    {activeTask.type ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded ${activeTask.typeBg} ${activeTask.typeColor}`}>
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
                  <h4 className="font-medium mt-2">{activeTask.title}</h4>
                  {activeTask.description && (
                    <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{activeTask.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    {activeTask.assigneeId ? (
                      <div className="flex">
                        <div className={`w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700`}>
                          {activeTask.assigneeInitials}
                        </div>
                      </div>
                    ) : (
                      <div></div>
                    )}
                    <div className="text-xs text-neutral-500">{activeTask.dueDateDisplay}</div>
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
            <DialogTitle>{selectedTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {selectedTask 
                ? "Update task details and attributes." 
                : "Fill in the details to create a new task."}
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
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Task description" 
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
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="backlog">Backlog</SelectItem>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">Testing</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
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
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
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
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Feature">Feature</SelectItem>
                          <SelectItem value="Bug">Bug</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Research">Research</SelectItem>
                          <SelectItem value="Setup">Setup</SelectItem>
                          <SelectItem value="Planning">Planning</SelectItem>
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
                      <FormLabel>Assignee</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username}
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
                      <FormLabel>Start Date</FormLabel>
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
                      <FormLabel>End Date</FormLabel>
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
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                  {selectedTask ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}