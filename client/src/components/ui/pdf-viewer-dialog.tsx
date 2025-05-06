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
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Check,
  AlertCircle,
  Upload,
  FileText
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { storeFileForReuse, getStoredFileById } from "@/lib/file-utils";
import { 
  getConsistentFileId, 
  getLatestPdfVersion, 
  addPdfViewerAnimations,
  centerElementInView 
} from "@/lib/pdf-utils";

// Configure worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Typer för markeringar och kommentarer
export interface PDFAnnotation {
  id: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  color: string;
  comment: string;
  status: 'open' | 'resolved' | 'action_required' | 'reviewing';
  createdBy: string;
  createdAt: string;
}

// Typ för filversioner
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

// Färgkodning baserat på status
const statusColors = {
  open: '#727cf5',        // Blå
  resolved: '#0acf97',    // Grön
  action_required: '#fa5c7c',  // Röd
  reviewing: '#ffc35a',   // Gul
};

interface PDFViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  file?: File | null;
  fileData?: {
    filename: string;
    version: string;
    description: string;
    uploaded: string;
    uploadedBy: string;
    fileId?: string;
  };
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
  file,
  fileData
}: PDFViewerDialogProps) {
  const { user } = useAuth();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState<Position>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  
  // Markerings- och kommentarsfunktionalitet
  const [isMarking, setIsMarking] = useState(false);
  const [markingStart, setMarkingStart] = useState<{ x: number; y: number } | null>(null);
  const [markingEnd, setMarkingEnd] = useState<{ x: number; y: number } | null>(null);
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<PDFAnnotation | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [tempAnnotation, setTempAnnotation] = useState<Partial<PDFAnnotation> | null>(null);
  
  // Versionshantering
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>(undefined);
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);
  const [showUploadVersionDialog, setShowUploadVersionDialog] = useState(false);
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(url);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfWrapperRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Funktioner för annotationer
  const startMarking = (e: React.MouseEvent) => {
    if (!isMarking || !pageRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pageRect = pageRef.current.getBoundingClientRect();
    const x = (e.clientX - pageRect.left) / scale;
    const y = (e.clientY - pageRect.top) / scale;
    
    setMarkingStart({ x, y });
  };

  const updateMarking = (e: React.MouseEvent) => {
    if (!isMarking || !markingStart || !pageRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pageRect = pageRef.current.getBoundingClientRect();
    const x = (e.clientX - pageRect.left) / scale;
    const y = (e.clientY - pageRect.top) / scale;
    
    setMarkingEnd({ x, y });
    
    // Temporär markering medan användaren drar
    setTempAnnotation({
      rect: {
        x: Math.min(markingStart.x, x),
        y: Math.min(markingStart.y, y),
        width: Math.abs(x - markingStart.x),
        height: Math.abs(y - markingStart.y),
        pageNumber: pageNumber,
      },
      color: statusColors.open,
    });
  };

  const completeMarking = (e: React.MouseEvent) => {
    if (!isMarking || !markingStart || !markingEnd || !pageRef.current || !user) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Skapa en ny annotation
    const newAnnotation: PDFAnnotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rect: {
        x: Math.min(markingStart.x, markingEnd.x),
        y: Math.min(markingStart.y, markingEnd.y),
        width: Math.abs(markingEnd.x - markingStart.x),
        height: Math.abs(markingEnd.y - markingStart.y),
        pageNumber: pageNumber,
      },
      color: statusColors.open,
      comment: '',
      status: 'open',
      createdBy: user.username,
      createdAt: new Date().toISOString(),
    };
    
    if (
      newAnnotation.rect.width > 10 / scale && 
      newAnnotation.rect.height > 10 / scale
    ) {
      // Lägg till den nya markeringen och visa kommentarsformuläret
      setAnnotations([...annotations, newAnnotation]);
      setActiveAnnotation(newAnnotation);
      setIsAddingComment(true);
      
      // Spara alla annotationer till localStorage
      if (fileData?.fileId) {
        localStorage.setItem(
          `pdf_annotations_${fileData.fileId}`, 
          JSON.stringify([...annotations, newAnnotation])
        );
      }
    }
    
    // Återställ markeringstillstånd
    setIsMarking(false);
    setMarkingStart(null);
    setMarkingEnd(null);
    setTempAnnotation(null);
  };

  // Funktion för att lägga till eller uppdatera en kommentar
  const handleSaveComment = () => {
    if (!activeAnnotation || !fileData?.fileId) return;
    
    // Uppdatera kommentaren för aktiv annotation
    const updatedAnnotations = annotations.map(annotation => 
      annotation.id === activeAnnotation.id 
        ? { ...annotation, comment: newComment } 
        : annotation
    );
    
    setAnnotations(updatedAnnotations);
    setIsAddingComment(false);
    
    // Spara till localStorage
    localStorage.setItem(
      `pdf_annotations_${fileData.fileId}`, 
      JSON.stringify(updatedAnnotations)
    );
    
    // Uppdatera kommentarsräknaren för aktiv filversion
    if (activeVersionId) {
      const updatedVersions = fileVersions.map(version => {
        if (version.id === activeVersionId) {
          const commentCount = updatedAnnotations.filter(a => a.comment.trim() !== '').length;
          return { ...version, commentCount };
        }
        return version;
      });
      
      setFileVersions(updatedVersions);
      localStorage.setItem(
        `pdf_versions_${fileData.fileId}`, 
        JSON.stringify(updatedVersions)
      );
    }
  };

  // Funktion för att ändra status på en annotation
  const handleStatusChange = (annotationId: string, status: 'open' | 'resolved' | 'action_required' | 'reviewing') => {
    if (!fileData?.fileId) return;
    
    const updatedAnnotations = annotations.map(annotation => 
      annotation.id === annotationId 
        ? { ...annotation, status, color: statusColors[status] } 
        : annotation
    );
    
    setAnnotations(updatedAnnotations);
    
    // Spara till localStorage
    localStorage.setItem(
      `pdf_annotations_${fileData.fileId}`, 
      JSON.stringify(updatedAnnotations)
    );
  };

  // Funktion för att zooma till en specifik annotation
  const zoomToAnnotation = (annotation: PDFAnnotation) => {
    // Kontrollera om annotationen är på en annan sida, byt i så fall
    if (annotation.rect.pageNumber !== pageNumber) {
      setPageNumber(annotation.rect.pageNumber);
    }
    
    // Sätt aktiv annotation
    setActiveAnnotation(annotation);
    
    // Scroller till markeringen när sidan har laddats
    setTimeout(() => {
      if (!containerRef.current || !pdfWrapperRef.current) return;
      
      // Beräkna position i dokumentet
      const pageWidth = 595.2; // Standard PDF width in points
      const pageHeight = 841.8; // Standard PDF height in points
      
      // Dokumentets mitt
      const centerX = pdfWrapperRef.current.clientWidth / 2;
      const centerY = pdfWrapperRef.current.clientHeight / 2;
      
      // Markeringens position
      const annotationCenterX = (annotation.rect.x + annotation.rect.width / 2) * scale;
      const annotationCenterY = (annotation.rect.y + annotation.rect.height / 2) * scale;
      
      // Scroller till markeringen
      containerRef.current.scrollLeft = centerX + annotationCenterX - containerRef.current.clientWidth / 2;
      containerRef.current.scrollTop = centerY + annotationCenterY - containerRef.current.clientHeight / 2;
    }, 100);
  };

  // Funktion för att lägga till en ny version
  const handleAddVersion = () => {
    if (!selectedVersionFile || !fileData?.fileId || !user) return;
    
    // Skapa en fil-URL för den nya versionen
    const fileUrl = URL.createObjectURL(selectedVersionFile);
    
    // Spara filen för återanvändning
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    storeFileForReuse(selectedVersionFile, fileId);
    
    // Skapa ny versionsinfo
    const newVersion: FileVersion = {
      id: fileId,
      versionNumber: fileVersions.length + 1,
      filename: selectedVersionFile.name,
      fileUrl,
      description: newVersionDescription || `Version ${fileVersions.length + 1}`,
      uploaded: new Date().toISOString(),
      uploadedBy: user.username,
      commentCount: 0
    };
    
    // Uppdatera versionslistan
    const updatedVersions = [...fileVersions, newVersion];
    setFileVersions(updatedVersions);
    setActiveVersionId(newVersion.id);
    setPdfUrl(fileUrl);
    
    // Spara till localStorage
    localStorage.setItem(
      `pdf_versions_${fileData.fileId}`, 
      JSON.stringify(updatedVersions)
    );
    
    // Återställ formuläret
    setSelectedVersionFile(null);
    setNewVersionDescription('');
    setShowUploadVersionDialog(false);
  };

  // Handle dragging to pan the PDF
  const handleMouseDown = (e: React.MouseEvent) => {
    // Om vi är i markeringsläge, hantera markering istället
    if (isMarking) {
      startMarking(e);
      return;
    }
    
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
    // Om vi är i markeringsläge, uppdatera markering
    if (isMarking && markingStart) {
      updateMarking(e);
      return;
    }
    
    if (isDragging && containerRef.current) {
      // Calculate how far the mouse has moved
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Scroll the container by the difference
      containerRef.current.scrollLeft = scrollPosition.x - dx;
      containerRef.current.scrollTop = scrollPosition.y - dy;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Om vi är i markeringsläge, slutför markering
    if (isMarking && markingStart && markingEnd) {
      completeMarking(e);
      return;
    }
    
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

  // Ladda annotationer och versioner när komponenten öppnas
  useEffect(() => {
    if (open && fileData?.fileId) {
      // Hämta befintliga annotationer från localStorage
      const savedAnnotations = localStorage.getItem(`pdf_annotations_${fileData.fileId}`);
      if (savedAnnotations) {
        try {
          setAnnotations(JSON.parse(savedAnnotations));
        } catch (error) {
          console.error('Error parsing saved annotations:', error);
        }
      }

      // Hämta versionsinformation från localStorage
      const savedVersions = localStorage.getItem(`pdf_versions_${fileData.fileId}`);
      if (savedVersions) {
        try {
          const versions = JSON.parse(savedVersions);
          setFileVersions(versions);
          // Sätt den senaste versionen som aktiv om ingen är vald
          if (!activeVersionId && versions.length > 0) {
            const latestVersion = getLatestPdfVersion(versions);
            setActiveVersionId(latestVersion.id);
            if (latestVersion.fileUrl !== url) {
              setPdfUrl(latestVersion.fileUrl);
            }
          }
        } catch (error) {
          console.error('Error parsing saved versions:', error);
        }
      } else if (fileData) {
        // Om det inte finns några sparade versioner, skapa en första version baserad på fileData
        const initialVersion: FileVersion = {
          id: fileData.fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          versionNumber: 1,
          filename: fileData.filename,
          fileUrl: url,
          description: fileData.description || 'Första versionen',
          uploaded: fileData.uploaded || new Date().toISOString(),
          uploadedBy: fileData.uploadedBy || (user?.username || 'Okänd användare'),
          commentCount: 0
        };
        
        setFileVersions([initialVersion]);
        setActiveVersionId(initialVersion.id);
        localStorage.setItem(`pdf_versions_${fileData.fileId}`, JSON.stringify([initialVersion]));
      }
    }
  }, [open, fileData, url, activeVersionId, user]);

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
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowVersionsPanel(!showVersionsPanel)}
                className={showVersionsPanel ? "bg-primary/20" : ""}
                title="Visa versioner"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsMarking(!isMarking)}
                className={isMarking ? "bg-primary/20" : ""}
                title="Lägg till kommentar"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={pdfUrl || url} download target="_blank" rel="noopener noreferrer">
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