import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
}

export function MonthCalendar({
  selectedDate,
  onSelectDate,
  timeEntries = [],
  className,
}: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
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

  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">
            {format(currentMonth, "MMMM yyyy", { locale: sv })}
          </h3>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-xs font-medium text-center text-muted-foreground mb-2">
          {weekdayNames.map((name) => (
            <div key={name} className="py-1">
              {name}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-sm">
          {/* Tomma celler före månadens första dag */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10 p-0"></div>
          ))}
          
          {/* Dagarna i månaden */}
          {days.map((day) => {
            const hasEntries = hasTimeEntriesForDay(day);
            const totalHours = getTotalHoursForDay(day);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            
            return (
              <Button
                key={day.toString()}
                variant="ghost"
                className={cn(
                  "h-10 w-full p-0 font-normal relative",
                  isToday(day) && "bg-muted",
                  isSelected && "border border-primary"
                )}
                onClick={() => onSelectDate(day)}
              >
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <span
                    className={cn(
                      "text-xs",
                      isToday(day) && "font-bold"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  
                  {hasEntries && (
                    <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-primary/10 text-primary rounded-b-sm">
                      {totalHours.toFixed(1)}h
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}