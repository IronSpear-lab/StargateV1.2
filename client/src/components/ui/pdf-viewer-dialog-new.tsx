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

export function PDFViewerDialogNew({
  open,
  onOpenChange,
  url,
  title,
  file,
  fileData
}: PDFViewerDialogProps) {
  // Alltid visa kommentarspanelen i höger sida
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(true);
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

  // Dra för att panorera PDF
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isMarking) return; // Endast vänster musknapp

    const container = containerRef.current;
    if (container) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      setScrollPosition({
        x: container.scrollLeft,
        y: container.scrollTop
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isMarking) return;

    const container = containerRef.current;
    if (container) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      container.scrollLeft = scrollPosition.x - dx;
      container.scrollTop = scrollPosition.y - dy;
    }

    // Om användaren markerar, uppdatera markeringen
    if (isMarking && markingStart) {
      updateMarking(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isMarking && markingStart && markingEnd) {
      completeMarking(e);
    }
    
    setIsDragging(false);
  };

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
            // Skapa ny annotation via API med korrekt format för API:et
            const savedAnnotation = await savePDFAnnotation(parseInt(activeVersionId || '0'), {
              pdfVersionId: parseInt(activeVersionId || '0'),
              rect: {
                x: newAnnotation.rect.x,
                y: newAnnotation.rect.y,
                width: newAnnotation.rect.width,
                height: newAnnotation.rect.height,
                pageNumber: newAnnotation.rect.pageNumber
              },
              status: newAnnotation.status,
              color: newAnnotation.color,
              comment: newAnnotation.comment,
              createdBy: user.username,
              createdById: user.id
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

  // Ändra status på en annotation
  const handleStatusChange = async (status: 'open' | 'resolved' | 'action_required' | 'reviewing') => {
    if (!activeAnnotation) return;
    
    // Skapa en uppdaterad annotation
    const updatedAnnotation = {
      ...activeAnnotation,
      status,
      color: statusColors[status]
    };
    
    // Uppdatera lokalt state först (optimistisk uppdatering)
    const updatedAnnotations = annotations.map(annotation => 
      annotation.id === activeAnnotation.id ? updatedAnnotation : annotation
    );
    
    setAnnotations(updatedAnnotations);
    setActiveAnnotation(updatedAnnotation);
    
    // Försök spara till databasen
    if (fileData?.fileId) {
      try {
        const fileId = getConsistentFileId(fileData.fileId);
        
        if (!isNaN(fileId)) {
          // Om annotationen redan finns i databasen (har ett numeriskt ID)
          if (!isNaN(parseInt(activeAnnotation.id))) {
            await savePDFAnnotation(parseInt(activeVersionId || '0'), {
              id: parseInt(activeAnnotation.id),
              pdfVersionId: parseInt(activeVersionId || '0'),
              rect: activeAnnotation.rect,
              status: status,
              color: statusColors[status],
              comment: activeAnnotation.comment,
              createdBy: activeAnnotation.createdBy,
              createdById: user?.id
            });
            
            console.log(`[${Date.now()}] Updated annotation status in database`);
          }
        } else {
          // Fallback till localStorage om fileId inte är ett giltigt nummer
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
    }
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
          await savePDFAnnotation(parseInt(activeVersionId || '0'), {
            id: parseInt(activeAnnotation.id),
            pdfVersionId: parseInt(activeVersionId || '0'),
            rect: activeAnnotation.rect,
            status: activeAnnotation.status,
            color: activeAnnotation.color,
            comment: newComment,
            createdBy: activeAnnotation.createdBy,
            createdById: user?.id
          });
          
          console.log(`[${Date.now()}] Updated annotation in database`);
        } else {
          // Om det är en ny annotation (har ett genererat ID-format)
          const savedAnnotation = await savePDFAnnotation(parseInt(activeVersionId || '0'), {
            pdfVersionId: parseInt(activeVersionId || '0'),
            rect: activeAnnotation.rect,
            status: activeAnnotation.status,
            color: activeAnnotation.color,
            comment: newComment,
            createdBy: activeAnnotation.createdBy || user?.username || 'Anonym',
            createdById: user?.id
          });
          
          if (savedAnnotation && savedAnnotation.id) {
            // Uppdatera annotations arrayen med det nya ID:t
            const annotationsWithUpdatedId = annotations.map(annotation => 
              annotation.id === activeAnnotation.id ? { 
                ...updatedAnnotation, 
                id: savedAnnotation.id.toString() 
              } : annotation
            );
            
            setAnnotations(annotationsWithUpdatedId);
            setActiveAnnotation({
              ...updatedAnnotation,
              id: savedAnnotation.id.toString()
            });
            
            console.log(`[${Date.now()}] Saved annotation to database with ID: ${savedAnnotation.id}`);
          }
        }
      } else {
        // Fallback till localStorage om fileId inte är ett giltigt nummer
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
  };

  // Funktion för att zooma till en specifik annotation
  const zoomToAnnotation = (annotation: PDFAnnotation) => {
    if (!containerRef.current || !pageRef.current) return;
    
    // Om annotationen är på en annan sida, byt sida först
    if (annotation.rect.pageNumber !== pageNumber) {
      setPageNumber(annotation.rect.pageNumber);
      
      // Vänta tills sidan har laddats innan vi zoomar
      setTimeout(() => {
        zoomToAnnotation(annotation);
      }, 500);
      return;
    }
    
    // Beräkna position baserat på aktuell zoom och rotation
    const { x, y, width, height } = annotation.rect;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Beräkna scroll-position för att centrera annotationen
    const pdfRect = pageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Justera för scale och offset
    const scaledX = centerX * scale;
    const scaledY = centerY * scale;
    
    const offsetX = pdfRect.left - containerRect.left;
    const offsetY = pdfRect.top - containerRect.top;
    
    // Centrera med justeringar för container offset
    containerRef.current.scrollLeft = scaledX + offsetX - containerRect.width / 2;
    containerRef.current.scrollTop = scaledY + offsetY - containerRect.height / 2;
  };

  // Lägg till en ny version av PDF
  const handleAddVersion = async () => {
    if (!selectedVersionFile || !fileData?.fileId) return;
    
    try {
      const fileId = getConsistentFileId(fileData.fileId);
      
      if (!isNaN(fileId)) {
        const newVersion = await uploadPDFVersion(
          fileId, 
          selectedVersionFile, 
          newVersionDescription
        );
        
        if (newVersion) {
          // Lägg till den nya versionen i filversioner
          const newFileVersion: FileVersion = {
            id: newVersion.id.toString(),
            versionNumber: newVersion.versionNumber,
            filename: selectedVersionFile.name,
            fileUrl: newVersion.filePath,
            description: newVersionDescription,
            uploaded: new Date().toISOString(),
            uploadedBy: user?.username || 'Anonym',
          };
          
          // Sortera efter versionsnummer (fallande)
          const updatedVersions = [...fileVersions, newFileVersion].sort(
            (a, b) => b.versionNumber - a.versionNumber
          );
          
          setFileVersions(updatedVersions);
          setActiveVersionId(newVersion.id.toString());
          setPdfUrl(newVersion.filePath);
          
          console.log(`[${Date.now()}] Added new version:`, newVersion);
          
          // Återställ formuläret
          setShowUploadVersionDialog(false);
          setNewVersionDescription('');
          setSelectedVersionFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } else {
        console.error('Invalid file ID');
        // Fallback: skapa en lokal version för demo
        fallbackToLocalStorage();
      }
    } catch (error) {
      console.error('Error uploading new version:', error);
      // Fallback: skapa en lokal version för demo
      fallbackToLocalStorage();
    }
    
    function fallbackToLocalStorage() {
      if (!selectedVersionFile) return;
      
      // Skapa en URL för filen
      const fileUrl = URL.createObjectURL(selectedVersionFile);
      
      // Lägg till den nya versionen i filversioner
      const newVersion: FileVersion = {
        id: `version_${Date.now()}`,
        versionNumber: fileVersions.length + 1,
        filename: selectedVersionFile.name,
        fileUrl: fileUrl,
        description: newVersionDescription,
        uploaded: new Date().toISOString(),
        uploadedBy: user?.username || 'Anonym',
      };
      
      // Sortera efter versionsnummer (fallande)
      const updatedVersions = [...fileVersions, newVersion].sort(
        (a, b) => b.versionNumber - a.versionNumber
      );
      
      setFileVersions(updatedVersions);
      setActiveVersionId(newVersion.id);
      setPdfUrl(fileUrl);
      
      // Återställ formuläret
      setShowUploadVersionDialog(false);
      setNewVersionDescription('');
      setSelectedVersionFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // Spara versioner i localStorage
      if (fileData?.fileId) {
        localStorage.setItem(
          `pdf_versions_${fileData.fileId}`, 
          JSON.stringify(updatedVersions)
        );
      }
    }
  };

  // Hitta den senaste versionen av en PDF
  const findLatestVersion = (versions: FileVersion[]): FileVersion => {
    return versions.reduce((latest, current) => {
      return latest.versionNumber > current.versionNumber ? latest : current;
    }, versions[0]);
  };

  // Ladda annotationer från localStorage
  useEffect(() => {
    if (fileData?.fileId) {
      async function loadPdfData() {
        try {
          // Försök ladda versionerna från databasen
          const fileId = getConsistentFileId(fileData.fileId);
          
          if (!isNaN(fileId)) {
            // Hämta versioner
            const versions = await getPDFVersions(fileId);
            
            if (versions && versions.length > 0) {
              // Mappa API-versioner till vårt FileVersion interface
              const mappedVersions: FileVersion[] = versions.map(v => ({
                id: v.id.toString(),
                versionNumber: v.versionNumber,
                filename: v.metadata?.fileName || 'document.pdf',
                fileUrl: v.filePath,
                description: v.description,
                uploaded: v.uploadedAt,
                uploadedBy: v.uploadedBy,
                commentCount: v.commentCount,
              }));
              
              setFileVersions(mappedVersions);
              
              // Hitta den senaste versionen
              const latestVersion = mappedVersions.reduce((latest, current) => {
                return latest.versionNumber > current.versionNumber ? latest : current;
              }, mappedVersions[0]);
              
              setActiveVersionId(latestVersion.id);
              setPdfUrl(latestVersion.fileUrl);
              
              // Hämta annotationer för den senaste versionen
              const versionId = parseInt(latestVersion.id);
              if (!isNaN(versionId)) {
                const annotations = await getPDFAnnotations(versionId);
                
                if (annotations && annotations.length > 0) {
                  // Mappa API-annotationer till vårt PDFAnnotation interface
                  const mappedAnnotations: PDFAnnotation[] = annotations.map(a => ({
                    id: a.id ? a.id.toString() : `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    rect: a.rect,
                    color: a.color,
                    comment: a.comment,
                    status: a.status,
                    createdBy: a.createdBy || 'Anonym',
                    createdAt: a.createdAt || new Date().toISOString(),
                  }));
                  
                  setAnnotations(mappedAnnotations);
                }
              }
              
              return;
            }
          }
          
          // Om databasen inte kunde nås eller inga versioner hittades, försök med localStorage
          loadFromLocalStorage();
        } catch (error) {
          console.error('Error loading PDF data from database:', error);
          // Fallback till localStorage
          loadFromLocalStorage();
        }
      }
      
      function loadAnnotationsFromLocal() {
        try {
          const storedAnnotations = localStorage.getItem(`pdf_annotations_${fileData.fileId}`);
          if (storedAnnotations) {
            setAnnotations(JSON.parse(storedAnnotations));
          }
        } catch (error) {
          console.error('Error loading annotations from localStorage:', error);
        }
      }
      
      function loadFromLocalStorage() {
        try {
          // Försök ladda versioner från localStorage
          const storedVersions = localStorage.getItem(`pdf_versions_${fileData.fileId}`);
          
          if (storedVersions) {
            const versions: FileVersion[] = JSON.parse(storedVersions);
            setFileVersions(versions);
            
            // Hitta den senaste versionen eller använd ursprungs-URL:en
            if (versions.length > 0) {
              const latestVersion = findLatestVersion(versions);
              setActiveVersionId(latestVersion.id);
              setPdfUrl(latestVersion.fileUrl);
            } else {
              const initialVersion: FileVersion = {
                id: 'initial',
                versionNumber: 1,
                filename: fileData.filename,
                fileUrl: url,
                description: fileData.description || 'Originalversion',
                uploaded: fileData.uploaded,
                uploadedBy: fileData.uploadedBy,
              };
              
              setFileVersions([initialVersion]);
              setActiveVersionId('initial');
            }
          } else if (file) {
            // Om vi har en fil men inga sparade versioner, skapa en initial version
            const fileUrl = URL.createObjectURL(file);
            
            const initialVersion: FileVersion = {
              id: 'initial',
              versionNumber: 1,
              filename: file.name,
              fileUrl: fileUrl,
              description: 'Originalversion',
              uploaded: new Date().toISOString(),
              uploadedBy: user?.username || 'Anonym',
            };
            
            setFileVersions([initialVersion]);
            setActiveVersionId('initial');
            setPdfUrl(fileUrl);
            
            // Spara i localStorage
            localStorage.setItem(
              `pdf_versions_${fileData.fileId}`, 
              JSON.stringify([initialVersion])
            );
          }
          
          // Ladda annotationer från localStorage
          loadAnnotationsFromLocal();
        } catch (error) {
          console.error('Error loading PDF data from localStorage:', error);
        }
      }
      
      loadPdfData();
    }
  }, [fileData?.fileId, url, file, user?.username]);

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      className="max-w-7xl w-full"
    >
      <DialogContent className="max-w-7xl w-full max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-2 flex flex-row justify-between items-center border-b">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>{title}</DialogTitle>
          </div>

          <div className="flex items-center space-x-2">
            {/* Top action buttons baserat på referensbilden */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (pdfUrl) {
                  const link = document.createElement('a');
                  link.href = pdfUrl;
                  link.download = fileData?.filename || 'document.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              title="Ladda ner"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Funktion för att spara som favorit/bokmärke
              }}
              title="Spara"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVersionsPanel(!showVersionsPanel)}
              title="Versioner"
              className={showVersionsPanel ? "bg-primary/10" : ""}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <path d="M12 11h4"></path>
                <path d="M12 16h4"></path>
                <path d="M8 11h.01"></path>
                <path d="M8 16h.01"></path>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMarking(!isMarking)}
              title={isMarking ? "Avsluta markering" : "Markera"}
              className={isMarking ? "bg-primary/10" : ""}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Zooma ut"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground w-16 text-center">
              {Math.round(scale * 100)}%
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              title="Zooma in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRotation((rotation + 90) % 360)}
              title="Rotera"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M21 2v6h-6"></path>
                <path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path>
              </svg>
            </Button>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Stäng"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Nuvärande version / Ursprunglig version knappar */}
        <div className="flex border-b">
          <Button 
            variant="ghost" 
            className="rounded-none border-b-2 border-primary px-6"
          >
            Nuvarande version
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-none border-b-2 border-transparent px-6"
          >
            Ursprunglig version
          </Button>
        </div>

        <div className="flex">
          {/* PDF Viewer Area */}
          <div 
            ref={containerRef}
            className="overflow-auto flex-1"
            style={{ 
              height: "75vh",
              background: "#f5f5f5",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {loading && (
              <div className="flex justify-center items-center w-full h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            
            <div 
              ref={pdfWrapperRef}
              style={{ 
                transformOrigin: 'center center',
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
                width: 'fit-content',
                margin: '0 auto',
                position: 'relative',
              }}
            >
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                options={{ 
                  cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
                  cMapPacked: true,
                }}
                loading={
                  <div className="flex justify-center items-center w-full h-full min-h-[500px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                }
                error={
                  <div className="flex flex-col justify-center items-center w-full h-full min-h-[500px]">
                    <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                    <p className="text-center text-destructive">Det uppstod ett fel vid laddning av dokumentet.</p>
                  </div>
                }
              >
                <div 
                  ref={pageRef}
                  onMouseDown={startMarking}
                  onMouseMove={updateMarking}
                  onMouseUp={completeMarking}
                >
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={800}
                  />

                  {/* PDF Annotations som visas på själva PDF:en */}
                  {pageRef.current && annotations
                    .filter(a => a.rect.pageNumber === pageNumber)
                    .map(annotation => (
                      <div
                        key={annotation.id}
                        className="absolute cursor-pointer transition-all border-2"
                        style={{
                          left: annotation.rect.x,
                          top: annotation.rect.y,
                          width: annotation.rect.width,
                          height: annotation.rect.height,
                          backgroundColor: colorWithOpacity(annotation.color, 0.2),
                          borderColor: annotation.color,
                          transform: `scale(${1}) translate(0, 0)`,
                          transformOrigin: 'top left',
                          zIndex: activeAnnotation?.id === annotation.id ? 30 : 20,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAnnotation(annotation);
                          zoomToAnnotation(annotation);
                        }}
                      />
                    ))}
                  
                  {/* Temporär markering medan användaren drar */}
                  {tempAnnotation && tempAnnotation.rect && pageRef.current && (
                    <div
                      className="absolute border-2"
                      style={{
                        left: tempAnnotation.rect.x,
                        top: tempAnnotation.rect.y,
                        width: tempAnnotation.rect.width,
                        height: tempAnnotation.rect.height,
                        backgroundColor: colorWithOpacity(tempAnnotation.color || statusColors.open, 0.2),
                        borderColor: tempAnnotation.color || statusColors.open,
                        transform: `scale(${1})`,
                        transformOrigin: 'top left',
                        zIndex: 15,
                      }}
                    />
                  )}
                </div>
              </Document>
            </div>
          </div>

          {/* Right Sidebar - information och kommentarer */}
          {showCommentsSidebar && (
            <div className="w-80 border-l overflow-y-auto" style={{ height: "75vh" }}>
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-medium text-lg">Extra detaljer</h3>
                <div className="mt-3 text-sm">
                  <p className="text-xs text-muted-foreground">Skickad av</p>
                  <div className="flex items-center mt-1">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs">DN</AvatarFallback>
                    </Avatar>
                    <p>Dennis Nielsen, 18 Apr 2023</p>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <p className="text-xs text-muted-foreground">Tilldelad till</p>
                  <div className="flex items-center mt-1">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs">14</AvatarFallback>
                    </Avatar>
                    <p>14 - Konstruktör</p>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <p className="text-xs text-muted-foreground">Granskningspaket</p>
                  <p className="mt-1">K - Granskning BH Hus 3-4</p>
                </div>
                <div className="mt-3 text-sm">
                  <p className="text-xs text-muted-foreground">Typ</p>
                  <p className="mt-1">Gransknings kommentar</p>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-medium mb-4">Aktivitet</h3>
                {/* Version History */}
                <div className="border rounded-md mb-4">
                  <div className="p-3 bg-muted/30 border-b">
                    <h4 className="font-medium">Version 3 - visar för närvarande</h4>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center mb-2">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback className="text-xs">SL</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Simon Lidskog</p>
                        <p className="text-xs text-muted-foreground">för 12 dagar sedan</p>
                      </div>
                    </div>
                    <p className="text-sm">Uppdaterad ny version</p>
                  </div>
                </div>

                <div className="border rounded-md mb-4">
                  <div className="p-3 bg-muted/30 border-b">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Version 2</h4>
                      <Button variant="outline" size="sm">Visa version</Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center mb-2">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback className="text-xs">SL</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">Simon Lidskog</p>
                        <p className="text-xs text-muted-foreground">för 14 dagar sedan</p>
                      </div>
                    </div>
                    <p className="text-sm">Uppdaterade ritningen för HKR isol</p>
                  </div>
                </div>

                {/* Annotations and Comments */}
                {annotations.map(annotation => (
                  <div 
                    key={annotation.id} 
                    className="border rounded-md mb-4 cursor-pointer hover:border-primary"
                    onClick={() => {
                      setActiveAnnotation(annotation);
                      zoomToAnnotation(annotation);
                      if (annotation.rect.pageNumber !== pageNumber) {
                        setPageNumber(annotation.rect.pageNumber);
                      }
                    }}
                  >
                    <div className="p-3 border-b flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: annotation.color }}
                      />
                      <span className="text-sm font-medium">
                        {annotation.status === 'open' ? 'Öppen' : 
                        annotation.status === 'resolved' ? 'Löst' : 
                        annotation.status === 'action_required' ? 'Åtgärd krävs' : 
                        'Under granskning'}
                      </span>
                      <span className="text-xs ml-auto text-muted-foreground">
                        Sida {annotation.rect.pageNumber}
                      </span>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-xs">
                            {annotation.createdBy?.substring(0, 2)?.toUpperCase() || 'AN'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{annotation.createdBy}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(annotation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {annotation.comment && (
                        <p className="text-sm mt-2">{annotation.comment}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add New Comment */}
                <div className="mt-4 flex items-start">
                  <Avatar className="h-8 w-8 mr-2 mt-1">
                    <AvatarFallback>
                      {user?.username?.substring(0, 2)?.toUpperCase() || 'AN'}
                    </AvatarFallback>
                  </Avatar>
                  <Textarea
                    placeholder="Skriv ett nytt meddelande..."
                    className="flex-1 resize-none"
                    rows={3}
                    onClick={() => setIsMarking(true)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {numPages && numPages > 1 && (
          <div className="flex justify-center items-center py-2 border-t">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevPage}
              disabled={pageNumber <= 1}
              title="Föregående sida"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="mx-4 text-sm">
              Sida {pageNumber} av {numPages}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextPage}
              disabled={pageNumber >= numPages!}
              title="Nästa sida"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Version panel dialog */}
        {showVersionsPanel && (
          <div className="absolute right-0 top-[105px] bottom-0 w-80 bg-white border-l shadow-lg overflow-auto">
            <div className="p-4 border-b">
              <h3 className="font-medium">Versioner</h3>
              <Button
                onClick={() => setShowUploadVersionDialog(true)}
                size="sm"
                className="mt-2 w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp ny version
              </Button>
            </div>
            <div className="divide-y">
              {fileVersions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 hover:bg-muted cursor-pointer ${
                    activeVersionId === version.id ? "bg-muted" : ""
                  }`}
                  onClick={() => {
                    setActiveVersionId(version.id);
                    setPdfUrl(version.fileUrl);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Version {version.versionNumber}</h4>
                    {version.commentCount ? (
                      <Badge variant="outline" className="flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {version.commentCount}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(version.uploaded).toLocaleDateString()} {" "}
                    {new Date(version.uploaded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex items-center mt-2">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs">
                        {version.uploadedBy.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs">{version.uploadedBy}</p>
                  </div>
                  <p className="text-xs mt-2">{version.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Upload new version dialog */}
        {showUploadVersionDialog && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="font-medium text-lg mb-4">Ladda upp ny version</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Beskrivning</label>
                <Textarea
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  placeholder="Beskriv ändringarna i denna version..."
                  className="w-full"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Fil</label>
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
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadVersionDialog(false);
                    setNewVersionDescription('');
                    setSelectedVersionFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
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
        
        {/* Active annotation comment panel */}
        {activeAnnotation && !showCommentsSidebar && (
          <div 
            className="absolute right-4 bottom-16 bg-white rounded-lg shadow-lg border overflow-hidden" 
            style={{ width: '320px' }}
          >
            <div className="p-3 bg-muted flex justify-between items-center">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: activeAnnotation.color }}
                />
                <span className="text-xs font-medium">
                  {activeAnnotation.status === 'open' ? 'Öppen' : 
                   activeAnnotation.status === 'resolved' ? 'Löst' : 
                   activeAnnotation.status === 'action_required' ? 'Åtgärd krävs' : 
                   'Under granskning'}
                </span>
              </div>
              <div className="flex items-center">
                <Select 
                  value={activeAnnotation.status}
                  onValueChange={(value) => handleStatusChange(value as 'open' | 'resolved' | 'action_required' | 'reviewing')}
                >
                  <SelectTrigger className="h-7 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Öppen</SelectItem>
                    <SelectItem value="reviewing">Granskning</SelectItem>
                    <SelectItem value="action_required">Åtgärd krävs</SelectItem>
                    <SelectItem value="resolved">Löst</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 ml-1"
                  onClick={() => setActiveAnnotation(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-3">
              {!isAddingComment && activeAnnotation.comment && (
                <div className="mb-2">
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs">
                        {activeAnnotation.createdBy.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{activeAnnotation.createdBy}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(activeAnnotation.createdAt).toLocaleDateString()} {" "}
                      {new Date(activeAnnotation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm mt-2">{activeAnnotation.comment}</p>
                </div>
              )}
              
              {isAddingComment ? (
                <div>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Skriv en kommentar..."
                    className="w-full resize-none mb-2"
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsAddingComment(false);
                        setNewComment('');
                      }}
                    >
                      Avbryt
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveComment}
                      disabled={!newComment.trim()}
                    >
                      Spara
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setIsAddingComment(true);
                    setNewComment(activeAnnotation.comment);
                  }}
                >
                  {activeAnnotation.comment ? 'Redigera kommentar' : 'Lägg till kommentar'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}