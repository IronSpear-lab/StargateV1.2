import { PageHeader } from "@/components/page-header";
import { InviteUserDialog } from "@/components/invitations/InviteUserDialog";
import { InvitationsList } from "@/components/invitations/InvitationsList";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function InvitationsPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  // Only admin, superuser, and project leaders can manage invitations
  const canManageInvitations = ["admin", "superuser", "project_leader"].includes(user.role);

  if (!canManageInvitations) {
    setLocation("/");
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <PageHeader title="Inbjudningar" />
        <InviteUserDialog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InvitationsList />
        </div>
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Information om inbjudningar
            </h2>
            <div className="space-y-4 text-gray-600 dark:text-gray-400">
              <p>
                Här kan du hantera inbjudningar till nya användare i systemet. 
                Inbjudningarna går ut efter 7 dagar om de inte accepteras.
              </p>
              <p>
                För att bjuda in en ny användare, klicka på knappen "Bjud in användare" och 
                fyll i användarens e-postadress och önskad roll.
              </p>
              <p>
                Efter att inbjudan har skapats kan du dela inbjudningslänken med användaren 
                genom att klicka på "Hämta länk" i menyn för respektive inbjudan.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Användarroller:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li><span className="font-medium">Administratör</span> - Fullständig åtkomst till alla funktioner</li>
                  <li><span className="font-medium">Superanvändare</span> - Ökad åtkomst över flera projekt</li>
                  <li><span className="font-medium">Projektledare</span> - Kan hantera projekt och dess medlemmar</li>
                  <li><span className="font-medium">Användare</span> - Grundläggande åtkomst till systemet</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}