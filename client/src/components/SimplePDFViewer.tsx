import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  XSquare,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  History,
  MessageCircle
} from "lucide-react";

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileUrl?: string;
  fileData?: {
    filename: string;
    version: string;
    description: string;
    uploaded: string;
    uploadedBy: string;
  };
}

export function SimplePDFViewer({ isOpen, onClose, file, fileUrl, fileData }: PDFViewerProps) {
  const [activeTab, setActiveTab] = useState<string>("comments");
  
  // PDF Viewer URL (direct file or constructed URL)
  const pdfSrc = file ? URL.createObjectURL(file) : fileUrl;

  // Handle PDF download
  const handleDownload = () => {
    if (file) {
      // Create download for File object
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (fileUrl) {
      // Create download for URL
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileData?.filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 bg-white">
        <div className="flex flex-col h-full">
          {/* Modern header */}
          <DialogHeader className="px-4 py-2 flex justify-between items-center flex-row border-b">
            <div className="flex items-center">
              <DialogTitle className="text-lg font-semibold">
                {fileData?.filename || (file?.name || "PDF Dokument")}
              </DialogTitle>
              <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                v{fileData?.version || "1"}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 h-8">
                <History className="h-4 w-4 text-gray-500" />
                <span>Historik</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs flex items-center gap-1 h-8"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 text-gray-500" />
                <span>Ladda ner</span>
              </Button>
              
              <Tabs 
                defaultValue="comments" 
                value={activeTab} 
                onValueChange={setActiveTab} 
                className="border rounded-md"
              >
                <TabsList className="bg-transparent border-0">
                  <TabsTrigger value="info" className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none px-4">
                    Filinfo
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none px-4">
                    Kommentarer
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <XSquare className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {/* Main content */}
          <div className="flex flex-1 overflow-hidden">
            {/* PDF Viewer area - Simple Preview with Download */}
            <div className="flex-1 relative overflow-auto bg-gray-100 flex justify-center items-center">
              <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
                <div className="mx-auto w-16 h-16 bg-blue-50 flex items-center justify-center rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                
                <h3 className="text-lg font-semibold mb-1">
                  {fileData?.filename || file?.name || "PDF Dokument"}
                </h3>
                
                <p className="text-sm text-gray-500 mb-1">
                  Version: {fileData?.version || "1"}
                </p>
                
                <p className="text-sm text-gray-500 mb-6">
                  {fileData?.description || "Ingen beskrivning"}
                </p>
                
                <p className="text-sm text-gray-600 mb-6">
                  PDF-filen kan inte visas direkt i webbläsaren på grund av säkerhetsinställningar, 
                  men du kan ladda ner den för att visa den i din egen PDF-läsare.
                </p>
                
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Ladda ner PDF
                </Button>
              </div>
            </div>
            
            {/* Right sidebar: Comments or Info */}
            <div className="w-80 border-l">
              <Tabs value={activeTab} className="h-full flex flex-col">
                <TabsContent value="info" className="flex-1 p-4 space-y-4 m-0 data-[state=inactive]:hidden">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Filnamn</h3>
                    <p className="text-sm text-gray-700">{fileData?.filename || file?.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Version</h3>
                    <p className="text-sm text-gray-700">{fileData?.version || "1"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Beskrivning</h3>
                    <p className="text-sm text-gray-700">{fileData?.description || "Ingen beskrivning"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Uppladdad</h3>
                    <p className="text-sm text-gray-700">{fileData?.uploaded || "Okänt datum"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Uppladdad av</h3>
                    <p className="text-sm text-gray-700">{fileData?.uploadedBy || "Okänd användare"}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="comments" className="flex-1 m-0 data-[state=inactive]:hidden flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-medium">Kommentarer (0)</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Ny kommentar
                    </Button>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
                    <MessageCircle className="h-12 w-12 mb-2 opacity-20" />
                    <p className="text-sm">Inga kommentarer än</p>
                    <p className="text-xs">Klicka på "Ny kommentar" för att lägga till en kommentar</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}