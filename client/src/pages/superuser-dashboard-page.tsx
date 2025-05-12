import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Widget } from "@/components/dashboard/Widget";
import UserManagementWidget from "@/components/dashboard/widgets/superuser/UserManagementWidget";
import RoleManagementWidget from "@/components/dashboard/widgets/superuser/RoleManagementWidget";
import SystemStatisticsWidget from "@/components/dashboard/widgets/superuser/SystemStatisticsWidget";
import EmailNotificationWidget from "@/components/dashboard/widgets/superuser/EmailNotificationWidget";
import ProjectProgressWidget from "@/components/dashboard/widgets/leader/ProjectProgressWidget";
import TeamPerformanceWidget from "@/components/dashboard/widgets/leader/TeamPerformanceWidget";
import TasksWidget from "@/components/dashboard/widgets/leader/TasksWidget";
import TimeTrackingWidget from "@/components/dashboard/widgets/leader/TimeTrackingWidget";
import FilesWidget from "@/components/dashboard/widgets/leader/FilesWidget";
import { FolderManagementWidget } from "@/components/dashboard/widgets/leader/FolderManagementWidget";
import { TaskHoursWidget } from "@/components/dashboard/widgets/leader/TaskHoursWidget";
import { AiForecastWidget } from "@/components/dashboard/widgets/leader/AiForecastWidget";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SuperuserDashboardPage() {
  const [activeTab, setActiveTab] = useState("system");

  // Hämta användarinformation för att säkerställa att användaren är en superanvändare
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/user');
      return await response.json();
    }
  });

  // Kontrollera om användaren har rätt behörighet
  useEffect(() => {
    if (user && user.role !== 'superuser' && user.role !== 'admin') {
      // Omdirigera eller visa ett meddelande om användaren inte har behörighet
      console.warn("Användaren har inte superuser-behörighet");
    }
  }, [user]);

  if (isLoadingUser) {
    return (
      <div className="container mx-auto p-6">
        <div className="w-full h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Laddar superuser-dashboard...</h2>
            <p className="text-muted-foreground">Vänligen vänta medan vi hämtar din data.</p>
          </div>
        </div>
      </div>
    );
  }

  // Om användaren inte är superuser eller admin, visa ett meddelande
  if (user && user.role !== 'superuser' && user.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <div className="w-full h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Åtkomst nekad</h2>
            <p className="text-muted-foreground">Du har inte behörighet att visa superuser-dashboarden.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Superanvändare Dashboard</h1>
        <p className="text-muted-foreground">
          Hantera systemanvändare, projektöversikt och administrera systemet
        </p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="system">Systemhantering</TabsTrigger>
          <TabsTrigger value="projects">Projektöversikt</TabsTrigger>
          <TabsTrigger value="admin">Administration</TabsTrigger>
        </TabsList>

        {/* System Tab - hantering av användare och systemöversikt */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UserManagementWidget title="Användarhantering" />
            <RoleManagementWidget title="Rollhantering" />
          </div>
          <div className="grid grid-cols-1 gap-6">
            <SystemStatisticsWidget title="Systemstatistik" />
          </div>
        </TabsContent>

        {/* Projects Tab - projektledareverktyg */}
        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectProgressWidget title="Projektprogress" />
            <TeamPerformanceWidget title="Teamprestanda" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TasksWidget title="Uppgifter" />
            <TimeTrackingWidget title="Tidrapportering" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FilesWidget title="Filer" />
            <FolderManagementWidget title="Mapphantering" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaskHoursWidget title="Uppgiftstimmar" projectId={1} />
            <AiForecastWidget title="AI-prognoser" />
          </div>
        </TabsContent>

        {/* Admin Tab - administrativa verktyg */}
        <TabsContent value="admin" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <EmailNotificationWidget title="E-postnotifikationer" />
          </div>
          
          {/* Plats för fler administrativa widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Widget title="Systemlogg">
              <div className="p-4">
                <p className="text-muted-foreground">System- och användaraktivitetsloggar (implementeras senare)</p>
              </div>
            </Widget>
            
            <Widget title="Backuphantering">
              <div className="p-4">
                <p className="text-muted-foreground">Hantering av systemsäkerhetskopior (implementeras senare)</p>
              </div>
            </Widget>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}