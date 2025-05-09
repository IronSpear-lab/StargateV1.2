import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, startOfDay, endOfDay, subDays } from "date-fns";
import { sv } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Clock, Play, Calendar, PlusCircle, Pause, BarChart2, CheckSquare } from "lucide-react";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { PageHeader } from "../components/page-header";
import { MainNav } from "../components/main-nav";
import { SideNav } from "../components/side-nav";
import { useAuth } from "../hooks/use-auth";
import { TimeTracking } from "../components/TimeTracking";
import { cn } from "../lib/utils";

export default function TimeTrackingPage() {
  const { user } = useAuth();
  const params = useParams();
  const projectId = params.projectId ? parseInt(params.projectId) : undefined;
  
  const [activeTab, setActiveTab] = useState("today");
  const [isTracking, setIsTracking] = useState(false);
  const [timer, setTimer] = useState("00:00:00");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [hours, setHours] = useState<string>("0");
  
  // Projects query
  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!user,
  });

  // Get current project if projectId is defined
  const currentProject = projectId && projects ? 
    projects.find((p: any) => p.id === projectId) : undefined;
  
  // Tasks query based on project
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks", projectId],
    enabled: !!projectId && !!user,
  });
  
  // Time entries query based on active tab and selected date
  const getTimeEntriesQueryKey = () => {
    let startDate;
    let endDate;
    
    if (activeTab === "today") {
      startDate = startOfDay(new Date());
      endDate = endOfDay(new Date());
    } else if (activeTab === "yesterday") {
      startDate = startOfDay(subDays(new Date(), 1));
      endDate = endOfDay(subDays(new Date(), 1));
    } else if (activeTab === "date" && selectedDate) {
      startDate = startOfDay(selectedDate);
      endDate = endOfDay(selectedDate);
    } else {
      // Default to last 7 days
      startDate = startOfDay(subDays(new Date(), 7));
      endDate = endOfDay(new Date());
    }
    
    return [
      "/api/time-entries",
      projectId,
      format(startDate, "yyyy-MM-dd"),
      format(endDate, "yyyy-MM-dd")
    ];
  };
  
  const { data: timeEntries = [] } = useQuery({
    queryKey: getTimeEntriesQueryKey(),
    enabled: !!user,
  });
  
  // Add a new time entry
  const addTimeEntry = async () => {
    if (!selectedTask || !selectedDate || Number(hours) <= 0) {
      // Show validation error
      return;
    }
    
    try {
      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: selectedTask,
          projectId: projectId,
          date: format(selectedDate, "yyyy-MM-dd"),
          hours: Number(hours),
          description: description || null,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add time entry");
      }
      
      // Reset form
      setSelectedTask("");
      setDescription("");
      setHours("0");
      
      // Refetch time entries
      // We would use react-query mutation here in a full implementation
    } catch (error) {
      console.error("Error adding time entry:", error);
    }
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Format date for display
  const formatDate = (date: string) => {
    try {
      return format(parseISO(date), "d MMMM yyyy", { locale: sv });
    } catch (error) {
      return date;
    }
  };
  
  // Calculate total time for filtered entries
  const calculateTotalHours = (entries: any[]) => {
    return entries.reduce((total, entry) => total + (entry.hours || 0), 0);
  };

  // Get filtered time entries based on active tab
  const getFilteredEntries = () => {
    if (!timeEntries.length) return [];
    
    if (activeTab === "today") {
      const today = format(new Date(), "yyyy-MM-dd");
      return timeEntries.filter((entry: any) => 
        entry.date && entry.date.startsWith(today)
      );
    } else if (activeTab === "yesterday") {
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      return timeEntries.filter((entry: any) => 
        entry.date && entry.date.startsWith(yesterday)
      );
    } else if (activeTab === "date" && selectedDate) {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      return timeEntries.filter((entry: any) => 
        entry.date && entry.date.startsWith(formattedDate)
      );
    }
    
    return timeEntries;
  };
  
  const filteredEntries = getFilteredEntries();
  const totalHours = calculateTotalHours(filteredEntries);
  
  return (
    <div className="flex h-screen overflow-hidden">
      {projectId && currentProject ? (
        <div className={cn("border-r bg-background h-full", isSidebarOpen ? "block" : "hidden md:block")}>
          <SideNav projectId={projectId} projectName={currentProject.name || "Projekt"} />
        </div>
      ) : null}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader 
          title={projectId && currentProject ? 
            `Tidsrapportering - ${currentProject.name}` : 
            "Tidsrapportering"
          } 
          onToggleSidebar={toggleSidebar} 
        />
        
        {!projectId && (
          <div className="border-b">
            <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
              <MainNav />
            </div>
          </div>
        )}
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Tidsrapportering</h1>
              <p className="text-neutral-500">Följ din arbetstid och produktivitet</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Select defaultValue="week">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Välj period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Idag</SelectItem>
                  <SelectItem value="week">Denna vecka</SelectItem>
                  <SelectItem value="month">Denna månad</SelectItem>
                  <SelectItem value="year">Detta år</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <BarChart2 className="mr-2 h-4 w-4" />
                Rapport
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card className="border border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium">Tidsposter</CardTitle>
                      <CardDescription>Dina senaste tidsrapporteringar</CardDescription>
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[300px]">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="today">Idag</TabsTrigger>
                        <TabsTrigger value="yesterday">Igår</TabsTrigger>
                        <TabsTrigger value="date">
                          {activeTab === "date" && selectedDate ? (
                            format(selectedDate, "d MMM", { locale: sv })
                          ) : (
                            "Välj datum"
                          )}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  {activeTab === "date" && (
                    <div className="mt-2 flex justify-end">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="ml-auto">
                            <Calendar className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "d MMMM yyyy", { locale: sv })
                            ) : (
                              "Välj ett datum"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {timeEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-neutral-700">Inga tidsposter</h3>
                      <p className="text-neutral-500 mt-1">Börja spåra tid för dina uppgifter</p>
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-neutral-700">Inga tidsposter för denna period</h3>
                      <p className="text-neutral-500 mt-1">Välj en annan period eller lägg till nya poster</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredEntries.map((entry: any, i: number) => (
                        <div key={entry.id}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2">
                            <div className="flex items-start space-x-3">
                              <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center">
                                <CheckSquare className="h-4 w-4 text-primary-600" />
                              </div>
                              <div>
                                <div className="font-medium">{entry.task?.title || "Okänd uppgift"}</div>
                                <div className="text-sm text-neutral-500">{entry.project?.name || "Okänt projekt"}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                              <div className="text-sm text-neutral-500">
                                {formatDate(entry.date)}
                              </div>
                              <div className="text-sm font-medium">{entry.hours} timmar</div>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="19" cy="12" r="1" />
                                  <circle cx="5" cy="12" r="1" />
                                </svg>
                                <span className="sr-only">Meny</span>
                              </Button>
                            </div>
                          </div>
                          {i < filteredEntries.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200">
                    <div className="font-medium">Total tid: <span className="text-primary-700">{totalHours} timmar</span></div>
                    <Button variant="outline" onClick={() => setActiveTab("date")}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Lägg till
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card className="border border-neutral-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Registrera tid</CardTitle>
                  <CardDescription>Lägg till tid för en uppgift</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="date">Datum</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, "d MMMM yyyy", { locale: sv })
                            ) : (
                              "Välj ett datum"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    {!projectId && (
                      <div className="space-y-1.5">
                        <Label htmlFor="project">Projekt</Label>
                        <Select>
                          <SelectTrigger id="project">
                            <SelectValue placeholder="Välj projekt" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects?.map((project: any) => (
                              <SelectItem key={project.id} value={project.id.toString()}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="task">Uppgift</Label>
                      <Select value={selectedTask} onValueChange={setSelectedTask}>
                        <SelectTrigger id="task">
                          <SelectValue placeholder="Välj uppgift" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks?.map((task: any) => (
                            <SelectItem key={task.id} value={task.id.toString()}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="hours">Antal timmar</Label>
                      <Input 
                        id="hours" 
                        type="number" 
                        min="0.5" 
                        step="0.5" 
                        value={hours} 
                        onChange={(e) => setHours(e.target.value)}
                      />
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
                    
                    <div className="flex justify-center pt-2">
                      <Button onClick={addTimeEntry}>
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Lägg till
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-neutral-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Projektöversikt</CardTitle>
                  <CardDescription>Tidsfördelning per projekt</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects?.slice(0, 3).map((project: any) => {
                      // Find time entries for this project
                      const projectEntries = timeEntries.filter(
                        (entry: any) => entry.projectId === project.id
                      );
                      const projectTotal = calculateTotalHours(projectEntries);
                      const maxHours = 40; // Example: assuming a 40 hour work week
                      const progressPercentage = Math.min(100, (projectTotal / maxHours) * 100);
                      
                      return (
                        <div key={project.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="text-sm font-medium">{project.name}</div>
                            <div className="text-sm text-neutral-500">{projectTotal} timmar</div>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                      );
                    })}
                    
                    {(!projects || projects.length === 0) && (
                      <div className="text-center py-4 text-neutral-500">
                        Inga projekt tillgängliga
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}