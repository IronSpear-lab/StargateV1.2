import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PageHeader } from "@/components/page-header";
import { InviteUserDialog } from "@/components/invitations/InviteUserDialog";
import { InvitationsList } from "@/components/invitations/InvitationsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitationsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Användarinbjudningar" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-900">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                Hantera användarinbjudningar
              </h2>
              <InviteUserDialog />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Card className="shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle>Aktiva inbjudningar</CardTitle>
                </CardHeader>
                <CardContent>
                  <InvitationsList />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}