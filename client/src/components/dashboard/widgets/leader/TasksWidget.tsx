import { useState } from "react";
import { 
  CheckSquare, 
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ClipboardCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";

interface Task {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

interface TaskSummary {
  total: number;
  completed: number;
  overdue: number;
  inProgress: number;
  tasks: Task[];
}

export default function TasksWidget({ title = "Uppgifter" }) {
  const { currentProject } = useProject();
  
  // Exempel på mock-data för uppgifter
  const mockTaskSummary: TaskSummary = {
    total: 48,
    completed: 32,
    overdue: 3,
    inProgress: 10,
    tasks: [
      { id: 1, title: "Slutföra ritningsarbete för fasad", status: 'in_progress', assignee: "Anna Andersson", dueDate: "2025-05-20", priority: 'high' },
      { id: 2, title: "Sammanställa materialspecifikation", status: 'todo', assignee: "Erik Eriksson", dueDate: "2025-05-22", priority: 'medium' },
      { id: 3, title: "Koordinera arbete med eltekniker", status: 'in_progress', assignee: "Maria Svensson", dueDate: "2025-05-15", priority: 'high' },
      { id: 4, title: "Granska konstruktionsritningar", status: 'review', assignee: "Johan Lindgren", dueDate: "2025-05-13", priority: 'medium' },
      { id: 5, title: "Uppdatera kostnadskalkyl", status: 'done', assignee: "Maria Svensson", dueDate: "2025-05-10", priority: 'medium' },
    ]
  };

  // I en verklig implementation skulle vi hämta data från ett API
  const { data: taskSummary = mockTaskSummary, isLoading } = useQuery<TaskSummary>({
    queryKey: ['/api/tasks/summary'],
    queryFn: async () => {
      try {
        // Normalt skulle vi hämta data från API:et här
        // const response = await apiRequest('GET', '/api/tasks/summary');
        // return await response.json();
        
        // Returnera mock-data för demonstration
        return mockTaskSummary;
      } catch (error) {
        console.error('Error fetching task data:', error);
        return mockTaskSummary;
      }
    },
    // Inaktivera för demonstrationssyfte
    enabled: false
  });

  // Formatera datum till kortformat
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Ingen deadline';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Kontrollera om datumet är idag eller imorgon
    if (date.toDateString() === today.toDateString()) {
      return 'Idag';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Imorgon';
    }
    
    // Annars, formatera som datum
    return new Intl.DateTimeFormat('sv-SE', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Statusfärger och text
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'done': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo': return 'Att göra';
      case 'in_progress': return 'Pågående';
      case 'review': return 'Granskning';
      case 'done': return 'Klart';
      default: return status;
    }
  };

  // Prioritetsfärger och ikoner
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Hög
          </Badge>
        );
      case 'medium':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Låg
          </Badge>
        );
      default:
        return null;
    }
  };

  // Räkna ut slutförandeprocent
  const completionPercentage = Math.round((taskSummary.completed / taskSummary.total) * 100);

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <CheckSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Laddar uppgiftsdata...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Uppgiftssammanfattning */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 border rounded-lg space-y-1 text-center">
                  <div className="text-xl font-bold">{taskSummary.total}</div>
                  <div className="text-xs text-muted-foreground">Totalt</div>
                </div>
                <div className="p-3 border rounded-lg space-y-1 text-center">
                  <div className="text-xl font-bold text-green-600">{taskSummary.completed}</div>
                  <div className="text-xs text-muted-foreground">Slutförda</div>
                </div>
                <div className="p-3 border rounded-lg space-y-1 text-center">
                  <div className="text-xl font-bold text-blue-600">{taskSummary.inProgress}</div>
                  <div className="text-xs text-muted-foreground">Pågående</div>
                </div>
                <div className="p-3 border rounded-lg space-y-1 text-center">
                  <div className="text-xl font-bold text-red-600">{taskSummary.overdue}</div>
                  <div className="text-xs text-muted-foreground">Försenade</div>
                </div>
              </div>
              
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Slutförande</h3>
                  <span className="text-sm font-medium">{completionPercentage}%</span>
                </div>
                <Progress 
                  value={completionPercentage} 
                  className="h-2"
                  indicatorClassName="bg-green-500"
                />
              </div>
              
              {/* Senaste uppgifterna */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Senaste uppgifterna</h3>
                
                <div className="space-y-2">
                  {taskSummary.tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-medium">{task.title}</div>
                        {getPriorityBadge(task.priority)}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center space-x-1">
                          <div className={`h-2 w-2 rounded-full ${getStatusColor(task.status)}`}></div>
                          <span>{getStatusText(task.status)}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      </div>
                      
                      {task.assignee && (
                        <div className="text-xs text-muted-foreground">
                          Tilldelad: {task.assignee}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Widget>
  );
}