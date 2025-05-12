import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/contexts/ProjectContext";
import { Document, Page, pdfjs } from "react-pdf";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { configurePdfWorker } from '@/lib/pdf-worker-config';
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  ZoomIn, 
  ZoomOut,
  Download,
  X,
  FileQuestion,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Ställ in PDF.js worker
configurePdfWorker();

// Grundläggande typ för PDF-annotations
export interface PDFAnnotation {
  id: string;
  pdfVersionId?: number;
  projectId?: number | null;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  color: string;
  comment: string;
  status: 'new_comment' | 'action_required' | 'rejected' | 'new_review' | 'other_forum' | 'resolved';
  createdBy: string;
  createdAt: string;
  assignedTo?: string;
  taskId?: string;
  deadline?: string;
}

// Version av en fil
export interface FileVersion {
  id: string;
  versionNumber: number;
  filename: string;
  fileUrl: string;
  description: string;
  uploaded: string;
  uploadedBy: string;
  commentCount?: number;
}

// Props för EnhancedPDFViewer
interface EnhancedPDFViewerProps {
  fileId?: string | number;
  initialUrl?: string;
  filename?: string;
  onClose?: () => void;
  projectId?: number | null;
  useDatabase?: boolean;
  file?: File | null;
  versionId?: number;
  pdfFile?: Blob | null;
  highlightAnnotationId?: number;
  annotationId?: number;
  isDialogMode?: boolean;
}

export default function EnhancedPDFViewer({
  fileId,
  initialUrl,
  filename = "Dokument",
  onClose,
  projectId,
  useDatabase = true,
  file,
  versionId,
  pdfFile,
  highlightAnnotationId,
  annotationId,
  isDialogMode = false
}: EnhancedPDFViewerProps) {
  // States
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialUrl || null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pdfSidebarVisible, setPdfSidebarVisible] = useState<boolean>(true);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Refs
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Funktioner
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };
  
  const onDocumentLoadError = (error: Error) => {
    console.error("Fel vid laddning av PDF:", error);
    setIsLoading(false);
  };
  
  const onRenderSuccess = () => {
    setTimeout(() => {
      setSidebarVisible(true);
    }, 100);
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
  
  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    } else {
      console.warn("onClose är inte en funktion, kan inte stänga PDF-visaren");
    }
  };

  return (
    <div className={`${isDialogMode ? 'h-full' : 'h-screen'} flex flex-col bg-gray-100`}>
      <div className="flex flex-col h-full">
        {/* Header bar */}
        <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClose} 
              className="mr-2"
              title={isDialogMode ? "Stäng" : "Tillbaka (sparar alla osparade kommentarer)"}
            >
              {isDialogMode ? (
                <><X className="h-4 w-4 mr-1" /> Stäng</>
              ) : (
                <><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka</>
              )}
            </Button>
            <h1 className="text-lg font-medium">{filename}</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className="ml-4 bg-gray-100 text-gray-800">
              {numPages ? `Sida ${pageNumber} av ${numPages}` : 'Laddar...'}
            </Badge>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                setPdfSidebarVisible(!pdfSidebarVisible);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setScale(Math.min(scale + 0.1, 2.0));
              }}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setScale(Math.max(scale - 0.1, 0.5));
              }}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* PDF viewer */}
          <div className="flex-1 overflow-auto" ref={pdfContainerRef}>
            {pdfUrl || pdfFile ? (
              <Document
                file={pdfFile || pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
              >
                <div className="flex justify-center">
                  <div 
                    ref={pageContainerRef}
                    style={{ 
                      transform: `scale(${scale})`, 
                      transformOrigin: 'top center',
                      margin: '20px auto'
                    }}
                  >
                    {isLoading ? (
                      <div className="flex justify-center items-center h-[800px] w-[800px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Page
                        pageNumber={pageNumber}
                        width={600}
                        height={800}
                        scale={1}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        onRenderSuccess={onRenderSuccess}
                        canvasRef={pdfCanvasRef}
                        loading={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
                      />
                    )}
                  </div>
                </div>
              </Document>
            ) : (
              <div className="flex flex-col justify-center items-center h-full text-muted-foreground">
                <FileQuestion className="h-16 w-16 mb-4" />
                <p>Ingen PDF att visa</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="border-t bg-white p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Föregående
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!numPages || pageNumber >= numPages}
            >
              Nästa <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(Math.min(3, scale + 0.1))}
              disabled={scale >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (pdfUrl) {
                  const link = document.createElement('a');
                  link.href = pdfUrl;
                  link.download = filename;
                  link.click();
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" /> Ladda ner
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}