import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XSquare, ZoomIn, ZoomOut, Download, AlertCircle } from "lucide-react";

interface SimplePDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileUrl?: string;
  fileData?: {
    filename: string;
    description?: string;
    uploaded?: string;
    uploadedBy?: string;
  };
}

export function SimplePDFViewer({ isOpen, onClose, file, fileUrl, fileData }: SimplePDFViewerProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [error, setError] = useState<boolean>(false);

  const zoomIn = () => setZoom(prev => Math.min(2.0, prev + 0.1));
  const zoomOut = () => setZoom(prev => Math.max(0.5, prev - 0.1));

  const downloadPDF = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileData?.filename || 'document.pdf';
      link.target = '_blank';
      link.click();
    } else if (file) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData?.filename || file.name || 'document.pdf';
      link.target = '_blank';
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-4 py-2 flex justify-between items-center flex-row border-b">
            <DialogTitle className="text-lg">
              {fileData?.filename || file?.name || 'PDF Viewer'}
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="text-sm px-2">
                {Math.round(zoom * 100)}%
              </div>
              
              <Button variant="ghost" size="icon" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={downloadPDF}>
                <Download className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={onClose}>
                <XSquare className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto bg-slate-100 p-4 flex justify-center items-start">
            {error ? (
              <div className="bg-amber-50 p-4 rounded-md border border-amber-200 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">Kunde inte visa PDF-dokumentet</p>
                  <p className="text-sm">Försök ladda ned dokumentet och öppna det i din PDF-läsare.</p>
                </div>
              </div>
            ) : (
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                {file && (
                  <iframe 
                    src={URL.createObjectURL(file)}
                    className="w-[750px] h-[800px] bg-white shadow-md border"
                    title={file.name || "PDF Viewer"}
                    onError={() => setError(true)}
                  />
                )}
                {!file && fileUrl && (
                  <iframe 
                    src={fileUrl}
                    className="w-[750px] h-[800px] bg-white shadow-md border"
                    title={fileData?.filename || "PDF Viewer"}
                    onError={() => setError(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}