import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TimeEntry {
  id: number;
  date: string;
  hours: number;
  taskId: number;
  projectId: number;
  description?: string;
}

interface MonthCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  timeEntries?: TimeEntry[];
  className?: string;
  tasks?: any[];
}

export function MonthCalendar({
  selectedDate,
  onSelectDate,
  timeEntries = [],
  tasks = [],
  className,
}: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState("month"); // "day", "week", "month"
  
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
  
  // Kontrollera om det finns tidsposter för en specifik dag
  const hasTimeEntriesForDay = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return timeEntries.some(entry => entry.date === dateString);
  };
  
  // Beräkna totalt antal timmar för en dag
  const getTotalHoursForDay = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return timeEntries
      .filter(entry => entry.date === dateString)
      .reduce((sum, entry) => sum + entry.hours, 0);
  };
  
  // Hämta första uppgiften för dagen (för att visa i kalendern)
  const getFirstTaskForDay = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    const entry = timeEntries.find(entry => entry.date === dateString);
    if (!entry) return null;
    
    const task = tasks.find(task => String(task.id) === String(entry.taskId));
    return task?.title || null;
  };

  return (
    <Card className={cn("border-neutral-200", className)}>
      <CardHeader className="bg-neutral-900 text-white p-3 flex flex-row justify-between items-center space-y-0">
        <div className="flex items-center space-x-1">
          <div className="font-semibold">
            {format(currentMonth, "MMMM d", { locale: sv })} - 
            {format(endOfMonth(currentMonth), " MMMM d, yyyy", { locale: sv })}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-white/10" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-white hover:bg-white/10" onClick={() => setCurrentMonth(new Date())}>
            Idag
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-white hover:bg-white/10" onClick={() => setActiveView("day")}>
            Dag
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-white hover:bg-white/10" onClick={() => setActiveView("week")}>
            Vecka
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-white hover:bg-white/10 bg-white/20" onClick={() => setActiveView("month")}>
            Månad
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
        
        <div className="grid grid-cols-7 auto-rows-[minmax(100px,_auto)]">
          {/* Tomma celler före månadens första dag */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="p-0 border-r border-b border-neutral-200"></div>
          ))}
          
          {/* Dagarna i månaden */}
          {days.map((day, index) => {
            const dayNumber = (index + firstDayOfMonth) % 7;
            const isWeekend = dayNumber === 5 || dayNumber === 6; // Lördag eller söndag
            const hasEntries = hasTimeEntriesForDay(day);
            const totalHours = getTotalHoursForDay(day);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const dayTask = getFirstTaskForDay(day);
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[100px] p-1 border-r border-b last:border-r-0 border-neutral-200 relative",
                  isToday(day) && "bg-blue-50",
                  isSelected && "ring-2 ring-primary ring-inset",
                  isWeekend && "bg-neutral-50"
                )}
                onClick={() => onSelectDate(day)}
              >
                <div className={cn(
                  "flex justify-between items-start h-6",
                  isToday(day) && "font-bold"
                )}>
                  <span className="text-sm p-1">
                    {format(day, "d")}
                  </span>
                  
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(day);
                  }}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {hasEntries && (
                  <div className="mt-1">
                    <div 
                      className={cn(
                        "text-xs p-1 mb-1 rounded-sm bg-blue-100 truncate", 
                        isSelected && "bg-blue-200"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(day);
                      }}
                    >
                      {dayTask && (
                        <span className="block truncate">
                          {dayTask}
                        </span>
                      )}
                      <Badge variant="secondary" className="mt-0.5 text-[10px] h-4 px-1 bg-blue-500 text-white">
                        {totalHours.toFixed(1)}h
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}