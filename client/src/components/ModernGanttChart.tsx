import React, { useState, useRef, useEffect } from "react";
import { addDays, format, differenceInDays, parseISO, isWithinInterval } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

// Define task type
interface Task {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'ongoing' | 'delayed' | 'pending';
  dependencies: number[];
}

// Define timeline item type
interface TimelineItem {
  date: Date;
  label: string;
  isMonth: boolean;
}

// Define position type
interface Position {
  left?: string;
  width?: string;
  display?: string;
}

// Mock task data for the Gantt chart
const mockTasks: Task[] = [
  {
    id: 1,
    name: "Project Planning",
    startDate: "2023-05-01",
    endDate: "2023-05-10",
    status: "completed",
    dependencies: []
  },
  {
    id: 2,
    name: "Research",
    startDate: "2023-05-08",
    endDate: "2023-05-20",
    status: "completed",
    dependencies: [1]
  },
  {
    id: 3,
    name: "Design Phase",
    startDate: "2023-05-15",
    endDate: "2023-05-30",
    status: "ongoing",
    dependencies: [2]
  },
  {
    id: 4,
    name: "Development",
    startDate: "2023-05-25",
    endDate: "2023-06-15",
    status: "ongoing",
    dependencies: [3]
  },
  {
    id: 5,
    name: "Testing",
    startDate: "2023-06-10",
    endDate: "2023-06-20",
    status: "delayed",
    dependencies: [4]
  },
  {
    id: 6,
    name: "Deployment",
    startDate: "2023-06-20",
    endDate: "2023-06-25",
    status: "pending",
    dependencies: [4, 5]
  },
  {
    id: 7,
    name: "Documentation",
    startDate: "2023-06-15",
    endDate: "2023-06-30",
    status: "pending",
    dependencies: []
  }
];

// Define status color mapping
const statusColors = {
  completed: "bg-green-500",
  ongoing: "bg-blue-500",
  delayed: "bg-red-500",
  pending: "bg-gray-400"
};

// TaskBar component for rendering individual task bars
const TaskBar = ({ 
  task, 
  getPosition, 
  containerWidth 
}: { 
  task: Task; 
  getPosition: (task: Task) => Position; 
  containerWidth: number 
}) => {
  const position = getPosition(task);
  
  if (position.display === 'none') {
    return null;
  }
  
  return (
    <div 
      className={`absolute h-6 rounded ${statusColors[task.status]} hover:opacity-90 transition-opacity`}
      style={{
        ...position,
        top: '50%',
        transform: 'translateY(-50%)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="px-2 h-full flex items-center text-white text-xs font-medium whitespace-nowrap overflow-hidden">
        {task.name}
      </div>
    </div>
  );
};

// DependencyLine component for rendering dependency arrows
const DependencyLine = ({ 
  fromTask, 
  toTask, 
  getPosition, 
  tasks 
}: { 
  fromTask: Task; 
  toTask: Task; 
  getPosition: (task: Task) => Position; 
  tasks: Task[] 
}) => {
  const fromPosition = getPosition(fromTask);
  const toPosition = getPosition(toTask);
  
  if (fromPosition.display === 'none' || toPosition.display === 'none') {
    return null;
  }
  
  // Calculate positions
  const fromRight = parseFloat(fromPosition.left || '0') + parseFloat(fromPosition.width || '0');
  const toLeft = parseFloat(toPosition.left || '0');
  const fromY = 32; // middle of the task bar
  const toY = 32;
  
  // Draw a bezier curve from the right side of the 'from' task to the left side of the 'to' task
  const path = `M${fromRight}%,${fromY} C${(fromRight + toLeft) / 2}%,${fromY} ${(fromRight + toLeft) / 2}%,${toY} ${toLeft}%,${toY}`;
  
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <defs>
        <marker
          id={`arrow-${fromTask.id}-${toTask.id}`}
          markerWidth="6"
          markerHeight="4"
          refX="6"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L6,2 L0,4 Z" fill="#9CA3AF" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeDasharray="4"
        markerEnd={`url(#arrow-${fromTask.id}-${toTask.id})`}
      />
    </svg>
  );
};

// Main ModernGanttChart component
export function ModernGanttChart() {
  const [tasks] = useState(mockTasks);
  const [viewMode, setViewMode] = useState('week');
  const [startDate, setStartDate] = useState(() => {
    // Find earliest start date from tasks
    return new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())));
  });
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Generate timeline based on view mode
  useEffect(() => {
    const generateTimeline = () => {
      const items = [];
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
          // Show 12 weeks
          for (let i = 0; i < 12; i++) {
            const date = addDays(current, i * 7);
            items.push({ 
              date, 
              label: `W${format(date, 'w')}`,
              isMonth: date.getDate() <= 7 || i === 0
            });
          }
          break;
        case 'month':
          // Show 12 months
          for (let i = 0; i < 12; i++) {
            const date = addDays(current, i * 30);
            items.push({ 
              date, 
              label: format(date, 'MMM'),
              isMonth: true
            });
          }
          break;
        default:
          break;
      }
      
      return items;
    };
    
    setTimeline(generateTimeline());
  }, [viewMode, startDate]);
  
  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Calculate position for a task
  const getTaskPosition = (task: Task): Position => {
    if (timeline.length === 0) {
      return { display: 'none' };
    }
    
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const timelineStart = timeline[0].date;
    const timelineEnd = addDays(timeline[timeline.length - 1].date, 
      viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30);
    
    // Check if task is within visible timeline
    if (!isWithinInterval(taskStart, { start: timelineStart, end: timelineEnd }) &&
        !isWithinInterval(taskEnd, { start: timelineStart, end: timelineEnd })) {
      return { display: 'none' };
    }
    
    // Calculate position and width
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const startOffset = Math.max(0, differenceInDays(taskStart, timelineStart));
    const taskDuration = differenceInDays(taskEnd, taskStart) + 1;
    
    const left = (startOffset / totalDays) * 100;
    const width = (taskDuration / totalDays) * 100;
    
    return {
      left: `${left}%`,
      width: `${Math.max(width, 1)}%`,
    };
  };
  
  // Navigate timeline
  const navigateTimeline = (direction: 'prev' | 'next') => {
    const days = viewMode === 'day' ? 15 : viewMode === 'week' ? 7 * 6 : 30 * 6;
    const newDate = direction === 'prev' 
      ? addDays(startDate, -days) 
      : addDays(startDate, days);
    setStartDate(newDate);
  };
  
  // Render dependency lines
  const renderDependencyLines = () => {
    return tasks.flatMap(task => 
      task.dependencies.map(depId => {
        const fromTask = tasks.find(t => t.id === depId);
        if (fromTask) {
          return (
            <DependencyLine 
              key={`dep-${depId}-${task.id}`}
              fromTask={fromTask}
              toTask={task}
              getPosition={getTaskPosition}
              tasks={tasks}
            />
          );
        }
        return null;
      }).filter(Boolean)
    );
  };
  
  // Today line position
  const getTodayPosition = () => {
    if (timeline.length === 0) return null;
    
    const today = new Date();
    const timelineStart = timeline[0].date;
    const timelineEnd = addDays(timeline[timeline.length - 1].date, 
      viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30);
    
    if (!isWithinInterval(today, { start: timelineStart, end: timelineEnd })) {
      return null;
    }
    
    const totalDays = differenceInDays(timelineEnd, timelineStart);
    const daysSinceStart = differenceInDays(today, timelineStart);
    return `${(daysSinceStart / totalDays) * 100}%`;
  };
  
  const todayPosition = getTodayPosition();
  
  return (
    <div className="w-full max-w-[70%] mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Project Timeline</h2>
        
        <div className="flex space-x-2">
          {/* View mode selector */}
          <div className="flex rounded-md overflow-hidden border border-gray-300">
            <button 
              className={`px-3 py-1 text-sm ${viewMode === 'day' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button 
              className={`px-3 py-1 text-sm border-l border-r border-gray-300 ${viewMode === 'week' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button 
              className={`px-3 py-1 text-sm ${viewMode === 'month' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-700'}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>
          
          {/* Timeline navigation */}
          <button 
            className="p-1 rounded border border-gray-300 hover:bg-gray-50"
            onClick={() => navigateTimeline('prev')}
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button 
            className="p-1 rounded border border-gray-300 hover:bg-gray-50"
            onClick={() => navigateTimeline('next')}
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
          
          {/* Task status legend */}
          <div className="flex items-center space-x-4 ml-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
              <span className="text-xs text-gray-600">Ongoing</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
              <span className="text-xs text-gray-600">Delayed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-400 mr-1"></div>
              <span className="text-xs text-gray-600">Pending</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden bg-white">
        <div className="flex border-b border-gray-200">
          {/* Task names column */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 shrink-0">
            <div className="p-3 font-medium text-gray-700 border-b border-gray-200">
              Tasks
            </div>
            {tasks.map(task => (
              <div 
                key={`task-${task.id}`} 
                className="p-3 border-b border-gray-200 h-16 flex items-center"
              >
                <div>
                  <div className="font-medium text-gray-800">{task.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format(parseISO(task.startDate), 'MMM d')} - {format(parseISO(task.endDate), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Timeline and task bars */}
          <div className="flex-1 overflow-x-auto" ref={containerRef}>
            <div className="relative min-w-max">
              {/* Timeline header */}
              <div className="flex border-b border-gray-200">
                {timeline.map((item, i) => (
                  <div 
                    key={`timeline-${i}`}
                    className="text-center p-3 border-r border-gray-200 font-medium text-gray-700"
                    style={{ width: `${100 / timeline.length}%` }}
                  >
                    {item.label}
                    {item.isMonth && (
                      <div className="text-xs text-gray-500 mt-1">
                        {format(item.date, 'yyyy')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Task rows with bars */}
              <div className="relative">
                {/* Today line */}
                {todayPosition && (
                  <div 
                    className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                    style={{ left: todayPosition }}
                  />
                )}
                
                {/* Dependency lines */}
                {renderDependencyLines()}
                
                {/* Task rows */}
                {tasks.map(task => (
                  <div 
                    key={`row-${task.id}`}
                    className="relative h-16 border-b border-gray-200 hover:bg-gray-50"
                  >
                    <TaskBar 
                      task={task} 
                      getPosition={getTaskPosition}
                      containerWidth={containerWidth}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}