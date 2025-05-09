import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { CalendarIcon, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { TimeEntry, Task } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

type TimeTrackingProps = {
  projectId: number;
  userId?: number;
};

export default function TimeTracking({ projectId, userId }: TimeTrackingProps) {
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [hours, setHours] = useState<string>("1");
  const [description, setDescription] = useState<string>("");
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Hämta tidsrapporter för projektet och användaren
  const { data: timeEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ["/api/time-entries", projectId],
    queryFn: async () => {
      const url = new URL("/api/time-entries", window.location.origin);
      url.searchParams.append("projectId", projectId.toString());
      if (userId) {
        url.searchParams.append("userId", userId.toString());
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return await res.json() as TimeEntry[];
    }
  });

  // Hämta uppgifter för projektet
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks", projectId],
    queryFn: async () => {
      const url = new URL(`/api/projects/${projectId}/tasks`, window.location.origin);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return await res.json() as Task[];
    }
  });

  // Skapa tidsrapport
  const createTimeEntryMutation = useMutation({
    mutationFn: async (timeEntry: Omit<TimeEntry, "id" | "createdAt">) => {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(timeEntry),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Kunde inte skapa tidsrapport");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      // Rensa formuläret
      setSelectedTask("");
      setHours("1");
      setDescription("");
      
      // Uppdatera listan
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries", projectId] });
      
      toast({
        title: "Tidsrapport skapad",
        description: "Din tidsrapport har sparats",
      });
    },
    onError: (error) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Ta bort tidsrapport
  const deleteTimeEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const res = await fetch(`/api/time-entries/${entryId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Kunde inte ta bort tidsrapport");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries", projectId] });
      
      toast({
        title: "Tidsrapport borttagen",
        description: "Tidsrapporten har tagits bort",
      });
    },
    onError: (error) => {
      toast({
        title: "Ett fel uppstod",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funktion för att skapa tidsrapport
  const handleSubmit = () => {
    // Validera formuläret
    if (!selectedTask) {
      toast({
        title: "Saknade uppgifter",
        description: "Välj en uppgift för tidsrapporten",
        variant: "destructive",
      });
      return;
    }

    if (!hours || isNaN(parseFloat(hours)) || parseFloat(hours) <= 0) {
      toast({
        title: "Ogiltig tid",
        description: "Ange en giltig tid i timmar",
        variant: "destructive",
      });
      return;
    }

    // Skapa tidsrapporten
    createTimeEntryMutation.mutate({
      taskId: parseInt(selectedTask),
      hours: parseFloat(hours),
      description: description || null, // Använd null om beskrivning saknas
      projectId: projectId,
      reportDate: selectedDate.toISOString().split('T')[0],
      userId: userId || 0, // userId kommer att ignoreras på serversidan och ersättas med autentiserad användare
    });
  };

  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'PPP', { locale: sv });
    } catch (e) {
      console.error("Felaktigt datumformat:", e);
      return "Ogiltigt datum";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrera tid</CardTitle>
          <CardDescription>Registrera arbetad tid på projekt och uppgifter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate) : "Välj datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="task">Uppgift</Label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger id="task">
                  <SelectValue placeholder="Välj uppgift" />
                </SelectTrigger>
                <SelectContent>
                  {tasksLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : tasks && tasks.length > 0 ? (
                    tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id.toString()}>
                        {task.title || `Uppgift #${task.id}`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no_tasks" disabled>
                      Inga uppgifter tillgängliga
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hours">Timmar</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0.25"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivning</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beskriv vad du gjorde (valfritt)"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSubmit}
            disabled={createTimeEntryMutation.isPending}
            className="w-full"
          >
            {createTimeEntryMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Registrera tid
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrerad tid</CardTitle>
          <CardDescription>Översikt över din registrerade tid</CardDescription>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !timeEntries || timeEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Inga tidsrapporter registrerade</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Uppgift</TableHead>
                  <TableHead>Timmar</TableHead>
                  <TableHead>Beskrivning</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.reportDate)}</TableCell>
                    <TableCell>
                      {tasks?.find(t => t.id === entry.taskId)?.title || `Uppgift #${entry.taskId}`}
                    </TableCell>
                    <TableCell>{entry.hours}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm("Är du säker på att du vill ta bort denna tidsrapport?")) {
                            deleteTimeEntryMutation.mutate(entry.id);
                          }
                        }}
                        disabled={deleteTimeEntryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}