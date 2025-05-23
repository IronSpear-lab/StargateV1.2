import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { WikiEditor } from "@/components/WikiEditor";

export default function WikiPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Project Wiki" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <WikiEditor />
        </main>
      </div>
    </div>
  );
}
