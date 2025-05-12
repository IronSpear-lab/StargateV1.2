import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { FileExplorer } from "@/components/FileExplorer";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileIcon, ImageIcon, FileTextIcon } from "lucide-react";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  uploadedBy?: string;
}

export default function FilesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const { showPDFDialog } = usePDFDialog();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleFileSelect = (file: FileNode) => {
    // Kontrollera om det är en PDF-fil
    if (file.name.toLowerCase().endsWith('.pdf')) {
      // Använder PDFDialogProvider för att visa PDF-filen i dialog
      showPDFDialog({
        fileId: file.id,
        filename: file.name
      });
      return;
    }
    
    // Hantera andra filtyper genom att visa deras information
    setSelectedFile(file);
  };

  // Funktion för att bestämma vilken ikon som ska visas baserat på filtyp
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'gif' || extension === 'svg') {
      return <ImageIcon className="h-12 w-12 text-blue-500" />;
    } else if (extension === 'txt' || extension === 'doc' || extension === 'docx') {
      return <FileTextIcon className="h-12 w-12 text-green-500" />;
    } else {
      return <FileIcon className="h-12 w-12 text-gray-500" />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Filhantering" onToggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3">
              <FileExplorer 
                onFileSelect={handleFileSelect} 
                selectedFileId={selectedFile?.id}
              />
            </div>
            <div className="lg:w-2/3">
              {selectedFile ? (
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      {getFileIcon(selectedFile.name)}
                      {selectedFile.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-md font-medium mb-1">Filtyp</h3>
                        <p className="text-muted-foreground">
                          {selectedFile.name.split('.').pop()?.toUpperCase()}
                        </p>
                      </div>
                      {selectedFile.description && (
                        <div>
                          <h3 className="text-md font-medium mb-1">Beskrivning</h3>
                          <p className="text-muted-foreground">
                            {selectedFile.description}
                          </p>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        {selectedFile.createdAt && (
                          <div>
                            <h3 className="text-md font-medium mb-1">Uppladdat</h3>
                            <p className="text-muted-foreground">
                              {new Date(selectedFile.createdAt).toLocaleDateString('sv-SE')}
                            </p>
                          </div>
                        )}
                        {selectedFile.uploadedBy && (
                          <div>
                            <h3 className="text-md font-medium mb-1">Uppladdat av</h3>
                            <p className="text-muted-foreground">
                              {selectedFile.uploadedBy}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground">
                          För att ladda ner denna fil, högerklicka på den i fillistan och välj "Ladda ner"
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="pt-6 text-center">
                    <FileIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">
                      Välj en fil från listan för att visa information
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      PDF-filer öppnas automatiskt i en dialogruta
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
