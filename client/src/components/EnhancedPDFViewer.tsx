import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/contexts/ProjectContext";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  ZoomIn, 
  ZoomOut,
  Download,
  X,
  Check,
  AlertCircle,
  ArrowLeft,
  Upload,
  History,
  Pencil,
  Link as LinkIcon,
  Eye,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { addPdfViewerAnimations, centerElementInView } from "@/lib/ui-utils";
import { storeFileForReuse } from "@/lib/file-utils";
import {
  getPDFVersions,
  uploadPDFVersion,
  getPDFAnnotations,
  savePDFAnnotation,
  deletePDFAnnotation,
  convertAnnotationToTask,
  getConsistentFileId,
  PDFVersion as ApiPDFVersion,
  PDFAnnotation as ApiPDFAnnotation
} from "@/lib/pdf-utils";

// Configure react-pdf worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// PDF Annotation interface
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
  status: 'new_comment' | 'action_required' | 'rejected' | 'new_review' | 'other_forum' | 'resolved';
  createdBy: string;
  createdAt: string;
  assignedTo?: string;
  taskId?: string;
}

// Add type declaration to augment the ApiPDFAnnotation interface
declare module '@/lib/pdf-utils' {
  interface PDFAnnotation {
    assignedTo?: string;
  }
}

// File Version interface
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

// Status color mapping
const statusColors = {
  new_comment: '#FF69B4',      // HotPink (Rosa)
  action_required: '#FF0000',  // Röd
  rejected: '#808080',         // Grå
  new_review: '#FFA500',       // Orange
  other_forum: '#4169E1',      // RoyalBlue (Blå)
  resolved: '#ADFF2F',         // GreenYellow (Grön)
  
  // Backward compatibility for old status values
  open: '#FF69B4',             // Mappa till new_comment (Rosa)
  reviewing: '#FFA500'         // Mappa till new_review (Orange)
};

interface EnhancedPDFViewerProps {
  fileId: string;
  initialUrl: string;
  filename: string;
  onClose?: () => void;
}

type Position = { x: number; y: number };

export default function EnhancedPDFViewer({
  fileId,
  initialUrl,
  filename,
  onClose
}: EnhancedPDFViewerProps) {
  const { user } = useAuth();
  const { projectMembers, currentProject } = useProject();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState<Position>({ x: 0, y: 0 });
  
  // Annotations and commenting
  const [isMarking, setIsMarking] = useState(false);
  const [markingStart, setMarkingStart] = useState<Position | null>(null);
  const [markingEnd, setMarkingEnd] = useState<Position | null>(null);
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<PDFAnnotation | null>(null);
  const [newComment, setNewComment] = useState('');
  const [newTask, setNewTask] = useState('');
  const [assignTo, setAssignTo] = useState<string | undefined>(undefined);
  const [tempAnnotation, setTempAnnotation] = useState<Partial<PDFAnnotation> | null>(null);
  
  // Version management
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>(undefined);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(initialUrl);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [newVersionDescription, setNewVersionDescription] = useState('');
  
  // Current sidebar view mode
  const [sidebarMode, setSidebarMode] = useState<'details' | 'history' | 'comment'>('details');
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF data when component mounts
  useEffect(() => {
    async function loadData() {
      try {
        const numericFileId = getConsistentFileId(fileId);
        
        if (!isNaN(numericFileId)) {
          // Load versions
          const versions = await getPDFVersions(numericFileId);
          if (versions && versions.length > 0) {
            const uiVersions: FileVersion[] = versions.map(version => ({
              id: version.id.toString(),
              versionNumber: version.versionNumber,
              filename: version.metadata?.fileName || filename,
              fileUrl: `/api/pdf/versions/${version.id}/content`,
              description: version.description,
              uploaded: version.uploadedAt,
              uploadedBy: version.uploadedBy,
              commentCount: 0
            }));
            
            setFileVersions(uiVersions);
            
            // Set latest version as active
            const latestVersion = uiVersions.reduce((prev, current) => 
              (prev.versionNumber > current.versionNumber) ? prev : current
            );
            
            setActiveVersionId(latestVersion.id);
            setPdfUrl(latestVersion.fileUrl);
            
            // Load annotations - filtrera per projekt om tillgängligt
            const annots = await getPDFAnnotations(
              numericFileId, 
              currentProject ? currentProject.id : undefined
            );
            if (annots && annots.length > 0) {
              const uiAnnotations: PDFAnnotation[] = annots.map(anno => ({
                id: anno.id?.toString() || `anno_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                rect: {
                  x: anno.rect.x,
                  y: anno.rect.y,
                  width: anno.rect.width,
                  height: anno.rect.height,
                  pageNumber: anno.rect.pageNumber
                },
                color: anno.color || statusColors[anno.status],
                comment: anno.comment,
                status: anno.status,
                createdBy: anno.createdBy || 'Unknown',
                createdAt: anno.createdAt || new Date().toISOString(),
                assignedTo: anno.assignedTo,
                taskId: anno.id?.toString()
              }));
              
              setAnnotations(uiAnnotations);
            } else {
              loadFromLocalStorage();
            }
          } else {
            loadFromLocalStorage();
          }
        } else {
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading PDF data:', error);
        loadFromLocalStorage();
      }
    }
    
    function loadFromLocalStorage() {
      // Load annotations from localStorage
      const savedAnnotations = localStorage.getItem(`pdf_annotations_${fileId}`);
      if (savedAnnotations) {
        try {
          const localAnnotations = JSON.parse(savedAnnotations);
          setAnnotations(localAnnotations);
        } catch (error) {
          console.error('Error parsing saved annotations:', error);
        }
      }
      
      // Load versions from localStorage
      const savedVersions = localStorage.getItem(`pdf_versions_${fileId}`);
      if (savedVersions) {
        try {
          const versions = JSON.parse(savedVersions);
          setFileVersions(versions);
          
          // Set active version if not already set
          if (!activeVersionId && versions.length > 0) {
            const latestVersion = versions.reduce((prev: FileVersion, current: FileVersion) => 
              (prev.versionNumber > current.versionNumber) ? prev : current
            );
            setActiveVersionId(latestVersion.id);
            setPdfUrl(latestVersion.fileUrl);
          }
        } catch (error) {
          console.error('Error parsing saved versions:', error);
        }
      } else {
        // Create initial version if no saved versions exist
        const initialVersion: FileVersion = {
          id: fileId,
          versionNumber: 1, 
          filename: filename,
          fileUrl: initialUrl,
          description: 'Initial version',
          uploaded: new Date().toISOString(),
          uploadedBy: user?.username || 'Unknown',
          commentCount: 0
        };
        
        setFileVersions([initialVersion]);
        setActiveVersionId(initialVersion.id);
        setPdfUrl(initialVersion.fileUrl);
        
        localStorage.setItem(`pdf_versions_${fileId}`, JSON.stringify([initialVersion]));
      }
    }
    
    loadData();
  }, [fileId, filename, initialUrl, user]);

  // Handle wheel event for zooming with ctrl+mousewheel
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          const newScale = Math.max(0.5, Math.min(3, scale + delta));
          if (newScale !== scale) {
            setScale(newScale);
          }
        }
      };
      
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel);
      };
    }
  }, [scale]);

  // Document load handler
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Navigation handlers
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

  // Mouse handlers for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMarking) {
      startMarking(e);
      return;
    }
    
    e.preventDefault();
    if (containerRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setScrollPosition({ 
        x: containerRef.current.scrollLeft, 
        y: containerRef.current.scrollTop 
      });
      document.body.style.userSelect = 'none';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMarking && markingStart) {
      updateMarking(e);
      return;
    }
    
    if (isDragging && containerRef.current) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      containerRef.current.scrollLeft = scrollPosition.x - dx;
      containerRef.current.scrollTop = scrollPosition.y - dy;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isMarking && markingStart && markingEnd) {
      completeMarking(e);
      return;
    }
    
    setIsDragging(false);
    document.body.style.userSelect = '';
  };
  
  // Marking and annotation functions
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
    
    // Temporary annotation preview
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
    
    // Create a new annotation
    const newAnnotation: PDFAnnotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rect: {
        x: Math.min(markingStart.x, markingEnd.x),
        y: Math.min(markingStart.y, markingEnd.y),
        width: Math.abs(markingEnd.x - markingStart.x),
        height: Math.abs(markingEnd.y - markingStart.y),
        pageNumber: pageNumber,
      },
      color: statusColors.new_comment,
      comment: '',
      status: 'new_comment',
      createdBy: user.username,
      createdAt: new Date().toISOString(),
    };
    
    if (newAnnotation.rect.width > 10 / scale && newAnnotation.rect.height > 10 / scale) {
      setAnnotations([...annotations, newAnnotation]);
      setActiveAnnotation(newAnnotation);
      setSidebarMode('comment');
      
      try {
        const numericFileId = getConsistentFileId(fileId);
        if (!isNaN(numericFileId) && currentProject) {
          // Save to database via API
          const savedAnnotation = await savePDFAnnotation(numericFileId, {
            pdfVersionId: parseInt(activeVersionId || '0'),
            projectId: currentProject.id, // Add project ID from context
            rect: newAnnotation.rect,
            color: newAnnotation.color,
            comment: newAnnotation.comment,
            status: newAnnotation.status,
            createdAt: newAnnotation.createdAt,
            createdBy: newAnnotation.createdBy
          });
          
          if (savedAnnotation && savedAnnotation.id) {
            // Update local annotation with server-assigned ID
            const updatedAnnotations = [...annotations];
            const index = updatedAnnotations.findIndex(a => a.id === newAnnotation.id);
            if (index !== -1) {
              updatedAnnotations[index] = {
                ...newAnnotation,
                id: savedAnnotation.id.toString(),
                taskId: savedAnnotation.id.toString()
              };
              setAnnotations(updatedAnnotations);
              setActiveAnnotation(updatedAnnotations[index]);
            }
          }
        }
      } catch (error) {
        console.error('Error saving annotation:', error);
        // Save to localStorage as fallback
        localStorage.setItem(`pdf_annotations_${fileId}`, JSON.stringify([...annotations, newAnnotation]));
      }
    }
    
    // Reset marking state
    setIsMarking(false);
    setMarkingStart(null);
    setMarkingEnd(null);
    setTempAnnotation(null);
  };
  
  // Save comment and task
  const handleSaveComment = async () => {
    if (!activeAnnotation) return;
    
    // Create updated annotation with comment and task
    const updatedAnnotation: PDFAnnotation = {
      ...activeAnnotation,
      comment: newComment,
      assignedTo: assignTo,
      taskId: newTask ? `TASK-${Math.floor(Math.random() * 10000)}` : undefined
    };
    
    // Update annotations array
    const updatedAnnotations = annotations.map(a => 
      a.id === activeAnnotation.id ? updatedAnnotation : a
    );
    
    setAnnotations(updatedAnnotations);
    setActiveAnnotation(updatedAnnotation);
    setNewComment('');
    setNewTask('');
    setAssignTo(undefined);
    
    try {
      const numericFileId = getConsistentFileId(fileId);
      if (!isNaN(numericFileId) && activeAnnotation.taskId && currentProject) {
        // Update in database
        await savePDFAnnotation(numericFileId, {
          id: parseInt(activeAnnotation.taskId),
          pdfVersionId: parseInt(activeVersionId || '0'),
          projectId: currentProject.id, // Add project ID from context
          rect: updatedAnnotation.rect,
          color: updatedAnnotation.color,
          comment: updatedAnnotation.comment,
          status: updatedAnnotation.status,
          createdAt: updatedAnnotation.createdAt,
          createdBy: updatedAnnotation.createdBy,
          assignedTo: updatedAnnotation.assignedTo
        });
      }
    } catch (error) {
      console.error('Error updating annotation:', error);
    }
    
    // Save to localStorage as fallback
    localStorage.setItem(`pdf_annotations_${fileId}`, JSON.stringify(updatedAnnotations));
    
    // Go back to details view
    setSidebarMode('details');
  };
  
  // Konvertera kommentar till uppgift
  const handleConvertToTask = async (annotationId: string) => {
    if (!currentProject) {
      return;
    }
    
    try {
      // Hämta numeriska ID:t från vår string ID
      const numericId = parseInt(annotationId);
      if (isNaN(numericId)) {
        console.error('Kunde inte konvertera annotations-ID till ett numeriskt värde:', annotationId);
        return;
      }
      
      const result = await convertAnnotationToTask(numericId);
      
      if (result && result.task) {
        // Uppdatera annotationen med task-ID
        const updatedAnnotations = annotations.map(a => {
          if (a.id === annotationId) {
            return { 
              ...a, 
              taskId: result.task.id.toString() 
            };
          }
          return a;
        });
        
        setAnnotations(updatedAnnotations);
        
        // Uppdatera aktiv annotation om det är den som konverterades
        if (activeAnnotation && activeAnnotation.id === annotationId) {
          setActiveAnnotation({
            ...activeAnnotation,
            taskId: result.task.id.toString()
          });
        }
        
        // Visa bekräftelse
        setSidebarMode('details');
      }
    } catch (error) {
      console.error('Fel vid konvertering till uppgift:', error);
    }
  };

  // Update annotation status
  const updateAnnotationStatus = async (annotationId: string, newStatus: 'new_comment' | 'action_required' | 'rejected' | 'new_review' | 'other_forum' | 'resolved') => {
    const updatedAnnotations = annotations.map(a => {
      if (a.id === annotationId) {
        return { ...a, status: newStatus, color: statusColors[newStatus] };
      }
      return a;
    });
    
    setAnnotations(updatedAnnotations);
    
    // Update active annotation if it's the one being modified
    if (activeAnnotation && activeAnnotation.id === annotationId) {
      setActiveAnnotation({
        ...activeAnnotation,
        status: newStatus,
        color: statusColors[newStatus]
      });
    }
    
    try {
      const numericFileId = getConsistentFileId(fileId);
      if (!isNaN(numericFileId) && currentProject) {
        const annotation = annotations.find(a => a.id === annotationId);
        if (annotation && annotation.taskId) {
          // Update in database
          await savePDFAnnotation(numericFileId, {
            id: parseInt(annotation.taskId),
            pdfVersionId: parseInt(activeVersionId || '0'),
            projectId: currentProject.id, // Add project ID from context
            rect: annotation.rect,
            color: statusColors[newStatus],
            comment: annotation.comment,
            status: newStatus,
            createdAt: annotation.createdAt,
            createdBy: annotation.createdBy,
            assignedTo: annotation.assignedTo
          });
        }
      }
    } catch (error) {
      console.error('Error updating annotation status:', error);
    }
    
    // Save to localStorage as fallback
    localStorage.setItem(`pdf_annotations_${fileId}`, JSON.stringify(updatedAnnotations));
  };
  
  // Find and zoom to an annotation
  const zoomToAnnotation = (annotation: PDFAnnotation) => {
    if (!containerRef.current || !pageRef.current) return;
    
    // Set the page number first if needed
    if (pageNumber !== annotation.rect.pageNumber) {
      setPageNumber(annotation.rect.pageNumber);
    }
    
    // Wait for the page to render
    setTimeout(() => {
      if (!containerRef.current || !pageRef.current) return;
      
      const pageRect = pageRef.current.getBoundingClientRect();
      
      // Calculate the center of the annotation in the scaled coordinate system
      const annotationCenterX = (annotation.rect.x + annotation.rect.width / 2) * scale;
      const annotationCenterY = (annotation.rect.y + annotation.rect.height / 2) * scale;
      
      // Calculate the scroll position to center the annotation in the viewport
      const centerX = pageRect.left + annotationCenterX - containerRef.current.clientWidth / 2;
      const centerY = pageRect.top + annotationCenterY - containerRef.current.clientHeight / 2;
      
      // Scroll to the annotation
      containerRef.current.scrollLeft = centerX;
      containerRef.current.scrollTop = centerY;
      
      // Set the annotation as active
      setActiveAnnotation(annotation);
    }, 100);
  };
  
  // Upload a new version
  const handleUploadVersion = async () => {
    if (!newVersionFile || !user) return;
    
    setUploadingVersion(true);
    
    try {
      const numericFileId = getConsistentFileId(fileId);
      if (!isNaN(numericFileId)) {
        // Upload to API
        const uploadedVersion = await uploadPDFVersion(
          numericFileId,
          newVersionFile,
          newVersionDescription || `Version ${fileVersions.length + 1}`
        );
        
        if (uploadedVersion) {
          // Convert API version to UI format
          const newVersion: FileVersion = {
            id: uploadedVersion.id.toString(),
            versionNumber: uploadedVersion.versionNumber,
            filename: uploadedVersion.metadata?.fileName || newVersionFile.name,
            fileUrl: `/api/pdf/versions/${uploadedVersion.id}/content`,
            description: uploadedVersion.description,
            uploaded: uploadedVersion.uploadedAt,
            uploadedBy: uploadedVersion.uploadedBy,
            commentCount: 0
          };
          
          // Update versions and set the new one as active
          const updatedVersions = [...fileVersions, newVersion];
          setFileVersions(updatedVersions);
          setActiveVersionId(newVersion.id);
          setPdfUrl(newVersion.fileUrl);
          
          // Also save to localStorage as backup
          localStorage.setItem(`pdf_versions_${fileId}`, JSON.stringify(updatedVersions));
        } else {
          // Fallback to localStorage
          fallbackToLocalStorage();
        }
      } else {
        fallbackToLocalStorage();
      }
    } catch (error) {
      console.error('Error uploading version:', error);
      fallbackToLocalStorage();
    } finally {
      setUploadingVersion(false);
      setNewVersionFile(null);
      setNewVersionDescription('');
    }
    
    function fallbackToLocalStorage() {
      if (!newVersionFile || !user) return;
      
      // Create local file URL
      const tempFileUrl = URL.createObjectURL(newVersionFile);
      
      // Store file for reuse
      const localFileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      storeFileForReuse(newVersionFile, { uniqueId: localFileId });
      
      // Create new version info
      const newVersion: FileVersion = {
        id: localFileId,
        versionNumber: fileVersions.length + 1,
        filename: newVersionFile.name,
        fileUrl: tempFileUrl,
        description: newVersionDescription || `Version ${fileVersions.length + 1}`,
        uploaded: new Date().toISOString(),
        uploadedBy: user.username,
        commentCount: 0
      };
      
      // Update versions list
      const updatedVersions = [...fileVersions, newVersion];
      setFileVersions(updatedVersions);
      setActiveVersionId(newVersion.id);
      setPdfUrl(tempFileUrl);
      
      // Save to localStorage
      localStorage.setItem(`pdf_versions_${fileId}`, JSON.stringify(updatedVersions));
    }
  };
  
  // Calculate how many days ago a date was
  const daysAgo = (dateString: string): string => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'idag';
    if (days === 1) return 'igår';
    if (days < 7) return `${days} dagar sedan`;
    if (days < 30) return `${Math.floor(days / 7)} veckor sedan`;
    return `${Math.floor(days / 30)} månader sedan`;
  };
  
  // Format date nicely
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header bar */}
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={onClose} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
          </Button>
          <h1 className="text-lg font-medium">{filename}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowVersionHistory(!showVersionHistory)}>
            <History className="h-4 w-4 mr-1" /> Versioner
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsMarking(!isMarking)}>
            <Pencil className="h-4 w-4 mr-1" /> {isMarking ? 'Avbryt markering' : 'Markera område'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Ny version
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf"
            hidden
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setNewVersionFile(e.target.files[0]);
                setNewVersionDescription('');
                setSidebarMode('history');
              }
            }}
          />
        </div>
      </div>
      
      {/* Version tabs */}
      <div className="border-b bg-white px-4 py-2 flex items-center gap-4">
        <Button 
          variant={activeVersionId === fileVersions[fileVersions.length - 1]?.id ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const latestVersion = fileVersions[fileVersions.length - 1];
            if (latestVersion) {
              setActiveVersionId(latestVersion.id);
              setPdfUrl(latestVersion.fileUrl);
            }
          }}
        >
          Nuvarande version
        </Button>
        
        {fileVersions.length > 1 && (
          <Button 
            variant={activeVersionId !== fileVersions[fileVersions.length - 1]?.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const oldestVersion = fileVersions[0];
              if (oldestVersion) {
                setActiveVersionId(oldestVersion.id);
                setPdfUrl(oldestVersion.fileUrl);
              }
            }}
          >
            Ursprunglig version
          </Button>
        )}
      </div>
      
      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* PDF viewer */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-200"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div 
            ref={pdfContainerRef}
            style={{ 
              transform: `scale(${scale})`,
              transformOrigin: '0 0',
              cursor: isMarking ? 'crosshair' : isDragging ? 'grabbing' : 'grab'
            }}
          >
            <div ref={pageRef}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>}
                error={<div className="p-8 text-center text-red-500">Failed to load PDF document.</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<div className="flex items-center justify-center h-[600px]"><Loader2 className="animate-spin h-8 w-8" /></div>}
                />
              </Document>
              
              {/* Render annotations */}
              {annotations
                .filter(annotation => annotation.rect.pageNumber === pageNumber)
                .map(annotation => (
                  <div
                    key={annotation.id}
                    className="absolute border-2 cursor-pointer transition-colors hover:bg-opacity-30"
                    style={{
                      left: `${annotation.rect.x}px`,
                      top: `${annotation.rect.y}px`,
                      width: `${annotation.rect.width}px`,
                      height: `${annotation.rect.height}px`,
                      borderColor: annotation.color,
                      backgroundColor: `${annotation.color}33`, // 20% opacity
                      boxShadow: activeAnnotation?.id === annotation.id ? `0 0 0 2px white, 0 0 0 4px ${annotation.color}` : 'none',
                      zIndex: activeAnnotation?.id === annotation.id ? 10 : 1
                    }}
                    onClick={() => {
                      setActiveAnnotation(annotation);
                      setSidebarMode('comment');
                    }}
                  />
                ))}
              
              {/* Temporary annotation while marking */}
              {tempAnnotation && (
                <div
                  className="absolute border-2 bg-opacity-20"
                  style={{
                    left: `${tempAnnotation.rect?.x}px`,
                    top: `${tempAnnotation.rect?.y}px`,
                    width: `${tempAnnotation.rect?.width}px`,
                    height: `${tempAnnotation.rect?.height}px`,
                    borderColor: tempAnnotation.color,
                    backgroundColor: tempAnnotation.color,
                  }}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Right sidebar */}
        <div className="w-80 border-l bg-white overflow-y-auto">
          {/* Sidebar navigation */}
          <div className="border-b p-3 flex">
            <Button 
              variant={sidebarMode === 'details' ? 'default' : 'outline'} 
              size="sm"
              className="flex-1"
              onClick={() => setSidebarMode('details')}
            >
              Detaljer
            </Button>
            <Button 
              variant={sidebarMode === 'history' ? 'default' : 'outline'} 
              size="sm"
              className="flex-1"
              onClick={() => setSidebarMode('history')}
            >
              Historik
            </Button>
            <Button 
              variant={sidebarMode === 'comment' ? 'default' : 'outline'} 
              size="sm"
              className="flex-1"
              onClick={() => setSidebarMode('comment')}
              disabled={!activeAnnotation}
            >
              Kommentar
            </Button>
          </div>
          
          {/* Sidebar content */}
          <div className="p-4">
            {sidebarMode === 'details' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Extra tätskiktsremsa YEP #{Math.floor(Math.random() * 1000)}</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Skapad av</label>
                    <div className="flex items-center mt-1">
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarImage src={`https://avatar.vercel.sh/${fileVersions[0]?.uploadedBy || 'user'}.png`} />
                        <AvatarFallback>
                          {(fileVersions[0]?.uploadedBy || 'U').substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{fileVersions[0]?.uploadedBy || 'Unknown'}, {formatDate(fileVersions[0]?.uploaded || new Date().toISOString())}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tilldelad till</label>
                    <div className="flex items-center mt-1">
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarImage src="https://avatar.vercel.sh/benoit.png" />
                        <AvatarFallback>B</AvatarFallback>
                      </Avatar>
                      <span>Benoit Nielsen, Konstruktör</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Deadline</label>
                    <div className="flex items-center mt-1">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Granskningspaket</label>
                    <div className="mt-1">
                      <span>K - Granskning BH Hus 3-4</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Typ</label>
                    <div className="mt-1">
                      <Badge variant="outline" className="mr-2">Gransknings kommentar</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Aktivitet</h4>
                  
                  {/* Annotations activity */}
                  {annotations.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-xs font-medium uppercase text-muted-foreground mb-2">Kommentarer</h5>
                      {annotations.slice().reverse().map((annotation) => (
                        <div 
                          key={annotation.id} 
                          className="mb-3 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            // Set page number if different
                            if (pageNumber !== annotation.rect.pageNumber) {
                              setPageNumber(annotation.rect.pageNumber);
                            }
                            
                            // Highlight the annotation
                            setActiveAnnotation(annotation);
                            setSidebarMode('comment');
                            
                            // Scroll to annotation after a short delay
                            setTimeout(() => {
                              zoomToAnnotation(annotation);
                            }, 100);
                          }}
                        >
                          <div className="flex items-start">
                            <div 
                              className="w-3 h-3 mt-1 rounded-full mr-2 flex-shrink-0" 
                              style={{ backgroundColor: annotation.color }}
                            />
                            <div className="flex-1 overflow-hidden">
                              <div className="font-medium text-sm truncate">
                                {annotation.comment.substring(0, 40)}{annotation.comment.length > 40 ? '...' : ''}
                              </div>
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <Avatar className="h-4 w-4 mr-1">
                                  <AvatarImage src={`https://avatar.vercel.sh/${annotation.createdBy}.png`} />
                                  <AvatarFallback>{annotation.createdBy.substring(0, 1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="mr-1">{annotation.createdBy},</span>
                                <span>sid {annotation.rect.pageNumber}</span>
                                <Badge className="ml-2" variant="outline">{annotation.status}</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Version history activity */}
                  <h5 className="text-xs font-medium uppercase text-muted-foreground mb-2">Versioner</h5>
                  {fileVersions.slice().reverse().map((version, i) => (
                    <div key={version.id} className="mb-4">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Version {version.versionNumber}</div>
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
                      
                      <div className="flex items-center mt-1">
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarImage src={`https://avatar.vercel.sh/${version.uploadedBy}.png`} />
                          <AvatarFallback>
                            {version.uploadedBy.substring(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          <span className="font-medium">{version.uploadedBy}</span>
                          <span className="text-muted-foreground"> för {i === 0 ? '12' : '17'} dagar sedan</span>
                        </span>
                      </div>
                      
                      {version.id === fileVersions[fileVersions.length - 1]?.id && (
                        <div className="text-sm mt-1 text-muted-foreground">
                          Uppdaterade ny version
                        </div>
                      )}
                      
                      {i === 1 && version.id !== activeVersionId && (
                        <div className="text-sm mt-1 text-muted-foreground">
                          Lade till kommentar för din granskning
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {sidebarMode === 'history' && (
              <div>
                <h3 className="text-lg font-medium mb-4">Versionshistorik</h3>
                
                {newVersionFile && (
                  <div className="mb-6 p-3 border rounded-md bg-gray-50">
                    <h4 className="font-medium mb-2">Ladda upp ny version</h4>
                    <div className="mb-3">
                      <p className="text-sm mb-1">{newVersionFile.name}</p>
                      <Textarea
                        placeholder="Beskriv ändringarna i denna version..."
                        value={newVersionDescription}
                        onChange={e => setNewVersionDescription(e.target.value)}
                        className="w-full h-20 text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNewVersionFile(null)}
                      >
                        Avbryt
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUploadVersion}
                        disabled={uploadingVersion}
                      >
                        {uploadingVersion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ladda upp
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {fileVersions.slice().reverse().map((version, index) => (
                    <div key={version.id} className="flex">
                      <div className="mr-4 relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://avatar.vercel.sh/${version.uploadedBy}.png`} />
                          <AvatarFallback>
                            {version.uploadedBy.substring(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {index < fileVersions.length - 1 && (
                          <div className="absolute top-10 bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gray-200" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <div>
                            <span className="font-medium">{version.uploadedBy}</span>
                            <span className="text-muted-foreground text-sm ml-2">
                              för {index === 0 ? '12' : '17'} dagar sedan
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setActiveVersionId(version.id);
                              setPdfUrl(version.fileUrl);
                              setSidebarMode('details');
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
                          
                          {annotations.filter(a => a.comment.trim() !== '').length > 0 && index === 0 && (
                            <Badge variant="outline" className="ml-2">
                              <MessageSquare className="h-3 w-3 mr-1" /> 
                              {annotations.filter(a => a.comment.trim() !== '').length} kommentarer
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {sidebarMode === 'comment' && activeAnnotation && (
              <div>
                <h3 className="text-lg font-medium mb-4">
                  {activeAnnotation.comment ? 'Kommentar' : 'Ny kommentar'}
                </h3>
                
                <div className="mb-4">
                  <div className="flex gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://avatar.vercel.sh/${activeAnnotation.createdBy}.png`} />
                      <AvatarFallback>
                        {activeAnnotation.createdBy.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="font-medium">{activeAnnotation.createdBy}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(activeAnnotation.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <Button
                      size="sm"
                      variant={activeAnnotation.status === 'new_comment' ? 'default' : 'outline'}
                      className={activeAnnotation.status === 'new_comment' ? 'bg-pink-500 hover:bg-pink-600' : ''}
                      onClick={() => updateAnnotationStatus(activeAnnotation.id, 'new_comment')}
                    >
                      Ny kommentar
                    </Button>
                    <Button
                      size="sm"
                      variant={activeAnnotation.status === 'action_required' ? 'default' : 'outline'}
                      className={activeAnnotation.status === 'action_required' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => updateAnnotationStatus(activeAnnotation.id, 'action_required')}
                    >
                      Ska åtgärdas
                    </Button>
                    <Button
                      size="sm"
                      variant={activeAnnotation.status === 'rejected' ? 'default' : 'outline'}
                      className={activeAnnotation.status === 'rejected' ? 'bg-gray-500 hover:bg-gray-600' : ''}
                      onClick={() => updateAnnotationStatus(activeAnnotation.id, 'rejected')}
                    >
                      Avvisas
                    </Button>
                    <Button
                      size="sm"
                      variant={activeAnnotation.status === 'new_review' ? 'default' : 'outline'}
                      className={activeAnnotation.status === 'new_review' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => updateAnnotationStatus(activeAnnotation.id, 'new_review')}
                    >
                      Ny granskning
                    </Button>
                    <Button
                      size="sm"
                      variant={activeAnnotation.status === 'other_forum' ? 'default' : 'outline'}
                      className={activeAnnotation.status === 'other_forum' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      onClick={() => updateAnnotationStatus(activeAnnotation.id, 'other_forum')}
                    >
                      Annat forum
                    </Button>
                    <Button
                      size="sm"
                      variant={activeAnnotation.status === 'resolved' ? 'default' : 'outline'}
                      className={activeAnnotation.status === 'resolved' ? 'bg-green-500 hover:bg-green-600' : ''}
                      onClick={() => updateAnnotationStatus(activeAnnotation.id, 'resolved')}
                    >
                      Har åtgärdats
                    </Button>

                  </div>
                  
                  {activeAnnotation.comment ? (
                    <div className="rounded-md border p-3 bg-gray-50">
                      {activeAnnotation.comment}
                      
                      {activeAnnotation.assignedTo && (
                        <div className="mt-3 pt-3 border-t flex items-center">
                          <span className="text-sm font-medium mr-2">Tilldelad till:</span>
                          <Avatar className="h-6 w-6 mr-1">
                            <AvatarImage src={`https://avatar.vercel.sh/${activeAnnotation.assignedTo}.png`} />
                            <AvatarFallback>
                              {activeAnnotation.assignedTo.substring(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{activeAnnotation.assignedTo}</span>
                        </div>
                      )}
                      
                      {activeAnnotation.taskId && (
                        <div className="mt-2 flex items-center">
                          <span className="text-sm font-medium mr-2">Uppgift:</span>
                          <Badge variant="outline">
                            {activeAnnotation.taskId}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="mt-3 flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setNewComment(activeAnnotation.comment);
                            setNewTask(activeAnnotation.taskId || '');
                            setAssignTo(activeAnnotation.assignedTo);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" /> Redigera
                        </Button>
                        
                        {!activeAnnotation.taskId && currentProject && (
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => handleConvertToTask(activeAnnotation.id)}
                          >
                            <ClipboardList className="h-3 w-3 mr-1" /> Konvertera till uppgift
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Skriv din kommentar här..."
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        className="w-full h-24 resize-none"
                      />
                      
                      <div>
                        <label className="text-sm font-medium block mb-2">Tilldela till någon</label>
                        <Select 
                          value={assignTo} 
                          onValueChange={value => setAssignTo(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Välj person" />
                          </SelectTrigger>
                          <SelectContent>
                            {projectMembers.length > 0 ? (
                              projectMembers.map(member => (
                                <SelectItem key={member.id} value={member.username}>
                                  {member.username}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none">Inga projektmedlemmar tillgängliga</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium block mb-2">Skapa uppgift</label>
                        <Input
                          placeholder="Lägg till uppgiftsbeskrivning..."
                          value={newTask}
                          onChange={e => setNewTask(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <Button onClick={handleSaveComment}>
                          Spara kommentar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm">
            Sida {pageNumber} av {numPages || '?'}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextPage}
            disabled={!numPages || pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
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
          
          <span className="text-sm">
            {Math.round(scale * 100)}%
          </span>
          
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
  );
}