import { useState, useEffect } from "react";
import { 
  BarChart, 
  Database, 
  Users,
  HardDrive,
  File,
  FileText,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalFiles: number;
  totalStorageUsed: number;
  maxStorage: number;
  totalTasks: number;
  completedTasks: number;
  systemUptime: string;
}

export default function SystemStatisticsWidget({ title = "Systemöversikt" }) {
  const { toast } = useToast();
  
  // Mock data för systemstatistik (i en verklig implementering skulle vi hämta från API)
  const mockStats: SystemStats = {
    totalUsers: 45,
    activeUsers: 28,
    totalProjects: 23,
    activeProjects: 14,
    totalFiles: 342,
    totalStorageUsed: 2.4, // GB
    maxStorage: 10, // GB
    totalTasks: 156,
    completedTasks: 92,
    systemUptime: "43 dagar, 12 timmar"
  };

  // I en verklig implementation skulle vi hämta data från ett API
  const { data: stats = mockStats, isLoading } = useQuery<SystemStats>({
    queryKey: ['/api/system/stats'],
    queryFn: async () => {
      try {
        // Normalt skulle vi hämta data från API:et här
        // const response = await apiRequest('GET', '/api/system/stats');
        // return await response.json();
        
        // Returnera mock-data för demonstration
        return mockStats;
      } catch (error) {
        console.error('Error fetching system stats:', error);
        return mockStats;
      }
    },
    // Inaktivera för demonstrationssyfte
    enabled: false
  });

  const formatNumber = (num: number): string => {
    return num.toLocaleString('sv-SE');
  };

  // Beräkna procent för visualiseringar
  const storagePercent = Math.round((stats.totalStorageUsed / stats.maxStorage) * 100);
  const activeUsersPercent = Math.round((stats.activeUsers / stats.totalUsers) * 100);
  const activeProjectsPercent = Math.round((stats.activeProjects / stats.totalProjects) * 100);
  const completedTasksPercent = Math.round((stats.completedTasks / stats.totalTasks) * 100);

  // Bestäm progress färg baserat på procentsats
  const getProgressColor = (percent: number): string => {
    if (percent < 30) return 'bg-green-500';
    if (percent < 60) return 'bg-yellow-500';
    if (percent < 85) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">Systemstatistik och resursutnyttjande</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Laddar statistik...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Användare & Projekt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <h4 className="text-sm font-medium">Användare</h4>
                  </div>
                  <div className="text-xl font-semibold">{formatNumber(stats.totalUsers)}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span>Aktiva användare ({stats.activeUsers})</span>
                      <span>{activeUsersPercent}%</span>
                    </div>
                    <Progress 
                      value={activeUsersPercent} 
                      className="h-1.5"
                      indicatorClassName="bg-blue-500"
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <BarChart className="h-5 w-5 text-purple-500" />
                    <h4 className="text-sm font-medium">Projekt</h4>
                  </div>
                  <div className="text-xl font-semibold">{formatNumber(stats.totalProjects)}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span>Aktiva projekt ({stats.activeProjects})</span>
                      <span>{activeProjectsPercent}%</span>
                    </div>
                    <Progress 
                      value={activeProjectsPercent} 
                      className="h-1.5"
                      indicatorClassName="bg-purple-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Lagring & Filer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-5 w-5 text-orange-500" />
                    <h4 className="text-sm font-medium">Lagring</h4>
                  </div>
                  <div className="text-xl font-semibold">{stats.totalStorageUsed} GB / {stats.maxStorage} GB</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span>Använt utrymme</span>
                      <span>{storagePercent}%</span>
                    </div>
                    <Progress 
                      value={storagePercent} 
                      className="h-1.5"
                      indicatorClassName={getProgressColor(storagePercent)}
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-cyan-500" />
                    <h4 className="text-sm font-medium">Filer</h4>
                  </div>
                  <div className="text-xl font-semibold">{formatNumber(stats.totalFiles)}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span>Uppgifter slutförda ({stats.completedTasks})</span>
                      <span>{completedTasksPercent}%</span>
                    </div>
                    <Progress 
                      value={completedTasksPercent} 
                      className="h-1.5"
                      indicatorClassName="bg-green-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* System info */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-3">
                  <Database className="h-5 w-5 text-gray-500" />
                  <h4 className="text-sm font-medium">Systeminformation</h4>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-muted-foreground">Upptid:</span>
                  </div>
                  <div>{stats.systemUptime}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Widget>
  );
}