import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
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
import NotificationsPage from "@/pages/notifications-page";
import TeamPage from "@/pages/team-page";
import HelpPage from "@/pages/help-page";
import VaultPage from "@/pages/vault-page";
import RitningarPage from "@/pages/ritningar-page";
import DwgIfcViewerPage from "@/pages/dwg-ifc-viewer-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";

function Router() {
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
      <ProtectedRoute path="/planning/kanban" component={KanbanPage} />
      <ProtectedRoute path="/planning/gantt-chart" component={GanttChartPage} />
      <ProtectedRoute path="/wiki" component={WikiPage} />
      <ProtectedRoute path="/time-tracking" component={TimeTrackingPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/help" component={HelpPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/profile" component={SettingsPage} />
      <ProtectedRoute path="/ritningar" component={RitningarPage} />
      <ProtectedRoute path="/vault/files/ritningar" component={RitningarPage} />
      <ProtectedRoute path="/dwg-ifc-viewer" component={DwgIfcViewerPage} />
      <ProtectedRoute path="/3d-viewer" component={DwgIfcViewerPage} />
      <ProtectedRoute path="/vault" component={VaultPage} />
      <ProtectedRoute path="/vault/:section" component={VaultPage} />
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
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
