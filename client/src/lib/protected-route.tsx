import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import NotFound from "@/pages/not-found";

// Paths som kräver project_leader eller admin roll
const LEADER_ONLY_PATHS = [
  "/project-leader-dashboard"
];

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: {
  path: string;
  component: () => React.JSX.Element;
  requiredRole?: string;
}) {
  const { user, isLoading } = useAuth();

  const hasAccess = () => {
    // Om användaren inte är inloggad
    if (!user) return false;
    
    // Om sidan kräver project_leader roll
    if (LEADER_ONLY_PATHS.includes(path)) {
      return user.role === 'project_leader' || user.role === 'admin';
    }
    
    // Om specifik roll krävs
    if (requiredRole) {
      return user.role === requiredRole || user.role === 'admin';
    }
    
    // Annars är användaren inloggad och har tillgång
    return true;
  };

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      ) : !user ? (
        <Redirect to="/auth" />
      ) : !hasAccess() ? (
        <NotFound />
      ) : (
        <Component />
      )}
    </Route>
  );
}
