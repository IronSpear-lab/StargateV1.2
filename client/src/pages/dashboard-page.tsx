import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { ProjectTabs } from "@/components/ProjectTabs";
import { Clock, FileText, Users, CheckSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Project Dashboard" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          {/* Project Statistics */}
          <section className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                icon={<CheckSquare className="h-5 w-5" />}
                iconBgColor="bg-primary-100"
                iconColor="text-primary-600"
                title="Tasks"
                value="24/36"
                progress={67}
              />
              
              <StatCard 
                icon={<Clock className="h-5 w-5" />}
                iconBgColor="bg-warning-100"
                iconColor="text-warning-600"
                title="Time Spent"
                value="127h"
                footerContent={<p className="text-sm text-neutral-500">Last 7 days: <span className="text-success">+12h</span></p>}
              />
              
              <StatCard 
                icon={<FileText className="h-5 w-5" />}
                iconBgColor="bg-success-100"
                iconColor="text-success-600"
                title="Files"
                value="48"
                footerContent={<p className="text-sm text-neutral-500">5 uploaded today</p>}
              />
              
              <StatCard 
                icon={<Users className="h-5 w-5" />}
                iconBgColor="bg-info-100"
                iconColor="text-info-600"
                title="Team Members"
                value="7"
                footerContent={
                  <div className="flex -space-x-2 mt-2">
                    <Avatar className="w-8 h-8 border-2 border-white bg-primary-200">
                      <AvatarFallback className="text-xs font-semibold text-primary-700">JD</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white bg-warning-200">
                      <AvatarFallback className="text-xs font-semibold text-warning-700">AS</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white bg-success-200">
                      <AvatarFallback className="text-xs font-semibold text-success-700">MK</AvatarFallback>
                    </Avatar>
                    <Avatar className="w-8 h-8 border-2 border-white bg-neutral-300">
                      <AvatarFallback className="text-xs font-semibold text-neutral-700">+4</AvatarFallback>
                    </Avatar>
                  </div>
                }
              />
            </div>
          </section>

          {/* Project Tabs */}
          <ProjectTabs />
        </main>
      </div>
    </div>
  );
}
