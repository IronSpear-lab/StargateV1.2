import { useState } from "react";
import { DwgIfcViewer } from "@/components/DwgIfcViewer";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default function DwgIfcViewerPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "w-64" : "w-20"} />
      <div className="flex flex-col flex-1 overflow-x-hidden">
        <Header 
          title="DWG & IFC Viewer" 
          onToggleSidebar={toggleSidebar} 
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 dark:bg-muted/10 pb-10">
          <div className="container mx-auto p-4 md:p-6">
            <DwgIfcViewer />
          </div>
        </main>
      </div>
    </div>
  );
}