import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { FileExplorer } from "@/components/FileExplorer";
import { PDFViewer } from "@/components/PDFViewer";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
}

export default function FilesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleFileSelect = (file: FileNode) => {
    // Kontrollera om det är en PDF-fil
    if (file.name.toLowerCase().endsWith('.pdf')) {
      // Använder PDFDialogProvider istället för att sätta valda filen
      const { showPDFDialog } = usePDFDialog();
      showPDFDialog({
        fileId: file.id,
        filename: file.name
      });
      return;
    }
    
    // Hantera andra filtyper som vanligt
    setSelectedFile(file);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="File Management" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/4">
              <FileExplorer 
                onFileSelect={handleFileSelect} 
                selectedFileId={selectedFile?.id}
              />
            </div>
            <div className="lg:w-3/4">
              <PDFViewer 
                isOpen={!!selectedFile}
                onClose={() => setSelectedFile(null)}
                fileData={{
                  filename: selectedFile?.name || "Document.pdf",
                  fileId: selectedFile?.id,
                  version: "1.0",
                  description: "",
                  uploaded: new Date().toISOString(),
                  uploadedBy: ""
                }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
