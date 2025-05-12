import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, Filter, Plus, FileDown, ChevronDown, ChevronRight, CircleDashed, CheckCircle2, Clock, AlertTriangle, Trash2, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Interface för uppgifter i Gantt-diagrammet
export interface GanttTask {
  id: number;
  project: string;
  type: "TASK" | "MILESTONE" | "PHASE";
  name: string;
  status: "New" | "Ongoing" | "Completed" | "Delayed";
  startDate: string;
  endDate: string;
  duration: number;
  dependencies?: number[];
  children?: GanttTask[];
  expanded?: boolean;
  parentId?: number;
  level?: number;
  assigneeId?: number | null;
  assigneeName?: string | null;
  estimatedHours?: number | null;
}

// Demo-data för Gantt-diagrammet - helt separerad från tasks API
const initialTasks: GanttTask[] = [
  {
    id: 1,
    project: "Byggprojekt A",
    type: "PHASE",
    name: "Projektfas 1: Design",
    status: "Completed",
    startDate: "2025-04-01",
    endDate: "2025-05-15",
    duration: 45,
    expanded: true,
    children: [
      {
        id: 2,
        project: "Byggprojekt A",
        type: "TASK",
        name: "Skapa initiala ritningar",
        status: "Completed",
        startDate: "2025-04-01",
        endDate: "2025-04-10",
        duration: 10,
        parentId: 1,
      },
      {
        id: 3,
        project: "Byggprojekt A",
        type: "TASK",
        name: "Kostnadsberäkning",
        status: "Completed",
        startDate: "2025-04-11",
        endDate: "2025-04-20",
        duration: 10,
        dependencies: [2],
        parentId: 1,
      },
      {
        id: 4,
        project: "Byggprojekt A",
        type: "MILESTONE",
        name: "Designbeslut",
        status: "Completed",
        startDate: "2025-04-21",
        endDate: "2025-04-21",
        duration: 0,
        dependencies: [3],
        parentId: 1,
      }
    ]
  },
  {
    id: 5,
    project: "Byggprojekt A",
    type: "PHASE",
    name: "Projektfas 2: Byggnation",
    status: "Ongoing",
    startDate: "2025-05-16",
    endDate: "2025-07-30",
    duration: 76,
    dependencies: [1],
    expanded: true,
    children: [
      {
        id: 6,
        project: "Byggprojekt A",
        type: "TASK",
        name: "Grundarbete",
        status: "Ongoing",
        startDate: "2025-05-16",
        endDate: "2025-05-30",
        duration: 15,
        dependencies: [4],
        parentId: 5,
      },
      {
        id: 7,
        project: "Byggprojekt A",
        type: "MILESTONE",
        name: "Grundinspektion",
        status: "New",
        startDate: "2025-06-01",
        endDate: "2025-06-01",
        duration: 0,
        dependencies: [6],
        parentId: 5,
      },
      {
        id: 8,
        project: "Byggprojekt A",
        type: "TASK",
        name: "Stomresning",
        status: "New",
        startDate: "2025-06-02",
        endDate: "2025-07-15",
        duration: 44,
        dependencies: [7],
        parentId: 5,
      },
      {
        id: 9,
        project: "Byggprojekt A",
        type: "TASK",
        name: "Takläggning",
        status: "New",
        startDate: "2025-07-10",
        endDate: "2025-07-30",
        duration: 21,
        dependencies: [8],
        parentId: 5,
      }
    ]
  },
  {
    id: 10,
    project: "Byggprojekt B",
    type: "PHASE",
    name: "Renovering badrum",
    status: "Delayed",
    startDate: "2025-04-10",
    endDate: "2025-06-15",
    duration: 66,
    expanded: true,
    children: [
      {
        id: 11,
        project: "Byggprojekt B",
        type: "TASK",
        name: "Rivning",
        status: "Completed",
        startDate: "2025-04-10",
        endDate: "2025-04-20",
        duration: 11,
        parentId: 10,
      },
      {
        id: 12,
        project: "Byggprojekt B",
        type: "TASK",
        name: "VVS-installation",
        status: "Delayed",
        startDate: "2025-04-21",
        endDate: "2025-05-10",
        duration: 20,
        dependencies: [11],
        parentId: 10,
      },
      {
        id: 13,
        project: "Byggprojekt B",
        type: "TASK",
        name: "Kakelsättning",
        status: "New",
        startDate: "2025-05-11",
        endDate: "2025-06-01",
        duration: 22,
        dependencies: [12],
        parentId: 10,
      },
      {
        id: 14,
        project: "Byggprojekt B", 
        type: "TASK",
        name: "Montering av inredning",
        status: "New",
        startDate: "2025-06-02",
        endDate: "2025-06-15",
        duration: 14,
        dependencies: [13],
        parentId: 10,
      }
    ]
  }
];

// Flatten task hierarchy for display
const flattenTasks = (tasks: GanttTask[]): GanttTask[] => {
  const result: GanttTask[] = [];
  
  const traverse = (task: GanttTask, level = 0) => {
    const taskCopy = { ...task, level };
    if (taskCopy.children) {
      const children = [...taskCopy.children];
      delete taskCopy.children;
      result.push(taskCopy);
      
      if (taskCopy.expanded) {
        children.forEach(child => traverse(child, level + 1));
      }
    } else {
      result.push({ ...taskCopy, level });
    }
  };
  
  tasks.forEach(task => traverse(task));
  return result;
};

// Status icon component
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'New':
      return <CircleDashed className="w-5 h-5 text-blue-500" />;
    case 'Ongoing':
      return <Clock className="w-5 h-5 text-amber-500" />;
    case 'Completed':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'Delayed':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    default:
      return <CircleDashed className="w-5 h-5" />;
  }
};

interface ModernGanttChartProps {
  projectId?: number;
  focusTaskId?: string | null;
}

const ModernGanttChart: React.FC<ModernGanttChartProps> = ({ projectId, focusTaskId = null }) => {
  const { toast } = useToast();
  
  // Hämta projektmedlemmar för att kunna tilldela uppgifter
  const { data: projectMembers = [] } = useQuery({
    queryKey: ['/api/project-members', projectId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/project-members/${projectId}`);
        if (!response.ok) {
          throw new Error('Kunde inte hämta projektmedlemmar');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching project members:', error);
        return [];
      }
    },
    enabled: !!projectId && projectId > 0
  });
  
  // Mutation för att skapa nya uppgifter
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      // Behåll den valda task-typen (milestone, phase, eller task)
      // Konverterar från UI-format till API-format om det behövs
      if (taskData.ganttType) {
        // Om vi har en ganttType (MILESTONE, PHASE, TASK) från UI, konvertera till backend-format
        const typeMapping: Record<string, string> = {
          'MILESTONE': 'milestone',
          'PHASE': 'phase',
          'TASK': 'task'
        };
        
        taskData = {
          ...taskData,
          type: typeMapping[taskData.ganttType] || 'gantt'
        };
        delete taskData.ganttType;
      }
      
      // Sätt typen till 'gantt' bara om den inte uttryckligen anges
      if (!taskData.type) {
        taskData.type = 'gantt';
      }
      
      const response = await apiRequest('POST', '/api/tasks', taskData);
      return await response.json();
    },
    onSuccess: () => {
      // Invalidera tasks-queryn för att hämta uppdaterade data
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', projectId] });
      
      // Invalidera alla field-tasks queries för att uppdatera dashboardwidgets
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      
      // Stäng dialogen om den är öppen
      setShowCreateDialog(false);
      
      toast({
        title: "Uppgift skapad",
        description: "En ny uppgift har skapats",
      });
    },
    onError: (error) => {
      console.error('Fel vid skapande av uppgift:', error);
      toast({
        title: "Kunde inte skapa uppgiften",
        description: "Ett fel uppstod när uppgiften skulle sparas i databasen",
        variant: "destructive",
      });
    }
  });
  
  // Mutation för att uppdatera befintliga uppgifter
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskData }: { taskId: number, taskData: any }) => {
      // Behåll den valda task-typen (milestone, phase, eller task)
      // Konverterar från UI-format till API-format om det behövs
      if (taskData.ganttType) {
        // Om vi har en ganttType (MILESTONE, PHASE, TASK) från UI, konvertera till backend-format
        const typeMapping: Record<string, string> = {
          'MILESTONE': 'milestone',
          'PHASE': 'phase',
          'TASK': 'task'
        };
        
        taskData = {
          ...taskData,
          type: typeMapping[taskData.ganttType] || 'gantt'
        };
        delete taskData.ganttType;
      }
      
      // Sätt typen till 'gantt' bara om den inte uttryckligen anges
      if (!taskData.type) {
        taskData.type = 'gantt';
      }
      
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}`, taskData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', projectId] });
      
      // Invalidera alla field-tasks queries för att uppdatera dashboardwidgets
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      
      toast({
        title: "Uppgift uppdaterad",
        description: "Uppgiften har uppdaterats",
      });
    },
    onError: (error) => {
      console.error('Fel vid uppdatering av uppgift:', error);
      toast({
        title: "Kunde inte uppdatera uppgiften",
        description: "Ett fel uppstod när uppgiften skulle uppdateras i databasen",
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
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', projectId] });
      
      // Invalidera alla field-tasks queries för att uppdatera dashboardwidgets
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      
      toast({
        title: "Uppgift borttagen",
        description: "Uppgiften har tagits bort",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error('Fel vid radering av uppgift:', error);
      toast({
        title: "Kunde inte radera uppgiften",
        description: "Ett fel uppstod när uppgiften skulle raderas från databasen",
        variant: "destructive",
      });
    }
  });
  
  // Generera ett projektnamn baserat på projektid
  const currentProjectName = useMemo(() => {
    if (!projectId) return "Default Project";
    return `Projekt ${projectId}`; // Detta kan ersättas med en faktisk API-anrop för att hämta projektnamn
  }, [projectId]);
  
  // Använd projektspecifik localStorage-nyckel om projektId finns
  const getStorageKey = () => {
    return projectId ? `project_${projectId}_gantt_tasks` : 'no_project_gantt_tasks';
  };
  
  // Hämta uppgifter från API om projektId finns, annars från localStorage
  const { data: apiTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/tasks', projectId, 'gantt'],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        // Lägg till type=gantt i sökningen för att bara hämta Gantt-uppgifter
        const response = await fetch(`/api/tasks?projectId=${projectId}&type=gantt`);
        if (!response.ok) throw new Error('Kunde inte hämta uppgifter');
        const data = await response.json();
        console.log(`Gantt: Hittade ${data.length} gantt-uppgifter för projekt ${projectId}`);
        
        // Funktion för att normalisera datum (matchar den i DeadlinesWidget)
        const normalizeDate = (dateStr?: string): string | undefined => {
          if (!dateStr) return undefined;
          
          // Om datumet redan är ett ISO-format med tid, returnera endast YYYY-MM-DD-delen
          if (dateStr.includes('T')) {
            return dateStr.substring(0, 10);
          }
          
          // Om det är bara YYYY-MM-DD, använd det direkt
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
          }
          
          // För andra format, konvertera via Date-objekt och ta YYYY-MM-DD-delen
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString().substring(0, 10);
            }
          } catch (e) {
            console.error("Kunde inte normalisera datum för Gantt:", dateStr, e);
          }
          
          // Fallback - returnera ursprungligt värde
          return dateStr;
        };

        // Omvandla API-formatet till GanttTask-formatet
        return data.map((task: any) => {
          // Normalisera datum för att säkerställa konsekvent format YYYY-MM-DD
          // Använd dagens datum som standardvärde om ingen startDate finns
          const today = new Date().toISOString().substring(0, 10);
          const normalizedStartDate = normalizeDate(task.startDate) || normalizeDate(task.createdAt) || today;
          
          // För slutdatum, beräkna standardvärde baserat på uppgiftstyp
          let defaultEndDate = normalizedStartDate;
          if (task.type === 'milestone') {
              // Milstolpar är samma dag
              defaultEndDate = normalizedStartDate;
          } else if (task.type === 'phase') {
              // Faser är 14 dagar långa som standard
              const endDateObj = new Date(normalizedStartDate);
              endDateObj.setDate(endDateObj.getDate() + 14);
              defaultEndDate = endDateObj.toISOString().substring(0, 10);
          } else {
              // Vanliga uppgifter är 7 dagar som standard
              const endDateObj = new Date(normalizedStartDate);
              endDateObj.setDate(endDateObj.getDate() + 7);
              defaultEndDate = endDateObj.toISOString().substring(0, 10);
          }
          
          const normalizedEndDate = normalizeDate(task.endDate) || defaultEndDate;
          
          console.log(`Gantt Task "${task.title}" datum normaliserade:`, {
            original: {
              startDate: task.startDate,
              endDate: task.endDate,
              createdAt: task.createdAt
            },
            normalized: {
              startDate: normalizedStartDate,
              endDate: normalizedEndDate
            }
          });
          
          // Förbättrad typhantering - respektera originaltypen men mappa till UI-format
          const mapTaskTypeToUI = (originalType: string) => {
            if (originalType === 'milestone') return 'MILESTONE';
            if (originalType === 'phase') return 'PHASE';
            if (originalType === 'task') return 'TASK';
            if (originalType === 'gantt') return 'TASK'; // standard gantt-uppgifter visar vi som vanliga uppgifter
            
            // Loggning för debugging
            console.log(`Gantt: Ovanlig uppgiftstyp: "${originalType}" för uppgift "${task.title}"`);
            
            // Defaulta till TASK om typen inte är någon av de kända typerna
            return 'TASK';
          };
          
          return {
            id: task.id,
            project: currentProjectName,
            type: mapTaskTypeToUI(task.type),
            name: task.title,
            status: task.status === 'todo' || task.status === 'backlog' ? 'New' : 
                   task.status === 'in_progress' || task.status === 'review' ? 'Ongoing' : 
                   task.status === 'done' ? 'Completed' : 'Delayed',
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            duration: task.duration || 1,
            parentId: task.parentId,
            expanded: true,
            assigneeId: task.assigneeId,
            assigneeName: task.assignee
          };
        });
      } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
      }
    },
    enabled: !!projectId
  });
  
  const [tasks, setTasks] = useState<GanttTask[]>(() => {
    try {
      // Om det inte finns ett projektId, använd localStorage eller demodata
      if (!projectId) {
        const savedTasks = localStorage.getItem(getStorageKey());
        if (savedTasks) {
          return JSON.parse(savedTasks);
        }
        return initialTasks;
      }
      
      // För projektspecifika vyer, börja med tom array och låt useEffect 
      // uppdatera när API-data kommer in
      return [];
    } catch (error) {
      console.error('Error loading tasks:', error);
      return projectId ? [] : initialTasks;
    }
  });
  
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(addMonths(new Date(), 3))
  });
  // Zooming state for Gantt chart
  const [zoomLevel, setZoomLevel] = useState<number>(30); // Standard width per day in pixels
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  
  // State för att hantera borttagning av uppgift
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<GanttTask | null>(null);
  
  // Dialog för att skapa nya uppgifter eller redigera befintliga
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [newTask, setNewTask] = useState<Partial<GanttTask>>({
    type: 'TASK',
    status: 'New',
    project: '', // Projektnamnet sätts automatiskt baserat på aktuellt projekt
    name: '',
    startDate: '',
    endDate: '',
    duration: 0,
    assigneeId: null, // Null betyder att ingen har tilldelats uppgiften
    assigneeName: null, // Kommer att sättas baserat på assigneeId
    estimatedHours: null // Uppskattat antal timmar för uppgiften
  });
  
  // Hantera expandering/kollapsning av faser
  const toggleExpand = (taskId: number) => {
    setTasks(prev => {
      return prev.map(task => {
        if (task.id === taskId) {
          return { ...task, expanded: !task.expanded };
        }
        return task;
      });
    });
  };
  
  // Uppdatera tasks state när API-data laddas
  useEffect(() => {
    if (apiTasks && apiTasks.length > 0 && !isLoadingTasks) {
      setTasks(apiTasks);
      console.log('Uppdaterade tasks state med API-data:', apiTasks.length, 'uppgifter');
    }
  }, [apiTasks, isLoadingTasks]);
  
  // Lyssna efter förändringar i focusTaskId och öppna uppgiften om den finns
  useEffect(() => {
    if (focusTaskId && apiTasks && apiTasks.length > 0 && !isLoadingTasks) {
      console.log(`Letar efter fokuserad uppgift med ID: ${focusTaskId} i ${apiTasks.length} uppgifter`);
      const focusedTask = apiTasks.find((task: GanttTask) => task.id.toString() === focusTaskId);
      
      if (focusedTask) {
        console.log("Fokuserad gantt-uppgift hittad:", focusedTask);
        
        // Hitta förälderfaser och expandera dem för att visa uppgiften
        if (focusedTask.parentId) {
          setTasks(prev => {
            return prev.map(task => {
              if (task.id === focusedTask.parentId) {
                return { ...task, expanded: true };
              }
              return task;
            });
          });
        }
        
        // Skrolla till uppgiften i Gantt-diagrammet
        setTimeout(() => {
          const taskElement = document.getElementById(`gantt-task-${focusedTask.id}`);
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            taskElement.classList.add('highlight-task');
            setTimeout(() => {
              taskElement.classList.remove('highlight-task');
            }, 3000); // Ta bort highlight efter 3 sekunder
          }
        }, 500);
        
        // Öppna redigeringsdialogen för uppgiften
        setEditingTaskId(focusedTask.id);
        setNewTask({
          type: focusedTask.type,
          status: focusedTask.status,
          project: focusedTask.project,
          name: focusedTask.name,
          startDate: focusedTask.startDate,
          endDate: focusedTask.endDate,
          duration: focusedTask.duration,
          assigneeId: focusedTask.assigneeId || null,
          assigneeName: focusedTask.assigneeName || null
        });
        setIsEditMode(true);
        setShowCreateDialog(true);
      } else {
        console.log(`Uppgift med ID ${focusTaskId} hittades inte i Gantt-vyn för projektet`);
      }
    }
  }, [focusTaskId, apiTasks, isLoadingTasks]);
  
  // Spara uppgifter till localStorage när de ändras
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(tasks));
      console.log(`Gantt tasks saved to localStorage (${getStorageKey()}):`, tasks.length, 'tasks');
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }, [tasks, projectId]);

  // Generera dagar för tidslinjen baserat på datumintervall
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end
    });
  }, [dateRange]);
  
  // Hämta alla unika projekt för filtrering
  const projects = useMemo(() => {
    const projectSet = new Set<string>();
    const addProject = (task: GanttTask) => {
      projectSet.add(task.project);
      if (task.children) {
        task.children.forEach(addProject);
      }
    };
    tasks.forEach(addProject);
    return Array.from(projectSet);
  }, [tasks]);
  
  // Hämta alla unika statusar för filtrering
  const statuses = useMemo(() => {
    const statusSet = new Set<string>();
    const addStatus = (task: GanttTask) => {
      statusSet.add(task.status);
      if (task.children) {
        task.children.forEach(addStatus);
      }
    };
    tasks.forEach(addStatus);
    return Array.from(statusSet);
  }, [tasks]);
  
  // Hämta alla unika typer för filtrering
  const types = useMemo(() => {
    const typeSet = new Set<string>();
    const addType = (task: GanttTask) => {
      typeSet.add(task.type);
      if (task.children) {
        task.children.forEach(addType);
      }
    };
    tasks.forEach(addType);
    return Array.from(typeSet);
  }, [tasks]);
  
  // Filtrera uppgifter baserat på valda filter
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const projectMatch = selectedProjects.length === 0 || selectedProjects.includes(task.project);
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(task.status);
      const typeMatch = typeFilter.length === 0 || typeFilter.includes(task.type);
      return projectMatch && statusMatch && typeMatch;
    });
  }, [tasks, selectedProjects, statusFilter, typeFilter]);
  
  // Förbereda uppgifter för visning i platt struktur (för tabellen)
  const flattenedTasks = useMemo(() => {
    return flattenTasks(filteredTasks);
  }, [filteredTasks]);
  
  // Generera månadsrubriker för tidslinjen
  const monthHeaders = useMemo(() => {
    const headers: { month: string, days: number }[] = [];
    let currentMonth = '';
    let dayCount = 0;
    
    days.forEach(day => {
      const monthName = format(day, 'MMM yyyy');
      if (currentMonth === monthName) {
        dayCount++;
      } else {
        if (currentMonth !== '') {
          headers.push({ month: currentMonth, days: dayCount });
        }
        currentMonth = monthName;
        dayCount = 1;
      }
    });
    
    if (dayCount > 0) {
      headers.push({ month: currentMonth, days: dayCount });
    }
    
    return headers;
  }, [days]);
  
  // Hantera val av filter för projekt
  const toggleProjectFilter = (project: string) => {
    setSelectedProjects(prev => {
      if (prev.includes(project)) {
        return prev.filter(p => p !== project);
      } else {
        return [...prev, project];
      }
    });
  };
  
  // Hantera val av filter för status
  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };
  
  // Hantera val av filter för typ
  const toggleTypeFilter = (type: string) => {
    setTypeFilter(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };
  
  // Beräkna position och stil för uppgiftsstaplar
  const getTaskBarStyle = (task: GanttTask): React.CSSProperties => {
    // Kontrollera om datum finns och konvertera datestrings till Date-objekt
    if (!task.startDate || !task.endDate) {
      console.warn(`Gantt: Uppgift "${task.name}" saknar start- eller slutdatum`, task);
      return { display: 'none' };
    }
    
    // Försök att konvertera strängdatum till Date-objekt, hantera eventuella fel
    let taskStartDate, taskEndDate;
    try {
      taskStartDate = parseISO(task.startDate);
      taskEndDate = parseISO(task.endDate);
      
      // Validera att parseISO producerade giltiga datum
      if (isNaN(taskStartDate.getTime()) || isNaN(taskEndDate.getTime())) {
        console.warn(`Gantt: Ogiltiga datum för uppgift "${task.name}"`, {
          startDate: task.startDate,
          endDate: task.endDate
        });
        return { display: 'none' };
      }
    } catch (error) {
      console.error(`Gantt: Fel vid konvertering av datum för uppgift "${task.name}"`, error);
      return { display: 'none' };
    }
    
    // Logga för debugging
    console.log(`Gantt: Rendering uppgift "${task.name}"`, {
      type: task.type,
      startDate: task.startDate,
      endDate: task.endDate,
      dates: {
        start: taskStartDate.toISOString(),
        end: taskEndDate.toISOString()
      }
    });
    
    // Hitta indexen där uppgiften börjar och slutar
    let startIdx = -1;
    let endIdx = -1;
    
    // För robusthet, använd en säker metod för att hitta index
    function findDateIndex(date: Date, defaultValue: number): number {
      // Logga för debugging
      console.log(`Gantt: Söker index för ${date.toISOString().substring(0, 10)}`);
      
      // Om datum är null/undefined, returnera fallback
      if (!date) {
        console.warn(`Gantt: Ogiltigt datum (undefined/null)`);
        return defaultValue;
      }
      
      // Hitta matchande datum i days-listan
      for (let i = 0; i < days.length; i++) {
        try {
          if (isSameDay(days[i], date) || isAfter(days[i], date)) {
            return i;
          }
        } catch (e) {
          console.error(`Gantt: Fel vid jämförelse av datum mellan ${days[i]} och ${date}`, e);
        }
      }
      
      // Om ingen match hittas, returnera fallback men logga varning
      console.warn(`Gantt: Hittade inget matchande index för datum ${date}`);
      return defaultValue;
    }
    
    // Hitta startindex med säker metod
    startIdx = findDateIndex(taskStartDate, 0);
    
    // Hitta slutindex baserat på uppgiftstyp
    if (task.type === 'MILESTONE') {
      // Milstolpar visar vi som en punkt (samma dag)
      endIdx = startIdx;
    } else {
      // För vanliga uppgifter
      endIdx = findDateIndex(taskEndDate, startIdx + 1);
      
      // Säkerställ att endIdx alltid är >= startIdx för förutsägbart beteende
      if (endIdx < startIdx) {
        console.warn(`Gantt: Slutindex (${endIdx}) < startindex (${startIdx}) för "${task.name}", justerar...`);
        endIdx = startIdx + 1;
      }
    }
    
    // Om datumen inte är inom intervallet eller vi fick ogiltig indexering
    if (startIdx === -1 || endIdx === -1) {
      console.warn(`Gantt: Uppgift "${task.name}" har datum utanför intervallet`, {
        startIdx,
        endIdx,
        days: days.length
      });
      return { display: 'none' };
    }
    
    // Beräkna bredden baserat på uppgiftstyp
    let width;
    if (task.type === 'MILESTONE') {
      width = 10; // Milstolpar är bara punkter
    } else {
      // Beräkna bredden baserat på faktiska datum
      const dayDiff = differenceInDays(taskEndDate, taskStartDate);
      width = Math.max((dayDiff + 1) * zoomLevel, zoomLevel);
    }
    
    let barColor = '';
    
    switch (task.status) {
      case 'New':
        barColor = '#3b82f6'; // blue-500
        break;
      case 'Ongoing':
        barColor = '#f59e0b'; // amber-500
        break;
      case 'Completed':
        barColor = '#10b981'; // green-500
        break;
      case 'Delayed':
        barColor = '#ef4444'; // red-500
        break;
      default:
        barColor = '#6b7280'; // gray-500
    }
    
    // Skapa olika stilar beroende på uppgiftstyp
    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${startIdx * zoomLevel}px`,
      cursor: 'pointer',
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    };
    
    // Olika stilar beroende på uppgiftstyp
    if (task.type === 'MILESTONE') {
      // För milstolpar, skapa en diamantformad markör med glans
      Object.assign(style, {
        top: '10px',
        width: '14px',
        height: '14px',
        backgroundColor: barColor,
        transform: 'rotate(45deg)',
        borderRadius: '2px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.4)',
        zIndex: 3,
        display: 'block'
      });
      console.log(`Gantt: Renderar MILSTOLPE "${task.name}"`, {
        position: style.left,
        color: barColor,
        dates: {
          start: task.startDate
        }
      });
    }
    else if (task.type === 'PHASE') {
      // För faser, skapa en större stapel med gradient och subtil skugga
      Object.assign(style, {
        top: '2px',
        width: `${width}px`,
        height: '26px',
        background: `linear-gradient(to right, ${barColor}, ${barColor}dd)`,
        border: '1px solid rgba(0,0,0,0.05)',
        borderLeft: '4px solid rgba(0,0,0,0.2)',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        zIndex: 1
      });
      console.log(`Gantt: Renderar FAS "${task.name}"`, {
        position: style.left,
        bredd: style.width,
        color: barColor,
        dates: {
          start: task.startDate,
          end: task.endDate
        }
      });
    }
    else {
      // För vanliga uppgifter, skapa en modern stapel med gradient och statusindikator
      let statusIndicator = {};
      
      if (task.status === 'Completed') {
        statusIndicator = {
          borderBottom: '2px solid rgba(255,255,255,0.5)',
          background: `linear-gradient(to bottom, ${barColor}ee, ${barColor})`
        };
      } else if (task.status === 'Delayed') {
        statusIndicator = {
          borderLeft: '3px solid #ef4444',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
        };
      } else {
        statusIndicator = {
          background: `linear-gradient(to bottom, ${barColor}dd, ${barColor})`,
          borderTop: '1px solid rgba(255,255,255,0.3)'
        };
      }
      
      Object.assign(style, {
        top: '5px',
        width: `${width}px`,
        height: '20px',
        backgroundColor: barColor,
        borderRadius: '3px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        ...statusIndicator
      });
      
      console.log(`Gantt: Renderar UPPGIFT "${task.name}"`, {
        position: style.left,
        bredd: style.width,
        color: barColor,
        dates: {
          start: task.startDate,
          end: task.endDate
        }
      });
    }
    
    return style;
  };
  
  // Interface för SVG arrow style
  interface ArrowStyle {
    points: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    strokeDasharray: string;
    markerEnd: string;
  }
  
  // Beräkna utseende för beroendepilar
  const getDependencyArrowStyle = (task: GanttTask): ArrowStyle[] | null => {
    if (!task.dependencies || task.dependencies.length === 0) {
      return null;
    }
    
    const dependencyLines = task.dependencies.map(depId => {
      const dependencyTask = flattenedTasks.find(t => t.id === depId);
      
      if (!dependencyTask) {
        return null;
      }
      
      const sourceTask = dependencyTask; // Källuppgift (den tidigare uppgiften)
      const targetTask = task;           // Måluppgift (den senare uppgiften)
      
      // Konvertera datestrings till Date-objekt
      const sourceTaskStartDate = parseISO(sourceTask.startDate);
      const sourceTaskEndDate = parseISO(sourceTask.endDate);
      const targetTaskStartDate = parseISO(targetTask.startDate);
      
      // Hitta startindex och slutindex för båda uppgifterna
      let sourceTaskStartIdx = -1;
      let sourceTaskEndIdx = -1;
      let targetTaskStartIdx = -1;
      
      // Hitta startindex för källuppgiften
      for (let i = 0; i < days.length; i++) {
        if (isSameDay(days[i], sourceTaskStartDate) || isAfter(days[i], sourceTaskStartDate)) {
          sourceTaskStartIdx = i;
          break;
        }
      }
      
      // Hitta slutindex för källuppgiften
      if (sourceTask.type === 'MILESTONE') {
        sourceTaskEndIdx = sourceTaskStartIdx;
      } else {
        for (let i = 0; i < days.length; i++) {
          if (isSameDay(days[i], sourceTaskEndDate) || isAfter(days[i], sourceTaskEndDate)) {
            sourceTaskEndIdx = i;
            break;
          }
        }
      }
      
      // Hitta startindex för måluppgiften
      for (let i = 0; i < days.length; i++) {
        if (isSameDay(days[i], targetTaskStartDate) || isAfter(days[i], targetTaskStartDate)) {
          targetTaskStartIdx = i;
          break;
        }
      }
      
      if (sourceTaskStartIdx === -1 || sourceTaskEndIdx === -1 || targetTaskStartIdx === -1) {
        return null;
      }
      
      // Beräkna koordinater för pilen med hänsyn till zoomLevel
      // För en uppgift är slutpositionen startpositionen + bredden
      const sourceDayCount = sourceTask.type === 'MILESTONE' ? 0 : differenceInDays(sourceTaskEndDate, sourceTaskStartDate);
      const sourceTaskWidth = sourceTask.type === 'MILESTONE' ? 10 : Math.max((sourceDayCount + 1) * zoomLevel, zoomLevel);
      
      // Hitta radnummer för att beräkna Y-positioner
      const sourceTaskIndex = flattenedTasks.findIndex(t => t.id === sourceTask.id);
      const targetTaskIndex = flattenedTasks.findIndex(t => t.id === targetTask.id);
      
      // Beräkna faktiska y-positioner baserat på raderna (höjden för varje rad är 40px)
      const sourceRowY = sourceTaskIndex * 40 + 15; // 15 är mitten på uppgiftsstapeln
      const targetRowY = targetTaskIndex * 40 + 15;
      
      // Beräkna x-positioner för pilens start- och slutpunkter
      const sourceX = (sourceTaskStartIdx * zoomLevel) + sourceTaskWidth; // Slutet av källuppgiften
      const targetX = targetTaskStartIdx * zoomLevel; // Början av måluppgiften
      
      // Anpassa pilstorleken baserat på zoomnivå
      const arrowThickness = Math.max(1, Math.min(2, zoomLevel / 20));
      
      // Bestäm pilens form baserat på uppgifternas relativa positioner
      let points = "";
      
      // Om pilens riktning är mot vänster (måluppgiften börjar före källuppgiftens slut)
      // då måste vi rita pilen runt uppgifterna, inte genom dem
      if (targetX < sourceX) {
        // Bestäm om vi ska rita pilen uppåt eller nedåt (eller både och)
        const isUpward = targetTaskIndex < sourceTaskIndex;
        const midX1 = sourceX + 20; // Temporär punkt till höger om källuppgiften
        const midX2 = targetX - 20; // Temporär punkt till vänster om måluppgiften
        const midY = isUpward 
          ? Math.min(sourceRowY, targetRowY) - 20 // 20px ovanför den övre uppgiften
          : Math.max(sourceRowY, targetRowY) + 20; // 20px nedanför den nedre uppgiften
        
        // Rita en bana som går runt uppgifterna
        points = `${sourceX},${sourceRowY} ${midX1},${sourceRowY} ${midX1},${midY} ${midX2},${midY} ${midX2},${targetRowY} ${targetX},${targetRowY}`;
      } 
      // Normal bana när måluppgiften börjar efter eller samma punkt som källuppgiftens slut
      else {
        // Om uppgifterna är på samma rad, rita en enkel linje
        if (sourceTaskIndex === targetTaskIndex) {
          points = `${sourceX},${sourceRowY} ${targetX},${targetRowY}`;
        }
        // Om uppgifterna är på olika rader, rita en linje med hörnpunkt
        else {
          const midX = sourceX + (targetX - sourceX) / 2;
          points = `${sourceX},${sourceRowY} ${midX},${sourceRowY} ${midX},${targetRowY} ${targetX},${targetRowY}`;
        }
      }
      
      return {
        points,
        fill: "none",
        stroke: "#64748b",
        strokeWidth: arrowThickness,
        strokeDasharray: "4 2",
        markerEnd: "url(#arrowhead)"
      };
    });
    
    return dependencyLines.filter(Boolean) as ArrowStyle[];
  };
  
  // Hantera klick på uppgift för att visa/redigera den
  const handleTaskClick = (task: GanttTask) => {
    // Initiera redigeringsläge för uppgiften
    setIsEditMode(true);
    setEditingTaskId(task.id);
    
    // Fyll formuläret med befintlig data
    setNewTask({
      type: task.type,
      status: task.status,
      project: task.project,
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      duration: task.duration,
      assigneeId: task.assigneeId || null,
      assigneeName: task.assigneeName || null
    });
    
    // Visa dialogen
    setShowCreateDialog(true);
  };
  
  // Hantera skapande eller uppdatering av uppgift
  const saveNewTask = () => {
    if (!newTask.name || !newTask.startDate || (!newTask.endDate && newTask.type !== 'MILESTONE')) {
      toast({
        title: "Formuläret är ofullständigt",
        description: "Vänligen fyll i alla obligatoriska fält",
        variant: "destructive",
      });
      return;
    }
    
    // Om det är en milstolpe, sätt sluttid till samma som starttid
    const endDate = newTask.type === 'MILESTONE' ? newTask.startDate : newTask.endDate;
    
    // Beräkna varaktighet
    const duration = newTask.type === 'MILESTONE' 
      ? 0 
      : differenceInDays(parseISO(endDate!), parseISO(newTask.startDate!)) + 1;
    
    // Konvertera Gantt-uppgiftsstatus till API-format
    const apiStatus = newTask.status === 'New' ? 'todo' :
                      newTask.status === 'Ongoing' ? 'in_progress' :
                      newTask.status === 'Completed' ? 'done' :
                      'backlog';
                      
    // Konvertera Gantt uppgiftstyp till API-format
    const apiType = newTask.type === 'TASK' ? 'task' :
                    newTask.type === 'MILESTONE' ? 'milestone' :
                    'phase';
    
    // Om vi redigerar en befintlig uppgift
    if (isEditMode && editingTaskId !== null) {
      // Uppdatera i UI för direkt feedback
      setTasks(prev => prev.map(task => {
        if (task.id === editingTaskId) {
          return {
            ...task,
            type: newTask.type as "TASK" | "MILESTONE" | "PHASE",
            name: newTask.name!,
            status: newTask.status as "New" | "Ongoing" | "Completed" | "Delayed",
            project: task.project,
            startDate: newTask.startDate!,
            endDate: endDate!,
            duration,
            assigneeId: newTask.assigneeId,
            assigneeName: newTask.assigneeName
          };
        }
        return task;
      }));
      
      // För projekt med projektId, spara till databasen
      if (projectId) {
        // Skapa API-data objekt - ALLTID sätta 'type' fältet till 'gantt' för 
        // databastypfältet, medan apiType används för visuell representation
        const taskData = {
          title: newTask.name,
          status: apiStatus,
          type: "gantt", // Explicit sätter databas-typen till "gantt"
          taskType: apiType, // Använd separata fält för Gantt-vyn
          projectId: projectId,
          startDate: newTask.startDate,
          endDate: endDate,
          parentId: null, // Kan läggas till senare för hierarkistöd
          assigneeId: newTask.assigneeId,
          estimatedHours: newTask.estimatedHours
        };
        
        // Anropa uppdateringsmutation
        updateTaskMutation.mutate({ 
          taskId: editingTaskId, 
          taskData: taskData 
        });
      }
      
      const taskTypeSv = newTask.type === 'TASK' ? 'Uppgift' : 
                       newTask.type === 'MILESTONE' ? 'Milstolpe' : 'Fas';
      
      toast({
        title: "Uppgift uppdaterad",
        description: `${taskTypeSv} "${newTask.name}" har uppdaterats i Gantt-diagrammet.`,
      });
      
      // Återställ redigeringsläge
      setIsEditMode(false);
      setEditingTaskId(null);
    } 
    // Skapa en ny uppgift
    else {
      // För lokala Gantt-uppgifter (utan projektId), använd gamla metoden
      if (!projectId) {
        const taskId = flattenedTasks.length > 0 
          ? Math.max(...flattenedTasks.map(t => t.id)) + 1 
          : 1;
        
        const newTaskItem: GanttTask = {
          id: taskId,
          project: currentProjectName,
          type: newTask.type as "TASK" | "MILESTONE" | "PHASE",
          name: newTask.name!,
          status: newTask.status as "New" | "Ongoing" | "Completed" | "Delayed",
          startDate: newTask.startDate!,
          endDate: endDate!,
          duration,
          assigneeId: newTask.assigneeId,
          assigneeName: newTask.assigneeName,
          estimatedHours: newTask.estimatedHours
        };
        
        setTasks(prev => [...prev, newTaskItem]);
      }
      // För uppgifter med projektId, spara till databasen
      else {
        // Skapa API-data objekt
        // Konvertera Gantt-uppgiftstyp till API-format
        const typeMapping: Record<string, string> = {
          'MILESTONE': 'milestone',
          'PHASE': 'phase',
          'TASK': 'task'
        };
        
        // Använd vald typ från användaren istället för hardcoded "gantt"
        const taskType = typeMapping[newTask.type as string] || 'gantt';
        
        const taskData = {
          title: newTask.name,
          status: apiStatus,
          type: taskType, // Använd korrekt mappat värde från uppgiftstypen
          projectId: projectId,
          startDate: newTask.startDate,
          endDate: endDate,
          parentId: null,
          assigneeId: newTask.assigneeId,
          estimatedHours: newTask.estimatedHours
        };
        
        // Skapa uppgiften via API
        createTaskMutation.mutate(taskData);
      }
      
      const taskTypeSv = newTask.type === 'TASK' ? 'Uppgift' : 
                         newTask.type === 'MILESTONE' ? 'Milstolpe' : 'Fas';
      
      toast({
        title: "Uppgift skapad",
        description: `${taskTypeSv} "${newTask.name}" har lagts till i Gantt-diagrammet.`,
      });
    }
    
    cancelCreateTask();
  };
  
  // Avbryt skapande eller redigering av uppgift
  const cancelCreateTask = () => {
    setShowCreateDialog(false);
    // Återställ formuläret
    setNewTask({
      type: 'TASK',
      status: 'New',
      project: '', // Lämna projektfältet tomt eftersom vi använder currentProjectName automatiskt
      name: '',
      startDate: '',
      endDate: '',
      duration: 0,
      assigneeId: null,
      assigneeName: null
    });
    // Återställ redigeringsläge
    setIsEditMode(false);
    setEditingTaskId(null);
  };
  
  // Hantera radering av uppgift
  const handleDeleteClick = (task: GanttTask) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };
  
  // Bekräfta radering av uppgift
  const confirmDeleteTask = () => {
    if (taskToDelete) {
      console.log("Deleting task:", taskToDelete);
      
      // Radera från den lokala listan
      setTasks(prev => {
        // Hitta och ta bort alla barn rekursivt
        const taskIds = new Set<number>();
        
        // Identifiera alla uppgifter som ska tas bort (uppgiften och alla barn)
        const findTasksToDelete = (taskId: number) => {
          taskIds.add(taskId);
          
          // Hitta alla direkta barn till denna uppgift
          const children = prev.filter(t => t.parentId === taskId);
          
          // Lägg till alla barnens ID och fortsätt neråt i hierarkin
          children.forEach(child => findTasksToDelete(child.id));
        };
        
        // Starta med den valda uppgiften
        findTasksToDelete(taskToDelete.id);
        
        // Beräkna antalet uppgifter som tas bort
        const deletedCount = taskIds.size;
        
        // För projekt med projektId, radera via API
        if (projectId) {
          // Radera huvuduppgiften från databasen med mutation
          deleteTaskMutation.mutate(taskToDelete.id);
          
          // Om det finns barn, radera även dem i databasen
          if (deletedCount > 1) {
            // Konvertera Set till Array för att kunna iterera
            const childrenIds = Array.from(taskIds).filter(id => id !== taskToDelete.id);
            console.log("Deleting child tasks:", childrenIds);
            
            // Radera barnuppgifterna en efter en
            childrenIds.forEach(childId => {
              deleteTaskMutation.mutate(childId);
            });
          }
        }
        
        // Skapa den nya filtrerade listan för lokal state
        const filteredTasks = prev.filter(t => !taskIds.has(t.id));
        
        console.log("Original tasks:", prev.length);
        console.log("Tasks to delete:", taskIds.size);
        console.log("Remaining tasks:", filteredTasks.length);
        
        // Visa bekräftelse med toast
        toast({
          title: "Uppgift borttagen",
          description: `${taskToDelete.name} ${deletedCount > 1 ? `och ${deletedCount - 1} relaterade uppgifter` : ''} har tagits bort från Gantt-diagrammet.`,
        });
        
        // Returnera den nya filtrerade listan
        return filteredTasks;
      });
      
      // Återställ dialogen
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };
  
  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setZoomLevel(prev => Math.max(10, prev - 10));
                toast({
                  title: "Zooma ut",
                  description: "Minskade zoomnivån för Gantt-diagrammet",
                });
              }}
            >
              <ZoomOut className="w-4 h-4 mr-1" />
              <span>Zooma ut</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setZoomLevel(prev => Math.min(100, prev + 10));
                toast({
                  title: "Zooma in",
                  description: "Ökade zoomnivån för Gantt-diagrammet",
                });
              }}
            >
              <ZoomIn className="w-4 h-4 mr-1" />
              <span>Zooma in</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              <span>Lägg till uppgift</span>
            </Button>
            <Button variant="outline" size="sm">
              <FileDown className="w-4 h-4 mr-1" />
              <span>Exportera</span>
            </Button>
          </div>
          
          <div className="ml-auto flex items-center space-x-2">
            <Select 
              value={viewMode} 
              onValueChange={(val) => setViewMode(val as any)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Visa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dag</SelectItem>
                <SelectItem value="week">Vecka</SelectItem>
                <SelectItem value="month">Månad</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Dialog>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-1" />
                  <span>Filtrera</span>
                </Button>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Filtrera uppgifter</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-6 py-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Projekt</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {projects.map(project => (
                          <div key={project} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`project-${project}`}
                              checked={selectedProjects.includes(project)}
                              onCheckedChange={() => toggleProjectFilter(project)}
                            />
                            <label htmlFor={`project-${project}`} className="text-sm cursor-pointer">{project}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Status</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {statuses.map(status => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`status-${status}`}
                              checked={statusFilter.includes(status)}
                              onCheckedChange={() => toggleStatusFilter(status)}
                            />
                            <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">
                              {status === 'New' ? 'Ny' : 
                               status === 'Ongoing' ? 'Pågående' : 
                               status === 'Completed' ? 'Avslutad' : 'Försenad'}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Typ</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {types.map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`type-${type}`}
                              checked={typeFilter.includes(type)}
                              onCheckedChange={() => toggleTypeFilter(type)}
                            />
                            <label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                              {type === 'TASK' ? 'Uppgift' : 
                               type === 'MILESTONE' ? 'Milstolpe' : 'Fas'}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - Gantt chart */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left side - Tasks table */}
        <div className="w-[40%] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-10 py-2">Typ</TableHead>
                <TableHead className="py-2">Uppgiftsnamn</TableHead>
                <TableHead className="py-2 text-center w-20">Status</TableHead>
                <TableHead className="py-2 w-24">Startdatum</TableHead>
                <TableHead className="py-2 w-24">Slutdatum</TableHead>
                <TableHead className="py-2 w-20">Varaktighet</TableHead>
                <TableHead className="py-2 w-24">Ansvarig</TableHead>
                <TableHead className="py-2 w-10">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedTasks.map((task, index) => (
                <TableRow 
                  key={task.id}
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleTaskClick(task)}
                >
                  <TableCell className="py-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant={
                              task.type === 'MILESTONE' 
                                ? 'default' 
                                : task.type === 'PHASE' 
                                  ? 'outline' 
                                  : 'secondary'
                            }
                            className={task.type === 'MILESTONE' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                          >
                            {task.type}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{
                            task.type === 'MILESTONE' 
                              ? 'Viktigt datum eller händelse' 
                              : task.type === 'PHASE' 
                                ? 'Behållare för uppgifter' 
                                : 'Arbetsuppgift'
                          }</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="py-2 font-medium">{task.name}</TableCell>
                  <TableCell className="py-2 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex justify-center">
                            <StatusIcon status={task.status} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {task.status === 'New' ? 'Ny' : 
                             task.status === 'Ongoing' ? 'Pågående' : 
                             task.status === 'Completed' ? 'Avslutad' : 'Försenad'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="py-2">{format(parseISO(task.startDate), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="py-2">{format(parseISO(task.endDate), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="py-2">
                    {task.type === 'MILESTONE' ? '-' : `${task.duration} dagar`}
                  </TableCell>
                  <TableCell className="py-2">
                    {task.assigneeName ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center">
                              <UserCog className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span className="text-xs truncate max-w-[90px]">{task.assigneeName}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tilldelad till: {task.assigneeName}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inte tilldelad</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(task);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Höger sida - Gantt-diagram */}
        <div className="w-[60%] overflow-y-auto overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="relative" style={{ minWidth: days.length * zoomLevel }}>
            {/* Tidsrubrik */}
            <div className="sticky top-0 bg-background z-10">
              {/* Månadsrubriker */}
              <div className="flex border-b border-border h-10">
                {monthHeaders.map((month, index) => (
                  <div 
                    key={index} 
                    className="text-center font-medium text-sm py-2 border-r border-border bg-muted"
                    style={{ width: `${month.days * zoomLevel}px` }}
                  >
                    {month.month}
                  </div>
                ))}
              </div>
              
              {/* Dagrubrik */}
              <div className="flex border-b border-border h-8">
                {days.map((day, index) => {
                  // Visa endast vissa dagar vid låg zoom för att undvika överlappning
                  const showDay = 
                    zoomLevel >= 30 || // Visa alla dagar vid hög zoom
                    (zoomLevel >= 20 && day.getDate() % 2 === 1) || // Visa udda dagar vid mellan zoom
                    (zoomLevel < 20 && day.getDate() % 5 === 1);    // Visa var femte dag vid låg zoom
                    
                  // Markera första dagen i månaden med tjockare vänsterkant
                  const isFirstOfMonth = day.getDate() === 1;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = isSameDay(day, new Date());
                  
                  // Markera viktiga datum (multiplar av 5 eller veckostart)
                  const isImportantDate = day.getDate() % 5 === 0 || day.getDay() === 1;
                  
                  return (
                    <div 
                      key={index}
                      className={`
                        text-center text-xs py-1 
                        border-r border-border 
                        ${isToday ? 'bg-primary/10 font-bold' : 
                           isWeekend ? 'bg-muted/50 text-muted-foreground' : 
                           isImportantDate && showDay ? 'font-medium' : ''}
                        ${isFirstOfMonth ? 'border-l-2 border-l-gray-400 dark:border-l-gray-500' : ''}
                      `}
                      style={{ 
                        width: `${zoomLevel}px`,
                        // Ändra bakgrund för att skapa ett subtilt rutnät
                        backgroundImage: isWeekend ? 'none' : 'linear-gradient(to right, rgba(0,0,0,0.025), rgba(0,0,0,0))',
                      }}
                    >
                      {showDay ? (
                        <div className={`${isImportantDate ? 'font-semibold' : ''}`}>
                          {format(day, 'd')}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Gantt-staplar */}
            <div style={{ position: 'relative' }}>
              {/* Rader för uppgifter */}
              {flattenedTasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className="relative h-10 border-b border-border hover:bg-muted"
                >
                  {/* Vertikal linje för dagens datum */}
                  {days.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`absolute top-0 bottom-0 w-px ${
                        isSameDay(day, new Date()) 
                          ? 'bg-red-500' 
                          : dayIndex % 7 === 0 || dayIndex % 7 === 6 
                            ? 'bg-border' 
                            : ''
                      }`}
                      style={{ left: `${dayIndex * zoomLevel}px` }}
                    />
                  ))}
                  
                  {/* Uppgiftsstapel */}
                  <div 
                    id={`gantt-task-${task.id}`}
                    style={getTaskBarStyle(task)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task);
                    }}
                  >
                    {task.type !== 'MILESTONE' && (
                      <div className="px-2 overflow-hidden whitespace-nowrap text-xs text-white truncate h-full flex items-center">
                        {task.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Gemensam SVG för alla beroendepilar */}
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="10"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                  </marker>
                </defs>
                
                {/* Rita alla beroendepilar på en gång */}
                {flattenedTasks.map(task => {
                  if (!task.dependencies || task.dependencies.length === 0) {
                    return null;
                  }
                  
                  const arrowStyles = getDependencyArrowStyle(task);
                  if (!arrowStyles) {
                    return null;
                  }
                  
                  return arrowStyles.map((style, i) => (
                    <polyline 
                      key={`${task.id}-dep-${i}`}
                      points={style.points}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      strokeDasharray={style.strokeDasharray}
                      markerEnd={style.markerEnd}
                    />
                  ));
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog för att skapa eller redigera uppgift */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Redigera uppgift' : 'Skapa ny uppgift'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-type" className="text-right text-sm">Typ</label>
              <Select
                value={newTask.type}
                onValueChange={(value) => setNewTask({ ...newTask, type: value as any })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TASK">Uppgift</SelectItem>
                  <SelectItem value="MILESTONE">Milstolpe</SelectItem>
                  <SelectItem value="PHASE">Fas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Projektfältet borttaget eftersom det används automatiskt från aktuellt projekt */}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-name" className="text-right text-sm">Namn</label>
              <Input
                id="task-name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-status" className="text-right text-sm">Status</label>
              <Select
                value={newTask.status}
                onValueChange={(value) => setNewTask({ ...newTask, status: value as any })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Välj status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">Ny</SelectItem>
                  <SelectItem value="Ongoing">Pågående</SelectItem>
                  <SelectItem value="Completed">Avslutad</SelectItem>
                  <SelectItem value="Delayed">Försenad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-start-date" className="text-right text-sm">Startdatum</label>
              <Input
                id="task-start-date"
                type="date"
                value={newTask.startDate}
                onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-end-date" className="text-right text-sm">Slutdatum</label>
              <Input
                id="task-end-date"
                type="date"
                value={newTask.endDate}
                onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                className="col-span-3"
                disabled={newTask.type === 'MILESTONE'}
              />
            </div>

            {/* Välja ansvarig person */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-assignee" className="text-right text-sm">
                <UserCog className="h-4 w-4 inline mr-1" />
                Ansvarig
              </label>
              <Select
                value={newTask.assigneeId?.toString() || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setNewTask({ 
                      ...newTask, 
                      assigneeId: null, 
                      assigneeName: null 
                    });
                  } else {
                    const selectedMember = projectMembers.find((m: { id: number; username: string }) => m.id.toString() === value);
                    setNewTask({
                      ...newTask,
                      assigneeId: selectedMember ? Number(value) : null,
                      assigneeName: selectedMember ? selectedMember.username : null
                    });
                  }
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Välj ansvarig" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen tilldelad</SelectItem>
                  {projectMembers.map((member: { id: number; username: string }) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Uppskattat antal timmar */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="estimated-hours" className="text-right text-sm">
                <Clock className="h-4 w-4 inline mr-1" />
                Uppskattat antal timmar
              </label>
              <Input
                id="estimated-hours"
                type="number"
                min="0"
                step="0.5"
                placeholder="0"
                value={newTask.estimatedHours === null ? '' : newTask.estimatedHours}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseFloat(e.target.value);
                  setNewTask({ ...newTask, estimatedHours: value });
                }}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={cancelCreateTask}>Avbryt</Button>
            {isEditMode ? (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (editingTaskId !== null) {
                      // Stäng dialogen och återställ redigeringsläge
                      setShowCreateDialog(false);
                      
                      // Pausa en kort stund för att låta dialogen stängas korrekt
                      setTimeout(() => {
                        // Hämta uppgiften som ska tas bort
                        const taskToRemove = tasks.find(t => t.id === editingTaskId);
                        if (taskToRemove) {
                          // Ta bort uppgiften från listan
                          setTasks(prevTasks => prevTasks.filter(t => t.id !== editingTaskId));
                          
                          toast({
                            title: "Uppgift borttagen",
                            description: `${taskToRemove.name} har tagits bort från Gantt-diagrammet`,
                          });
                        }
                        
                        // Återställ redigeringsläge
                        setIsEditMode(false);
                        setEditingTaskId(null);
                      }, 100);
                    }
                  }}
                >
                  Ta bort
                </Button>
                <Button onClick={saveNewTask}>
                  Uppdatera
                </Button>
              </>
            ) : (
              <Button onClick={saveNewTask}>
                Skapa
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Task Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ta bort uppgift</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Är du säker på att du vill ta bort denna uppgift? 
              {taskToDelete?.type === 'PHASE' && (
                <span className="text-destructive font-semibold block mt-2">
                  Varning: Detta kommer även ta bort alla underuppgifter under denna fas!
                </span>
              )}
            </p>
            
            {taskToDelete && (
              <div className="mt-4 p-3 border rounded-md bg-muted">
                <p><span className="font-medium">Namn:</span> {taskToDelete.name}</p>
                <p><span className="font-medium">Typ:</span> {taskToDelete.type === 'TASK' ? 'Uppgift' : taskToDelete.type === 'MILESTONE' ? 'Milstolpe' : 'Fas'}</p>
                <p><span className="font-medium">Status:</span> {taskToDelete.status === 'New' ? 'Ny' : 
                                                               taskToDelete.status === 'Ongoing' ? 'Pågående' : 
                                                               taskToDelete.status === 'Completed' ? 'Avslutad' : 'Försenad'}</p>
                <p><span className="font-medium">Projekt:</span> {taskToDelete.project}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Avbryt</Button>
            <Button variant="destructive" onClick={confirmDeleteTask}>
              Ta bort
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernGanttChart as React.FC<ModernGanttChartProps>;