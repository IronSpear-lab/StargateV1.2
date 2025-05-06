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
  FileText,
  Eye
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { storeFileForReuse, getStoredFileById } from "@/lib/file-utils";
import { addPdfViewerAnimations, centerElementInView } from "@/lib/ui-utils";
import {
  getPDFVersions,
  uploadPDFVersion,
  getPDFVersionContent,
  getPDFAnnotations,
  savePDFAnnotation,
  deletePDFAnnotation,
  getLatestPDFVersion,
  getConsistentFileId,
  PDFVersion as ApiPDFVersion,
  PDFAnnotation as ApiPDFAnnotation
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

  const completeMarking = async (e: React.MouseEvent) => {
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
      
      // Försök spara till databasen om vi har en giltig fileId
      if (fileData?.fileId) {
        try {
          const fileId = getConsistentFileId(fileData.fileId);
          
          if (!isNaN(fileId)) {
            // Skapa ny annotation via API
            const savedAnnotation = await savePDFAnnotation(fileId, {
              position: {
                x: newAnnotation.rect.x,
                y: newAnnotation.rect.y,
                width: newAnnotation.rect.width,
                height: newAnnotation.rect.height,
                pageNumber: newAnnotation.rect.pageNumber
              },
              status: newAnnotation.status,
              color: newAnnotation.color,
              content: newAnnotation.comment,
              createdAt: newAnnotation.createdAt,
              createdBy: newAnnotation.createdBy,
              versionId: activeVersionId ? parseInt(activeVersionId) : undefined
            });
            
            if (savedAnnotation && savedAnnotation.id) {
              // Uppdatera lokalt state med det korrekt tilldelade ID:t från databasen
              const annotationsWithUpdatedId = [...annotations, {
                ...newAnnotation,
                id: savedAnnotation.id.toString()
              }];
              
              setAnnotations(annotationsWithUpdatedId);
              setActiveAnnotation({
                ...newAnnotation,
                id: savedAnnotation.id.toString()
              });
              
              console.log(`[${Date.now()}] Saved new annotation to database with ID: ${savedAnnotation.id}`);
            } else {
              // Fallback till localStorage vid fel eller om ingen annotation returnerades
              localStorage.setItem(
                `pdf_annotations_${fileData.fileId}`, 
                JSON.stringify([...annotations, newAnnotation])
              );
            }
          } else {
            // Fallback till localStorage om fileId inte är ett giltigt nummer
            localStorage.setItem(
              `pdf_annotations_${fileData.fileId}`, 
              JSON.stringify([...annotations, newAnnotation])
            );
          }
        } catch (error) {
          console.error('Error saving annotation to database:', error);
          
          // Fallback till localStorage vid fel
          localStorage.setItem(
            `pdf_annotations_${fileData.fileId}`, 
            JSON.stringify([...annotations, newAnnotation])
          );
        }
      }
    }
    
    // Återställ markeringstillstånd
    setIsMarking(false);
    setMarkingStart(null);
    setMarkingEnd(null);
    setTempAnnotation(null);
  };

  // Funktion för att lägga till eller uppdatera en kommentar
  const handleSaveComment = async () => {
    if (!activeAnnotation || !fileData?.fileId) return;
    
    // Skapa en uppdaterad annotation
    const updatedAnnotation = {
      ...activeAnnotation,
      comment: newComment
    };
    
    // Uppdatera lokalt state först (optimistisk uppdatering)
    const updatedAnnotations = annotations.map(annotation => 
      annotation.id === activeAnnotation.id ? updatedAnnotation : annotation
    );
    
    setAnnotations(updatedAnnotations);
    setIsAddingComment(false);
    
    // Försök spara till databasen
    try {
      const fileId = getConsistentFileId(fileData.fileId);
      
      if (!isNaN(fileId)) {
        // Om annotationen redan finns i databasen (har ett numeriskt ID)
        if (!isNaN(parseInt(activeAnnotation.id))) {
          await savePDFAnnotation(fileId, {
            id: parseInt(activeAnnotation.id),
            content: newComment,
            position: {
              x: activeAnnotation.rect.x,
              y: activeAnnotation.rect.y,
              width: activeAnnotation.rect.width,
              height: activeAnnotation.rect.height,
              pageNumber: activeAnnotation.rect.pageNumber
            },
            status: activeAnnotation.status,
            color: activeAnnotation.color,
            createdAt: activeAnnotation.createdAt,
            createdBy: activeAnnotation.createdBy,
            versionId: activeVersionId ? parseInt(activeVersionId) : undefined
          });
          
          console.log(`[${Date.now()}] Updated annotation in database`);
        } else {
          // Om det är en ny annotation (har ett genererat ID-format)
          const savedAnnotation = await savePDFAnnotation(fileId, {
            content: newComment,
            position: {
              x: activeAnnotation.rect.x,
              y: activeAnnotation.rect.y,
              width: activeAnnotation.rect.width,
              height: activeAnnotation.rect.height,
              pageNumber: activeAnnotation.rect.pageNumber
            },
            status: activeAnnotation.status,
            color: activeAnnotation.color,
            createdAt: activeAnnotation.createdAt,
            createdBy: activeAnnotation.createdBy,
            versionId: activeVersionId ? parseInt(activeVersionId) : undefined
          });
          
          if (savedAnnotation) {
            // Uppdatera annotation-ID i lokalt state
            const annotationsWithUpdatedId = updatedAnnotations.map(a => 
              a.id === activeAnnotation.id ? {...a, id: savedAnnotation.id.toString()} : a
            );
            setAnnotations(annotationsWithUpdatedId);
            console.log(`[${Date.now()}] Saved new annotation to database with ID: ${savedAnnotation.id}`);
          }
        }
      } else {
        // Fallback till localStorage om fileId inte är ett giltigt nummer
        console.log(`[${Date.now()}] Invalid fileId, falling back to localStorage`);
        localStorage.setItem(
          `pdf_annotations_${fileData.fileId}`, 
          JSON.stringify(updatedAnnotations)
        );
      }
    } catch (error) {
      console.error('Error saving annotation to database:', error);
      
      // Fallback till localStorage vid fel
      localStorage.setItem(
        `pdf_annotations_${fileData.fileId}`, 
        JSON.stringify(updatedAnnotations)
      );
    }
    
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
      
      // Spara versioner till localStorage som fallback
      localStorage.setItem(
        `pdf_versions_${fileData.fileId}`, 
        JSON.stringify(updatedVersions)
      );
    }
  };

  // Funktion för att ändra status på en annotation
  const handleStatusChange = async (annotationId: string, status: 'open' | 'resolved' | 'action_required' | 'reviewing') => {
    if (!fileData?.fileId) return;
    
    // Hitta annotationen som ska uppdateras
    const annotationToUpdate = annotations.find(a => a.id === annotationId);
    if (!annotationToUpdate) return;
    
    // Skapa en uppdaterad annotation
    const updatedAnnotation = {
      ...annotationToUpdate,
      status,
      color: statusColors[status]
    };
    
    // Uppdatera lokalt state först (optimistisk uppdatering)
    const updatedAnnotations = annotations.map(annotation => 
      annotation.id === annotationId ? updatedAnnotation : annotation
    );
    
    setAnnotations(updatedAnnotations);
    
    // Försök spara till databasen
    try {
      const fileId = getConsistentFileId(fileData.fileId);
      
      if (!isNaN(fileId) && !isNaN(parseInt(annotationId))) {
        // Uppdatera status i databasen
        await savePDFAnnotation(fileId, {
          id: parseInt(annotationId),
          content: updatedAnnotation.comment,
          position: {
            x: updatedAnnotation.rect.x,
            y: updatedAnnotation.rect.y,
            width: updatedAnnotation.rect.width,
            height: updatedAnnotation.rect.height,
            pageNumber: updatedAnnotation.rect.pageNumber
          },
          status: status,
          color: statusColors[status],
          createdAt: updatedAnnotation.createdAt,
          createdBy: updatedAnnotation.createdBy,
          versionId: activeVersionId ? parseInt(activeVersionId) : undefined
        });
        
        console.log(`[${Date.now()}] Updated annotation status in database`);
      } else {
        // Fallback till localStorage om ID inte är ett giltigt nummer
        console.log(`[${Date.now()}] Invalid ID format, falling back to localStorage`);
        localStorage.setItem(
          `pdf_annotations_${fileData.fileId}`, 
          JSON.stringify(updatedAnnotations)
        );
      }
    } catch (error) {
      console.error('Error updating annotation status in database:', error);
      
      // Fallback till localStorage vid fel
      localStorage.setItem(
        `pdf_annotations_${fileData.fileId}`, 
        JSON.stringify(updatedAnnotations)
      );
    }
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
  const handleAddVersion = async () => {
    if (!selectedVersionFile || !fileData?.fileId || !user) return;
    
    // Skapa temporärt URL för optimistisk uppdatering
    const tempFileUrl = URL.createObjectURL(selectedVersionFile);
    
    try {
      const fileId = getConsistentFileId(fileData.fileId);
      
      if (!isNaN(fileId)) {
        // Försök ladda upp versionen till API:et
        const uploadedVersion = await uploadPDFVersion(
          fileId,
          selectedVersionFile,
          newVersionDescription || `Version ${fileVersions.length + 1}`
        );
        
        if (uploadedVersion) {
          console.log(`[${Date.now()}] Version uploaded to database with ID: ${uploadedVersion.id}`);
          
          // Konvertera API-version till UI-format
          const newVersion: FileVersion = {
            id: uploadedVersion.id.toString(),
            versionNumber: uploadedVersion.versionNumber,
            filename: uploadedVersion.metadata?.fileName || selectedVersionFile.name,
            fileUrl: `/api/pdf/versions/${uploadedVersion.id}/content`,
            description: uploadedVersion.description,
            uploaded: uploadedVersion.uploadedAt,
            uploadedBy: uploadedVersion.uploadedBy,
            commentCount: 0
          };
          
          // Uppdatera versionslistan
          const updatedVersions = [...fileVersions, newVersion];
          setFileVersions(updatedVersions);
          setActiveVersionId(newVersion.id);
          setPdfUrl(newVersion.fileUrl);
          
          // Spara i localStorage som backup
          localStorage.setItem(
            `pdf_versions_${fileData.fileId}`, 
            JSON.stringify(updatedVersions)
          );
          
          console.log(`[${Date.now()}] Updated version list with new version from API`);
        } else {
          console.error(`[${Date.now()}] Failed to upload version to API`);
          fallbackToLocalStorage();
        }
      } else {
        console.log(`[${Date.now()}] Invalid fileId: ${fileData.fileId}, falling back to localStorage`);
        fallbackToLocalStorage();
      }
    } catch (error) {
      console.error(`[${Date.now()}] Error uploading version:`, error);
      fallbackToLocalStorage();
    }
    
    // Hjälpfunktion för att använda localStorage som fallback
    function fallbackToLocalStorage() {
      // Spara filen för återanvändning
      const localFileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      storeFileForReuse(selectedVersionFile, localFileId);
      
      // Skapa ny versionsinfo
      const newVersion: FileVersion = {
        id: localFileId,
        versionNumber: fileVersions.length + 1,
        filename: selectedVersionFile.name,
        fileUrl: tempFileUrl,
        description: newVersionDescription || `Version ${fileVersions.length + 1}`,
        uploaded: new Date().toISOString(),
        uploadedBy: user.username,
        commentCount: 0
      };
      
      // Uppdatera versionslistan
      const updatedVersions = [...fileVersions, newVersion];
      setFileVersions(updatedVersions);
      setActiveVersionId(newVersion.id);
      setPdfUrl(tempFileUrl);
      
      // Spara till localStorage
      localStorage.setItem(
        `pdf_versions_${fileData.fileId}`, 
        JSON.stringify(updatedVersions)
      );
      
      console.log(`[${Date.now()}] Created local version with ID: ${localFileId}`);
    }
    
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
    async function loadPdfData() {
      if (open && fileData?.fileId) {
        const fileId = getConsistentFileId(fileData.fileId);
        console.log(`[${Date.now()}] Loading PDF data for fileId: ${fileId}`);
        
        if (!isNaN(fileId)) {
          // Ladda versioner från API
          try {
            const versions = await getPDFVersions(fileId);
            
            if (versions && versions.length > 0) {
              console.log(`[${Date.now()}] Loaded ${versions.length} versions from API`);
              
              // Konvertera API-versioner till UI-format
              const uiVersions: FileVersion[] = versions.map(version => ({
                id: version.id.toString(),
                versionNumber: version.versionNumber,
                filename: version.metadata?.fileName || fileData.filename,
                fileUrl: `/api/pdf/versions/${version.id}/content`,
                description: version.description,
                uploaded: version.uploadedAt,
                uploadedBy: version.uploadedBy,
                commentCount: 0 // Vi kan uppdatera detta senare
              }));
              
              setFileVersions(uiVersions);
              
              // Välj den senaste versionen (högst versionsnummer)
              const latestVersion = findLatestVersion(uiVersions);
              
              if (!activeVersionId) {
                setActiveVersionId(latestVersion.id);
                if (latestVersion.fileUrl !== url) {
                  setPdfUrl(latestVersion.fileUrl);
                }
              }
            } else {
              console.log(`[${Date.now()}] No versions found in API, checking localStorage...`);
              loadFromLocalStorage();
            }
          } catch (error) {
            console.error('Error loading PDF versions from API:', error);
            loadFromLocalStorage();
          }
          
          // Ladda annotationer från API
          try {
            const apiAnnotations = await getPDFAnnotations(fileId);
            
            if (apiAnnotations && apiAnnotations.length > 0) {
              console.log(`[${Date.now()}] Loaded ${apiAnnotations.length} annotations from API`);
              
              // Konvertera API-annotationer till UI-format
              const uiAnnotations: PDFAnnotation[] = apiAnnotations.map(anno => ({
                id: anno.id.toString(),
                rect: {
                  x: anno.position.x,
                  y: anno.position.y,
                  width: anno.position.width,
                  height: anno.position.height,
                  pageNumber: anno.position.pageNumber
                },
                color: anno.color || statusColors[anno.status as keyof typeof statusColors],
                comment: anno.content,
                status: anno.status as 'open' | 'resolved' | 'action_required' | 'reviewing',
                createdBy: anno.createdBy,
                createdAt: anno.createdAt
              }));
              
              setAnnotations(uiAnnotations);
            } else {
              // Fallback till localStorage för annotationer
              loadAnnotationsFromLocal();
            }
          } catch (error) {
            console.error('Error loading PDF annotations from API:', error);
            // Fallback till localStorage för annotationer
            loadAnnotationsFromLocal();
          }
        } else {
          console.log(`[${Date.now()}] Invalid fileId: ${fileData.fileId}, using localStorage`);
          loadFromLocalStorage();
        }
      }
    }
    
    // Funktion för att ladda annotationer från localStorage
    function loadAnnotationsFromLocal() {
      if (!fileData?.fileId) return;
      
      const savedAnnotations = localStorage.getItem(`pdf_annotations_${fileData.fileId}`);
      if (savedAnnotations) {
        try {
          const localAnnotations = JSON.parse(savedAnnotations);
          setAnnotations(localAnnotations);
          console.log(`[${Date.now()}] Loaded ${localAnnotations.length} annotations from localStorage`);
        } catch (error) {
          console.error('Error parsing saved annotations:', error);
        }
      }
    }
    
    // Funktion för att ladda från localStorage som fallback
    function loadFromLocalStorage() {
      if (!fileData?.fileId) return;
      
      // Hämta annotationer
      loadAnnotationsFromLocal();
      
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
    
    loadPdfData();
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
          <div className="absolute top-[60px] right-0 w-[320px] h-[calc(100%-60px)] bg-white border-l shadow-lg overflow-auto z-10">
            {/* Header med titel */}
            <div className="p-4 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-lg">Aktivitet</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowUploadVersionDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-1" /> Ladda upp version
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              {fileVersions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Version {fileVersions.find(v => v.id === activeVersionId)?.versionNumber || fileVersions[0].versionNumber} - aktuell för närvarande
                  </h4>
                  
                  {fileVersions.map((version, index) => (
                    <div key={version.id} className="mb-4 last:mb-0">
                      <div className="flex gap-3 mb-2">
                        <div className="flex-none">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://avatar.vercel.sh/${version.uploadedBy}.png`} alt={version.uploadedBy} />
                            <AvatarFallback>{version.uploadedBy.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <div>
                              <span className="font-medium">{version.uploadedBy}</span>
                              <span className="text-muted-foreground text-sm ml-2">
                                för {Math.floor((Date.now() - new Date(version.uploaded).getTime()) / (1000 * 60 * 60 * 24))} dagar sen
                              </span>
                            </div>
                            <Button 
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                setActiveVersionId(version.id);
                                setPdfUrl(version.fileUrl);
                              }}
                            >
                              Visa version
                            </Button>
                          </div>
                          
                          <div className="text-sm">
                            {version.description || `Laddade upp version ${version.versionNumber}`}
                          </div>
                          
                          <div className="mt-2">
                            {version.id === activeVersionId ? (
                              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/30">
                                Nuvarande version
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Version {version.versionNumber}
                              </Badge>
                            )}
                            
                            {version.commentCount && version.commentCount > 0 ? (
                              <Badge variant="outline" className="ml-2">
                                <MessageSquare className="h-3 w-3 mr-1" /> {version.commentCount} kommentarer
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      
                      {/* Linje för att separera versioner */}
                      {index < fileVersions.length - 1 && (
                        <div className="ml-4 pl-4 border-l h-4 border-dashed border-gray-300"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Kommentarssection */}
              {annotations.filter(a => a.comment.trim() !== '').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Kommentarer ({annotations.filter(a => a.comment.trim() !== '').length})</h4>
                  
                  {annotations
                    .filter(a => a.comment.trim() !== '')
                    .map((annotation) => (
                      <div key={annotation.id} className="mb-4 pb-4 border-b last:border-0">
                        <div className="flex gap-3">
                          <div className="flex-none">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={`https://avatar.vercel.sh/${annotation.createdBy}.png`} alt={annotation.createdBy} />
                              <AvatarFallback>{annotation.createdBy.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <div>
                                <span className="font-medium">{annotation.createdBy}</span>
                                <span className="text-muted-foreground text-sm ml-2">
                                  {new Date(annotation.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <Button 
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => zoomToAnnotation(annotation)}
                              >
                                Visa markering
                              </Button>
                            </div>
                            
                            <div className="text-sm">{annotation.comment}</div>
                            
                            <div className="mt-2 flex gap-2 items-center">
                              <Badge 
                                variant="outline" 
                                className="flex items-center gap-1"
                                style={{
                                  borderColor: annotation.color,
                                  backgroundColor: `${annotation.color}10`,
                                  color: annotation.color
                                }}
                              >
                                {annotation.status === 'open' && <span className="h-2 w-2 rounded-full bg-current"></span>}
                                {annotation.status === 'resolved' && <Check className="h-3 w-3" />}
                                {annotation.status === 'action_required' && <AlertCircle className="h-3 w-3" />}
                                {annotation.status === 'reviewing' && <Eye className="h-3 w-3" />}
                                
                                {annotation.status === 'open' && 'Öppen'}
                                {annotation.status === 'resolved' && 'Löst'}
                                {annotation.status === 'action_required' && 'Kräver åtgärd'}
                                {annotation.status === 'reviewing' && 'Under granskning'}
                              </Badge>
                              
                              <Select 
                                value={annotation.status} 
                                onValueChange={(value) => handleStatusChange(annotation.id, value as any)}
                              >
                                <SelectTrigger className="h-6 text-xs px-2 w-[130px]">
                                  <SelectValue placeholder="Ändra status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Öppen</SelectItem>
                                  <SelectItem value="resolved">Löst</SelectItem>
                                  <SelectItem value="action_required">Kräver åtgärd</SelectItem>
                                  <SelectItem value="reviewing">Under granskning</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
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