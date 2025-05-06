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
  
  // Hjälpfunktion för att konvertera en färg med opacitet
  const colorWithOpacity = (color: string, opacity: number): string => {
    // Konvertera hex till rgba
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    // Om färgen redan är rgba eller annan format, returnera med opacitet
    return color + opacity.toString();
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

  // Funktion för att hitta senaste versionen
  const findLatestVersion = (versions: FileVersion[]): FileVersion => {
    return versions.reduce((prev, current) => 
      (prev.versionNumber > current.versionNumber) ? prev : current
    );
  };

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
            const latestVersion = findLatestVersion(versions);
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
                file={pdfUrl || url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={null}
                error={
                  <div className="flex flex-col items-center justify-center p-10">
                    <p className="text-red-500 mb-2">Kunde inte ladda dokumentet</p>
                    <p className="text-gray-600 text-sm">Kontrollera att det är en giltig PDF-fil</p>
                  </div>
                }
              >
                <div ref={pageRef} style={{ position: 'relative' }}>
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading={null}
                    className={loading ? "hidden" : ""}
                    width={595.2} // Standardbredd för A4
                  />
                  
                  {/* Temporär markering när användaren drar */}
                  {isMarking && tempAnnotation && markingStart && markingEnd && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${tempAnnotation.rect?.x}px`,
                        top: `${tempAnnotation.rect?.y}px`,
                        width: `${tempAnnotation.rect?.width}px`,
                        height: `${tempAnnotation.rect?.height}px`,
                        border: `2px solid ${tempAnnotation.color}`,
                        backgroundColor: `${tempAnnotation.color}33`,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  
                  {/* Visa alla annotationer för aktuell sida */}
                  {annotations
                    .filter(annotation => annotation.rect.pageNumber === pageNumber)
                    .map(annotation => (
                      <div
                        key={annotation.id}
                        style={{
                          position: 'absolute',
                          left: `${annotation.rect.x}px`,
                          top: `${annotation.rect.y}px`,
                          width: `${annotation.rect.width}px`,
                          height: `${annotation.rect.height}px`,
                          border: `2px solid ${annotation.color}`,
                          backgroundColor: `${annotation.color}33`,
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAnnotation(annotation);
                          setNewComment(annotation.comment);
                          setIsAddingComment(true);
                        }}
                      >
                        {/* Indikator för status */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-15px',
                            right: '-15px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '11px',
                            backgroundColor: annotation.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            border: '1px solid white',
                          }}
                        >
                          {annotation.status === 'open' && <span>!</span>}
                          {annotation.status === 'resolved' && <Check size={14} />}
                          {annotation.status === 'action_required' && <AlertCircle size={14} />}
                          {annotation.status === 'reviewing' && <span>?</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </Document>
            </div>
          </div>
        </div>
        
        {/* Versionshanteringspanel */}
        {showVersionsPanel && fileData?.fileId && (
          <div className="absolute top-[60px] right-0 w-[300px] h-[calc(100%-60px)] bg-white border-l shadow-lg p-4 overflow-auto z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Versioner</h3>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowUploadVersionDialog(true)}
              >
                <Upload className="h-4 w-4 mr-1" /> Ladda upp version
              </Button>
            </div>
            
            <div className="space-y-3 mt-4">
              {fileVersions.map(version => (
                <div 
                  key={version.id} 
                  className={`p-3 rounded-md ${activeVersionId === version.id ? 'bg-primary/10 border border-primary/30' : 'bg-gray-100 hover:bg-gray-200'} cursor-pointer`}
                  onClick={() => {
                    setActiveVersionId(version.id);
                    setPdfUrl(version.fileUrl);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">Version {version.versionNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{version.filename}</p>
                    </div>
                    {version.commentCount ? (
                      <div className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {version.commentCount}
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">{version.description}</p>
                  <p className="text-xs mt-2">
                    {new Date(version.uploaded).toLocaleDateString()} av {version.uploadedBy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Kommentarspanel */}
        {isAddingComment && activeAnnotation && (
          <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 z-10">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Kommentar</h3>
              <div className="flex gap-2">
                <Select 
                  value={activeAnnotation.status} 
                  onValueChange={(value) => handleStatusChange(activeAnnotation.id, value as any)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Öppen</SelectItem>
                    <SelectItem value="resolved">Löst</SelectItem>
                    <SelectItem value="action_required">Kräver åtgärd</SelectItem>
                    <SelectItem value="reviewing">Under granskning</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsAddingComment(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Skriv din kommentar här..."
              className="min-h-[100px]"
            />
            
            <div className="flex justify-end mt-2">
              <Button 
                onClick={handleSaveComment}
                disabled={newComment.trim() === activeAnnotation.comment.trim()}
              >
                Spara
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground mt-2">
              Skapad av {activeAnnotation.createdBy} den {new Date(activeAnnotation.createdAt).toLocaleDateString()}
            </div>
          </div>
        )}

        {/* Dialog för att ladda upp ny version */}
        {showUploadVersionDialog && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white rounded-lg w-[400px] p-6">
              <h3 className="text-lg font-medium mb-4">Ladda upp ny version</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Välj PDF-fil</label>
                  <Input 
                    type="file" 
                    accept=".pdf" 
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedVersionFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Versionsbeskrivning</label>
                  <Textarea
                    value={newVersionDescription}
                    onChange={(e) => setNewVersionDescription(e.target.value)}
                    placeholder="Beskriv vad som är nytt i denna version..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowUploadVersionDialog(false);
                    setSelectedVersionFile(null);
                    setNewVersionDescription('');
                  }}
                >
                  Avbryt
                </Button>
                <Button 
                  onClick={handleAddVersion}
                  disabled={!selectedVersionFile}
                >
                  Ladda upp
                </Button>
              </div>
            </div>
          </div>
        )}
        
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