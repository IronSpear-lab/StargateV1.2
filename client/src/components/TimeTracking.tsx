import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Clock, Play, Pause, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';

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
  tasks?: TaskType[]; // Lista med tasks från API
};

export function TimeTracking({ projectId, initialTaskId, className, tasks = [] }: TimeTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>(initialTaskId || '');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Använd tasks från props istället för mockdata
  const availableTasks = tasks || [];

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
    if (!startTime) return;
    
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    const hours = parseFloat(durationHours.toFixed(2));
    
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
      
      // Reset timer och form
      setTimer('00:00:00');
      setStartTime(null);
      setDescription('');
      
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
        <CardTitle className="text-lg font-medium">Tidtagning</CardTitle>
        <CardDescription>Spåra tid för dina uppgifter</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="text-4xl font-mono font-bold text-neutral-900 bg-neutral-50 px-4 py-3 rounded-md">
              {timer}
            </div>
          </div>
          
          <div className="space-y-3">
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
            
            <div className="space-y-1.5">
              <Label htmlFor="date">Datum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, 'd MMMM yyyy', { locale: sv })
                    ) : (
                      <span>Välj ett datum</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="description">Beskrivning (valfritt)</Label>
              <Input 
                id="description" 
                placeholder="Lägg till anteckningar om ditt arbete" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-center pt-2">
            <Button 
              size="lg" 
              className={isTracking ? "bg-red-600 hover:bg-red-700" : ""}
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
      </CardContent>
    </Card>
  );
}