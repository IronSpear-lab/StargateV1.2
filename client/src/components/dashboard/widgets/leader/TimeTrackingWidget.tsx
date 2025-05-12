import { useState } from "react";
import { 
  Clock,
  Calendar,
  BarChart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";

interface TimeEntry {
  id: number;
  user: string;
  project: string;
  task: string;
  hours: number;
  date: string;
}

interface TimeReport {
  currentWeekHours: number;
  lastWeekHours: number;
  percentChange: number;
  timeEntries: TimeEntry[];
}

export default function TimeTrackingWidget({ title = "Tidrapportering" }) {
  const { currentProject } = useProject();
  
  // Exempel på mock-data för tidrapportering
  const mockTimeReport: TimeReport = {
    currentWeekHours: 138,
    lastWeekHours: 125,
    percentChange: 10.4,
    timeEntries: [
      { id: 1, user: "Anna Andersson", project: "Byggnation Stadshuset", task: "Ritningsarbete", hours: 6.5, date: "2025-05-11" },
      { id: 2, user: "Erik Eriksson", project: "Renovering Kulturhuset", task: "Konstruktionsberäkningar", hours: 8.0, date: "2025-05-11" },
      { id: 3, user: "Maria Svensson", project: "Byggnation Stadshuset", task: "Projektledning", hours: 7.5, date: "2025-05-10" },
      { id: 4, user: "Johan Lindgren", project: "Nybyggnation Skola", task: "Elinstallationer", hours: 5.0, date: "2025-05-10" },
    ]
  };

  // I en verklig implementation skulle vi hämta data från ett API
  const { data: timeReport = mockTimeReport, isLoading } = useQuery<TimeReport>({
    queryKey: ['/api/time-tracking/summary'],
    queryFn: async () => {
      try {
        // Normalt skulle vi hämta data från API:et här
        // const response = await apiRequest('GET', '/api/time-tracking/summary');
        // return await response.json();
        
        // Returnera mock-data för demonstration
        return mockTimeReport;
      } catch (error) {
        console.error('Error fetching time tracking data:', error);
        return mockTimeReport;
      }
    },
    // Inaktivera för demonstrationssyfte
    enabled: false
  });

  // Formatera datum till kort svenska format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Laddar tidrapporteringsdata...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Veckosummering */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="text-sm text-muted-foreground">Denna vecka</div>
                  <div className="text-2xl font-bold">{timeReport.currentWeekHours} tim</div>
                  <div className={`text-sm flex items-center ${timeReport.percentChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {timeReport.percentChange >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 mr-1" />
                    )}
                    {Math.abs(timeReport.percentChange)}% jämfört med förra veckan
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="text-sm text-muted-foreground">Förra veckan</div>
                  <div className="text-2xl font-bold">{timeReport.lastWeekHours} tim</div>
                  <div className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Tidigare veckan
                  </div>
                </div>
              </div>
              
              {/* Senaste tidrapporteringarna */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Senaste rapporterade tid</h3>
                
                <div className="space-y-2">
                  {timeReport.timeEntries.map((entry) => (
                    <div key={entry.id} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{entry.task}</div>
                        <div className="text-xs text-muted-foreground">{entry.user}</div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <Badge variant="outline" className="font-bold">
                          {entry.hours} tim
                        </Badge>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Widget>
  );
}