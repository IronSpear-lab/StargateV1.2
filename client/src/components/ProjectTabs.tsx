import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileExplorer } from "./FileExplorer";
import { PDFViewer } from "./PDFViewer";
import { KanbanBoard } from "./KanbanBoard";
import { GanttChart } from "./GanttChart";
import { WikiEditor } from "./WikiEditor";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

export function ProjectTabs() {
  const [activeTab, setActiveTab] = useState("files");
  const [selectedFile, setSelectedFile] = useState<FileNode>({
    id: "file-1",
    name: "Requirements.pdf",
    type: "file"
  });

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
  };

  return (
    <Tabs defaultValue="files" value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-lg shadow-sm mb-6">
      <div className="border-b border-neutral-200">
        <TabsList className="h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="files" 
            className="px-4 py-3 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none"
          >
            File Management
          </TabsTrigger>
          <TabsTrigger 
            value="kanban" 
            className="px-4 py-3 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none"
          >
            Kanban Board
          </TabsTrigger>
          <TabsTrigger 
            value="gantt" 
            className="px-4 py-3 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none"
          >
            Gantt Chart
          </TabsTrigger>
          <TabsTrigger 
            value="wiki" 
            className="px-4 py-3 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:shadow-none rounded-none"
          >
            Wiki
          </TabsTrigger>
        </TabsList>
      </div>
      
      <TabsContent value="files" className="p-4 mt-0">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/4">
            <FileExplorer onFileSelect={handleFileSelect} selectedFileId={selectedFile?.id} />
          </div>
          <div className="lg:w-3/4">
            <PDFViewer fileName={selectedFile?.name || "Document.pdf"} />
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="kanban" className="p-4 mt-0">
        <KanbanBoard />
      </TabsContent>
      
      <TabsContent value="gantt" className="p-4 mt-0">
        <GanttChart />
      </TabsContent>
      
      <TabsContent value="wiki" className="p-4 mt-0">
        <WikiEditor />
      </TabsContent>
    </Tabs>
  );
}
