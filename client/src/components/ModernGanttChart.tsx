import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, Filter, Plus, FileDown, ChevronDown, ChevronRight, CircleDashed, CheckCircle2, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

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

const ModernGanttChart: React.FC = () => {
  const { toast } = useToast();
  // Läs uppgifter från localStorage, om de finns, annars använd initialTasks
  const [tasks, setTasks] = useState<GanttTask[]>(() => {
    try {
      const savedTasks = localStorage.getItem('gantt_tasks');
      return savedTasks ? JSON.parse(savedTasks) : initialTasks;
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      return initialTasks;
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
    project: 'Byggprojekt A', // Sätt standardvärde till första projekt från demoprojekten
    name: '',
    startDate: '',
    endDate: '',
    duration: 0
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
  
  // Spara uppgifter till localStorage när de ändras
  useEffect(() => {
    try {
      localStorage.setItem('gantt_tasks', JSON.stringify(tasks));
      console.log('Gantt tasks saved to localStorage:', tasks.length, 'tasks');
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error);
    }
  }, [tasks]);

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
    // Konvertera datestrings till Date-objekt
    const taskStartDate = parseISO(task.startDate);
    const taskEndDate = parseISO(task.endDate);
    
    // Hitta indexen där uppgiften börjar och slutar
    let startIdx = -1;
    let endIdx = -1;
    
    // Hitta startindex
    for (let i = 0; i < days.length; i++) {
      if (isSameDay(days[i], taskStartDate) || isAfter(days[i], taskStartDate)) {
        startIdx = i;
        break;
      }
    }
    
    // Hitta slutindex - börja från slutet för milstolpar (samma dag)
    if (task.type === 'MILESTONE') {
      endIdx = startIdx;
    } else {
      // För vanliga uppgifter, hitta sista dagen som är mindre än eller lika med slutdatumet
      for (let i = 0; i < days.length; i++) {
        if (isSameDay(days[i], taskEndDate) || isAfter(days[i], taskEndDate)) {
          endIdx = i;
          break;
        }
      }
    }
    
    // Om datumen inte är inom intervallet, visa inte stapeln
    if (startIdx === -1 || endIdx === -1) {
      return { display: 'none' };
    }
    
    // För vanliga uppgifter, beräkna bredden baserat på antalet dagar mellan start- och slutdatum
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
      duration: task.duration
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
    
    // Om vi redigerar en befintlig uppgift
    if (isEditMode && editingTaskId !== null) {
      setTasks(prev => prev.map(task => {
        if (task.id === editingTaskId) {
          return {
            ...task,
            type: newTask.type as "TASK" | "MILESTONE" | "PHASE",
            name: newTask.name!,
            status: newTask.status as "New" | "Ongoing" | "Completed" | "Delayed",
            project: newTask.project!,
            startDate: newTask.startDate!,
            endDate: endDate!,
            duration
          };
        }
        return task;
      }));
      
      toast({
        title: "Uppgift uppdaterad",
        description: `${newTask.type} "${newTask.name}" har uppdaterats i Gantt-diagrammet.`,
      });
      
      // Återställ redigeringsläge
      setIsEditMode(false);
      setEditingTaskId(null);
    } 
    // Skapa en ny uppgift
    else {
      const taskId = flattenedTasks.length > 0 
        ? Math.max(...flattenedTasks.map(t => t.id)) + 1 
        : 1;
      
      const newTaskItem: GanttTask = {
        id: taskId,
        project: newTask.project!,
        type: newTask.type as "TASK" | "MILESTONE" | "PHASE",
        name: newTask.name!,
        status: newTask.status as "New" | "Ongoing" | "Completed" | "Delayed",
        startDate: newTask.startDate!,
        endDate: endDate!,
        duration
      };
      
      setTasks(prev => [...prev, newTaskItem]);
      
      toast({
        title: "Uppgift skapad",
        description: `${newTaskItem.type} "${newTaskItem.name}" har lagts till i Gantt-diagrammet.`,
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
      project: 'Byggprojekt A', // Använd ett giltigt projekt som standardvärde
      name: '',
      startDate: '',
      endDate: '',
      duration: 0
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
      
      // Radera från den lokala listan - detta påverkar inte Kanban-uppgifter
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
        
        // Skapa den nya filtrerade listan
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
                  title: "Zoomed Out",
                  description: "Reduced the zoom level of the Gantt chart",
                });
              }}
            >
              <ZoomOut className="w-4 h-4 mr-1" />
              <span>Zoom Out</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setZoomLevel(prev => Math.min(100, prev + 10));
                toast({
                  title: "Zoomed In",
                  description: "Increased the zoom level of the Gantt chart",
                });
              }}
            >
              <ZoomIn className="w-4 h-4 mr-1" />
              <span>Zoom In</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              <span>Add Task</span>
            </Button>
            <Button variant="outline" size="sm">
              <FileDown className="w-4 h-4 mr-1" />
              <span>Export</span>
            </Button>
          </div>
          
          <div className="ml-auto flex items-center space-x-2">
            <Select 
              value={viewMode} 
              onValueChange={(val) => setViewMode(val as any)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Dialog>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-1" />
                  <span>Filter</span>
                </Button>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>Filter Tasks</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid gap-6 py-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Projects</h3>
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
                            <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">{status}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Type</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {types.map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`type-${type}`}
                              checked={typeFilter.includes(type)}
                              onCheckedChange={() => toggleTypeFilter(type)}
                            />
                            <label htmlFor={`type-${type}`} className="text-sm cursor-pointer">{type}</label>
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
                <TableHead className="w-10 py-2">Type</TableHead>
                <TableHead className="py-2">Task Name</TableHead>
                <TableHead className="py-2 text-center w-20">Status</TableHead>
                <TableHead className="py-2 w-24">Start Date</TableHead>
                <TableHead className="py-2 w-24">End Date</TableHead>
                <TableHead className="py-2 w-20">Duration</TableHead>
                <TableHead className="py-2 w-10">Actions</TableHead>
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
                              ? 'Important date or event' 
                              : task.type === 'PHASE' 
                                ? 'Container of tasks' 
                                : 'Work item'
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
                          <p>{task.status}</p>
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
            <DialogTitle>{isEditMode ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-type" className="text-right text-sm">Type</label>
              <Select
                value={newTask.type}
                onValueChange={(value) => setNewTask({ ...newTask, type: value as any })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TASK">TASK</SelectItem>
                  <SelectItem value="MILESTONE">MILESTONE</SelectItem>
                  <SelectItem value="PHASE">PHASE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-project" className="text-right text-sm">Project</label>
              <Select
                value={newTask.project}
                onValueChange={(value) => setNewTask({ ...newTask, project: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length > 0 ? (
                    projects.map(project => (
                      <SelectItem key={project} value={project}>{project}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="Byggprojekt A">Byggprojekt A</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-name" className="text-right text-sm">Name</label>
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
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Ongoing">Ongoing</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-start-date" className="text-right text-sm">Start Date</label>
              <Input
                id="task-start-date"
                type="date"
                value={newTask.startDate}
                onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="task-end-date" className="text-right text-sm">End Date</label>
              <Input
                id="task-end-date"
                type="date"
                value={newTask.endDate}
                onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                className="col-span-3"
                disabled={newTask.type === 'MILESTONE'}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={cancelCreateTask}>Cancel</Button>
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
                            title: "Task Deleted",
                            description: `${taskToRemove.name} has been removed from the Gantt chart`,
                          });
                        }
                        
                        // Återställ redigeringsläge
                        setIsEditMode(false);
                        setEditingTaskId(null);
                      }, 100);
                    }
                  }}
                >
                  Delete Task
                </Button>
                <Button onClick={saveNewTask}>
                  Update
                </Button>
              </>
            ) : (
              <Button onClick={saveNewTask}>
                Create
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Task Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this task? 
              {taskToDelete?.type === 'PHASE' && (
                <span className="text-destructive font-semibold block mt-2">
                  Warning: This will also delete all child tasks under this phase!
                </span>
              )}
            </p>
            
            {taskToDelete && (
              <div className="mt-4 p-3 border rounded-md bg-muted">
                <p><span className="font-medium">Name:</span> {taskToDelete.name}</p>
                <p><span className="font-medium">Type:</span> {taskToDelete.type}</p>
                <p><span className="font-medium">Status:</span> {taskToDelete.status}</p>
                <p><span className="font-medium">Project:</span> {taskToDelete.project}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTask}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernGanttChart;