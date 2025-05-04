import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addDays,
  parseISO,
  addWeeks,
  subWeeks,
  isToday,
  startOfToday,
} from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  type: "meeting" | "task" | "reminder" | "milestone";
  status?: "scheduled" | "in_progress" | "completed" | "canceled";
}

interface CalendarWidgetProps {
  projectId?: number;
}

// Different colors for different event types
const eventColors: Record<string, { bg: string, text: string, bgHover: string, border?: string }> = {
  meeting: { bg: "bg-blue-100", text: "text-blue-700", bgHover: "hover:bg-blue-200", border: "border-blue-300" },
  task: { bg: "bg-green-100", text: "text-green-700", bgHover: "hover:bg-green-200", border: "border-green-300" },
  reminder: { bg: "bg-amber-100", text: "text-amber-700", bgHover: "hover:bg-amber-200", border: "border-amber-300" },
  milestone: { bg: "bg-purple-100", text: "text-purple-700", bgHover: "hover:bg-purple-200", border: "border-purple-300" },
};

export function CalendarWidget({ projectId }: CalendarWidgetProps) {
  const today = startOfToday();
  const [currentWeek, setCurrentWeek] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'day'>('week');
  
  // Fetch events from API
  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', projectId],
    queryFn: async () => {
      // Simulate API call with mock data for now
      // In real implementation, replace with actual API call
      return getSampleEvents();
    }
  });
  
  // Get date range for the current week
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Navigate to previous week
  const prevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };
  
  // Navigate to next week
  const nextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };
  
  // Navigate to today
  const goToToday = () => {
    setCurrentWeek(today);
    setSelectedDay(today);
  };
  
  // Get events for a specific day
  const getEventsForDay = (day: Date, events: CalendarEvent[] = []) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start);
      return isSameDay(eventStart, day);
    });
  };
  
  // Sample events data - this would come from your API in a real implementation
  function getSampleEvents(): CalendarEvent[] {
    const today = new Date();
    
    return [
      {
        id: "1",
        title: "Standup Item",
        start: addDays(today, 0).toISOString(),
        end: addDays(today, 0).toISOString(),
        type: "task",
        status: "scheduled"
      },
      {
        id: "2",
        title: "Team Meeting",
        start: addDays(today, 0).toISOString(),
        end: addDays(today, 0).toISOString(),
        type: "meeting"
      },
      {
        id: "3",
        title: "API Documentation",
        start: addDays(today, 2).toISOString(),
        end: addDays(today, 2).toISOString(),
        type: "task"
      },
      {
        id: "4",
        title: "Review Reports",
        start: addDays(today, 3).toISOString(),
        end: addDays(today, 3).toISOString(),
        type: "reminder"
      },
      {
        id: "5",
        title: "Version 1.0 Release",
        start: addDays(today, 5).toISOString(),
        end: addDays(today, 5).toISOString(),
        type: "milestone"
      }
    ];
  }

  return (
    <div className="h-full flex flex-col">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 border-gray-200"
            onClick={prevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 border-gray-200"
            onClick={nextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 font-normal border-gray-200"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>
        
        <div className="text-sm font-medium">
          {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
        </div>
        
        <div className="flex space-x-1">
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-3 text-xs font-normal",
              viewMode === "day" ? "bg-blue-600 hover:bg-blue-700" : "border-gray-200"
            )}
            onClick={() => setViewMode("day")}
          >
            Day
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-3 text-xs font-normal",
              viewMode === "week" ? "bg-blue-600 hover:bg-blue-700" : "border-gray-200"
            )}
            onClick={() => setViewMode("week")}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-3 text-xs font-normal",
              viewMode === "month" ? "bg-blue-600 hover:bg-blue-700" : "border-gray-200"
            )}
            onClick={() => setViewMode("month")}
          >
            Month
          </Button>
        </div>
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, dayIdx) => (
          <div key={day.toString()} className="flex flex-col">
            <div className="text-center mb-1">
              <div className="font-medium text-sm mb-0.5">{format(day, "EEE")}</div>
              <div 
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  isToday(day) && "bg-blue-600 text-white",
                  !isToday(day) && isSameDay(day, selectedDay) && "bg-gray-100 text-gray-900",
                  !isToday(day) && !isSameDay(day, selectedDay) && "text-gray-700"
                )}
                onClick={() => setSelectedDay(day)}
              >
                {format(day, "d")}
              </div>
            </div>
            
            {/* Events for this day */}
            <div className="flex-1 overflow-y-auto max-h-[200px] text-xs space-y-1">
              {isLoading ? (
                <div className="text-center text-gray-500 py-2">Loading...</div>
              ) : (
                getEventsForDay(day, events).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "px-2 py-1.5 rounded-md cursor-pointer",
                      eventColors[event.type].bg,
                      eventColors[event.type].text,
                      eventColors[event.type].bgHover,
                      "border-l-2",
                      eventColors[event.type].border
                    )}
                  >
                    <div className="font-medium text-xs line-clamp-1">{event.title}</div>
                    <div className="flex items-center mt-0.5 text-[10px] opacity-80">
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      {format(parseISO(event.start), "HH:mm")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}