import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page-new";
import DashboardPage from "@/pages/dashboard-page";
import ProjectLeaderDashboardPage from "@/pages/project-leader-dashboard-page";
import FilesPage from "@/pages/files-page";
import TasksPage from "@/pages/tasks-page";
import TimelinePage from "@/pages/timeline-page";
import KanbanPage from "@/pages/kanban-page";
import WikiPage from "@/pages/wiki-page";
import SettingsPage from "@/pages/settings-page";
import ProjectsPage from "@/pages/projects-page";
import ProjectDetailPage from "@/pages/project-detail-page";
import GanttPage from "@/pages/gantt-page";
import GanttChartPage from "@/pages/gantt-chart-page";
import AnalyticsPage from "@/pages/analytics-page";
import TimeTrackingPage from "@/pages/time-tracking-page-fixed";
import MonthCalendarPage from "@/pages/month-calendar-page";
import NotificationsPage from "@/pages/notifications-page";
import TeamPage from "@/pages/team-page";
import HelpPage from "@/pages/help-page";
import VaultPage from "@/pages/vault-page";
import VaultCommentsPage from "@/pages/vault-comments-page";
import RitningarPage from "@/pages/ritningar-page";
import FolderPage from "@/pages/folder-page";
import DwgIfcViewerPage from "@/pages/dwg-ifc-viewer-page";
import SimpleViewerPage from "@/pages/simple-viewer-page";
import MessagesPage from "@/pages/messages-page";
import PDFViewerPage from "@/pages/pdf-viewer-page";
import InvitationsPage from "@/pages/invitations-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { ProjectProvider } from "./contexts/ProjectContext";
import { PDFDialogProvider } from "@/components/PDFDialogProvider";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";
import { useEffect, useState } from "react";
import { configurePdfWorker } from "@/lib/pdf-worker-config";

// Ensure PDF.js worker is configured at application start
configurePdfWorker();

function Router() {
  // Läs användarskapade mappar från localStorage
  const [userFolders, setUserFolders] = useState<string[]>([]);
  
  useEffect(() => {
    // Försök hämta användarens skapade mappar från localStorage
    const storedFolders = localStorage.getItem('user_created_folders');
    if (storedFolders) {
      try {
        // Tolka JSON-strängen och extrahera mappnamn
        const folders = JSON.parse(storedFolders);
        const folderNames = folders
          .filter((folder: any) => folder && folder.label) // Filtrera bort ogiltiga mappar
          .map((folder: any) => folder.label); // Extrahera mappnamn
        
        setUserFolders(folderNames);
      } catch (error) {
        console.error('Fel vid inläsning av användarens mappar:', error);
        setUserFolders([]);
      }
    }
  }, []);

  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/project-leader-dashboard" component={ProjectLeaderDashboardPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/:id" component={ProjectDetailPage} />
      <ProtectedRoute path="/files" component={FilesPage} />
      <ProtectedRoute path="/tasks" component={TasksPage} />
      <ProtectedRoute path="/timeline" component={TimelinePage} />
      <ProtectedRoute path="/gantt" component={GanttPage} />
      <ProtectedRoute path="/kanban" component={KanbanPage} />
      <ProtectedRoute path="/kanban/:projectId" component={KanbanPage} />
      <ProtectedRoute path="/planning/kanban" component={KanbanPage} />
      <ProtectedRoute path="/planning/gantt-chart" component={GanttChartPage} />
      <ProtectedRoute path="/gantt-chart/:projectId" component={GanttChartPage} />
      <ProtectedRoute path="/wiki" component={WikiPage} />
      <ProtectedRoute path="/time-tracking" component={TimeTrackingPage} />
      <ProtectedRoute path="/time-tracking/:projectId" component={TimeTrackingPage} />
      <ProtectedRoute path="/month-calendar" component={MonthCalendarPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/help" component={HelpPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/profile" component={SettingsPage} />
      <ProtectedRoute path="/invitations" component={InvitationsPage} />
      <ProtectedRoute path="/ritningar" component={RitningarPage} />
      <ProtectedRoute path="/vault/files/ritningar" component={RitningarPage} />
      <ProtectedRoute path="/dwg-ifc-viewer" component={DwgIfcViewerPage} />
      <ProtectedRoute path="/3d-viewer" component={DwgIfcViewerPage} />
      <ProtectedRoute path="/3d-viewer/design" component={DwgIfcViewerPage} />
      <ProtectedRoute path="/3d-viewer/byggarbetsplats" component={SimpleViewerPage} />
      <ProtectedRoute path="/simple-viewer" component={SimpleViewerPage} />
      <ProtectedRoute path="/vault" component={VaultPage} />
      <ProtectedRoute path="/vault/comments" component={VaultCommentsPage} />
      <ProtectedRoute path="/vault/:section" component={VaultPage} />
      <ProtectedRoute path="/vault/files/:folderName" component={FolderPage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/communication/messages" component={MessagesPage} />
      <ProtectedRoute path="/files/pdf/:versionId" component={() => {
          // Create a component to intercept PDF navigation
          const PdfInterceptor = () => {
            const { showPDFDialog } = usePDFDialog();
            const params = window.location.pathname.split('/');
            const versionId = params[params.length - 1] ? Number(params[params.length - 1]) : undefined;
            
            // På komponentmontering, visa dialogen och gå tillbaka
            useEffect(() => {
              if (versionId) {
                console.log(`Öppnar PDF version ${versionId} i dialog istället för separat sida`);
                showPDFDialog({
                  versionId: versionId
                });
                // Återgå till föregående sida efter en kort fördröjning
                setTimeout(() => {
                  window.history.back();
                }, 300);
              }
            }, [versionId]);
            
            return null; // Visa ingenting medan omdirigeringen sker
          };
          
          return <PdfInterceptor />;
        }} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProjectProvider>
            <PDFDialogProvider>
              <Router />
              <Toaster />
            </PDFDialogProvider>
          </ProjectProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
