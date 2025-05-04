import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical } from "lucide-react";
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Draggable } from '@/lib/file-utils';

interface KanbanTask {
  id: string;
  title: string;
  description: string;
  type: string;
  typeBg: string;
  typeColor: string;
  assignee: string;
  assigneeInitials: string;
  assigneeBg: string;
  assigneeColor: string;
  dueDate: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  borderColor: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
}

export function KanbanBoard() {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: 'todo',
      title: 'To Do',
      tasks: [
        {
          id: 'task-1',
          title: 'Implement file upload system',
          description: 'Create drag & drop file upload component with progress indicator',
          type: 'Feature',
          typeBg: 'bg-primary-100',
          typeColor: 'text-primary-700',
          assignee: 'John Doe',
          assigneeInitials: 'JD',
          assigneeBg: 'bg-primary-200',
          assigneeColor: 'text-primary-700',
          dueDate: 'Due in 3 days',
          status: 'todo',
          borderColor: 'border-primary-500'
        },
        {
          id: 'task-2',
          title: 'Evaluate PDF annotation libraries',
          description: 'Research options for PDF annotation and compare features',
          type: 'Research',
          typeBg: 'bg-info-100',
          typeColor: 'text-info-700',
          assignee: 'Alex Smith',
          assigneeInitials: 'AS',
          assigneeBg: 'bg-warning-200',
          assigneeColor: 'text-warning-700',
          dueDate: 'Due tomorrow',
          status: 'todo',
          borderColor: 'border-info-500'
        }
      ]
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      tasks: [
        {
          id: 'task-3',
          title: 'Create UI components for File Viewer',
          description: 'Design responsive components following Joy UI guidelines',
          type: 'Design',
          typeBg: 'bg-warning-100',
          typeColor: 'text-warning-700',
          assignee: 'Maria Kim',
          assigneeInitials: 'MK',
          assigneeBg: 'bg-success-200',
          assigneeColor: 'text-success-700',
          dueDate: '2 days left',
          status: 'in-progress',
          borderColor: 'border-warning-500'
        }
      ]
    },
    {
      id: 'review',
      title: 'Review',
      tasks: [
        {
          id: 'task-4',
          title: 'Implement user authentication',
          description: 'Set up JWT-based auth with role-based permissions',
          type: 'Feature',
          typeBg: 'bg-primary-100',
          typeColor: 'text-primary-700',
          assignee: 'John Doe',
          assigneeInitials: 'JD',
          assigneeBg: 'bg-primary-200',
          assigneeColor: 'text-primary-700',
          dueDate: 'Review requested',
          status: 'review',
          borderColor: 'border-primary-500'
        }
      ]
    },
    {
      id: 'done',
      title: 'Done',
      tasks: [
        {
          id: 'task-5',
          title: 'Project setup and configuration',
          description: 'Initialize React project with Joy UI components',
          type: 'Setup',
          typeBg: 'bg-success-100',
          typeColor: 'text-success-700',
          assignee: 'Alex Smith',
          assigneeInitials: 'AS',
          assigneeBg: 'bg-warning-200',
          assigneeColor: 'text-warning-700',
          dueDate: 'Completed',
          status: 'done',
          borderColor: 'border-success-500'
        }
      ]
    }
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Find the task that's being dragged
    for (const column of columns) {
      const task = column.tasks.find(t => t.id === active.id);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      setActiveTask(null);
      return;
    }

    // Get column ID from the container ID (format: "column-{columnId}")
    const targetColumnId = over.id.toString().split('-')[1];
    
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
      const taskIndex = column.tasks.findIndex(t => t.id === active.id);
      if (taskIndex !== -1) {
        sourceColumnId = column.id;
        taskToMove = { ...column.tasks[taskIndex] };
        column.tasks.splice(taskIndex, 1);
        break;
      }
    }

    if (sourceColumnId && taskToMove) {
      // Update the task's status
      taskToMove.status = targetColumnId as any;
      
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

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveTask(null);
  };

  const addNewTask = () => {
    // Functionality to add a new task would go here
    console.log("Add new task");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Kanban Board</h2>
        <Button onClick={addNewTask} className="gap-1">
          <PlusCircle className="h-4 w-4" />
          Add Task
        </Button>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex overflow-x-auto pb-4 kanban-container gap-4">
          {columns.map(column => (
            <div key={column.id} className="kanban-column bg-neutral-50 rounded-md shadow-sm p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{column.title}</h3>
                <span className="text-sm bg-neutral-200 rounded-full px-2">{column.tasks.length}</span>
              </div>
              
              <div id={`column-${column.id}`} className="space-y-3">
                {column.tasks.map(task => (
                  <Draggable key={task.id} id={task.id}>
                    <Card className={`kanban-card shadow-sm border-l-4 ${task.borderColor} cursor-grab`}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${task.typeBg} ${task.typeColor}`}>
                            {task.type}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-neutral-600">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                        <h4 className="font-medium mt-2">{task.title}</h4>
                        <p className="text-sm text-neutral-600 mt-1">{task.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex">
                            <div className={`w-6 h-6 rounded-full ${task.assigneeBg} flex items-center justify-center text-xs font-semibold ${task.assigneeColor}`}>
                              {task.assigneeInitials}
                            </div>
                          </div>
                          <div className="text-xs text-neutral-500">{task.dueDate}</div>
                        </div>
                      </CardContent>
                    </Card>
                  </Draggable>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <DragOverlay>
          {activeId && activeTask && (
            <Card className={`kanban-card shadow-sm border-l-4 ${activeTask.borderColor} cursor-grabbing w-[280px]`}>
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${activeTask.typeBg} ${activeTask.typeColor}`}>
                    {activeTask.type}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-neutral-600">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
                <h4 className="font-medium mt-2">{activeTask.title}</h4>
                <p className="text-sm text-neutral-600 mt-1">{activeTask.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex">
                    <div className={`w-6 h-6 rounded-full ${activeTask.assigneeBg} flex items-center justify-center text-xs font-semibold ${activeTask.assigneeColor}`}>
                      {activeTask.assigneeInitials}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">{activeTask.dueDate}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
