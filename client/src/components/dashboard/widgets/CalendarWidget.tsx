import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckSquare,
  Circle,
  AlertCircle
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
  startOfMonth,
  endOfMonth,
  getDay,
  isSameMonth
} from "date-fns";
import { useQuery } from "@tanstack/react-query";

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO date string
  end: string; // ISO date string
  type: "meeting" | "task" | "reminder" | "milestone";
  status?: "scheduled" | "in_progress" | "completed" | "canceled";
  allDay?: boolean;
  location?: string;
}

interface CalendarWidgetProps {
  projectId?: number;
}

// Different colors for different event types using provided color scheme
// #ffc35a (orange), #0acf97 (green), #727cf5 (blue) and #fa5c7c (pink)
const eventColors: Record<string, { bg: string, text: string, bgHover: string, border?: string, accent: string }> = {
  meeting: { 
    bg: "bg-primary/10", 
    text: "text-primary", 
    bgHover: "hover:bg-primary/20", 
    border: "border-primary/30",
    accent: "hsl(var(--primary))"
  },
  task: { 
    bg: "bg-emerald-500/10", 
    text: "text-emerald-500", 
    bgHover: "hover:bg-emerald-500/20", 
    border: "border-emerald-500/30",
    accent: "hsl(152, 76%, 42%)"
  },
  reminder: { 
    bg: "bg-amber-500/10", 
    text: "text-amber-500", 
    bgHover: "hover:bg-amber-500/20", 
    border: "border-amber-500/30",
    accent: "hsl(38, 100%, 50%)"
  },
  milestone: { 
    bg: "bg-rose-500/10", 
    text: "text-rose-500", 
    bgHover: "hover:bg-rose-500/20", 
    border: "border-rose-500/30", 
    accent: "hsl(351, 94%, 71%)"
  },
};

// Form validation schema for adding new events
const eventFormSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().optional(),
  date: z.string().min(1, { message: "Date is required." }),
  startTime: z.string().min(1, { message: "Start time is required." }),
  endTime: z.string().min(1, { message: "End time is required." }),
  type: z.enum(["meeting", "task", "reminder", "milestone"], {
    required_error: "Please select an event type.",
  }),
  location: z.string().optional(),
  allDay: z.boolean().default(false),
});

export function CalendarWidget({ projectId }: CalendarWidgetProps) {
  const today = startOfToday();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'day'>('week');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState<string | null>(null);
  
  // Setup form for adding new events
  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      date: format(selectedDay, "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      type: "meeting",
      location: "",
      allDay: false,
    },
  });

  // Update form date when selected day changes
  useState(() => {
    form.setValue("date", format(selectedDay, "yyyy-MM-dd"));
  });
  
  // Fetch events from API
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['calendar-events', projectId],
    queryFn: async () => {
      try {
        // Get events from the API
        const url = projectId 
          ? `/api/calendar-events?projectId=${projectId}` 
          : '/api/calendar-events';
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        
        const eventsData = await response.json();
        return eventsData;
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        // Fallback to sample data if API call fails during development
        return getSampleEvents();
      }
    }
  });
  
  // Date navigation helpers
  const getDateRange = () => {
    if (viewMode === 'day') {
      return { start: selectedDay, end: selectedDay };
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
      return { start: weekStart, end: weekEnd };
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return { start: monthStart, end: monthEnd };
    }
  };

  const dateRange = getDateRange();
  
  // Get days to display based on view mode
  const getDaysToDisplay = () => {
    if (viewMode === 'day') {
      return [selectedDay];
    } else if (viewMode === 'week') {
      return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    } else {
      // For month view, start from the first day of the week that contains the first day of the month
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: startDate, end: endDate });
    }
  };

  const daysToDisplay = getDaysToDisplay();
  
  // Navigation functions
  const prev = () => {
    if (viewMode === 'day') {
      setSelectedDay(addDays(selectedDay, -1));
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };
  
  const next = () => {
    if (viewMode === 'day') {
      setSelectedDay(addDays(selectedDay, 1));
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };
  
  const goToToday = () => {
    setCurrentDate(today);
    setSelectedDay(today);
  };
  
  // Create mutation for adding a new event
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Function to handle adding a new event
  const onSubmit = async (data: z.infer<typeof eventFormSchema>) => {
    setIsCreating(true);
    setCreateError(null);
    
    try {
      // Create the event data
      const eventData = {
        title: data.title,
        description: data.description || "",
        start: `${data.date}T${data.startTime}:00`,
        end: `${data.date}T${data.endTime}:00`,
        type: data.type,
        status: "scheduled" as const,
        allDay: data.allDay,
        location: data.location,
        projectId: projectId
      };
      
      // Send the event to the API
      const response = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }
      
      // Refresh the events list
      refetch();
      
      // Close the dialog
      setCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating event:', error);
      setCreateError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Get events for a specific day
  const getEventsForDay = (day: Date, events: CalendarEvent[] = []) => {
    return events?.filter(event => {
      const eventStart = parseISO(event.start);
      return isSameDay(eventStart, day);
    }) || [];
  };
  
  // Sample events data - this would come from your API in a real implementation
  function getSampleEvents(): CalendarEvent[] {
    const todayDate = new Date();
    
    return [
      {
        id: "1",
        title: "Daily Standup",
        description: "Team standup to discuss progress and blockers",
        start: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 9, 30).toISOString(),
        end: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 10, 0).toISOString(),
        type: "meeting",
        status: "scheduled",
        location: "Conference Room A"
      },
      {
        id: "2",
        title: "Project Planning",
        description: "Quarterly planning session for Q3 deliverables",
        start: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 13, 0).toISOString(),
        end: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate(), 15, 0).toISOString(),
        type: "meeting",
        status: "scheduled",
        location: "Main Office"
      },
      {
        id: "3",
        title: "API Implementation",
        description: "Implement new API endpoints for user management",
        start: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 2, 10, 0).toISOString(),
        end: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 2, 16, 0).toISOString(),
        type: "task",
        status: "scheduled"
      },
      {
        id: "4",
        title: "Design Review",
        description: "Review UI mockups with the design team",
        start: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 3, 14, 0).toISOString(),
        end: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 3, 15, 30).toISOString(),
        type: "reminder",
        status: "scheduled",
        location: "Design Lab"
      },
      {
        id: "5",
        title: "Version 1.0 Release",
        description: "Major version release with new features",
        start: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 5, 9, 0).toISOString(),
        end: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 5, 18, 0).toISOString(),
        type: "milestone",
        status: "scheduled",
        allDay: true
      },
      {
        id: "6",
        title: "Client Demo",
        description: "Demonstrate new features to key client",
        start: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1, 11, 0).toISOString(),
        end: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1, 12, 30).toISOString(),
        type: "meeting",
        status: "scheduled",
        location: "Virtual Meeting"
      },
      {
        id: "7",
        title: "Team Training",
        description: "Training session on new technologies",
        start: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 4, 9, 0).toISOString(),
        end: new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 4, 12, 0).toISOString(),
        type: "task",
        status: "scheduled",
        location: "Training Room"
      }
    ];
  }

  // Function to render the calendar grid
  const renderCalendarGrid = () => {
    if (viewMode === 'month') {
      // Render a 7-column grid with each day as a cell
      return (
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers (Mon, Tue, etc.) */}
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="font-medium text-sm text-center py-1 border-b text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {daysToDisplay.map((day) => (
            <div 
              key={day.toString()} 
              className={cn(
                "min-h-[80px] p-1 border border-border rounded-sm",
                !isSameMonth(day, currentDate) && "opacity-40 bg-muted/50",
                isSameDay(day, today) && "bg-primary/10"
              )}
              onClick={() => {
                setSelectedDay(day);
                setViewMode('day');
              }}
            >
              <div className="text-right">
                <span 
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center text-xs rounded-full",
                    isSameDay(day, today) && "bg-primary text-white"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
              
              <div className="mt-1 space-y-1 max-h-[60px] overflow-hidden">
                {getEventsForDay(day, events).slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "px-1 py-0.5 text-[10px] rounded truncate",
                      eventColors[event.type].bg,
                      eventColors[event.type].text
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                
                {getEventsForDay(day, events).length > 2 && (
                  <div className="text-[10px] text-center text-gray-500">
                    +{getEventsForDay(day, events).length - 2} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    } else if (viewMode === 'week') {
      // Render a 7-column grid with each day as a column
      return (
        <div className="grid grid-cols-7 gap-1.5 h-[260px]">
          {daysToDisplay.map((day) => (
            <div key={day.toString()} className="flex flex-col h-full">
              <div 
                className={cn(
                  "text-center mb-1 cursor-pointer",
                  isSameDay(day, selectedDay) && "bg-muted rounded-md"
                )}
                onClick={() => setSelectedDay(day)}
              >
                <div className="font-medium text-xs text-foreground/70 dark:text-foreground/70 mb-0.5">{format(day, "EEE")}</div>
                <div 
                  className={cn(
                    "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday(day) && "bg-primary text-white",
                    !isToday(day) && "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>
              
              {/* Events for this day */}
              <ScrollArea className="flex-1 overflow-y-auto py-1 px-0.5">
                <div className="space-y-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    getEventsForDay(day, events).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "px-2 py-1 rounded-md cursor-pointer",
                          eventColors[event.type].bg,
                          eventColors[event.type].text,
                          eventColors[event.type].bgHover,
                          "border-l-2",
                          eventColors[event.type].border
                        )}
                        onClick={() => setShowEventDetails(event.id)}
                      >
                        <div className="font-medium text-xs line-clamp-1 text-gray-500">{event.title}</div>
                        <div className="flex items-center mt-0.5 text-[10px] opacity-80">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {format(parseISO(event.start), "HH:mm")}
                        </div>
                      </div>
                    ))
                  )}

                  {!isLoading && getEventsForDay(day, events).length === 0 && (
                    <div 
                      className="h-full flex items-center justify-center text-center py-2"
                      onClick={() => {
                        setSelectedDay(day);
                        form.setValue("date", format(day, "yyyy-MM-dd"));
                        setCreateDialogOpen(true);
                      }}
                    >
                      <div className="text-[10px] text-foreground/50 dark:text-foreground/50 py-3 px-1 w-full border border-dashed border-border rounded-md hover:bg-muted cursor-pointer">
                        <Plus className="h-3 w-3 mx-auto mb-1" />
                        Add
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}
        </div>
      );
    } else {
      // Day view - render a single column with hourly sections
      const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8AM to 7PM
      const dayEvents = getEventsForDay(selectedDay, events);
      
      return (
        <div className="flex flex-col h-[260px]">
          <div className="text-center mb-2">
            <div className="font-medium text-sm mb-1">{format(selectedDay, "EEEE")}</div>
            <div 
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm",
                isToday(selectedDay) && "bg-primary text-white",
                !isToday(selectedDay) && "bg-muted text-foreground"
              )}
            >
              {format(selectedDay, "d")}
            </div>
          </div>
          
          <ScrollArea className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-full py-12">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : dayEvents.length > 0 ? (
                dayEvents.map((event) => (
                  <Card
                    key={event.id}
                    className={cn(
                      "overflow-hidden cursor-pointer hover:shadow-md transition-all",
                      "border-l-4",
                      `border-l-[${eventColors[event.type].accent}]`
                    )}
                    onClick={() => setShowEventDetails(event.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium">{event.title}</div>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-normal",
                            eventColors[event.type].bg,
                            eventColors[event.type].text
                          )}
                        >
                          {event.type}
                        </Badge>
                      </div>
                      
                      {event.description && (
                        <div className="text-xs text-foreground/60 dark:text-foreground/60 mb-2 line-clamp-2">
                          {event.description}
                        </div>
                      )}
                      
                      <div className="flex items-center text-xs text-foreground/60 dark:text-foreground/60">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          {format(parseISO(event.start), "HH:mm")} - {format(parseISO(event.end), "HH:mm")}
                        </span>
                        
                        {event.location && (
                          <>
                            <span className="mx-1.5">•</span>
                            <span className="truncate">{event.location}</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <AlertCircle className="h-8 w-8 text-foreground/30 dark:text-foreground/30 mb-2" />
                  <h3 className="text-sm font-medium text-foreground/80 dark:text-foreground/80">No events scheduled</h3>
                  <p className="text-xs text-foreground/60 dark:text-foreground/60 mt-1 text-center">
                    There are no events scheduled for this day.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Event
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={prev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <h3 className="text-sm font-medium">
              {viewMode === 'day' 
                ? format(selectedDay, "MMMM d, yyyy")
                : viewMode === 'week'
                  ? `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d, yyyy")}`
                  : format(currentDate, "MMMM yyyy")
              }
            </h3>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={next}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-2 ml-1"
            onClick={goToToday}
          >
            Today
          </Button>
        </div>
        
        <div className="flex items-center">
          <div className="flex border rounded-md overflow-hidden mr-2">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2 text-xs rounded-none",
                viewMode === "day" ? "bg-primary hover:bg-primary/90" : "hover:bg-muted"
              )}
              onClick={() => setViewMode("day")}
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2 text-xs rounded-none",
                viewMode === "week" ? "bg-primary hover:bg-primary/90" : "hover:bg-muted"
              )}
              onClick={() => setViewMode("week")}
            >
              Week
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2 text-xs rounded-none",
                viewMode === "month" ? "bg-primary hover:bg-primary/90" : "hover:bg-muted"
              )}
              onClick={() => setViewMode("month")}
            >
              Month
            </Button>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-7 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Event title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="col-span-3 sm:col-span-1">
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                            <SelectItem value="reminder">Reminder</SelectItem>
                            <SelectItem value="milestone">Milestone</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Event location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {createError && (
                    <div className="w-full mb-3 p-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                      {createError}
                    </div>
                  )}
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <div className="h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : 'Add Event'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Event Details Dialog */}
      {events && (
        <Dialog 
          open={!!showEventDetails} 
          onOpenChange={(open) => !open && setShowEventDetails(null)}
        >
          <DialogContent className="sm:max-w-[500px]">
            {showEventDetails && events && (() => {
              const selectedEvent = events.find((e: CalendarEvent) => e.id === showEventDetails);
              if (!selectedEvent) return null;
              
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ 
                          backgroundColor: eventColors[selectedEvent.type].accent 
                        }} 
                      />
                      {selectedEvent.title}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-2">
                    {selectedEvent.description && (
                      <div className="text-sm">
                        {selectedEvent.description}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-foreground/70 dark:text-foreground/70">Date & Time</Label>
                        <div className="text-sm mt-1 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-foreground/50 dark:text-foreground/50" />
                          {format(parseISO(selectedEvent.start), "MMM d, yyyy")}
                        </div>
                        
                        <div className="text-sm mt-1 flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-foreground/50 dark:text-foreground/50" />
                          {format(parseISO(selectedEvent.start), "HH:mm")} - 
                          {format(parseISO(selectedEvent.end), "HH:mm")}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs text-foreground/70 dark:text-foreground/70">Details</Label>
                        <div className="text-sm mt-1">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "px-2 py-0.5 font-normal",
                              eventColors[selectedEvent.type].bg,
                              eventColors[selectedEvent.type].text
                            )}
                          >
                            {selectedEvent.type}
                          </Badge>
                        </div>
                        
                        {selectedEvent.location && (
                          <div className="text-sm mt-2">
                            <span className="text-foreground/70 dark:text-foreground/70">Location:</span> {selectedEvent.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEventDetails(null)}>
                      Close
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Calendar grid */}
      {renderCalendarGrid()}
    </div>
  );
}