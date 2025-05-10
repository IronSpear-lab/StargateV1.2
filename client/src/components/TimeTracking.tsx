import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Clock, Play, Pause, Calendar as CalendarIcon, PenLine } from 'lucide-react';
import { cn } from '../lib/utils';
import { MonthCalendar } from './MonthCalendar';

type TimeEntry = {
  id: number;
  date: string;
  hours: number;
  taskId: number;
  projectId: number;
  description?: string;
};

type TaskType = {
  id: string | number;
  title: string;
  description?: string;
  status?: string;
  projectId?: number;
};

type TimeTrackingProps = {
  projectId?: number;
  initialTaskId?: string;
  className?: string;
  tasks?: TaskType[];
  timeEntries?: TimeEntry[];
};

export function TimeTracking({ 
  projectId, 
  initialTaskId, 
  className, 
  tasks = [],
  timeEntries = [] 
}: TimeTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>(initialTaskId || '');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState<string>("timer");
  const [hours, setHours] = useState<string>("1");

  // Använd tasks från props istället för mockdata
  const availableTasks = tasks.filter(task => {
    return !projectId || task.projectId === projectId;
  });

  // Filter timeEntries for the current project
  const projectTimeEntries = timeEntries.filter(entry => {
    return !projectId || entry.projectId === projectId;
  });

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTracking && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        setTimer(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, startTime]);

  const toggleTimeTracking = () => {
    if (!isTracking) {
      setStartTime(new Date());
      setIsTracking(true);
    } else {
      setIsTracking(false);
      saveTimeEntry();
    }
  };

  const saveTimeEntry = async () => {
    if (activeTab === "timer") {
      if (!startTime) return;
      
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      const hours = parseFloat(durationHours.toFixed(2));
      
      await submitTimeEntry(hours);
    } else {
      // Manual entry mode
      const hoursValue = parseFloat(hours);
      if (isNaN(hoursValue) || hoursValue <= 0) {
        alert("Vänligen ange ett giltigt antal timmar");
        return;
      }
      
      await submitTimeEntry(hoursValue);
    }
  };
  
  const submitTimeEntry = async (hours: number) => {
    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: selectedTask,
          projectId: projectId,
          date: format(date || new Date(), "yyyy-MM-dd"),
          hours: hours,
          description: description || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Kunde inte spara tidspost");
      }
      
      console.log('Tid sparad:', {
        taskId: selectedTask,
        projectId,
        date: format(date || new Date(), 'yyyy-MM-dd'),
        hours: hours,
        description: description || null
      });
      
      // Reset form
      setTimer('00:00:00');
      setStartTime(null);
      setDescription('');
      setHours("1");
      
      // Skulle implementera en TanStack Query mutation här för att uppdatera cache
      // Men för nu triggar vi bara en omladdning av sidan
      window.location.reload();
      
    } catch (error) {
      console.error('Fel vid sparande av tidspost:', error);
      alert('Ett fel uppstod när tiden skulle sparas. Försök igen.');
    }
  };

  return (
    <Card className={cn("border border-neutral-200", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Tidrapportering</CardTitle>
        <CardDescription>Spåra och rapportera tid för dina uppgifter</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vänster kolumn: Kalendervy */}
          <div>
            <MonthCalendar 
              selectedDate={date || null}
              onSelectDate={(newDate) => setDate(newDate)}
              timeEntries={projectTimeEntries as any[]}
              className="mb-4"
            />
            
            <div className="space-y-1.5">
              <Label htmlFor="task">Uppgift</Label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger id="task">
                  <SelectValue placeholder="Välj uppgift" />
                </SelectTrigger>
                <SelectContent>
                  {availableTasks.map(task => (
                    <SelectItem key={task.id} value={String(task.id)}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 mt-3">
              <Label htmlFor="description">Beskrivning (valfritt)</Label>
              <Input 
                id="description" 
                placeholder="Lägg till anteckningar om ditt arbete" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          
          {/* Höger kolumn: Tidregistrering */}
          <div>
            <div className="bg-muted mb-4 p-3 rounded-md">
              <div className="font-medium">Valt datum:</div>
              <div className="text-lg">
                {date ? format(date, 'd MMMM yyyy', { locale: sv }) : "Inget datum valt"}
              </div>
            </div>
            
            <Tabs defaultValue="timer" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="timer" className="flex-1">
                  <Clock className="mr-2 h-4 w-4" />
                  Timer
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">
                  <PenLine className="mr-2 h-4 w-4" />
                  Manuell
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="timer">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="text-4xl font-mono font-bold text-neutral-900 bg-neutral-50 px-4 py-3 rounded-md w-full text-center">
                      {timer}
                    </div>
                  </div>
                  
                  <div className="flex justify-center pt-2">
                    <Button 
                      size="lg" 
                      className={cn(
                        "w-full", 
                        isTracking ? "bg-red-600 hover:bg-red-700" : ""
                      )}
                      onClick={toggleTimeTracking}
                      disabled={!selectedTask}
                    >
                      {isTracking ? (
                        <>
                          <Pause className="mr-2 h-5 w-5" />
                          Stoppa
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          Starta timer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="manual">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="hours">Antal timmar</Label>
                    <Input 
                      id="hours" 
                      type="number" 
                      min="0.5" 
                      step="0.5" 
                      value={hours} 
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={saveTimeEntry}
                    disabled={!selectedTask}
                  >
                    Spara tidsrapport
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}