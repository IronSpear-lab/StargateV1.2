import { useState } from "react";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isToday, addMonths, subMonths, isSameDay 
} from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { TimeEntry, Task, InsertTimeEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface MonthCalendarGridProps {
  className?: string;
}

export function MonthCalendarGrid({ className }: MonthCalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [hours, setHours] = useState<string>("0");
  const [description, setDescription] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Hämta användarens uppgifter från API
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks/assigned'],
    staleTime: 60 * 1000,
  });
  
  // Hämta användarens tidsregistreringar från API
  const { data: timeEntries = [], isLoading: entriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/time-entries'],
    staleTime: 60 * 1000,
  });
  
  // Mutation för att lägga till tidsregistrering
  const addTimeEntryMutation = useMutation({
    mutationFn: async (timeEntry: Partial<InsertTimeEntry>) => {
      const res = await apiRequest("POST", "/api/time-entries", timeEntry);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Tidsrapportering sparad",
        description: "Din tidsrapportering har sparats.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time-entries'] });
      setIsAddEntryOpen(false);
      setSelectedTask("");
      setHours("0");
      setDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Något gick fel",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Skapa en array med alla dagar i den aktuella månaden
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Skapa array för veckodagsnamn
  const weekdayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];
  
  // Hämta veckodagen för månadens första dag (0 = söndag, 1 = måndag, etc)
  // I Sverige börjar veckan med måndag, så vi justerar index
  const getAdjustedDay = (day: number) => (day === 0 ? 6 : day - 1);
  const firstDayOfMonth = getAdjustedDay(monthStart.getDay());
  
  // Funktioner för att byta månad
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  
  // Hantera klick på en dag
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setIsAddEntryOpen(true);
  };
  
  // När en uppgift väljs, hämta även projektid
  const handleTaskSelect = (taskId: string) => {
    setSelectedTask(taskId);
    
    const selectedTaskObj = tasks.find(t => t.id.toString() === taskId);
    if (selectedTaskObj) {
      setSelectedProjectId(selectedTaskObj.projectId);
    }
  };
  
  // Hämta tidsregistreringar för en specifik dag
  const getEntriesForDay = (day: Date): TimeEntry[] => {
    if (!timeEntries) return [];
    
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.reportDate);
      return isSameDay(entryDate, day);
    });
  };
  
  // Beräkna totala timmar för en dag
  const getTotalHoursForDay = (day: Date): number => {
    const entries = getEntriesForDay(day);
    return entries.reduce((total, entry) => total + entry.hours, 0);
  };
  
  // Hantera inlämning av tidsregistrering
  const handleSubmitTimeEntry = () => {
    if (!selectedDay || !selectedTask || !hours || parseFloat(hours) <= 0) {
      toast({
        title: "Ofullständig information",
        description: "Välj en uppgift och ange antal timmar.",
        variant: "destructive",
      });
      return;
    }
    
    const timeEntryData = {
      taskId: parseInt(selectedTask),
      projectId: selectedProjectId!,
      reportDate: format(selectedDay, 'yyyy-MM-dd'),
      hours: parseInt(hours), // Ange timmar i minuter (2 timmar = 120 minuter)
      description: description
    };
    
    addTimeEntryMutation.mutate(timeEntryData);
  };

  return (
    <>
      <Card className={cn("border-neutral-200", className)}>
        <CardHeader className="bg-neutral-900 text-white p-3 flex flex-row justify-between items-center space-y-0">
          <CardTitle className="text-lg font-medium">
            {format(currentMonth, "MMMM yyyy", { locale: sv })}
          </CardTitle>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-white/10" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-white/10" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-neutral-200">
            {weekdayNames.map((name) => (
              <div key={name} className="py-2 text-center text-xs font-medium border-r last:border-r-0 border-neutral-200">
                {name}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 auto-rows-[minmax(80px,_auto)]">
            {/* Tomma celler före månadens första dag */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="p-0 border-r border-b border-neutral-200"></div>
            ))}
            
            {/* Dagarna i månaden */}
            {days.map((day, index) => {
              const dayNumber = (index + firstDayOfMonth) % 7;
              const isWeekend = dayNumber === 5 || dayNumber === 6; // Lördag eller söndag
              const dayEntries = getEntriesForDay(day);
              const totalHours = getTotalHoursForDay(day);
              const hasEntries = dayEntries.length > 0;
              
              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[80px] p-1 border-r border-b border-neutral-200 relative cursor-pointer hover:bg-neutral-100 transition-colors",
                    isToday(day) && "bg-blue-50 hover:bg-blue-100",
                    isWeekend && "bg-neutral-50"
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex justify-between items-start h-6">
                    <span className={cn("text-sm p-1", isToday(day) && "font-bold")}>
                      {format(day, "d")}
                    </span>
                    
                    {hasEntries && (
                      <Badge variant="secondary" className="mr-1">{totalHours}h</Badge>
                    )}
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    {dayEntries.slice(0, 2).map((entry, i) => {
                      // Hitta uppgiftens namn från tasks-arrayen
                      const task = tasks.find(t => t.id === entry.taskId);
                      const taskName = task ? task.title : 'Uppgift';
                      
                      return (
                        <div key={`entry-${entry.id || i}`} className="px-1 py-0.5 text-xs bg-primary-100 text-primary-900 rounded truncate">
                          {taskName}: {entry.hours}h
                        </div>
                      );
                    })}
                    
                    {dayEntries.length > 2 && (
                      <div className="px-1 py-0.5 text-xs text-neutral-600">
                        + {dayEntries.length - 2} till
                      </div>
                    )}
                  </div>
                  
                  <button 
                    className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDayClick(day);
                    }}
                  >
                    <Plus className="h-3 w-3 text-primary-700" />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isAddEntryOpen} onOpenChange={setIsAddEntryOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Lägg till tidsrapportering</DialogTitle>
            <DialogDescription>
              {selectedDay && (
                <div className="flex items-center mt-1 text-sm">
                  <CalendarDays className="mr-2 h-4 w-4 text-neutral-500" />
                  {format(selectedDay, "EEEE d MMMM yyyy", { locale: sv })}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task">Uppgift</Label>
              <Select value={selectedTask} onValueChange={handleTaskSelect}>
                <SelectTrigger id="task">
                  <SelectValue placeholder="Välj en uppgift" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hours">Antal timmar</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-neutral-500" />
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning (valfritt)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv ditt arbete"
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button type="submit" onClick={handleSubmitTimeEntry}>Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}