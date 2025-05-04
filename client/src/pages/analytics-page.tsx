import { useState } from "react";
import { PieChart, BarChart2, TrendingUp, Calendar, CheckSquare, Clock, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("week");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const projectStats = [
    {
      name: "Active Projects",
      value: "4",
      change: "+2",
      changeType: "increase",
      icon: <BarChart2 className="h-4 w-4 text-primary-500" />
    },
    {
      name: "Tasks Completed",
      value: "43",
      change: "+12",
      changeType: "increase",
      icon: <CheckSquare className="h-4 w-4 text-green-500" />
    },
    {
      name: "In Progress",
      value: "8",
      change: "-3",
      changeType: "decrease",
      icon: <TrendingUp className="h-4 w-4 text-amber-500" />
    },
    {
      name: "Team Members",
      value: "9",
      change: "+1",
      changeType: "increase",
      icon: <Users className="h-4 w-4 text-blue-500" />
    }
  ];

  const projectProgress = [
    { name: "ValvXlstart Development", progress: 68, status: "In Progress" },
    { name: "Mobile App Integration", progress: 42, status: "In Progress" },
    { name: "API Documentation", progress: 94, status: "Review" },
    { name: "Design System", progress: 100, status: "Complete" }
  ];

  const timeStats = [
    { day: "Mon", hours: 8.5 },
    { day: "Tue", hours: 7.25 },
    { day: "Wed", hours: 6.75 },
    { day: "Thu", hours: 9.0 },
    { day: "Fri", hours: 7.5 },
    { day: "Sat", hours: 2.0 },
    { day: "Sun", hours: 0.5 }
  ];

  const tasksByType = [
    { type: "Development", count: 28 },
    { type: "Design", count: 14 },
    { type: "Research", count: 8 },
    { type: "Documentation", count: 12 },
    { type: "Testing", count: 18 }
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Analytics Dashboard" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Analytics Dashboard</h1>
              <p className="text-neutral-500">Overview of your project statistics and performance</p>
            </div>
            <div className="flex items-center space-x-2">
              <Tabs value={timeRange} onValueChange={setTimeRange} className="w-[300px]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {projectStats.map((stat, index) => (
              <Card key={index} className="border border-neutral-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-500 text-sm">{stat.name}</span>
                    <span className="p-1 rounded-full bg-neutral-100">{stat.icon}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-semibold text-neutral-900">{stat.value}</div>
                    <div className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                      stat.changeType === "increase" 
                        ? "text-green-700 bg-green-50" 
                        : "text-red-700 bg-red-50"
                    }`}>
                      {stat.change}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2 border border-neutral-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Project Progress</CardTitle>
                <CardDescription>Current status of active projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectProgress.map((project, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{project.name}</span>
                        <Badge 
                          variant="outline" 
                          className={
                            project.status === "Complete" 
                              ? "bg-green-50 text-green-700 border-green-200"
                              : project.status === "Review"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={project.progress} className="h-2" />
                        <span className="text-xs font-medium text-neutral-500">{project.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-neutral-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Time Tracked</CardTitle>
                <CardDescription>Hours logged this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px] flex items-end justify-between gap-2">
                  {timeStats.map((day, index) => (
                    <div key={index} className="flex flex-col items-center gap-1.5">
                      <div 
                        className="bg-primary-100 rounded-sm w-9" 
                        style={{ height: `${day.hours * 12}px` }}
                      ></div>
                      <span className="text-xs font-medium text-neutral-500">{day.day}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-500">Total hours</div>
                      <div className="text-xl font-semibold">
                        {timeStats.reduce((acc, day) => acc + day.hours, 0).toFixed(1)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-neutral-400" />
                      <span className="text-sm text-neutral-600">Weekly report</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-neutral-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Tasks by Type</CardTitle>
                <CardDescription>Distribution of tasks by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasksByType.map((task, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{task.type}</span>
                        <span className="text-sm text-neutral-500">{task.count}</span>
                      </div>
                      <Progress value={(task.count / 80) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-neutral-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Upcoming Deadlines</CardTitle>
                <CardDescription>Tasks and milestones due soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-8 mt-0.5">
                      <Calendar className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">API Documentation Review</div>
                      <div className="text-xs text-neutral-500 mt-1">Due in 2 days</div>
                    </div>
                    <Badge className="ml-auto bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
                      Urgent
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="min-w-8 mt-0.5">
                      <Calendar className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Frontend Sprint Planning</div>
                      <div className="text-xs text-neutral-500 mt-1">Due in 5 days</div>
                    </div>
                    <Badge className="ml-auto bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                      Medium
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <div className="min-w-8 mt-0.5">
                      <Calendar className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">UI Component Library</div>
                      <div className="text-xs text-neutral-500 mt-1">Due in 7 days</div>
                    </div>
                    <Badge className="ml-auto bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                      Normal
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}