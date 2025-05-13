import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/contexts/ProjectContext";
import { Document, Page, pdfjs } from "react-pdf";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { configurePdfWorker, configureAlternativePdfLoading } from '@/lib/pdf-worker-config';
import { useToast } from "@/hooks/use-toast";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { sv } from "date-fns/locale";
import { 
  getPDFVersionContent, 
  getLatestPDFVersion, 
  getConsistentFileId,
  getPDFVersions,
  uploadPDFVersion,
  getPDFAnnotations,
  savePDFAnnotation,
  deletePDFAnnotation,
  convertAnnotationToTask,
  PDFVersion as ApiPDFVersion,
  PDFAnnotation as ApiPDFAnnotation 
} from "@/lib/pdf-utils";
import { storeFileForReuse } from "@/lib/file-utils";

// Konfigurerar PDF.js för att hantera avbrutna förfrågningar bättre
// Använd vår förbättrade konfiguration istället för direkt tilldelning
configurePdfWorker();
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
  Clock,
  ClipboardList,
  Calendar as CalendarIcon
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

// Configure react-pdf worker is handled by pdf-worker-config.ts

// PDF Annotation interface
export interface PDFAnnotation {
  id: string;
  pdfVersionId?: number; // Lägg till stöd för versionId
  projectId?: number | null; // Lägg till stöd för projektId
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
  deadline?: string; // Deadline för annotationen
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
  fileId?: string | number;
  initialUrl?: string;
  filename?: string;
  onClose?: () => void;
  projectId?: number | null;
  useDatabase?: boolean;
  file?: File | null;
  // Parameters for direct PDF viewing with annotations
  versionId?: number;
  pdfFile?: Blob | null;
  highlightAnnotationId?: number;
  annotationId?: number; // ID för att fokusera på en specifik annotation
  // Dialog mode flag - när true visas PDF:en i dialog/popup-läge
  isDialogMode?: boolean;
  // Folder association - vilken mapp filen tillhör
  folderId?: number | null;
}

type Position = { x: number; y: number };

export default function EnhancedPDFViewer({
  fileId,
  initialUrl,
  filename,
  onClose,
  projectId,
  useDatabase = false,
  file,
  versionId,
  pdfFile,
  highlightAnnotationId,
  annotationId,
  isDialogMode = false,
  folderId
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
  const [deadline, setDeadline] = useState<Date | undefined>(addDays(new Date(), 14)); // Standard deadline 2 veckor framåt
  const [tempAnnotation, setTempAnnotation] = useState<Partial<PDFAnnotation> | null>(null);
  
  // Version management
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | number | undefined>(undefined);
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
  
  // Anväd react-query mutation för att hämta PDF-innehåll
  const fetchPdfContentMutation = useMutation({
    mutationFn: async (versionId: number | string) => {
      try {
        console.log(`Hämtar PDF-innehåll för version: ${versionId}`);
        
        // Omvandla versionId till number om det är en sträng
        const numericVersionId = typeof versionId === 'string' ? parseInt(versionId) : versionId;
        
        // Hämta innehållet
        const content = await getPDFVersionContent(numericVersionId);
        if (!content) {
          throw new Error("Kunde inte ladda PDF-innehåll");
        }
        
        return content;
      } catch (error) {
        console.error(`Fel vid hämtning av PDF-innehåll för version ${versionId}:`, error);
        throw error;
      }
    },
    onSuccess: (content) => {
      // Konvertera blob till URL
      const blobUrl = URL.createObjectURL(content);
      console.log(`Skapade blob URL: ${blobUrl}`);
      setPdfUrl(blobUrl);
      
      // Spara även för lokal lagring
      if (file || content) {
        const pdfFile = file || new File([content], filename, { type: "application/pdf" });
        const uniqueId = `file_${getConsistentFileId(fileId)}`;
        storeFileForReuse(pdfFile, { uniqueId });
        console.log(`PDF-fil sparad för återanvändning som: ${uniqueId}`);
      }
    },
    onError: (error) => {
      console.error('Fel vid hämtning av PDF-innehåll:', error);
      toast({
        title: "Fel vid dokumentladdning",
        description: "Kunde inte ladda PDF-innehållet optimalt. Försöker med alternativ metod.",
        variant: "destructive",
      });
      
      // Fallback till direkt URL om vi har en aktiv version
      if (activeVersionId) {
        setPdfUrl(`/api/pdf/versions/${activeVersionId}/content?t=${Date.now()}`);
      } else if (initialUrl) {
        setPdfUrl(initialUrl);
      }
    }
  });

  // Load PDF data when component mounts
  useEffect(() => {
    // Om vi får direkta parametrar (versionId och pdfFile), använd dessa istället för att ladda från databasen
    if (versionId && pdfFile) {
      console.log(`Använder direkt versionId: ${versionId} och pdfFile (Blob)`);
      const blobUrl = URL.createObjectURL(pdfFile);
      setPdfUrl(blobUrl);
      setActiveVersionId(versionId);
      
      // Ladda annotationer om versionId är tillgängligt
      if (versionId) {
        const loadAnnotations = async () => {
          try {
            const annots = await getPDFAnnotations(versionId, projectId);
            console.log(`Hämtade ${annots.length} annotationer för versionId: ${versionId}`);
            
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
                comment: anno.comment || '',
                status: anno.status,
                createdBy: anno.createdBy || user?.username || 'Unknown',
                createdAt: anno.createdAt ? 
                  (typeof anno.createdAt === 'string' && anno.createdAt.match(/^\d{4}-\d{2}-\d{2}/) ? 
                    anno.createdAt : new Date().toISOString()) : 
                  new Date().toISOString(),
                assignedTo: anno.assignedTo,
                taskId: anno.id?.toString(),
                pdfVersionId: anno.pdfVersionId
              }));
              
              setAnnotations(uiAnnotations);
              
              // Markera den specificerade annotationen om highlightAnnotationId eller annotationId anges
              if (highlightAnnotationId || annotationId) {
                const targetId = annotationId || highlightAnnotationId;
                const annotation = uiAnnotations.find(a => Number(a.id) === targetId);
                if (annotation) {
                  setActiveAnnotation(annotation);
                  // Sätt sidebarMode till comment för att visa kommentarspanelen
                  setSidebarMode('comment');
                  
                  // Sätt även pageNumber för att visa rätt sida med annotationen
                  if (annotation.rect && annotation.rect.pageNumber) {
                    setPageNumber(annotation.rect.pageNumber);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Fel vid hämtning av annotationer för versionId ${versionId}:`, error);
          }
        };
        
        loadAnnotations();
      }
      
      return; // Avsluta här, vi behöver inte ladda mer data
    }
    
    async function loadData() {
      try {
        // Fallback till fileId om versionId inte är tillgängligt
        const numericFileId = fileId ? getConsistentFileId(fileId) : undefined;
        console.log(`[${new Date().toISOString()}] Laddar PDF-data för fileId: ${fileId} (numeriskt: ${numericFileId}), folderId: ${folderId}`);
        
        // MAPPVALIDERING: Kontrollera att denna fil tillhör rätt mapp (om mappfiltrering är aktivt)
        if (folderId !== undefined && numericFileId !== undefined) {
          console.log(`MAPPVALIDERING: Kontrollerar att fil ${numericFileId} tillhör mapp ${folderId}`);
          
          // Om folderId är null, kontrollerar vi att filen är i rotmappen
          // Om folderId är satt, kontrollerar vi att filen tillhör den angivna mappen
          if (folderId === null) {
            console.log(`MAPPVALIDERING: Kontrollerar att fil ${numericFileId} finns i rotmappen (ingen mapp)`);
          } else {
            console.log(`MAPPVALIDERING: Kontrollerar att fil ${numericFileId} finns i mapp ${folderId}`);
          }
          
          try {
            // Asynkron validering av mapp-tillhörighet
            const isValidFolder = await validateFileFolder(numericFileId, folderId);
            if (!isValidFolder) {
              console.error(`Fil ${numericFileId} tillhör inte mapp ${folderId}, visar felmeddelande`);
              toast({
                title: "Åtkomst nekad",
                description: "Denna fil tillhör inte den valda mappen. Kontakta systemadministratören om detta är ett fel.",
                variant: "destructive",
              });
              return; // Avbryt laddning av PDF om filen inte tillhör rätt mapp
            } else {
              console.log(`Validering OK: Fil ${numericFileId} tillhör mapp ${folderId}`);
            }
          } catch (error) {
            console.error('Fel vid validering av mapp-tillhörighet:', error);
            // Fortsätt med laddningen även vid valideringsfel, för att säkerställa att systemet inte låser sig
          }
        }
        
        if (numericFileId !== undefined && !isNaN(numericFileId) && (useDatabase || projectId)) {
          // Load versions
          const versions = await getPDFVersions(numericFileId);
          console.log(`PDF-versioner från API (innehåller metadata):`, JSON.stringify(versions, null, 2));
          
          if (versions && versions.length > 0) {
            const uiVersions: FileVersion[] = versions.map(version => ({
              id: version.id.toString(),
              versionNumber: version.versionNumber,
              filename: version.metadata?.fileName || filename,
              // Vi kommer att hämta och generera URL senare, inte direkt via API-länkar
              fileUrl: '',
              description: version.description,
              uploaded: version.uploadedAt || new Date().toISOString(), // Säkerställ att uploaded alltid har ett värde
              uploadedBy: version.uploadedBy || user?.username || 'Unknown',
              commentCount: 0
            }));
            
            console.log(`Bearbetade UI-versioner:`, JSON.stringify(uiVersions.map(v => ({
              id: v.id,
              versionNumber: v.versionNumber,
              filename: v.filename,
              fileUrl: v.fileUrl
            })), null, 2));
            
            setFileVersions(uiVersions);
            
            // Set latest version as active
            const latestVersion = uiVersions.reduce((prev, current) => 
              (prev.versionNumber > current.versionNumber) ? prev : current
            );
            
            console.log(`Använder senaste versionen: ${latestVersion.id} (nummer: ${latestVersion.versionNumber})`);
            
            setActiveVersionId(latestVersion.id);
            
            // Använd fetchPdfContentMutation för att hämta innehållet
            console.log(`Hämtar PDF-innehåll för version: ${latestVersion.id}`);
            fetchPdfContentMutation.mutate(latestVersion.id);
            
            // Spara versionsinformation i localStorage för om servern skulle starta om
            if (fileId) {
              localStorage.setItem(`pdf_versions_${fileId.toString()}`, JSON.stringify(uiVersions));
              console.log(`Sparade ${uiVersions.length} versioner till localStorage (säkerhetskopia)`);
            }
            
            // Load annotations - filter by project if available
            const projectIdToUse = projectId || (currentProject ? currentProject.id : undefined);
            // Använd latestVersion.id (versions-ID) istället för numericFileId (fil-ID) för att hämta annotationer
            const annots = await getPDFAnnotations(parseInt(latestVersion.id), projectIdToUse);
            console.log(`PDF-annotationer från API för versionId ${latestVersion.id}:`, JSON.stringify(annots, null, 2));
            
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
                comment: anno.comment || '',
                status: anno.status,
                createdBy: anno.createdBy || user?.username || 'Unknown',
                createdAt: anno.createdAt ? 
                  (typeof anno.createdAt === 'string' && anno.createdAt.match(/^\d{4}-\d{2}-\d{2}/) ? 
                    anno.createdAt : new Date().toISOString()) : 
                  new Date().toISOString(),
                assignedTo: anno.assignedTo,
                taskId: anno.taskId?.toString() || null, // Använd anno.taskId istället för anno.id
                pdfVersionId: anno.pdfVersionId, // Viktig för korrekt hantering av PDF-versioner
                deadline: anno.deadline // Lägg till deadline i UI-objektet
              }));
              
              setAnnotations(uiAnnotations);
              
              // Spara annotationer i localStorage för om servern skulle starta om
              if (fileId) {
                localStorage.setItem(`pdf_annotations_${fileId.toString()}`, JSON.stringify(uiAnnotations));
                console.log(`Sparade ${uiAnnotations.length} annotationer till localStorage (säkerhetskopia)`);
              }
            } else {
              loadFromLocalStorage();
            }
          } else {
            console.log(`Inga versioner hittades för fileId ${numericFileId}, använder localStorage`);
            loadFromLocalStorage();
          }
        } else {
          console.log(`FileId ${fileId} är inte ett giltigt id eller database/projectId saknas, använder localStorage`);
          loadFromLocalStorage();
        }
      } catch (error) {
        console.error('Error loading PDF data:', error);
        loadFromLocalStorage();
      }
    }
    
    function loadFromLocalStorage() {
      // Om vi explicit ska använda databasen kan vi skippa localStorage
      if (useDatabase && !projectId) {
        console.log(`Skippar localStorage eftersom useDatabase=${useDatabase}`);
        return;
      }
      
      // Hantera om fileId är undefined
      if (!fileId) {
        console.log("Inget fileId tillgängligt för att läsa från localStorage");
        return;
      }
      
      // Konvertera fileId till en string för localStorage-nyckel
      const storageKey = `pdf_annotations_${fileId.toString()}`;
      console.log(`Försöker läsa annotationer från localStorage med nyckel: ${storageKey}`);
      
      // Ladda annotationer från localStorage
      const savedAnnotations = localStorage.getItem(storageKey);
      if (savedAnnotations) {
        try {
          // Parsa sparade annotationer och logga dem för felsökning
          const localAnnotations = JSON.parse(savedAnnotations);
          console.log(`Hittade ${localAnnotations.length} annotationer i localStorage:`, 
            JSON.stringify(localAnnotations).substring(0, 200) + '...');
          
          // Filtrera bort ogiltiga värden (t.ex. null eller undefined)
          const validAnnotations = Array.isArray(localAnnotations) 
            ? localAnnotations.filter(a => a && typeof a === 'object')
            : [];
            
          if (validAnnotations.length !== localAnnotations.length) {
            console.warn(`Filtrerade bort ${localAnnotations.length - validAnnotations.length} ogiltiga annotationer`);
          }
          
          // Uppdatera UI
          setAnnotations(validAnnotations);
        } catch (error) {
          console.error('Error parsing saved annotations:', error);
        }
      } else {
        console.log(`Inga sparade annotationer hittades för nyckel: ${storageKey}`);
      }
      
      // Load versions from localStorage
      const savedVersions = localStorage.getItem(`pdf_versions_${fileId.toString()}`);
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
        // Säkerställ att filename och initialUrl har defaultvärden
        const safeFilename = filename || 'unnamed-document';
        const safeInitialUrl = initialUrl || '';
        
        const initialVersion: FileVersion = {
          id: fileId.toString(),
          versionNumber: 1, 
          filename: safeFilename,
          fileUrl: safeInitialUrl,
          description: 'Initial version',
          uploaded: new Date().toISOString(),
          uploadedBy: user?.username || 'Unknown',
          commentCount: 0
        };
        
        setFileVersions([initialVersion]);
        setActiveVersionId(initialVersion.id);
        setPdfUrl(safeInitialUrl);
        
        localStorage.setItem(`pdf_versions_${fileId.toString()}`, JSON.stringify([initialVersion]));
      }
    }
    
    loadData();
  }, [fileId, filename, initialUrl, user, currentProject, projectId, useDatabase]);

  // Lägg till en cleanup-funktion för att spara kommentarer när komponenten avmonteras
  useEffect(() => {
    // Rensa/spara vid avmontering
    return () => {
      console.log(`[${new Date().toISOString()}] PDF-visare avmonteras, sparar kommentarer...`);
      if (annotations.length > 0) {
        if (useDatabase && currentProject) {
          // Vi kan inte använda await i cleanup-funktioner, så vi använder promise  
          console.log(`[${new Date().toISOString()}] Sparar ${annotations.length} kommentarer till databasen vid avmontering`);
          
          // Vi måste ha en lokal referens till de variabler vi behöver
          const localAnnotations = [...annotations];
          const localFileId = fileId;
          const localActiveVersionId = activeVersionId;
          const localCurrentProject = currentProject;
          
          // Vi kan inte använda async/await här, så istället använder vi promise direkt
          const savePromise = new Promise<void>(async (resolve, reject) => {
            try {
              // För att undvika problem med att saveAllUnsavedAnnotations inte finns i beroendelistan
              // skapar vi en egen funktion här som gör samma sak
              const numericFileId = getConsistentFileId(localFileId);
              if (isNaN(numericFileId) || !localActiveVersionId) {
                console.error('Kunde inte spara annotationer: ogiltigt fileId eller versionId');
                resolve();
                return;
              }
              
              const savePromises = localAnnotations.map(async (annotation) => {
                const isNumericId = typeof annotation.id === 'string' && !isNaN(parseInt(annotation.id));
                const idToUse = isNumericId ? parseInt(annotation.id) : undefined;
                
                try {
                  // Säkerställ att versionId är ett giltigt nummer
                  if (!localActiveVersionId) {
                    console.error(`Saknat versionId: ${localActiveVersionId} vid sparande av annotation`);
                    throw new Error('Saknat versionId');
                  }
                  
                  // Konvertera versionId till number om det är en sträng
                  const versionIdToUse = typeof localActiveVersionId === 'string' 
                    ? parseInt(localActiveVersionId) 
                    : localActiveVersionId;
                  
                  // Skapa en kopia med korrekt versionId
                  const annotationToSave = {
                    id: idToUse,
                    pdfVersionId: versionIdToUse,
                    projectId: localCurrentProject.id,
                    rect: annotation.rect,
                    color: annotation.color, 
                    comment: annotation.comment,
                    status: annotation.status,
                    createdAt: annotation.createdAt,
                    createdBy: annotation.createdBy,
                    assignedTo: annotation.assignedTo,
                    taskId: annotation.taskId || null,
                    deadline: annotation.deadline || null
                  };
                  
                  return await savePDFAnnotation(numericFileId, annotationToSave);
                } catch (err) {
                  console.error(`Fel vid sparande av annotation ${annotation.id}:`, err);
                  return null;
                }
              });
              
              const results = await Promise.all(savePromises);
              console.log(`[${new Date().toISOString()}] Sparade ${results.filter(Boolean).length} av ${localAnnotations.length} annotationer`);
              resolve();
            } catch (err) {
              console.error('Kunde inte spara alla annotationer:', err);
              reject(err);
            }
          });
          
          savePromise.catch(err => {
            console.error(`[${new Date().toISOString()}] Fel vid sparande av kommentarer vid avmontering:`, err);
          });
        } else if (fileId) {
          console.log(`[${new Date().toISOString()}] Sparar ${annotations.length} kommentarer till localStorage vid avmontering`);
          // Spara till localStorage
          const storageKey = `pdf_annotations_${fileId.toString()}`;
          localStorage.setItem(storageKey, JSON.stringify(annotations));
        } else {
          console.log(`[${new Date().toISOString()}] Kunde inte spara annotationer - fileId saknas`);
        }
      }
    };
  }, [annotations, useDatabase, currentProject, fileId, activeVersionId]);
  
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
    console.log(`PDF laddad framgångsrikt: ${numPages} sidor`);
    setNumPages(numPages);
    
    // Vi behåller loading-tillståndet mycket längre för att säkerställa att allt renderas korrekt
    // Detta hjälper till att förhindra att sidopanelen försvinner när PDF-dokumentet laddas
    setTimeout(() => {
      // Kontrollera om komponenterna fortfarande är monterade
      if (pdfContainerRef.current && containerRef.current) {
        console.log('Ställer in loading till false efter fördröjning');
        setLoading(false);
      }
    }, 500); // Ökad fördröjning till 500ms för att säkerställa att allt hinner ladda
  };
  
  // Hantera fel vid laddning av PDF
  const onDocumentLoadError = (error: Error) => {
    console.error('Fel vid laddning av PDF:', error);
    setLoading(false);
    
    // Hantera alla typer av fel som kan uppstå med PDF-filer
    console.log('PDF-laddning misslyckades, försöker med alternativa metoder...');
    
    // Konfigurera om PDF.js med alternativ arbetarprocess
    configureAlternativePdfLoading();
    
    // Skapa en fallback-funktion för att visa rå PDF-data om möjligt
    const loadFallbackPdfData = async () => {
      try {
        let url = pdfUrl;
        
        // Om vi använder blob URL, byt till API URL
        if (pdfUrl && pdfUrl.startsWith('blob:')) {
          if (activeVersionId) {
            url = `/api/pdf/versions/${activeVersionId}/content?nocache=${Date.now()}`;
          } else if (fileId) {
            url = `/api/files/${fileId}/content?nocache=${Date.now()}`;
          }
        } 
        // Lägg till cache-busting om URL redan har en sökväg
        else if (pdfUrl) {
          url = `${pdfUrl}${pdfUrl.includes('?') ? '&' : '?'}nocache=${Date.now()}`;
        }
        
        console.log('Försöker med URL:', url);
        
        // Kontrollera att URL är definierad innan vi försöker med fetch
        if (!url) {
          throw new Error("Ingen giltig URL tillgänglig för att hämta PDF-filen");
        }
        
        // Försök med fetch direkt för att se om vi kan få filen
        const response = await fetch(url);
        
        if (response.ok) {
          const blob = await response.blob();
          console.log(`Lyckades hämta PDF med storlek: ${blob.size} bytes`);
          
          // Skapa en enklare visning om vanlig rendering inte fungerar
          const blobUrl = URL.createObjectURL(blob);
          setPdfUrl(blobUrl);
          
          // Felmeddelande i dialogrutan
          toast({
            title: "Information",
            description: "PDF-filen kunde inte visas med standardläsaren. Vi använder ett förenklat visningsläge istället.",
            variant: "default",
          });
        } else {
          // Om vi inte kunde hämta filen via fetch heller, visa ett tydligt felmeddelande
          console.error('Kunde inte hämta PDF-filen via API:', response.status, response.statusText);
          throw new Error(`API svarade med felkod ${response.status}`);
        }
      } catch (fetchError) {
        console.error('Fallback-metod misslyckades också:', fetchError);
        
        // Visa ett mycket tydligt felmeddelande
        toast({
          title: "PDF kunde inte öppnas",
          description: "Filen är skadad eller i ett format som inte stöds. Försök med en annan fil.",
          variant: "destructive",
        });
      }
    };
    
    // Vänta en stund innan vi försöker igen med fallback-metoden
    setTimeout(loadFallbackPdfData, 1000);
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
    
    // Hämta giltigt versionId om det finns, eller skapa ett numeriskt versionId baserat på fileId
    let versionId = 0;
    
    if (activeVersionId && typeof activeVersionId === 'number') {
      versionId = activeVersionId;
    } else if (activeVersionId && typeof activeVersionId === 'string' && !isNaN(parseInt(activeVersionId))) {
      versionId = parseInt(activeVersionId);
    } else if (fileId) {
      // Om vi inte har någon version, använd fileId som temporärt versionId
      // Detta förhindrar null-värden som kan orsaka fel i databasen
      try {
        const numericId = typeof fileId === 'string' ? parseInt(fileId.replace(/\D/g, '')) : fileId;
        if (!isNaN(numericId) && numericId > 0) {
          versionId = numericId;
          console.log(`Använder temporärt versionId baserat på fileId: ${versionId}`);
        }
      } catch (e) {
        console.error("Kunde inte konvertera fileId till versionId:", e);
      }
    }
    
    // Create a new annotation
    // Skapa deadline 2 veckor fram i tiden som standard
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 14); // +14 dagar

    const newAnnotation: PDFAnnotation = {
      id: `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pdfVersionId: versionId, // Lägg till pdfVersionId här
      projectId: currentProject?.id, // Lägg till projektID om det finns
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
      assignedTo: user.username, // Tilldela kommentaren automatiskt till inloggad användare
      deadline: defaultDeadline.toISOString(), // Sätt standarddeadline två veckor fram
      taskId: null // Explicit sätt taskId till null för nya annotationer
    };
    
    if (newAnnotation.rect.width > 10 / scale && newAnnotation.rect.height > 10 / scale) {
      setAnnotations([...annotations, newAnnotation]);
      setActiveAnnotation(newAnnotation);
      setSidebarMode('comment');
      
      // Spara till localStorage först för säkerhets skull
      if (fileId) {
        const storageKey = `pdf_annotations_${fileId.toString()}`;
        const updatedAnnotations = [...annotations, newAnnotation];
        localStorage.setItem(storageKey, JSON.stringify(updatedAnnotations));
        console.log(`Sparade ${updatedAnnotations.length} annotationer till localStorage (säkerhetskopia)`);
      }
      
      try {
        const numericFileId = getConsistentFileId(fileId);
        if (!isNaN(numericFileId) && currentProject) {
          console.log(`[${new Date().toISOString()}] Sparar ny annotation till databasen:`, {
            fileId: numericFileId,
            versionId: versionId,
            annotation: newAnnotation
          });
          
          // Kontrollera först att versionId är ett giltigt värde
          if (!versionId || versionId === 0) {
            console.error(`Ogiltigt versionId: ${versionId}, kan inte spara annotation. Lagrar i localStorage istället.`);
            localStorage.setItem(`pdf_annotations_${fileId}`, JSON.stringify([...annotations, newAnnotation]));
            return;
          }
          
          // Skapa en kopia med korrekt attribut
          const annotationToSave = {
            pdfVersionId: versionId,
            projectId: currentProject.id, 
            rect: newAnnotation.rect,
            color: newAnnotation.color,
            comment: newAnnotation.comment,
            status: newAnnotation.status,
            createdAt: newAnnotation.createdAt,
            createdBy: newAnnotation.createdBy,
            assignedTo: assignTo || user?.username, // Använd tilldelad användare eller inloggad som fallback
            deadline: newAnnotation.deadline, // Inkludera deadline fältet
            taskId: null // Säkerställ att taskId är med, null för nya annotationer 
          };
          
          console.log("Skickar annotation till servern:", annotationToSave);
          
          // Save to database via API - använd versionId-variabeln från tidigare
          const savedAnnotation = await savePDFAnnotation(numericFileId, annotationToSave);
          
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
              
              // Invalidera cachen för att uppdatera gränssnittet direkt
              queryClient.invalidateQueries({queryKey: ['/api/pdf-annotations/assigned']});
              queryClient.invalidateQueries({queryKey: ['field-tasks']});
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
    if (!activeAnnotation || !currentProject) return;
    
    // Create updated annotation with comment, task and deadline
    const updatedAnnotation: PDFAnnotation = {
      ...activeAnnotation,
      comment: newComment,
      assignedTo: assignTo,
      taskId: newTask ? `TASK-${Math.floor(Math.random() * 10000)}` : activeAnnotation.taskId,
      deadline: deadline ? deadline.toISOString() : undefined
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
      // If we're using the database or have a valid project context
      if ((useDatabase || projectId || currentProject) && !isNaN(numericFileId)) {
        // Kontrollera om ID är numeriskt (från databasen) eller temporärt
        const isNumericId = typeof activeAnnotation.id === 'string' && !isNaN(parseInt(activeAnnotation.id));
        const idToUse = isNumericId ? parseInt(activeAnnotation.id) : undefined;
        
        // Säkerställ att versionId är ett giltigt nummer
        let versionId = 0;
        
        if (activeVersionId && typeof activeVersionId === 'number') {
          versionId = activeVersionId;
        } else if (activeVersionId && typeof activeVersionId === 'string' && !isNaN(parseInt(activeVersionId))) {
          versionId = parseInt(activeVersionId);
        } else if (fileId) {
          // Om vi inte har någon version, använd fileId som temporärt versionId
          try {
            const numericId = typeof fileId === 'string' ? parseInt(fileId.replace(/\D/g, '')) : fileId;
            if (!isNaN(numericId) && numericId > 0) {
              versionId = numericId;
              console.log(`Använder temporärt versionId baserat på fileId: ${versionId}`);
            }
          } catch (e) {
            console.error("Kunde inte konvertera fileId till versionId:", e);
            throw new Error(`Ogiltigt versionId: ${activeVersionId}`);
          }
        } else {
          throw new Error(`Ogiltigt versionId: ${activeVersionId}`);
        }
        
        // Skapa en kopia av annotationen med korrekt formatering
        const annotationToSave = {
          id: idToUse, // Undefined för nya kommentarer, ID för existerande
          pdfVersionId: versionId,
          projectId: projectId || (currentProject ? currentProject.id : null),
          rect: updatedAnnotation.rect,
          color: updatedAnnotation.color,
          comment: updatedAnnotation.comment || '',
          status: updatedAnnotation.status,
          createdAt: updatedAnnotation.createdAt,
          createdBy: updatedAnnotation.createdBy,
          assignedTo: updatedAnnotation.assignedTo,
          deadline: updatedAnnotation.deadline
        };
        
        console.log(`[${new Date().toISOString()}] Sparar annotation till databasen:`, {
          fileId: numericFileId,
          versionId: versionId
        });

        // Update in database
        const savedAnnotation = await savePDFAnnotation(numericFileId, annotationToSave);
        
        // Om vi fick ett svar från servern med ett ID, uppdatera id i frontend
        if (savedAnnotation && savedAnnotation.id && !isNumericId) {
          const newUpdatedAnnotations = [...updatedAnnotations];
          const index = newUpdatedAnnotations.findIndex(a => a.id === activeAnnotation.id);
          if (index !== -1) {
            newUpdatedAnnotations[index] = {
              ...updatedAnnotation,
              id: savedAnnotation.id.toString(),
              taskId: savedAnnotation.id.toString()
            };
            setAnnotations(newUpdatedAnnotations);
            setActiveAnnotation(newUpdatedAnnotations[index]);
          }
        }
        
        // Invalidera cachen för att uppdatera gränssnittet direkt
        queryClient.invalidateQueries({queryKey: ['/api/pdf-annotations/assigned']});
        queryClient.invalidateQueries({queryKey: ['/api/field-tasks']});
      } else if (!useDatabase && fileId) {
        // Only use localStorage if not explicitly using database and fileId exists
        localStorage.setItem(`pdf_annotations_${fileId.toString()}`, JSON.stringify(updatedAnnotations));
      }
    } catch (error) {
      console.error('Error updating annotation:', error);
      
      // Save to localStorage as fallback, but only if not explicitly using database
      if (!useDatabase && fileId) {
        localStorage.setItem(`pdf_annotations_${fileId.toString()}`, JSON.stringify(updatedAnnotations));
      }
    }
    
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
        
        // Invalidera cachen för att uppdatera gränssnittet direkt
        queryClient.invalidateQueries({queryKey: ['/api/pdf-annotations/assigned']});
        queryClient.invalidateQueries({queryKey: ['/api/field-tasks']});
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
      // If we're using the database or have a valid project context
      if ((useDatabase || projectId || currentProject) && !isNaN(numericFileId)) {
        const annotation = annotations.find(a => a.id === annotationId);
        if (annotation) {
          // Kontrollera om ID är numeriskt (från databasen) eller temporärt
          const isNumericId = typeof annotation.id === 'string' && !isNaN(parseInt(annotation.id));
          const idToUse = isNumericId ? parseInt(annotation.id) : undefined;
          
          // Säkerställ att versionId är ett giltigt nummer
          let versionId = 0;
        
          if (activeVersionId && typeof activeVersionId === 'number') {
            versionId = activeVersionId;
          } else if (activeVersionId && typeof activeVersionId === 'string' && !isNaN(parseInt(activeVersionId))) {
            versionId = parseInt(activeVersionId);
          } else if (fileId) {
            // Om vi inte har någon version, använd fileId som temporärt versionId
            try {
              const numericId = typeof fileId === 'string' ? parseInt(fileId.replace(/\D/g, '')) : fileId;
              if (!isNaN(numericId) && numericId > 0) {
                versionId = numericId;
                console.log(`Använder temporärt versionId baserat på fileId: ${versionId}`);
              }
            } catch (e) {
              console.error("Kunde inte konvertera fileId till versionId:", e);
              throw new Error(`Ogiltigt versionId: ${activeVersionId}`);
            }
          } else {
            throw new Error(`Ogiltigt versionId: ${activeVersionId}`);
          }
          
          // Skapa en kopia av annotationen med korrekt formatering
          const annotationToSave = {
            id: idToUse, // Undefined för nya kommentarer, ID för existerande
            pdfVersionId: versionId,
            projectId: projectId || (currentProject ? currentProject.id : null),
            rect: annotation.rect,
            color: statusColors[newStatus],
            comment: annotation.comment || '',
            status: newStatus,
            createdAt: annotation.createdAt,
            createdBy: annotation.createdBy,
            assignedTo: annotation.assignedTo,
            deadline: annotation.deadline,
            taskId: annotation.taskId || null // Säkerställ att taskId finns med
          };
          
          console.log(`[${new Date().toISOString()}] Sparar statusförändring till databasen:`, {
            fileId: numericFileId,
            versionId: versionId,
            status: newStatus
          });

          // Update in database
          const savedAnnotation = await savePDFAnnotation(numericFileId, annotationToSave);
          
          // Om vi fick ett svar från servern med ett ID, uppdatera id i frontend
          if (savedAnnotation && savedAnnotation.id && !isNumericId) {
            const newUpdatedAnnotations = [...updatedAnnotations];
            const index = newUpdatedAnnotations.findIndex(a => a.id === annotationId);
            if (index !== -1) {
              newUpdatedAnnotations[index] = {
                ...newUpdatedAnnotations[index],
                id: savedAnnotation.id.toString(),
                taskId: savedAnnotation.id.toString()
              };
              setAnnotations(newUpdatedAnnotations);
              
              // Uppdatera aktiv annotation om det behövs
              if (activeAnnotation && activeAnnotation.id === annotationId) {
                setActiveAnnotation(newUpdatedAnnotations[index]);
              }
            }
          }
        }
      } else if (!useDatabase && fileId) {
        // Only use localStorage if not explicitly using database
        localStorage.setItem(`pdf_annotations_${fileId.toString()}`, JSON.stringify(updatedAnnotations));
      }
      
      // Invalidera cachen för att uppdatera gränssnittet direkt
      queryClient.invalidateQueries({queryKey: ['/api/pdf-annotations/assigned']});
      queryClient.invalidateQueries({queryKey: ['field-tasks']});
    } catch (error) {
      console.error('Error updating annotation status:', error);
      
      // Save to localStorage as fallback, but only if not explicitly using database
      if (!useDatabase && fileId) {
        localStorage.setItem(`pdf_annotations_${fileId.toString()}`, JSON.stringify(updatedAnnotations));
      }
    }
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
      // If we're using the database or have a valid project context
      if ((useDatabase || projectId || currentProject) && !isNaN(numericFileId)) {
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
          
          // Also save to localStorage as backup if not explicitly using database
          if (!useDatabase && fileId) {
            localStorage.setItem(`pdf_versions_${fileId.toString()}`, JSON.stringify(updatedVersions));
          }
        } else if (!useDatabase) {
          // Fallback to localStorage only if not using database
          fallbackToLocalStorage();
        }
      } else if (!useDatabase) {
        // Use localStorage if not using database
        fallbackToLocalStorage();
      }
    } catch (error) {
      console.error('Error uploading version:', error);
      // Fallback to localStorage only if not using database
      if (!useDatabase) {
        fallbackToLocalStorage();
      }
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
      
      // Save to localStorage if we have a valid fileId
      if (fileId) {
        localStorage.setItem(`pdf_versions_${fileId.toString()}`, JSON.stringify(updatedVersions));
      }
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
  const formatDate = (dateString: string | Date | undefined | null): string => {
    try {
      if (!dateString) return 'Okänt datum';
      
      // Konvertera till Date-objekt om det är en sträng
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      
      // Kontrollera om datumet är giltigt
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn('Ogiltigt datum:', dateString);
        return 'Okänt datum';
      }
      
      // Formatera datumet med toLocaleDateString för svensk format
      try {
        return date.toLocaleDateString('sv-SE', { 
          day: 'numeric', 
          month: 'short', 
          year: 'numeric' 
        });
      } catch (formatError) {
        // Fallback om toLocaleDateString inte fungerar
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      }
    } catch (error) {
      console.error('Fel vid formatering av datum:', error);
      return 'Okänt datum';
    }
  };

  // Hämta query client för att invalidera cachen
  const queryClient = useQueryClient();
  
  // Funktion för att spara alla osparade annotationer till databasen eller localStorage
  const saveAllUnsavedAnnotations = async (forceLocalStorage = false): Promise<void> => {
    console.log(`[${new Date().toISOString()}] PDF-visare avmonteras, sparar kommentarer...`);
    
    if (annotations.length === 0) {
      console.log(`[${new Date().toISOString()}] Inga annotationer att spara`);
      return;
    }
    
    // Om vi inte har projektkontext eller aktiv version, använd localStorage istället
    if (forceLocalStorage || !useDatabase || !currentProject || !activeVersionId) {
      console.log(`[${new Date().toISOString()}] Sparar ${annotations.length} annotationer till localStorage`);
      
      // Kontrollera att fileId är definierat
      if (!fileId) {
        console.error(`[${new Date().toISOString()}] Inget giltigt fileId, kan inte spara till localStorage`);
        return;
      }
      
      const storageKey = `pdf_annotations_${fileId.toString()}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(annotations));
        console.log(`[${new Date().toISOString()}] Annotationer sparade till localStorage`);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Fel vid sparande av annotationer till localStorage:`, err);
      }
      return;
    }
    
    try {
      // Säkerställ giltigt fil-ID
      const numericFileId = getConsistentFileId(fileId);
      if (isNaN(numericFileId)) {
        console.error(`[${new Date().toISOString()}] Kunde inte konvertera fileId till ett giltigt numeriskt värde, använder localStorage istället`);
        // Fallback till localStorage
        await saveAllUnsavedAnnotations(true);
        return;
      }
      
      // Säkerställ giltigt versions-ID
      let numericVersionId = 0;
      if (typeof activeVersionId === 'number') {
        numericVersionId = activeVersionId;
      } else if (typeof activeVersionId === 'string' && !isNaN(parseInt(activeVersionId))) {
        numericVersionId = parseInt(activeVersionId);
      } else {
        console.error(`[${new Date().toISOString()}] Kunde inte konvertera versionId till nummer:`, activeVersionId);
      }
      if (isNaN(numericVersionId)) {
        console.error(`[${new Date().toISOString()}] Ogiltigt versionId: ${activeVersionId}, använder localStorage istället`);
        await saveAllUnsavedAnnotations(true);
        return;
      }
      
      console.log(`[${new Date().toISOString()}] Sparar ${annotations.length} kommentarer till databasen med versionId: ${numericVersionId}, projectId: ${currentProject.id}...`);
      
      let savedCount = 0;
      
      // Loopa igenom alla annotationer och spara dem
      for (const annotation of annotations) {
        // Kontrollera om ID är numeriskt (från databasen) eller temporärt
        const isNumericId = typeof annotation.id === 'string' && !isNaN(parseInt(annotation.id));
        const idToUse = isNumericId ? parseInt(annotation.id) : undefined;
        
        try {
          console.log(`[${new Date().toISOString()}] Sparar annotation:`, {
            fileId: numericFileId,
            versionId: numericVersionId,
            projectId: currentProject.id,
            annotationId: annotation.id
          });
          
          // Skapa en kopia av annotationen med rätt versionId
          const annotationToSave = {
            id: idToUse,
            pdfVersionId: numericVersionId,
            projectId: currentProject.id,
            rect: annotation.rect,
            color: annotation.color, 
            comment: annotation.comment || '',
            status: annotation.status,
            createdAt: annotation.createdAt,
            createdBy: annotation.createdBy,
            assignedTo: annotation.assignedTo,
            deadline: annotation.deadline,
            taskId: annotation.taskId || null
          };
          
          const result = await savePDFAnnotation(numericFileId, annotationToSave);
          
          if (result && result.id) {
            savedCount++;
            // Om vi har ett temporärt ID, uppdatera till databasens ID
            if (!isNumericId) {
              const updatedAnnotations = [...annotations];
              const index = updatedAnnotations.findIndex(a => a.id === annotation.id);
              if (index !== -1) {
                updatedAnnotations[index] = {
                  ...annotation,
                  id: result.id.toString()
                };
                setAnnotations(updatedAnnotations);
              }
            }
          }
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Fel vid sparande av annotation ${annotation.id}:`, err);
        }
      }
      
      console.log(`[${new Date().toISOString()}] Sparade ${savedCount} av ${annotations.length} annotationer`);
      
      // Invalidera cache för PDF-annotationer om några sparades
      if (savedCount > 0) {
        try {
          queryClient.invalidateQueries({ queryKey: [`/api/pdf/versions/${numericVersionId}/annotations`] });
          queryClient.invalidateQueries({ queryKey: [`/api/pdf/${numericFileId}/annotations`] });
        } catch (err) {
          console.error(`[${new Date().toISOString()}] Fel vid invalidering av cache:`, err);
        }
      }
      
      // Om inte alla sparades, spara till localStorage som backup
      if (savedCount < annotations.length) {
        console.log(`[${new Date().toISOString()}] Inte alla annotationer sparades, använder localStorage som backup`);
        await saveAllUnsavedAnnotations(true);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Kunde inte spara alla annotationer:`, err);
      
      // Fallback till localStorage vid fel
      try {
        await saveAllUnsavedAnnotations(true);
      } catch (backupErr) {
        console.error(`[${new Date().toISOString()}] Även backup till localStorage misslyckades:`, backupErr);
      }
    }
  };
  
  // Sparar annotationer när komponenten unmountas
  useEffect(() => {
    // Spara aktuell state så vi kan använda den vid unmounting
    const currentAnnotations = [...annotations];
    const currentProjectSnapshot = currentProject;
    const currentVersionIdSnapshot = activeVersionId;
    
    return () => {
      // Spara alla osparade annotationer när komponenten stängs
      if (currentAnnotations.length > 0) {
        console.log(`[${new Date().toISOString()}] Komponenten unmountas, sparar ${currentAnnotations.length} annotationer`);
        
        // Klona annotationerna eftersom de kan ha ändrats efter att cleanup-funktionen skapades
        const annotationsToSave = [...currentAnnotations];
        
        // Om vi inte kan spara till databasen, använd localStorage
        if (!useDatabase || !currentProjectSnapshot || !currentVersionIdSnapshot) {
          // Kontrollera att fileId är definierat
          if (fileId) {
            const storageKey = `pdf_annotations_${fileId.toString()}`;
            try {
              localStorage.setItem(storageKey, JSON.stringify(annotationsToSave));
              console.log(`[${new Date().toISOString()}] Annotationer sparade till localStorage vid unmount`);
            } catch (err) {
              console.error(`[${new Date().toISOString()}] Fel vid sparande till localStorage vid unmount:`, err);
            }
          } else {
            console.error(`[${new Date().toISOString()}] Inget giltigt fileId, kan inte spara till localStorage vid unmount`);
          }
        } else {
          // Vi försöker spara även om något saknas, saveAllUnsavedAnnotations har fallback till localStorage
          saveAllUnsavedAnnotations()
            .catch(err => {
              console.error(`[${new Date().toISOString()}] Fel vid sparande av annotationer vid unmount:`, err);
            });
        }
      }
    };
  }, [annotations, currentProject, useDatabase, activeVersionId, fileId]);
  

  
  // Hantera stängning av PDF-visaren
  const handleClose = async () => {
    try {
      // Försök alltid spara kommentarer även om useDatabase är false
      if (annotations.length > 0) {
        console.log(`[${new Date().toISOString()}] Sparar ${annotations.length} kommentarer innan stängning av PDF-visare`);
        
        // Använd den förbättrade funktionen som har fallback till localStorage
        await saveAllUnsavedAnnotations();
        
        console.log(`[${new Date().toISOString()}] Kommentarer sparade innan stängning`);
      } else {
        console.log(`[${new Date().toISOString()}] Inga kommentarer att spara vid stängning`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Fel vid sparande av kommentarer vid stängning:`, error);
      
      // Sista försök att spara till localStorage vid error
      try {
        if (annotations.length > 0 && fileId) {
          const storageKey = `pdf_annotations_${fileId.toString()}`;
          localStorage.setItem(storageKey, JSON.stringify(annotations));
          console.log(`[${new Date().toISOString()}] Annotationer sparade till localStorage som backup vid fel`);
        } else if (annotations.length > 0) {
          console.error(`[${new Date().toISOString()}] Inget giltigt fileId, kan inte spara till localStorage vid fel`);
        }
      } catch (backupError) {
        console.error(`[${new Date().toISOString()}] Kunde inte spara till localStorage heller:`, backupError);
      }
    } finally {
      // Anropa förälderns stängningsfunktion om den finns
      if (typeof onClose === 'function') {
        onClose();
      } else {
        console.warn(`[${new Date().toISOString()}] onClose är inte en funktion, kan inte stänga PDF-visaren`);
      }
    }
  };

  return (
    <div className={`${isDialogMode ? 'h-full' : 'h-screen'} flex flex-col bg-gray-100`}>
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
      <div className="flex flex-1 overflow-hidden relative">
        {/* PDF viewer - med förändrad z-index för att säkerställa att den inte täcker sidopanelen */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-gray-200 z-5"
          style={{ position: 'relative', zIndex: 5 }}
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
            <div ref={pageRef} className="pdf-document-container">
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={<div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>}
                error={<div className="p-8 text-center text-red-500">Dokumentet kunde inte laddas. Försöker igen automatiskt...</div>}
                className="pdf-document"
              >
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  loading={<div className="flex items-center justify-center h-[600px]"><Loader2 className="animate-spin h-8 w-8" /></div>}
                  className="pdf-page"
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
        
        {/* Right sidebar - med extremt hög z-index för att säkerställa att den alltid är synlig */}
        <div className="w-80 border-l bg-white overflow-y-auto z-50 relative" style={{ position: 'relative', zIndex: 50 }}>
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
                <h3 className="text-lg font-medium mb-4">PDF Anteckning</h3>
                
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
                      
                      <div>
                        <label className="text-sm font-medium block mb-2">Deadline</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between text-left font-normal"
                            >
                              {deadline ? format(deadline, "PPP", { locale: sv }) : "Välj deadline..."}
                              <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={deadline}
                              onSelect={setDeadline}
                              locale={sv}
                              initialFocus
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>
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