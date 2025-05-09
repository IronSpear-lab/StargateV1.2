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

type TimeTrackingProps = {
  projectId?: number;
  initialTaskId?: string;
  className?: string;
};

export function TimeTracking({ projectId, initialTaskId, className }: TimeTrackingProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<string>(initialTaskId || '');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Mock data for tasks
  const tasks = [
    { id: '1', title: 'API Documentation' },
    { id: '2', title: 'Frontend Implementation' },
    { id: '3', title: 'Database Schema Design' },
    { id: '4', title: 'Code Review' }
  ];

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

  const saveTimeEntry = () => {
    if (!startTime) return;
    
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    console.log('Time entry saved:', {
      taskId: selectedTask,
      projectId,
      date: format(date || new Date(), 'yyyy-MM-dd'),
      startTime: format(startTime, 'HH:mm:ss'),
      endTime: format(endTime, 'HH:mm:ss'),
      duration: durationHours.toFixed(2),
      description: description || null
    });
    
    // Reset timer
    setTimer('00:00:00');
    setStartTime(null);
    
    // In a real app, here you would:
    // 1. Send a POST request to your API to save the time entry
    // 2. Use a mutation with react-query to update the cache
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
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
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