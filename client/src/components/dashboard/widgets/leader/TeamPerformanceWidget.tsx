import { useState } from "react";
import { 
  Users,
  Star,
  TrendingUp,
  Clock,
  BarChart,
  CircleUser
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger, 
} from "@/components/ui/tooltip";

interface TeamMember {
  id: number;
  name: string;
  avatar?: string;
  role: string;
  tasksCompleted: number;
  productivity: number;
  hoursLogged: number;
}

export default function TeamPerformanceWidget({ title = "Teamprestanda" }) {
  // Exempel på mock-data för teamprestanda
  const mockTeam: TeamMember[] = [
    { id: 1, name: "Anna Andersson", role: "Projektarkitekt", tasksCompleted: 14, productivity: 92, hoursLogged: 38 },
    { id: 2, name: "Erik Eriksson", role: "Konstruktör", tasksCompleted: 9, productivity: 84, hoursLogged: 40 },
    { id: 3, name: "Maria Svensson", role: "Projektledare", tasksCompleted: 22, productivity: 95, hoursLogged: 45 },
    { id: 4, name: "Johan Lindgren", role: "Eltekniker", tasksCompleted: 12, productivity: 88, hoursLogged: 36 },
  ];

  // I en verklig implementation skulle vi hämta data från ett API
  const { data: teamMembers = mockTeam, isLoading } = useQuery<TeamMember[]>({
    queryKey: ['/api/team/performance'],
    queryFn: async () => {
      try {
        // Normalt skulle vi hämta data från API:et här
        // const response = await apiRequest('GET', '/api/team/performance');
        // return await response.json();
        
        // Returnera mock-data för demonstration
        return mockTeam;
      } catch (error) {
        console.error('Error fetching team performance:', error);
        return mockTeam;
      }
    },
    // Inaktivera för demonstrationssyfte
    enabled: false
  });

  // Sortera teammedlemmar efter produktivitet (högst först)
  const sortedTeam = [...teamMembers].sort((a, b) => b.productivity - a.productivity);

  // Få en färg baserat på produktivitet
  const getProductivityColor = (productivity: number): string => {
    if (productivity < 60) return 'bg-red-500';
    if (productivity < 75) return 'bg-yellow-500';
    if (productivity < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Generera initialer från namn
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Laddar teamdata...</p>
            </div>
          ) : sortedTeam.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Inga teammedlemmar hittades</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedTeam.map((member) => (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        {member.avatar ? (
                          <AvatarImage src={member.avatar} alt={member.name} />
                        ) : (
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium flex items-center">
                      {member.productivity}%
                      <Star className="h-3 w-3 ml-1 text-yellow-500" />
                    </div>
                  </div>
                  
                  <Progress 
                    value={member.productivity} 
                    className="h-2"
                    indicatorClassName={getProductivityColor(member.productivity)}
                  />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <TrendingUp className="h-3 w-3" />
                            <span>{member.tasksCompleted} uppgifter</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Avslutade uppgifter denna månad</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Clock className="h-3 w-3" />
                            <span>{member.hoursLogged} timmar</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Loggade timmar denna vecka</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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