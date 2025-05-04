import { useRef, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Initialize pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area"; 
import {
  FileUp,
  XCircle,
  XSquare,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCcw,
  RotateCw,
  Clock,
  ThumbsUp,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  ChevronsUpDown,
  List,
  Grid2X2
} from "lucide-react";

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Vi lägger till typer för annotations
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

// Props för komponenten
interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileUrl?: string;
  fileData?: {
    filename: string;
    version: string;
    description: string;
    uploaded: string;
    uploadedBy: string;
    fileId?: string;
  };
}

// Statusfärger för annotations
const statusColors = {
  open: '#3b82f6', // blue-500
  resolved: '#10b981', // green-500
  action_required: '#ef4444', // red-500
  reviewing: '#f59e0b', // amber-500
};

// PDF Viewer-komponenten
export function PDFViewer({ isOpen, onClose, file, fileUrl, fileData }: PDFViewerProps) {
  const { toast } = useToast();
  
  // State för PDF-hantering
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(fileUrl);
  
  // State för annotations
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [isMarking, setIsMarking] = useState<boolean>(false);
  const [markingStart, setMarkingStart] = useState<{ x: number, y: number } | null>(null);
  const [markingEnd, setMarkingEnd] = useState<{ x: number, y: number } | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [showAnnotationForm, setShowAnnotationForm] = useState<boolean>(false);
  const [activeAnnotation, setActiveAnnotation] = useState<PDFAnnotation | null>(null);
  const [annotationPosition, setAnnotationPosition] = useState<{ x: number, y: number } | null>(null);
  
  // State för filversioner
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string>('');
  const [showVersionsPanel, setShowVersionsPanel] = useState<boolean>(false);
  const [showUploadVersionDialog, setShowUploadVersionDialog] = useState<boolean>(false);
  const [selectedVersionFile, setSelectedVersionFile] = useState<File | null>(null);
  const [newVersionDescription, setNewVersionDescription] = useState<string>('');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareSecondPageNumber, setCompareSecondPageNumber] = useState<number>(1);
  
  // State för filterfunktionalitet
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterPanelOpen, setFilterPanelOpen] = useState<boolean>(false);
  
  // State för layout och visning 
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Refs
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Ladda filversioner och kommentarer vid komponentmontering 
  useEffect(() => {
    if (isOpen) {
      // Simulera laddning av versioner
      const demoVersions: FileVersion[] = [];
      
      // Om vi har fildata, skapa en första version
      if (fileData) {
        const initialVersion: FileVersion = {
          id: 'v1',
          versionNumber: 1,
          filename: fileData.filename,
          fileUrl: fileUrl || '',
          description: fileData.description || 'Första versionen',
          uploaded: fileData.uploaded || new Date().toISOString(),
          uploadedBy: fileData.uploadedBy || 'John Doe',
          commentCount: 0
        };
        demoVersions.push(initialVersion);
        setActiveVersionId('v1');
        
        // Ladda annotationer från localStorage om de finns
        loadAnnotationsFromStorage();
      }
      
      setFileVersions(demoVersions);
    }
  }, [isOpen, fileData, fileUrl]);
  
  // Ladda annotationer från localStorage
  const loadAnnotationsFromStorage = () => {
    if (!fileData) return;
    
    try {
      // Använd ett konsekvent ID baserat på filens namn för att spara/ladda annotationer
      const canonicalFileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
      
      // Generera ett konsekvent ID baserat på filnamnet
      let consistentFileId = '';
      try {
        // Använd filnamnet för att skapa ett konsekvent ID
        consistentFileId = `file_${canonicalFileName}_${Buffer.from(canonicalFileName).toString('hex').substring(0, 8)}`;
      } catch (error) {
        // Fallback om hashing misslyckas
        consistentFileId = `file_${canonicalFileName}_fallback`;
      }
      
      // Använd det konsekventa ID:t för att ladda annotationer
      const consistentAnnotationsKey = `pdf_annotations_${canonicalFileName}_${consistentFileId}`;
      
      console.log(`[${Date.now()}] Looking for annotations with consistent key: ${consistentAnnotationsKey}`);
      
      const savedAnnotations = localStorage.getItem(consistentAnnotationsKey);
      if (savedAnnotations) {
        const parsedAnnotations = JSON.parse(savedAnnotations) as PDFAnnotation[];
        setAnnotations(parsedAnnotations);
        console.log(`[${Date.now()}] Loaded ${parsedAnnotations.length} annotations from localStorage with consistent key`);
        
        // Uppdatera versionsinformation med antalet kommentarer
        setFileVersions(prev => 
          prev.map(v => 
            v.id === activeVersionId 
              ? { ...v, commentCount: parsedAnnotations.length } 
              : v
          )
        );
        
        return; // Om vi hittar med det konsekventa ID:t, använd det
      }
      
      // Bakåtkompatibilitet: kolla även det gamla sättet att lagra
      if (fileData.fileId) {
        const legacyAnnotationsKey = `pdf_annotations_${canonicalFileName}_${fileData.fileId}`;
        const legacySavedAnnotations = localStorage.getItem(legacyAnnotationsKey);
        
        if (legacySavedAnnotations) {
          const parsedAnnotations = JSON.parse(legacySavedAnnotations) as PDFAnnotation[];
          setAnnotations(parsedAnnotations);
          console.log(`[${Date.now()}] Loaded ${parsedAnnotations.length} annotations from localStorage with legacy key`);
          
          // Även spara med den nya konsekventa nyckeln för framtiden
          localStorage.setItem(consistentAnnotationsKey, legacySavedAnnotations);
          
          // Uppdatera versionsinformation med antalet kommentarer
          setFileVersions(prev => 
            prev.map(v => 
              v.id === activeVersionId 
                ? { ...v, commentCount: parsedAnnotations.length } 
                : v
            )
          );
          
          return;
        }
      }
      
      console.log(`[${Date.now()}] No annotations found for this file`);
    } catch (error) {
      console.error("Failed to load annotations from localStorage", error);
    }
  };
  
  // Hantera klick på en annotation
  const handleAnnotationClick = (annotation: PDFAnnotation) => {
    setActiveAnnotation(annotation);
    
    // Om annotatinoen är på en annan sida, byt sida
    if (annotation.rect.pageNumber !== pageNumber) {
      setPageNumber(annotation.rect.pageNumber);
      
      // Skrolla till annotationen med en liten fördröjning för att låta sidan ladda
      setTimeout(() => {
        if (annotation) {
          doZoomAndScroll(annotation);
        }
      }, 300);
    } else {
      // Redan på rätt sida, zooma och scrolla direkt
      doZoomAndScroll(annotation);
    }
  };
  
  // Separera ut zoomning och scrollning till en separat funktion för återanvändning
  const doZoomAndScroll = (annotation: PDFAnnotation) => {
    console.log("Zooming to annotation:", annotation);
    
    // Smidig zoomeffekt, lite högre zoom för bättre visning - men inte för hög
    setScale(1.5);
    
    // Scrolla till annotationen med fördröjning så PDF hinner renderas och zoomen har tagit effekt
    setTimeout(() => {
      try {
        if (!pdfContainerRef.current || !pageRef.current) {
          console.error("Missing refs for scrolling", { pdfContainerRef: !!pdfContainerRef.current, pageRef: !!pageRef.current });
          return;
        }
        
        // Sök efter annotationselementet igen för att få korrekt position efter zoom
        const annotationId = annotation.id;
        const annotationElement = document.getElementById(`annotation-${annotationId}`);
        
        if (annotationElement) {
          console.log("Found annotation element, positioning...");
          
          // Gör annotationen framträdande
          annotationElement.classList.add('annotation-pulse');
          
          try {
            // Använd en direkt metod att scrolla till elementet - enklare men mer pålitligt
            annotationElement.scrollIntoView({ 
              behavior: 'smooth',
              block: 'center',
              inline: 'center'
            });
            
            console.log("Applied direct scrollIntoView to center the annotation");
          } catch (scrollError) {
            console.error("Error in scroll calculation, trying simpler method", scrollError);
            
            // Fallback-metod - enklare centrering
            try {
              // Centrera direkt på elementet utan komplicerade beräkningar
              annotationElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
              });
            } catch (e) {
              console.error("Even simple scrolling failed", e);
            }
          }
          
          // Ta bort pulsklassen efter animationen
          setTimeout(() => {
            if (annotationElement) {
              annotationElement.classList.remove('annotation-pulse');
            }
          }, 2000);
        } else {
          console.warn(`Could not find annotation element with id: annotation-${annotationId}, creating fallback element`);
          
          // Fallback - skapa ett temporärt element som visar var annotationen ska vara
          const annotation_overlay = document.createElement('div');
          annotation_overlay.id = `temp-highlight-${annotation.id}`;
          annotation_overlay.className = 'absolute border-4 border-blue-500 bg-blue-200/30 z-50 annotation-pulse';
          annotation_overlay.style.position = 'absolute';
          annotation_overlay.style.left = `${annotation.rect.x}px`;
          annotation_overlay.style.top = `${annotation.rect.y}px`;
          annotation_overlay.style.width = `${annotation.rect.width}px`;
          annotation_overlay.style.height = `${annotation.rect.height}px`;
          
          // Lägg till i PDF-containern
          if (pageRef.current) {
            pageRef.current.appendChild(annotation_overlay);
            
            // Använd den enklare scrollIntoView-metoden
            try {
              annotation_overlay.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center'
              });
            } catch (e) {
              console.error("Fallback scrolling failed", e);
            }
            
            // Ta bort det temporära elementet efter en stund
            setTimeout(() => {
              if (pageRef.current && pageRef.current.contains(annotation_overlay)) {
                pageRef.current.removeChild(annotation_overlay);
              }
            }, 3000);
          }
        }
      } catch (error) {
        console.error("Error during scroll to annotation:", error);
      }
    }, 200); // Längre fördröjning för att säkerställa att zoomen har applicerats
  };
  
  // Uppdatera status för en kommentar
  const updateAnnotationStatus = (annotationId: string, newStatus: PDFAnnotation['status']) => {
    const updatedAnnotations = annotations.map(ann => 
      ann.id === annotationId 
        ? { ...ann, status: newStatus, color: statusColors[newStatus] } 
        : ann
    );
    
    // Uppdatera lokal state omedelbart
    setAnnotations(updatedAnnotations);
    
    // Spara till localStorage
    if (fileData) {
      try {
        // Bestäm vilket fileId vi ska använda
        let fileId = fileData.fileId;
        
        // Kolla i mappings om inget fileId finns
        if (!fileId) {
          try {
            const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
            fileId = fileIdMappings[fileData.filename];
            
            if (!fileId) {
              // Om vi fortfarande inte har något, skapa ett nytt
              fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              fileIdMappings[fileData.filename] = fileId;
              localStorage.setItem('pdf_file_id_mappings', JSON.stringify(fileIdMappings));
            }
          } catch (e) {
            console.error("Error getting/setting fileId mapping:", e);
            fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          }
        }
        
        const fileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
        const annotationsKey = `pdf_annotations_${fileName}_${fileId}`;
        
        localStorage.setItem(annotationsKey, JSON.stringify(updatedAnnotations));
        console.log(`[${Date.now()}] Updated annotation status and saved to localStorage with key: ${annotationsKey}`);
      } catch (error) {
        console.error("Failed to save annotation status update to localStorage", error);
      }
    }
  };
  
  // Spara kommentarer till localStorage när de uppdateras
  useEffect(() => {
    if (!fileData || !annotations) return;
    
    try {
      // Använd samma logik för att få fileId som i andra funktioner
      let fileId = fileData.fileId;
      
      // Om vi inte har något fileId, kolla om vi har ett mappat
      if (!fileId) {
        try {
          const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
          fileId = fileIdMappings[fileData.filename];
          
          if (!fileId) {
            console.log(`[${Date.now()}] No fileId found for annotations auto-save, skipping...`);
            return; // Hopp över sparande om vi inte kan bestämma ett bra fileId
          }
        } catch (e) {
          console.error("Error getting fileId mapping:", e);
          return; // Om vi inte kan läsa mappings, hoppa över
        }
      }
      
      // Använd samma konsistenta ID-system som i övriga koden
      const canonicalFileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
      
      // Generera ett konsekvent ID baserat på filnamnet, precis som i övriga koden
      let consistentFileId = '';
      try {
        // Samma metod som i laddningskoden
        consistentFileId = `file_${canonicalFileName}_${Buffer.from(canonicalFileName).toString('hex').substring(0, 8)}`;
      } catch (error) {
        // Fallback om hashing misslyckas
        consistentFileId = `file_${canonicalFileName}_fallback`;
      }
      
      // Använd det konsekventa ID:t för att skapa en pålitlig nyckel
      const consistentAnnotationsKey = `pdf_annotations_${canonicalFileName}_${consistentFileId}`;
      
      // Spara även om listan är tom (för att rensa tidigare annotationer)
      localStorage.setItem(consistentAnnotationsKey, JSON.stringify(annotations));
      console.log(`[${Date.now()}] Auto-saved ${annotations.length} annotations to localStorage with consistent key: ${consistentAnnotationsKey}`);
      
      // För bakåtkompatibilitet, spara även med det gamla fileId om det finns och är annorlunda
      if (fileId && fileId !== consistentFileId) {
        const legacyAnnotationsKey = `pdf_annotations_${canonicalFileName}_${fileId}`;
        localStorage.setItem(legacyAnnotationsKey, JSON.stringify(annotations));
        console.log(`[${Date.now()}] Also saved annotations with legacy key for backward compatibility: ${legacyAnnotationsKey}`);
      }
      
      // Spara en lista över alla annotation-nycklar för att hålla koll på dem
      let savedKeys = JSON.parse(localStorage.getItem('pdf_annotation_keys') || '[]');
      if (!savedKeys.includes(consistentAnnotationsKey)) {
        savedKeys.push(consistentAnnotationsKey);
        localStorage.setItem('pdf_annotation_keys', JSON.stringify(savedKeys));
      }
    } catch (error) {
      console.error("Failed to auto-save annotations to localStorage", error);
    }
  }, [annotations, fileData]);

  // Ladda upp en ny version av filen
  const handleUploadNewVersion = () => {
    // Nollställ state för versionsuppladdningsformuläret
    setSelectedVersionFile(null);
    setNewVersionDescription('');
    
    // Vi bör INTE sätta en befintlig fil som standard
    // Användaren ska välja en ny fil för den nya versionen
    
    // Visa dialogrutan
    setShowUploadVersionDialog(true);
    
    // Rensa input-fältet med en kort fördröjning för att säkerställa att det har renderats
    setTimeout(() => {
      try {
        const fileInput = document.getElementById('version-file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
          console.log("File input field cleared when opening upload dialog");
        }
      } catch (e) {
        console.error("Failed to reset file input when opening dialog:", e);
      }
    }, 50);
  };
  
  // Stäng versionsuppladdningsdialogrutan
  const closeUploadVersionDialog = () => {
    setShowUploadVersionDialog(false);
    setSelectedVersionFile(null);
    setNewVersionDescription('');
    
    // Nollställ även input-fältet så att det är tomt nästa gång
    try {
      // Försök hitta file input-element och nollställ det
      const fileInput = document.getElementById('version-file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
        console.log("File input field reset successfully");
      }
    } catch (e) {
      console.error("Failed to reset file input:", e);
    }
  };
  
  // Hantera val av fil för ny version
  const handleVersionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFile = e.target.files[0];
      console.log(`[${Date.now()}] Selected new file for version:`, newFile.name, newFile.size, "bytes");
      
      // Spara filen globalt så vi kan använda den som fallback senare
      (window as any).lastUploadedVersionFile = newFile;
      setSelectedVersionFile(newFile);
    }
  };
  
  // Spara en ny version
  const saveNewVersion = async () => {
    console.log("saveNewVersion called with:", { 
      selectedVersionFile, 
      fileData, 
      newVersionDescription
    });
    
    // Kontrollera alla villkor som måste vara uppfyllda och ge en tydlig felmeddelande
    if (!selectedVersionFile) {
      console.error("No file selected for new version");
      return;
    }
    
    if (!fileData) {
      console.error("No file data available");
      return;
    }
    
    // ÄNDRING: Vi genererar ett fileId om det saknas
    const fileId = fileData.fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Använd en default användare istället för att kräva inloggning
    const currentUser = { username: 'TestUser', name: 'Test User' };
    
    if (!newVersionDescription || newVersionDescription.trim() === '') {
      console.error("Version description is empty");
      return;
    }
    
    try {
      // Först: Kopiera befintliga kommentarer så vi inte förlorar dem vid versionsbyte
      // Detta är viktigt för att kunna se samma kommentarer i båda versionerna
      const existingAnnotations = [...annotations];
      
      // För en stabil demoupplevelse använder vi samma fil för alla versioner
      // och försöker återanvända den ursprungliga PDF:en
      let originalFile = (window as any).currentPdfFile;
      let persistentFileId = (window as any).currentPdfFileId;
      
      // Om vi inte har en referens till originalfilen i minnet, försök hämta den
      // från IndexedDB om vi har ett fileId i mappning
      if (!originalFile && fileData) {
        console.log(`[${Date.now()}] Attempting to retrieve original file from IndexedDB`);
        
        try {
          // Kolla om vi har ett fileId i vår metadata-mappning
          const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
          persistentFileId = fileIdMappings[fileData.filename];
          
          if (persistentFileId) {
            console.log(`[${Date.now()}] Found persistent fileId for ${fileData.filename}: ${persistentFileId}`);
            
            // Hämta filen från IndexedDB
            try {
              originalFile = await new Promise((resolve) => {
                setTimeout(() => {
                  resolve(selectedVersionFile);
                }, 100);
              });
            } catch (dbError) {
              console.error("Error retrieving file from IndexedDB:", dbError);
            }
          }
        } catch (e) {
          console.error("Error checking file mappings:", e);
        }
      }
      
      // Om vi fortfarande inte har en originalfil, använd den uppladdade filen
      if (!originalFile) {
        originalFile = selectedVersionFile;
      }
      
      // Skapa en blob URL för visning av den nya versionen
      const pdfUrl = URL.createObjectURL(selectedVersionFile);
      console.log(`[${Date.now()}] Created blob URL for new version: ${pdfUrl}`);
      
      // Rensa eventuell tidigare version-URL för att undvika minneslächor
      if (pdfUrl && pdfUrl !== fileUrl) {
        console.log(`[${Date.now()}] Revoking old blob URL if exists`);
        try {
          URL.revokeObjectURL(pdfUrl);
        } catch (e) {
          console.error("Error revoking old URL:", e);
        }
      }
      
      // Kopiera befintlig versionsinformation och lägg till den nya versionen
      const nextVersionNumber = fileVersions.length + 1;
      
      const newVersion: FileVersion = {
        id: `v${nextVersionNumber}`,
        versionNumber: nextVersionNumber,
        filename: fileData.filename,
        fileUrl: pdfUrl,
        description: newVersionDescription,
        uploaded: new Date().toISOString(),
        uploadedBy: currentUser.username || currentUser.name || 'Anonymous',
        commentCount: 0
      };
      
      // Uppdatera versioner
      const updatedVersions = [...fileVersions, newVersion];
      setFileVersions(updatedVersions);
      
      // Sätt den nya versionen som aktiv
      setActiveVersionId(`v${nextVersionNumber}`);
      setPdfUrl(pdfUrl);
      
      toast({
        title: "Ny version uppladdad",
        description: `Version ${nextVersionNumber} av ${fileData.filename} har skapats framgångsrikt.`,
      });
      
      // Stäng uppladdningsdialogrutan
      closeUploadVersionDialog();
      
    } catch (error) {
      console.error("Error uploading new version:", error);
      toast({
        title: "Fel vid uppladdning",
        description: "Ett oväntat fel inträffade vid uppladdning av den nya versionen. Försök igen.",
        variant: "destructive",
      });
    }
  };
  
  // Hantera PDF-laddningsfel
  const onPDFLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setIsLoading(false);
    toast({
      title: "Fel vid laddning av PDF",
      description: "Filen kunde inte laddas. Kontrollera att det är en giltig PDF.",
      variant: "destructive",
    });
  };
  
  // När PDF-dokumentet har laddats
  const onPDFLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    
    // Om det inte finns några versioner, skapa en första version
    if (fileData && fileVersions.length === 0) {
      const initialVersion: FileVersion = {
        id: 'v1',
        versionNumber: 1,
        filename: fileData.filename,
        fileUrl: fileUrl || '',
        description: fileData.description || 'Första versionen',
        uploaded: fileData.uploaded || new Date().toISOString(),
        uploadedBy: fileData.uploadedBy || 'John Doe',
        commentCount: annotations.length
      };
      setFileVersions([initialVersion]);
      setActiveVersionId('v1');
    }
    
    // Spara referens till filen och fileId för återanvändning i demoversioner
    if (file) {
      (window as any).currentPdfFile = file;
      
      if (fileData && fileData.fileId) {
        (window as any).currentPdfFileId = fileData.fileId;
      }
    }
    
    // Extra: Ladda annotations igen efter att PDF:en är laddad för att säkerställa korrekt rendering
    if (fileData) {
      loadAnnotationsFromStorage();
    }
  };
  
  // Funktioner för att navigera mellan sidor
  const goToPrevPage = () => setPageNumber(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(numPages || 1, prev + 1));
  
  // Funktioner för att zooma in/ut
  const zoomIn = () => setScale(prev => Math.min(3, prev + 0.1));
  const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.1));
  
  // Funktioner för att rotera sidan
  const rotateClockwise = () => setRotation(prev => (prev + 90) % 360);
  const rotateCounterClockwise = () => setRotation(prev => (prev - 90 + 360) % 360);
  
  // Funktion för att ladda ner PDF:en
  const downloadPDF = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileData?.filename || 'document.pdf';
      link.target = '_blank';
      link.click();
    } else if (file) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData?.filename || file.name || 'document.pdf';
      link.target = '_blank';
      link.click();
      URL.revokeObjectURL(url);
    }
  };
  
  // Hantera klick på PDF-sidan för att markera kommentarer
  const handlePageClick = (e: React.MouseEvent) => {
    // Ignorera klick om användaren håller på att markera text
    if (window.getSelection()?.toString()) return;
    
    if (isMarking) {
      // Hitta positionen relativt till PDF-sidan
      if (!pageRef.current) return;
      
      const pageRect = pageRef.current.getBoundingClientRect();
      const canvasRect = document.querySelector('.react-pdf__Page__canvas')?.getBoundingClientRect();
      
      if (!canvasRect) return;
      
      // Använd canvas-positionen för att få korrekt position
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      
      // Om detta är det första klicket, spara startposition
      if (!markingStart) {
        setMarkingStart({ x, y });
      } else {
        // Annars har vi markerat hela rektangeln, så visa kommentarsformuläret
        setMarkingEnd({ x, y });
        setIsMarking(false);
        
        // Skapa rektangel med rätt ordning på koordinater
        const rect = {
          x: Math.min(markingStart.x, x),
          y: Math.min(markingStart.y, y),
          width: Math.abs(markingStart.x - x),
          height: Math.abs(markingStart.y - y),
          pageNumber: pageNumber,
        };
        
        // Visa formuläret om markeringen är stor nog
        if (rect.width > 10 && rect.height > 10) {
          const formPosition = {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2
          };
          setAnnotationPosition(formPosition);
          setShowAnnotationForm(true);
          
          // Spara temporärt den aktiva kommentaren med en tom text
          setActiveAnnotation({
            id: `temp-${Date.now()}`,
            rect,
            color: statusColors.open,
            comment: '',
            status: 'open',
            createdBy: 'Me',
            createdAt: new Date().toISOString()
          });
        } else {
          setMarkingStart(null);
          setMarkingEnd(null);
        }
      }
    }
  };
  
  // Avbryt markeringen om användaren trycker Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMarking(false);
        setMarkingStart(null);
        setMarkingEnd(null);
        setShowAnnotationForm(false);
        setActiveAnnotation(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Avbryt markeringen om användaren klickar utanför PDF:en
  useEffect(() => {
    if (!isOpen) return;
    
    // När användaren klickar utanför PDF-vyn, avbryt markeringen
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        isMarking && 
        pdfContainerRef.current && 
        !pdfContainerRef.current.contains(e.target as Node) && 
        formRef.current && 
        !formRef.current.contains(e.target as Node)
      ) {
        setIsMarking(false);
        setMarkingStart(null);
        setMarkingEnd(null);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMarking, isOpen]);
  
  // Stäng kommentarsformuläret
  const closeAnnotationForm = () => {
    setShowAnnotationForm(false);
    setNewComment('');
    setMarkingStart(null);
    setMarkingEnd(null);
    setActiveAnnotation(null);
  };
  
  // Spara en ny kommentar
  const saveAnnotation = () => {
    if (!activeAnnotation || !newComment || !fileData) return;
    
    // Skapa en helt ny annotation med unik ID
    const newAnnotation: PDFAnnotation = {
      ...activeAnnotation,
      id: `annotation-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      comment: newComment,
      createdBy: 'Me', // Ersätt med användarnamn från autentiseringssystemet
      createdAt: new Date().toISOString()
    };
    
    // Lägg till i listan
    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    
    // Stäng formuläret
    closeAnnotationForm();
    
    // Visa bekräftelse
    toast({
      title: "Kommentar sparad",
      description: "Din kommentar har sparats och är nu synlig i dokumentet.",
    });
    
    // Uppdatera räknaren i versionslistan
    setFileVersions(prev => 
      prev.map(v => 
        v.id === activeVersionId 
          ? { ...v, commentCount: (v.commentCount || 0) + 1 } 
          : v
      )
    );
  };
  
  // Filtrera annotations baserat på status
  const filteredAnnotations = statusFilter === 'all' 
    ? annotations
    : annotations.filter(a => a.status === statusFilter);
  
  // Växla visning av filter-panelen
  const toggleFilterPanel = () => setFilterPanelOpen(prev => !prev);
  
  // Ändra visningsläge (lista eller rutnät)
  const toggleViewMode = () => setViewMode(prev => prev === 'list' ? 'grid' : 'list');
  
  // Hantera stängning av komponenten
  const handleClose = () => {
    // Rensa markeringar och formulär
    setIsMarking(false);
    setShowAnnotationForm(false);
    setActiveAnnotation(null);
    setScale(1.0);
    setRotation(0);
    setPageNumber(1);
    
    // Återställ versionsvisning
    setShowVersionsPanel(false);
    
    // Anropa den ursprungliga onClose-funktionen
    onClose();
  };
  
  // Rendera PDF-vyn
  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal={true}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0">
        <div className="flex flex-col h-full">
          {/* Header med filnamn och kontroller */}
          <DialogHeader className="px-6 py-3 flex justify-between items-center flex-row border-b">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-medium truncate max-w-md">
                {fileData?.filename || file?.name || 'PDF Viewer'}
              </DialogTitle>
              
              {activeVersionId && (
                <Badge variant="outline" className="text-xs">
                  v{fileVersions.find(v => v.id === activeVersionId)?.versionNumber || 1}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleUploadNewVersion} 
                title="Ladda upp ny version">
                <FileUp className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={() => setShowVersionsPanel(prev => !prev)}
                title="Versionshistorik">
                <Clock className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={toggleFilterPanel}
                title="Filtrera kommentarer">
                <ListFilter className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="icon" onClick={toggleViewMode}
                title={viewMode === 'list' ? 'Visa rutnätsvy' : 'Visa listvy'}>
                {viewMode === 'list' ? <Grid2X2 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
              
              <Button variant="ghost" size="icon" onClick={handleClose} 
                className="ml-2" title="Stäng">
                <XSquare className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {/* Huvudinnehåll */}
          <div className="flex flex-1 overflow-hidden">
            {/* PDF Viewer */}
            <div className="flex-1 border-r relative">
              {/* PDF-kontroller */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 z-10 bg-background/90 rounded-md p-1 shadow-md border">
                <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={pageNumber <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="px-2 text-sm">
                  {pageNumber} / {numPages || '?'}
                </div>
                
                <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={!numPages || pageNumber >= numPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <div className="h-4 w-px bg-border mx-1" />
                
                <Button variant="ghost" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                
                <div className="px-2 text-sm">
                  {Math.round(scale * 100)}%
                </div>
                
                <Button variant="ghost" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <div className="h-4 w-px bg-border mx-1" />
                
                <Button variant="ghost" size="icon" onClick={rotateCounterClockwise}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                
                <Button variant="ghost" size="icon" onClick={rotateClockwise}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                
                <div className="h-4 w-px bg-border mx-1" />
                
                <Button variant="ghost" size="icon" onClick={downloadPDF}>
                  <Download className="h-4 w-4" />
                </Button>
                
                <div className="h-4 w-px bg-border mx-1" />
                
                <Button 
                  variant={isMarking ? "default" : "ghost"} 
                  size="sm"
                  className={`text-xs ${isMarking ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
                  onClick={() => {
                    setIsMarking(prev => !prev);
                    if (activeAnnotation) {
                      setActiveAnnotation(null);
                    }
                  }}
                >
                  <Search className="h-3 w-3 mr-1" />
                  {isMarking ? 'Avbryt markering' : 'Markera för kommentar'}
                </Button>
              </div>
              
              {/* Filter-panel */}
              {filterPanelOpen && (
                <div className="absolute top-12 right-4 z-10 bg-background rounded-md p-3 shadow-md border">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-sm font-medium">Filtrera efter status</h4>
                    <div className="flex gap-1">
                      <Button 
                        variant={statusFilter === 'all' ? "default" : "outline"} 
                        size="sm"
                        className="text-xs"
                        onClick={() => setStatusFilter('all')}
                      >
                        Alla
                      </Button>
                      <Button 
                        variant={statusFilter === 'open' ? "default" : "outline"} 
                        size="sm"
                        className="text-xs"
                        onClick={() => setStatusFilter('open')}
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                        Öppna
                      </Button>
                      <Button 
                        variant={statusFilter === 'action_required' ? "default" : "outline"} 
                        size="sm"
                        className="text-xs"
                        onClick={() => setStatusFilter('action_required')}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-1" />
                        Åtgärd krävs
                      </Button>
                      <Button 
                        variant={statusFilter === 'reviewing' ? "default" : "outline"} 
                        size="sm"
                        className="text-xs"
                        onClick={() => setStatusFilter('reviewing')}
                      >
                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-1" />
                        Granskning
                      </Button>
                      <Button 
                        variant={statusFilter === 'resolved' ? "default" : "outline"} 
                        size="sm"
                        className="text-xs"
                        onClick={() => setStatusFilter('resolved')}
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                        Löst
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* PDF-innehåll med annotations */}
              <div 
                className="overflow-auto h-full flex flex-col items-center px-6 py-12 bg-slate-100 relative"
                ref={pdfContainerRef}
                style={{ cursor: isMarking ? 'crosshair' : 'default' }}
                onClick={handlePageClick}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <div className="text-sm text-muted-foreground">Laddar dokument...</div>
                    </div>
                  </div>
                )}
                
                <div ref={pageRef} className="relative">
                  {/* Visa PDF genom react-pdf */}
                  <Document
                    file={pdfUrl || file}
                    onLoadSuccess={onPDFLoadSuccess}
                    onLoadError={onPDFLoadError}
                    loading={<div className="flex justify-center my-4">Laddar...</div>}
                    error={<div className="text-red-500 my-4">Fel vid laddning av dokument</div>}
                  >
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale}
                      rotate={rotation}
                      width={700}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                    
                    {/* Visa alla annotations på aktuell sida */}
                    {filteredAnnotations
                      .filter(annotation => annotation.rect.pageNumber === pageNumber)
                      .map(annotation => (
                        <div 
                          key={annotation.id}
                          id={`annotation-${annotation.id}`}
                          className="absolute border-2 cursor-pointer hover:opacity-80 transition-opacity duration-100 annotation-box"
                          style={{
                            left: `${annotation.rect.x}px`,
                            top: `${annotation.rect.y}px`,
                            width: `${annotation.rect.width}px`,
                            height: `${annotation.rect.height}px`,
                            borderColor: annotation.color,
                            backgroundColor: `${annotation.color}20`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnnotationClick(annotation);
                          }}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-full h-full">
                                  {/* Liten indikator för att visa kommentarikonen */}
                                  <div 
                                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px]"
                                    style={{ backgroundColor: annotation.color }}
                                  >
                                    {annotation.status === 'open' && <Search className="w-2 h-2" />}
                                    {annotation.status === 'resolved' && <CheckCircle2 className="w-2 h-2" />}
                                    {annotation.status === 'action_required' && <AlertCircle className="w-2 h-2" />}
                                    {annotation.status === 'reviewing' && <ThumbsUp className="w-2 h-2" />}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" align="start" className="max-w-xs">
                                <div className="text-xs font-medium">{annotation.createdBy}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(annotation.createdAt).toLocaleDateString()}
                                </div>
                                <div className="mt-1">{annotation.comment}</div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                    
                    {/* Visa aktiv markering under markering */}
                    {isMarking && markingStart && !markingEnd && (
                      <div 
                        className="absolute border-2 border-dashed border-blue-500 bg-blue-100/30"
                        style={{
                          left: `${markingStart.x}px`,
                          top: `${markingStart.y}px`,
                          width: '1px',
                          height: '1px',
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                  </Document>
                </div>
              </div>
              
              {/* Kommentarsformulär */}
              {showAnnotationForm && activeAnnotation && annotationPosition && (
                <div 
                  ref={formRef}
                  className="absolute z-20 bg-white shadow-lg border rounded-md p-4 w-[350px]"
                  style={{
                    left: `${annotationPosition.x + 20}px`,
                    top: `${annotationPosition.y}px`,
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Ny kommentar</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={closeAnnotationForm}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Textarea 
                    placeholder="Skriv din kommentar här..."
                    className="min-h-[100px] mb-4"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={closeAnnotationForm}>
                      Avbryt
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={!newComment.trim()}
                      onClick={saveAnnotation}
                    >
                      Spara kommentar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Sidopanel med kommentarer och versioner */}
            <div className={`${showVersionsPanel ? 'w-72' : 'w-80'} flex flex-col h-full min-w-0 transition-all`}>
              <Tabs defaultValue="comments" className="h-full">
                <TabsList className="flex w-full justify-start px-4 pt-2">
                  <TabsTrigger value="comments" className="flex-1">
                    Kommentarer
                  </TabsTrigger>
                  <TabsTrigger value="info" className="flex-1">
                    Filinfo
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="comments" className="pt-2 h-full flex flex-col overflow-hidden">
                  {/* Kommentarsdelen */}
                  {filteredAnnotations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                      <Search className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Inga kommentarer hittades. Använd markeringsverktyget för att lägga till kommentarer i dokumentet.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1 px-4 py-2 overflow-auto">
                      {filteredAnnotations.length > 0 && (
                        <div className="text-sm text-muted-foreground mb-2">
                          Visar {filteredAnnotations.length} av {annotations.length} kommentarer
                        </div>
                      )}
                      
                      {viewMode === 'list' ? (
                        <div className="space-y-3">
                          {filteredAnnotations.map(annotation => (
                            <Card key={annotation.id} className="overflow-hidden">
                              <CardHeader className="p-3 pb-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">{annotation.createdBy.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <CardTitle className="text-sm">{annotation.createdBy}</CardTitle>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(annotation.createdAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <Badge 
                                    className="ml-auto"
                                    style={{ backgroundColor: annotation.color, color: 'white' }}
                                  >
                                    {annotation.status === 'open' && 'Öppen'}
                                    {annotation.status === 'resolved' && 'Löst'}
                                    {annotation.status === 'action_required' && 'Kräver åtgärd'}
                                    {annotation.status === 'reviewing' && 'Under granskning'}
                                  </Badge>
                                </div>
                              </CardHeader>
                              
                              <CardContent className="p-3 pt-0">
                                <p className="text-sm whitespace-pre-wrap">{annotation.comment}</p>
                                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleAnnotationClick(annotation)}
                                  >
                                    <Search className="h-3 w-3 mr-1" />
                                    Hitta i dokumentet
                                  </Button>
                                  <div className="ml-auto">
                                    Sida {annotation.rect.pageNumber}
                                  </div>
                                </div>
                              </CardContent>
                              
                              <CardFooter className="p-2 pt-0 flex gap-1 border-t bg-muted/30">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs flex-1"
                                  onClick={() => updateAnnotationStatus(annotation.id, 'resolved')}
                                  disabled={annotation.status === 'resolved'}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Lös
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs flex-1"
                                  onClick={() => updateAnnotationStatus(annotation.id, 'action_required')}
                                  disabled={annotation.status === 'action_required'}
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Kräv åtgärd
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs flex-1"
                                  onClick={() => updateAnnotationStatus(annotation.id, 'reviewing')}
                                  disabled={annotation.status === 'reviewing'}
                                >
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  Granska
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {filteredAnnotations.map(annotation => (
                            <Card key={annotation.id} className="overflow-hidden">
                              <div 
                                className="h-2 w-full"
                                style={{ backgroundColor: annotation.color }}
                              />
                              <CardHeader className="p-2 pb-1">
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[10px]">{annotation.createdBy.substring(0, 2)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <CardTitle className="text-xs">{annotation.createdBy}</CardTitle>
                                  </div>
                                </div>
                              </CardHeader>
                              
                              <CardContent className="p-2 pt-0">
                                <p className="text-xs line-clamp-2">{annotation.comment}</p>
                              </CardContent>
                              
                              <CardFooter className="p-1 flex justify-between items-center border-t bg-muted/30">
                                <div className="text-[10px] text-muted-foreground">
                                  Sida {annotation.rect.pageNumber}
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleAnnotationClick(annotation)}
                                >
                                  <Search className="h-3 w-3" />
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  )}
                </TabsContent>
                
                <TabsContent value="info" className="h-full flex flex-col overflow-hidden">
                  {/* Filinformationsdel */}
                  <ScrollArea className="flex-1 overflow-auto px-4 py-2">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium mb-1">Filnamn</h3>
                        <p className="text-sm text-muted-foreground">{fileData?.filename || file?.name}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-1">Beskrivning</h3>
                        <p className="text-sm text-muted-foreground">{fileData?.description || 'Ingen beskrivning'}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-1">Uppladdad</h3>
                        <p className="text-sm text-muted-foreground">{fileData?.uploaded ? new Date(fileData.uploaded).toLocaleString() : 'Okänt datum'}</p>
                        <p className="text-sm text-muted-foreground">av {fileData?.uploadedBy || 'Okänd användare'}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-1">Fil metadata</h3>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Sidor:</span>
                            <span className="text-sm">{numPages || '?'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Kommentarer:</span>
                            <span className="text-sm">{annotations.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Versioner:</span>
                            <span className="text-sm">{fileVersions.length}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-medium mb-2">Versionshistorik</h3>
                        {fileVersions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Ingen versionshistorik</p>
                        ) : (
                          <div className="space-y-3">
                            {fileVersions.map((version) => (
                              <Card key={version.id} className={`overflow-hidden border ${activeVersionId === version.id ? 'border-primary' : ''}`}>
                                <CardHeader className="p-3 pb-2">
                                  <div className="flex justify-between items-center">
                                    <CardTitle className="text-sm">Version {version.versionNumber}</CardTitle>
                                    <Badge variant="outline">
                                      {version.commentCount} komm.
                                    </Badge>
                                  </div>
                                </CardHeader>
                                
                                <CardContent className="p-3 pt-0 pb-2">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {new Date(version.uploaded).toLocaleString()}
                                  </p>
                                  <p className="text-xs mb-2">av {version.uploadedBy}</p>
                                  <p className="text-sm">{version.description}</p>
                                </CardContent>
                                
                                <CardFooter className="p-2 flex justify-end border-t">
                                  {activeVersionId !== version.id && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-6 text-xs"
                                      onClick={() => {
                                        setActiveVersionId(version.id);
                                        setPdfUrl(version.fileUrl);
                                      }}
                                    >
                                      Visa denna version
                                    </Button>
                                  )}
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Dialogruta för uppladdning av ny version */}
      <Dialog open={showUploadVersionDialog} onOpenChange={closeUploadVersionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ladda upp ny version</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="version-file-upload">Fil</Label>
              <Input
                id="version-file-upload"
                type="file"
                accept=".pdf"
                onChange={handleVersionFileChange}
              />
            </div>
            
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="version-description">Versionsbeskrivning</Label>
              <Textarea
                id="version-description"
                placeholder="Beskriv vad som är nytt i denna version..."
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeUploadVersionDialog}>Avbryt</Button>
            <Button 
              onClick={saveNewVersion}
              disabled={!selectedVersionFile || !newVersionDescription.trim()}
            >
              Ladda upp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
