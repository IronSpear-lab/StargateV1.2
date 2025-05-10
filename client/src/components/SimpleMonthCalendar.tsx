import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SimpleMonthCalendar() {
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

  return (
    <Card className="border-neutral-200">
      <CardHeader className="bg-neutral-900 text-white p-3 flex flex-row justify-between items-center space-y-0">
        <div className="flex items-center space-x-1">
          <CardTitle className="text-lg font-medium">
            {format(currentMonth, "MMMM yyyy", { locale: sv })}
          </CardTitle>
        </div>
        
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
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[80px] p-1 border-r border-b last:border-r-0 border-neutral-200 relative",
                  isToday(day) && "bg-blue-50",
                  isWeekend && "bg-neutral-50"
                )}
              >
                <div className="flex justify-between items-start h-6">
                  <span className={cn("text-sm p-1", isToday(day) && "font-bold")}>
                    {format(day, "d")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}