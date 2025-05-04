import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Share, 
  MoreVertical, 
  ArrowLeft, 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Pen, 
  Highlighter, 
  MessageSquare,
  FileQuestion,
  Loader2
} from "lucide-react";
import { CommentList } from "./CommentList";
import { Separator } from "@/components/ui/separator";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// We need to provide the PDF.js worker explicitly
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFViewerProps {
  fileName: string;
  fileId?: string | number;
  totalPages?: number;
}

export function PDFViewer({ fileName, fileId, totalPages: initialTotalPages = 1 }: PDFViewerProps) {
  // Generate URL to the file content
  const pdfUrl = fileId ? `/api/files/${fileId}/content` : null;
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [numPages, setNumPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Set initial loading state when PDF URL changes
  useEffect(() => {
    if (pdfUrl) {
      setIsLoading(true);
      setError(null);
      console.log("Loading PDF from URL:", pdfUrl);
      
      // Try to pre-fetch the PDF file to ensure it exists
      fetch(pdfUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
          }
          // No need to process the response here, just checking if it's available
        })
        .catch(err => {
          console.error("Error pre-fetching PDF:", err);
          setError(err);
          setIsLoading(false);
        });
    }
  }, [pdfUrl]);

  const increasePage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const decreasePage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const increaseZoom = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const decreaseZoom = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
    console.log(`Document loaded successfully with ${numPages} pages`);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setIsLoading(false);
    setError(error);
  }

  return (
    <Card className="shadow-none border border-neutral-200">
      <CardHeader className="border-b border-neutral-200 p-3 flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">{fileName}</CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4 text-neutral-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share className="h-4 w-4 text-neutral-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      </CardHeader>
      
      <div className="p-2 flex space-x-2 border-b border-neutral-200 bg-neutral-50">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={decreasePage} disabled={currentPage === 1}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={increasePage} disabled={currentPage === numPages}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <span className="text-sm flex items-center">Page {currentPage} of {numPages}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={increaseZoom}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={decreaseZoom}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Maximize className="h-4 w-4" />
        </Button>
        <div className="flex-1"></div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Highlighter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 bg-neutral-100 h-[500px] flex items-center justify-center overflow-auto">
        {!pdfUrl ? (
          <div className="text-center">
            <FileQuestion className="h-16 w-16 mx-auto text-neutral-400 mb-4" />
            <p className="text-neutral-500">No file selected or preview not available</p>
          </div>
        ) : (
          <div className="bg-white shadow-md w-full max-w-2xl h-full flex flex-col items-center justify-center p-2 relative overflow-auto">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10">
                <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-2" />
                <p className="text-sm text-neutral-500">Loading PDF...</p>
              </div>
            )}
            
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                <div className="text-center p-4">
                  <p className="text-sm text-red-500 mb-2">Failed to load PDF document</p>
                  <p className="text-xs text-neutral-500">Please check if the file exists and is a valid PDF</p>
                  <p className="text-xs text-neutral-400 mt-2">Error: {error.message}</p>
                </div>
              </div>
            )}

            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="w-full h-full"
            >
              <Page 
                key={`page_${currentPage}`}
                pageNumber={currentPage} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
                scale={zoom / 100}
                className="page-container mx-auto"
              />
            </Document>
            
            {/* Example annotation - this would be dynamic in a real implementation */}
            <div className="absolute bottom-20 right-20 bg-yellow-100 p-3 rounded-md shadow-md" style={{ width: "200px" }}>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700 text-sm font-medium">
                  AS
                </div>
                <div>
                  <p className="text-sm font-medium">Alex Smith</p>
                  <p className="text-xs text-neutral-600">Please review this section</p>
                  <p className="text-xs text-neutral-500 mt-1">Yesterday at 3:45 PM</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-0">
        <CommentList />
      </CardContent>
    </Card>
  );
}