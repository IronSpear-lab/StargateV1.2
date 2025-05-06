import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

type Position = {
  x: number;
  y: number;
};

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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState<Position>({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);

  // Reset state when URL changes
  useEffect(() => {
    setScale(1);
    setLoading(true);
    setPageNumber(1);
  }, [url]);

  // Handle wheel event for zooming with mouse wheel
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      // Determine zoom direction
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const newScale = Math.max(0.5, Math.min(3, scale + delta));
      
      if (newScale !== scale) {
        setScale(newScale);
      }
    }
  };

  // Add wheel event listener for zooming
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel as any, { passive: false });
      
      return () => {
        container.removeEventListener('wheel', handleWheel as any);
      };
    }
  }, [scale]);

  // Center PDF when it loads, changes page, or scales
  useEffect(() => {
    if (!loading && containerRef.current) {
      setTimeout(() => {
        if (containerRef.current) {
          // Center horizontally and vertically
          containerRef.current.scrollLeft = (containerRef.current.scrollWidth - containerRef.current.clientWidth) / 2;
          containerRef.current.scrollTop = (containerRef.current.scrollHeight - containerRef.current.clientHeight) / 2;
        }
      }, 100);
    }
  }, [loading, pageNumber, scale]);

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

  // Handle dragging to pan the PDF
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
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

  const handleMouseMove = (e: React.MouseEvent) => {
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

  // Add handlers to document to ensure mouseup is caught even outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0" hideCloseButton>
        <DialogHeader className="px-6 pt-4">
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
          className="overflow-auto"
          style={{ 
            height: "75vh",
            background: "#f5f5f5",
            cursor: isDragging ? "grabbing" : "grab",
            position: "relative",
            padding: "2rem",
            overscrollBehavior: "auto",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Loading indicator */}
          {loading && (
            <div className="absolute inset-0 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* PDF wrapper with large margins to ensure it's scrollable in all directions */}
          <div 
            ref={pdfWrapperRef}
            style={{
              width: "200%", // Ensure extra scrollable space horizontally
              height: "200%", // Ensure extra scrollable space vertically
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Actual PDF content with proper CSS transformation */}
            <div 
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                background: "white", 
                transition: "transform 0.1s ease-out",
              }}
            >
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={null}
                error={
                  <div className="flex flex-col items-center justify-center p-10">
                    <p className="text-red-500 mb-2">Kunde inte ladda dokumentet</p>
                    <p className="text-gray-600 text-sm">Kontrollera att det är en giltig PDF-fil</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={null}
                  className={loading ? "hidden" : ""}
                />
              </Document>
            </div>
          </div>
        </div>
        
        {/* Mobile page navigation */}
        <div className="flex justify-between p-4 md:hidden">
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