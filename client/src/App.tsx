import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import FilesPage from "@/pages/files-page";
import TasksPage from "@/pages/tasks-page";
import TimelinePage from "@/pages/timeline-page";
import KanbanPage from "@/pages/kanban-page";
import WikiPage from "@/pages/wiki-page";
import SettingsPage from "@/pages/settings-page";
import ProjectsPage from "@/pages/projects-page";
import ProjectDetailPage from "@/pages/project-detail-page";
import GanttPage from "@/pages/gantt-page";
import AnalyticsPage from "@/pages/analytics-page";
import TimeTrackingPage from "@/pages/time-tracking-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/projects" component={ProjectsPage} />
      <ProtectedRoute path="/projects/:id" component={ProjectDetailPage} />
      <ProtectedRoute path="/files" component={FilesPage} />
      <ProtectedRoute path="/tasks" component={TasksPage} />
      <ProtectedRoute path="/timeline" component={TimelinePage} />
      <ProtectedRoute path="/gantt" component={GanttPage} />
      <ProtectedRoute path="/kanban" component={KanbanPage} />
      <ProtectedRoute path="/wiki" component={WikiPage} />
      <ProtectedRoute path="/time-tracking" component={TimeTrackingPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
