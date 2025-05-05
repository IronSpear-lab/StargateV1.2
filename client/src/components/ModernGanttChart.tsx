import React, { useState, useEffect, useMemo } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, Filter, Plus, FileDown, ChevronDown, ChevronRight, CircleDashed, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

// Demo-data för Gantt-diagrammet
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
        type: "MILESTONE",
        name: "Designgodkännande",
        status: "Completed",
        startDate: "2025-04-15",
        endDate: "2025-04-15",
        duration: 0,
        parentId: 1,
      },
      {
        id: 4,
        project: "Byggprojekt A",
        type: "TASK",
        name: "Detaljritningar",
        status: "Completed",
        startDate: "2025-04-16",
        endDate: "2025-05-15",
        duration: 30,
        dependencies: [3],
        parentId: 1,
      }
    ]
  },
  {
    id: 5,
    project: "Byggprojekt A",
    type: "PHASE",
    name: "Projektfas 2: Konstruktion",
    status: "Ongoing",
    startDate: "2025-05-01",
    endDate: "2025-07-30",
    duration: 60,
    expanded: true,
    dependencies: [1],
    children: [
      {
        id: 6,
        project: "Byggprojekt A",
        type: "TASK",
        name: "Grundläggning",
        status: "Ongoing",
        startDate: "2025-05-01",
        endDate: "2025-05-30",
        duration: 30,
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
        name: "Rivning av befintligt badrum",
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
        name: "Installation av nya rör",
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
        type: "MILESTONE",
        name: "Inspektion av rördragning",
        status: "Delayed",
        startDate: "2025-05-12",
        endDate: "2025-05-12",
        duration: 0,
        dependencies: [12],
        parentId: 10,
      },
      {
        id: 14,
        project: "Byggprojekt B",
        type: "TASK",
        name: "Tätskikt och plattsättning",
        status: "New",
        startDate: "2025-05-15",
        endDate: "2025-06-15",
        duration: 31,
        dependencies: [13],
        parentId: 10,
      }
    ]
  }
];

// Funktion för att platta ut hierarkiska uppgifter
const flattenTasks = (tasks: GanttTask[], level = 0): GanttTask[] => {
  return tasks.reduce<GanttTask[]>((acc, task) => {
    const newTask = { ...task, level, children: task.children || [] };
    acc.push(newTask);
    
    if (task.expanded && task.children && task.children.length > 0) {
      acc.push(...flattenTasks(task.children, level + 1));
    }
    
    return acc;
  }, []);
};

// Huvudkomponent för Gantt-diagram
const ModernGanttChart: React.FC = () => {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(addMonths(new Date(), 3))
  });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  
  // Dialog för att skapa nya uppgifter
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTask, setNewTask] = useState<Partial<GanttTask>>({
    type: 'TASK',
    status: 'New',
    project: '',
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
  const statuses = ["New", "Ongoing", "Completed", "Delayed"];
  const types = ["TASK", "MILESTONE", "PHASE"];
  
  // Filtrera uppgifter baserat på valda filter
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    
    // Filtrera på projekt
    if (selectedProjects.length > 0) {
      filtered = filtered.filter(task => selectedProjects.includes(task.project));
    }
    
    // Filtrera på status
    if (statusFilter.length > 0) {
      filtered = filtered.filter(task => statusFilter.includes(task.status));
    }
    
    // Filtrera på typ
    if (typeFilter.length > 0) {
      filtered = filtered.filter(task => typeFilter.includes(task.type));
    }
    
    return filtered;
  }, [tasks, selectedProjects, statusFilter, typeFilter]);
  
  // Platta ut och strukturera uppgifterna för visning
  const flattenedTasks = useMemo(() => {
    return flattenTasks(filteredTasks);
  }, [filteredTasks]);
  
  // Zooma in tidsskalan
  const zoomIn = () => {
    if (viewMode === 'month') setViewMode('week');
    else if (viewMode === 'week') setViewMode('day');
  };
  
  // Zooma ut tidsskalan
  const zoomOut = () => {
    if (viewMode === 'day') setViewMode('week');
    else if (viewMode === 'week') setViewMode('month');
  };
  
  // Exportera Gantt-diagrammet som PDF eller Excel
  const exportData = () => {
    alert('Export-funktionen implementeras senare.');
  };
  
  // Skapa ny uppgift
  const createTask = () => {
    setShowCreateDialog(true);
  };
  
  // Avbryt skapande av ny uppgift
  const cancelCreateTask = () => {
    setShowCreateDialog(false);
    setNewTask({
      type: 'TASK',
      status: 'New',
      project: '',
      name: '',
      startDate: '',
      endDate: '',
      duration: 0
    });
  };
  
  // Spara ny uppgift
  const saveNewTask = () => {
    // Validera indata
    if (!newTask.name || !newTask.project || !newTask.startDate || !newTask.endDate) {
      alert('Vänligen fyll i alla obligatoriska fält.');
      return;
    }
    
    // Beräkna varaktighet
    const startDate = new Date(newTask.startDate);
    const endDate = new Date(newTask.endDate);
    const duration = differenceInDays(endDate, startDate) + 1;
    
    // Skapa ny uppgift med unikt ID
    const maxId = Math.max(...tasks.flat().map(task => task.id), 0);
    const newTaskItem: GanttTask = {
      id: maxId + 1,
      project: newTask.project,
      type: newTask.type as "TASK" | "MILESTONE" | "PHASE",
      name: newTask.name,
      status: newTask.status as "New" | "Ongoing" | "Completed" | "Delayed",
      startDate: newTask.startDate,
      endDate: newTask.endDate,
      duration,
      children: newTask.type === 'PHASE' ? [] : undefined,
      expanded: newTask.type === 'PHASE' ? true : undefined
    };
    
    // Lägg till den nya uppgiften
    setTasks(prev => [...prev, newTaskItem]);
    
    // Stäng dialogrutan och återställ formuläret
    setShowCreateDialog(false);
    setNewTask({
      type: 'TASK',
      status: 'New',
      project: '',
      name: '',
      startDate: '',
      endDate: '',
      duration: 0
    });
  };
  
  // Beräkna position och bredd för staplar i Gantt-diagrammet
  const getTaskBarStyle = (task: GanttTask) => {
    const startDate = parseISO(task.startDate);
    const endDate = parseISO(task.endDate);
    const totalDays = days.length;
    
    // Om uppgiften ligger utanför tidsintervallet, visa den inte
    if (isAfter(startDate, days[days.length - 1]) || isBefore(endDate, days[0])) {
      return { display: 'none' };
    }
    
    // Beräkna start- och slutposition för stapeln
    const startIndex = Math.max(
      days.findIndex(day => isSameDay(day, startDate) || isAfter(day, startDate)),
      0
    );
    
    const endIndex = Math.min(
      days.findIndex(day => isAfter(day, endDate)),
      totalDays - 1
    );
    
    const dayWidth = 30; // bredd per dag i pixlar
    const left = startIndex * dayWidth;
    const width = (endIndex - startIndex) * dayWidth || dayWidth; // Minsta bredd för milestones
    
    // Välj färg baserat på status
    let backgroundColor;
    switch (task.status) {
      case 'Completed':
        backgroundColor = '#0acf97'; // Grön
        break;
      case 'Ongoing':
        backgroundColor = '#727cf5'; // Blå
        break;
      case 'Delayed':
        backgroundColor = '#fa5c7c'; // Röd
        break;
      default:
        backgroundColor = '#8a909d'; // Grå för nya/framtida uppgifter
    }
    
    // Särskild stil för milestones
    if (task.type === 'MILESTONE') {
      return {
        position: 'absolute' as const,
        left: `${left}px`,
        top: '8px',
        width: '0',
        height: '0',
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderBottom: `20px solid #ffc35a`, // Orange för milestones
        transform: 'rotate(45deg)',
        zIndex: 2
      };
    }
    
    // Faser har gradient för att skilja dem från vanliga uppgifter
    if (task.type === 'PHASE') {
      return {
        position: 'absolute' as const,
        left: `${left}px`,
        top: '5px',
        width: `${width}px`,
        height: '25px',
        background: `linear-gradient(to right, ${backgroundColor}, ${backgroundColor}dd)`,
        borderRadius: '4px',
        zIndex: 1
      };
    }
    
    // Normal uppgiftsstapel
    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: '8px',
      width: `${width}px`,
      height: '20px',
      backgroundColor,
      borderRadius: '4px',
      zIndex: 1
    };
  };
  
  // Beräkna position för beroendepil
  const getDependencyArrowStyle = (task: GanttTask) => {
    if (!task.dependencies || task.dependencies.length === 0) return null;
    
    const arrows = task.dependencies.map(depId => {
      const dependencyTask = flattenedTasks.find(t => t.id === depId);
      if (!dependencyTask) return null;
      
      const depEndDate = parseISO(dependencyTask.endDate);
      const taskStartDate = parseISO(task.startDate);
      
      const startIndex = days.findIndex(day => isSameDay(day, depEndDate) || isAfter(day, depEndDate));
      const endIndex = days.findIndex(day => isSameDay(day, taskStartDate) || isAfter(day, taskStartDate));
      
      if (startIndex < 0 || endIndex < 0) return null;
      
      const dayWidth = 30;
      const dependencyEndLeft = startIndex * dayWidth + dayWidth / 2;
      const taskStartLeft = endIndex * dayWidth;
      
      // Hitta positioner i den flattade listan för att beräkna höjdskillnad
      const depIndex = flattenedTasks.findIndex(t => t.id === dependencyTask.id);
      const taskIndex = flattenedTasks.findIndex(t => t.id === task.id);
      const verticalGap = (taskIndex - depIndex) * 40; // 40px per rad
      
      // Beräkna mellanliggande punkter för pilen
      const midX = Math.max(dependencyEndLeft + 10, (dependencyEndLeft + taskStartLeft) / 2);
      
      return {
        points: `${dependencyEndLeft},20 ${midX},20 ${midX},${verticalGap} ${taskStartLeft},${verticalGap}`,
        stroke: '#64748b',
        strokeWidth: 1,
        fill: 'none',
        strokeDasharray: task.status === 'Delayed' ? '5,5' : 'none',
        markerEnd: 'url(#arrowhead)'
      };
    });
    
    return arrows;
  };
  
  // Generera månadsrubriker för tidslinjen
  const monthHeaders = useMemo(() => {
    const months: { month: string; days: number }[] = [];
    let currentMonth = '';
    let dayCount = 0;
    
    days.forEach(day => {
      const monthString = format(day, 'MMM yyyy');
      if (monthString !== currentMonth) {
        if (currentMonth) {
          months.push({ month: currentMonth, days: dayCount });
        }
        currentMonth = monthString;
        dayCount = 1;
      } else {
        dayCount++;
      }
    });
    
    if (currentMonth) {
      months.push({ month: currentMonth, days: dayCount });
    }
    
    return months;
  }, [days]);
  
  // Visa status ikon
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'Ongoing':
        return <Clock size={16} className="text-blue-500" />;
      case 'Delayed':
        return <AlertTriangle size={16} className="text-red-500" />;
      default:
        return <CircleDashed size={16} className="text-gray-500" />;
    }
  };
  
  return (
    <div className="gantt-chart-container p-4 bg-white dark:bg-slate-900 rounded-lg shadow">
      {/* Verktygsrad */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="flex items-center space-x-2">
          <Button onClick={createTask} variant="default" size="sm" className="bg-primary-500 hover:bg-primary-600">
            <Plus size={16} className="mr-1" /> Create
          </Button>
          
          <div className="relative">
            <Button variant="outline" size="sm" className="flex items-center">
              Include Projects <ChevronDown size={16} className="ml-1" />
            </Button>
            <div className="hidden absolute left-0 mt-1 w-48 p-2 bg-white dark:bg-slate-800 shadow-lg rounded-md z-10 border border-gray-200 dark:border-slate-700">
              {projects.map(project => (
                <div key={project} className="flex items-center p-1">
                  <Checkbox
                    id={`project-${project}`}
                    checked={selectedProjects.includes(project)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedProjects(prev => [...prev, project]);
                      } else {
                        setSelectedProjects(prev => prev.filter(p => p !== project));
                      }
                    }}
                  />
                  <label htmlFor={`project-${project}`} className="ml-2 text-sm">{project}</label>
                </div>
              ))}
            </div>
          </div>
          
          <Button variant="outline" size="sm">
            Baseline
          </Button>
          
          <div className="relative">
            <Button variant="outline" size="sm" className="flex items-center">
              <Filter size={16} className="mr-1" /> Filter <ChevronDown size={16} className="ml-1" />
            </Button>
            <div className="hidden absolute left-0 mt-1 w-48 p-2 bg-white dark:bg-slate-800 shadow-lg rounded-md z-10 border border-gray-200 dark:border-slate-700">
              <div className="mb-2">
                <p className="font-medium text-xs mb-1">Status</p>
                {statuses.map(status => (
                  <div key={status} className="flex items-center p-1">
                    <Checkbox
                      id={`status-${status}`}
                      checked={statusFilter.includes(status)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setStatusFilter(prev => [...prev, status]);
                        } else {
                          setStatusFilter(prev => prev.filter(s => s !== status));
                        }
                      }}
                    />
                    <label htmlFor={`status-${status}`} className="ml-2 text-sm">{status}</label>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-medium text-xs mb-1">Type</p>
                {types.map(type => (
                  <div key={type} className="flex items-center p-1">
                    <Checkbox
                      id={`type-${type}`}
                      checked={typeFilter.includes(type)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setTypeFilter(prev => [...prev, type]);
                        } else {
                          setTypeFilter(prev => prev.filter(t => t !== type));
                        }
                      }}
                    />
                    <label htmlFor={`type-${type}`} className="ml-2 text-sm">{type}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-md p-0.5">
            <Button variant="ghost" size="icon" onClick={zoomOut} className="h-8 w-8" disabled={viewMode === 'month'}>
              <ZoomOut size={16} />
            </Button>
            <span className="px-2 text-sm">
              {viewMode === 'day' ? 'Day' : viewMode === 'week' ? 'Week' : 'Month'}
            </span>
            <Button variant="ghost" size="icon" onClick={zoomIn} className="h-8 w-8" disabled={viewMode === 'day'}>
              <ZoomIn size={16} />
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={exportData}>
            <FileDown size={16} className="mr-1" /> Export
          </Button>
        </div>
      </div>
      
      <div className="flex border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {/* Vänster sida - Uppgiftstabell */}
        <div className="w-[40%] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <Table>
            <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-10">ID</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="w-24">Start</TableHead>
                <TableHead className="w-24">End</TableHead>
                <TableHead className="w-20">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedTasks.map((task) => (
                <TableRow key={task.id} className={task.level && task.level > 0 ? 'pl-6' : ''}>
                  <TableCell className="p-0 w-10">
                    {task.type === 'PHASE' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8" 
                        onClick={() => toggleExpand(task.id)}
                      >
                        {task.expanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="py-2">{task.id}</TableCell>
                  <TableCell 
                    className="py-2"
                    style={{ paddingLeft: task.level ? `${task.level * 16}px` : '0' }}
                  >
                    {task.project}
                  </TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Höger sida - Gantt-diagram */}
        <div className="w-[60%] overflow-y-auto overflow-x-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          <div className="relative" style={{ minWidth: days.length * 30 }}>
            {/* Tidsrubrik */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              {/* Månadsrubriker */}
              <div className="flex border-b border-gray-200 dark:border-slate-700 h-10">
                {monthHeaders.map((month, index) => (
                  <div 
                    key={index} 
                    className="text-center font-medium text-sm py-2 border-r border-gray-200 dark:border-slate-700"
                    style={{ width: `${month.days * 30}px` }}
                  >
                    {month.month}
                  </div>
                ))}
              </div>
              
              {/* Dagrubrik */}
              <div className="flex border-b border-gray-200 dark:border-slate-700 h-8">
                {days.map((day, index) => (
                  <div 
                    key={index}
                    className={`text-center text-xs py-1 border-r border-gray-200 dark:border-slate-700 ${
                      isSameDay(day, new Date()) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    style={{ width: '30px' }}
                  >
                    {format(day, 'd')}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Gantt-staplar */}
            <div style={{ position: 'relative' }}>
              {/* Rader för uppgifter */}
              {flattenedTasks.map((task, index) => (
                <div 
                  key={task.id} 
                  className="relative h-10 border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                >
                  {/* Vertikal linje för dagens datum */}
                  {days.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`absolute top-0 bottom-0 w-px ${
                        isSameDay(day, new Date()) 
                          ? 'bg-red-500' 
                          : dayIndex % 7 === 0 || dayIndex % 7 === 6 
                            ? 'bg-gray-200 dark:bg-slate-700' 
                            : ''
                      }`}
                      style={{ left: `${dayIndex * 30}px` }}
                    />
                  ))}
                  
                  {/* Uppgiftsstapel */}
                  <div style={getTaskBarStyle(task)}>
                    {task.type !== 'MILESTONE' && (
                      <div className="px-2 overflow-hidden whitespace-nowrap text-xs text-white truncate h-full flex items-center">
                        {task.name}
                      </div>
                    )}
                  </div>
                  
                  {/* SVG för pilar */}
                  <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
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
                    {task.dependencies?.map((depId, i) => (
                      <polyline 
                        key={`${task.id}-${depId}-${i}`}
                        {...getDependencyArrowStyle(task)?.[i]}
                      />
                    ))}
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialog för att skapa ny uppgift */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
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
                  {projects.map(project => (
                    <SelectItem key={project} value={project}>{project}</SelectItem>
                  ))}
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
            <Button onClick={saveNewTask}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModernGanttChart;