import { useState, useEffect } from "react";
import { 
  BarChart4, 
  CheckCircle,
  Clock,
  BarChart
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { useProject } from "@/contexts/ProjectContext";

interface Project {
  id: number;
  name: string;
  progress: number;
  deadline: string;
  status: string;
}

export default function ProjectProgressWidget({ title = "Projektprogress" }) {
  const { toast } = useToast();
  const { currentProject } = useProject();
  
  // Exempel på mock-data för projektprogress
  const mockProjects: Project[] = [
    { id: 1, name: "Byggnation Stadshuset", progress: 75, deadline: "2025-08-15", status: "Active" },
    { id: 2, name: "Renovering Kulturhuset", progress: 42, deadline: "2025-07-20", status: "Active" },
    { id: 3, name: "Nybyggnation Skola", progress: 89, deadline: "2025-06-10", status: "Active" },
    { id: 4, name: "Kontorskomplex City", progress: 20, deadline: "2025-12-01", status: "Active" }
  ];

  // I en verklig implementation skulle vi hämta data från ett API
  const { data: projects = mockProjects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects/progress'],
    queryFn: async () => {
      try {
        // Normalt skulle vi hämta data från API:et här
        // const response = await apiRequest('GET', '/api/projects/progress');
        // return await response.json();
        
        // Returnera mock-data för demonstration
        return mockProjects;
      } catch (error) {
        console.error('Error fetching project progress:', error);
        return mockProjects;
      }
    },
    // Inaktivera för demonstrationssyfte
    enabled: false
  });

  // Sortera projekt efter progress (högst först)
  const sortedProjects = [...projects].sort((a, b) => b.progress - a.progress);

  // Få en färg baserat på progress
  const getProgressColor = (progress: number): string => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-yellow-500';
    if (progress < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Formatera datum till svensk format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <BarChart4 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Laddar projektdata...</p>
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Inga projekt hittades</p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedProjects.map((project) => (
                <div key={project.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-sm">{project.name}</div>
                    <div className="text-sm font-medium">{project.progress}%</div>
                  </div>
                  <Progress 
                    value={project.progress} 
                    className="h-2"
                    indicatorClassName={getProgressColor(project.progress)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Deadline: {formatDate(project.deadline)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Status: {project.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Widget>
  );
}