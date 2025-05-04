import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Maximize, Minimize, ZoomIn, ZoomOut, Rotate3D } from "lucide-react";
import { Loader2 } from "lucide-react";

// Konfigurera worker för react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

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

export function PDFViewer({ isOpen, onClose, file, fileUrl, fileData }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(fileUrl);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Om en File-objekt skickas in, skapa en URL för den
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [file, fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber >= 1 && numPages && newPageNumber <= numPages) {
        return newPageNumber;
      }
      return prevPageNumber;
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileData?.filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-70" 
        onClick={onClose}
      />
      
      <div 
        className={`relative bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden
                   ${isFullscreen ? 'w-full h-full rounded-none' : 'w-[90%] max-w-5xl h-[90%]'}`}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold mr-4">{fileData?.filename || "PDF Document"}</h2>
            {fileData && (
              <div className="text-sm text-gray-500">
                Version: {fileData.version} | Uppladdad: {fileData.uploaded} | Av: {fileData.uploadedBy}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="icon"
              onClick={zoomOut}
              className="h-8 w-8"
            >
              <ZoomOut size={16} />
            </Button>
            <div className="w-12 text-center text-sm">
              {Math.round(scale * 100)}%
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={zoomIn}
              className="h-8 w-8"
            >
              <ZoomIn size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={rotate}
              className="h-8 w-8"
            >
              <Rotate3D size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8"
            >
              <Download size={16} />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary-600 mb-4" />
                  <p className="text-gray-600">Laddar dokument...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center">
                  <p className="text-red-500 mb-2">Kunde inte ladda dokumentet</p>
                  <p className="text-gray-600 text-sm">Kontrollera att det är en giltig PDF-fil</p>
                </div>
              }
              className="pdfDocument"
            >
              <Page
                pageNumber={pageNumber}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                scale={scale}
                rotate={rotation}
                loading={
                  <div className="h-[500px] w-[400px] bg-gray-100 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                }
                className="pdfPage shadow-lg"
              />
            </Document>
          ) : (
            <div className="text-gray-500">Ingen PDF vald</div>
          )}
        </div>
        
        {numPages && numPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <Button
              variant="outline"
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="h-8"
            >
              <ChevronLeft size={16} className="mr-1" />
              Föregående
            </Button>
            
            <div className="text-sm text-gray-600">
              Sida {pageNumber} av {numPages}
            </div>
            
            <Button
              variant="outline"
              onClick={nextPage}
              disabled={Boolean(numPages && pageNumber >= numPages)}
              className="h-8"
            >
              Nästa
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}