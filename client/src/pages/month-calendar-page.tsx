import { useState } from "react";
import { useParams } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../components/page-header";
import { MainNav } from "../components/main-nav";
import { SideNav } from "../components/side-nav";

export default function MonthCalendarPage() {
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <MainNav />
      </header>
      
      <div className="flex-1 flex">
        <aside className="hidden lg:block border-r w-[280px] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          <SideNav projectId={0} projectName="" />
        </aside>
        
        <main className="flex-1 flex flex-col">
          <PageHeader 
            title="Månadskalender för tidsrapportering" 
          >
            <p className="text-muted-foreground">Visa alla dagar i månaden för att planera och registrera tid</p>
          </PageHeader>
          
          <div className="flex-1 p-6">
            <div className="border border-neutral-200 rounded-md overflow-hidden">
              <div className="bg-neutral-900 text-white p-3 flex justify-between items-center">
                <h2 className="text-lg font-medium">
                  {format(currentMonth, "MMMM yyyy", { locale: sv })}
                </h2>
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-white hover:bg-white/10" 
                    onClick={prevMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-white hover:bg-white/10" 
                    onClick={nextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Veckodagar */}
              <div className="grid grid-cols-7 border-b border-neutral-200">
                {weekdayNames.map((name) => (
                  <div 
                    key={name} 
                    className="py-2 text-center text-xs font-medium border-r last:border-r-0 border-neutral-200"
                  >
                    {name}
                  </div>
                ))}
              </div>
              
              {/* Kalenderdagar */}
              <div className="grid grid-cols-7 auto-rows-[minmax(120px,_auto)]">
                {/* Tomma celler före månadens första dag */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div 
                    key={`empty-${i}`} 
                    className="p-0 border-r border-b border-neutral-200"
                  />
                ))}
                
                {/* Dagarna i månaden */}
                {days.map((day, index) => {
                  const dayNumber = (index + firstDayOfMonth) % 7;
                  const isWeekend = dayNumber === 5 || dayNumber === 6; // Lördag eller söndag
                  
                  return (
                    <div
                      key={day.toString()}
                      className={cn(
                        "p-2 border-r border-b last:border-r-0 border-neutral-200 relative",
                        isToday(day) && "bg-blue-50",
                        isWeekend && "bg-neutral-50"
                      )}
                    >
                      <div className="flex justify-between items-start h-6">
                        <span className={cn("text-sm font-medium p-1", isToday(day) && "text-blue-600")}>
                          {format(day, "d")}
                        </span>
                      </div>
                      
                      {/* Här kan vi lägga till time entries för den aktuella dagen */}
                      <div className="mt-1 space-y-1">
                        {/* Placeholder för eventuell framtida data */}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}