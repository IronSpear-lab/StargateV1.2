import * as React from "react";
import { useState, useEffect, useRef, MouseEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function PDFViewerDialog({
  open,
  onOpenChange,
  url,
  title,
}: PDFViewerDialogProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });

  // Reset scale when URL changes
  useEffect(() => {
    setScale(1);
    setLoading(true);
    setPageNumber(1);
  }, [url]);

  const handleZoomIn = () => {
    setScale((prevScale) => Math.min(prevScale + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5));
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const nextPage = () => {
    if (numPages && pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const prevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  // Handle dragging to move PDF
  const handleMouseDown = (e: MouseEvent) => {
    if (containerRef.current) {
      setIsDragging(true);
      setDragStart({ 
        x: e.clientX, 
        y: e.clientY 
      });
      setScrollPosition({ 
        x: containerRef.current.scrollLeft, 
        y: containerRef.current.scrollTop 
      });
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      // Calculate how far the mouse has moved
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Scroll the container by the difference
      containerRef.current.scrollLeft = scrollPosition.x - dx;
      containerRef.current.scrollTop = scrollPosition.y - dy;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    // Make sure to remove event listeners when component unmounts
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            <div className="flex items-center">
              <span className="truncate max-w-md">{title}</span>
              {numPages && (
                <span className="text-sm text-muted-foreground ml-2">
                  Sida {pageNumber} av {numPages}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={prevPage}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextPage}
                disabled={!numPages || pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={url} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <DialogClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div 
          ref={containerRef}
          className="pdf-container overflow-auto"
          style={{ 
            height: "75vh",
            width: "100%", 
            display: "flex", 
            justifyContent: "center",
            background: "#f5f5f5",
            cursor: isDragging ? "grabbing" : "grab"
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {loading && (
            <div className="flex justify-center items-center h-40 w-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            error={
              <div className="flex flex-col items-center justify-center h-40">
                <p className="text-red-500 mb-2">Kunde inte ladda dokumentet</p>
                <p className="text-gray-600 text-sm">Kontrollera att det är en giltig PDF-fil</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              scale={scale}
              loading={null}
              className={loading ? "hidden" : ""}
            />
          </Document>
        </div>
        
        {/* Page navigation buttons for mobile */}
        <div className="flex justify-between mt-4 md:hidden">
          <Button 
            onClick={prevPage} 
            disabled={pageNumber <= 1}
            className="w-1/3"
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Föregående
          </Button>
          
          <div className="flex items-center">
            <span className="text-sm">
              {pageNumber} / {numPages || 1}
            </span>
          </div>
          
          <Button 
            onClick={nextPage} 
            disabled={!numPages || pageNumber >= numPages}
            className="w-1/3"
          >
            Nästa <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}