import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play, Calendar, PlusCircle, Pause, BarChart2, User, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { MonthCalendarGrid } from "@/components/MonthCalendarGrid";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function TimeTrackingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("today");
  const [isTracking, setIsTracking] = useState(false);
  const [timer, setTimer] = useState("00:00:00");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Mock data for time entries
  const timeEntries = [
    {
      id: 1,
      task: "API Documentation",
      project: "ValvXlstart Development",
      startTime: "09:30 AM",
      endTime: "11:45 AM",
      duration: "2h 15m",
      date: "Today"
    },
    {
      id: 2,
      task: "Frontend Implementation",
      project: "ValvXlstart Development",
      startTime: "01:15 PM",
      endTime: "03:30 PM",
      duration: "2h 15m",
      date: "Today"
    },
    {
      id: 3,
      task: "Code Review",
      project: "Mobile App Integration",
      startTime: "04:00 PM",
      endTime: "05:30 PM",
      duration: "1h 30m",
      date: "Today"
    },
    {
      id: 4,
      task: "Database Schema Design",
      project: "ValvXlstart Development",
      startTime: "10:00 AM",
      endTime: "12:30 PM", 
      duration: "2h 30m",
      date: "Yesterday"
    },
    {
      id: 5,
      task: "UI Component Library",
      project: "Design System",
      startTime: "02:00 PM",
      endTime: "05:15 PM",
      duration: "3h 15m",
      date: "Yesterday"
    }
  ];
  
  // Filter time entries based on active tab
  const filteredEntries = timeEntries.filter(entry => {
    if (activeTab === "today") return entry.date === "Today";
    if (activeTab === "yesterday") return entry.date === "Yesterday";
    return true; // "all" tab
  });
  
  // Calculate total time
  const totalTime = filteredEntries.reduce((acc, entry) => {
    // Parse hours and minutes from the duration string (e.g., "2h 15m")
    const hoursMatch = entry.duration.match(/(\d+)h/);
    const minutesMatch = entry.duration.match(/(\d+)m/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    
    return acc + (hours * 60 + minutes);
  }, 0);
  
  // Format total time as hours and minutes
  const totalHours = Math.floor(totalTime / 60);
  const totalMinutes = totalTime % 60;
  const formattedTotalTime = `${totalHours}h ${totalMinutes}m`;
  
  const toggleTimeTracking = () => {
    setIsTracking(!isTracking);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Time Tracking" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Time Tracking</h1>
              <p className="text-neutral-500">Track your time and monitor your productivity</p>
            </div>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Select defaultValue="week">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                <BarChart2 className="mr-2 h-4 w-4" />
                Report
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <Card className="border border-neutral-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-medium">Time Entries</CardTitle>
                      <CardDescription>Your recent time tracking activities</CardDescription>
                    </div>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[300px]">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredEntries.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-neutral-700">No time entries</h3>
                      <p className="text-neutral-500 mt-1">Start tracking time for your tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredEntries.map((entry, i) => (
                        <div key={entry.id}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2">
                            <div className="flex items-start space-x-3">
                              <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center">
                                <CheckSquare className="h-4 w-4 text-primary-600" />
                              </div>
                              <div>
                                <div className="font-medium">{entry.task}</div>
                                <div className="text-sm text-neutral-500">{entry.project}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                              <div className="text-sm text-neutral-500">
                                {entry.startTime} - {entry.endTime}
                              </div>
                              <div className="text-sm font-medium">{entry.duration}</div>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="19" cy="12" r="1" />
                                  <circle cx="5" cy="12" r="1" />
                                </svg>
                                <span className="sr-only">Menu</span>
                              </Button>
                            </div>
                          </div>
                          {i < filteredEntries.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200">
                    <div className="font-medium">Total time: <span className="text-primary-700">{formattedTotalTime}</span></div>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <Card className="border border-neutral-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Current Timer</CardTitle>
                  <CardDescription>Track time for your current task</CardDescription>
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
                        <Label htmlFor="task">Task</Label>
                        <Select defaultValue="documentation">
                          <SelectTrigger id="task">
                            <SelectValue placeholder="Select task" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="documentation">API Documentation</SelectItem>
                            <SelectItem value="frontend">Frontend Implementation</SelectItem>
                            <SelectItem value="review">Code Review</SelectItem>
                            <SelectItem value="database">Database Schema Design</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="project">Project</Label>
                        <Select defaultValue="valvxl">
                          <SelectTrigger id="project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="valvxl">ValvXlstart Development</SelectItem>
                            <SelectItem value="mobile">Mobile App Integration</SelectItem>
                            <SelectItem value="design">Design System</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="description">Description (optional)</Label>
                        <Input id="description" placeholder="Add notes about your work" />
                      </div>
                    </div>
                    
                    <div className="flex justify-center pt-2">
                      <Button 
                        size="lg" 
                        className={isTracking ? "bg-red-600 hover:bg-red-700" : ""}
                        onClick={toggleTimeTracking}
                      >
                        {isTracking ? (
                          <>
                            <Pause className="mr-2 h-5 w-5" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-5 w-5" />
                            Start Timer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Kalendervyn som visar hela månaden */}
              <MonthCalendarGrid className="mb-6" />
              
              <Card className="border border-neutral-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Aktivitet per projekt</CardTitle>
                  <CardDescription>Din tidsrapportering fördelat på projekt</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm font-medium">ValvXlstart Development</div>
                        <div className="text-sm text-neutral-500">4h 30m</div>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm font-medium">Mobile App Integration</div>
                        <div className="text-sm text-neutral-500">1h 30m</div>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm font-medium">Design System</div>
                        <div className="text-sm text-neutral-500">3h 15m</div>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
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