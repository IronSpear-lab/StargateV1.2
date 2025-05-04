import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Maximize, 
  Minimize, 
  ZoomIn, 
  ZoomOut, 
  Rotate3D, 
  MessageSquare, 
  Check, 
  AlertCircle,
  Upload,
  FileText,
  Loader2
} from "lucide-react";
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

// Konfigurera worker för react-pdf - använder CDN för att undvika byggproblem
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
  reviewing: '#ffbc00'    // Gul
};

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

export function PDFViewer({ isOpen, onClose, file, fileUrl, fileData }: PDFViewerProps) {
  const { user } = useAuth();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(fileUrl);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Om en File-objekt skickas in, skapa en URL för den
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [file, fileUrl]);
  
  // Hämta sparade annotationer från localStorage när en ny fil öppnas
  useEffect(() => {
    // Rensa eventuella tidigare aktiva annotationer
    setActiveAnnotation(null);
    
    // Försök hämta annotationer från localStorage för denna fil - KRITISKT: Körs när dialogen öppnas
    if (isOpen && fileData?.fileId && fileData?.filename) {
      try {
        // Generera samma nyckel som vid sparande
        const fileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
        const annotationsKey = `pdf_annotations_${fileName}_${fileData.fileId}`;
        
        console.log(`[${Date.now()}] Attempting to load annotations using key: ${annotationsKey}`);
        const savedAnnotations = localStorage.getItem(annotationsKey);
        
        if (savedAnnotations) {
          try {
            const parsedAnnotations = JSON.parse(savedAnnotations);
            if (Array.isArray(parsedAnnotations)) {
              console.log(`[${Date.now()}] Successfully loaded ${parsedAnnotations.length} annotations from localStorage for file: ${fileData.filename}`);
              
              // För att tvinga React att uppdatera vyn, skapa en ny array
              const annotationsCopy = [...parsedAnnotations];
              setAnnotations(annotationsCopy);
            } else {
              console.error("Saved annotations are not an array:", typeof parsedAnnotations);
              setAnnotations([]);
            }
          } catch (parseError) {
            console.error("Failed to parse annotations JSON:", parseError);
            setAnnotations([]);
          }
        } else {
          // Check for legacy storage format as well
          const legacyKey = `annotations_${fileData.fileId}`;
          const legacyAnnotations = localStorage.getItem(legacyKey);
          
          if (legacyAnnotations) {
            console.log(`Found annotations in legacy format, migrating to new format...`);
            const parsedLegacyAnnotations = JSON.parse(legacyAnnotations);
            setAnnotations(parsedLegacyAnnotations);
            // Will be saved in new format by the save effect
          } else {
            console.log(`No annotations found for file: ${fileData.filename}, starting with empty list`);
            setAnnotations([]);
          }
        }
        
        // Som extra säkerhet, skriv också nyckelnamnet till en separat lista för felsökning
        try {
          let keyList = JSON.parse(localStorage.getItem('pdf_annotation_keys') || '[]');
          if (!keyList.includes(annotationsKey)) {
            keyList.push(annotationsKey);
            localStorage.setItem('pdf_annotation_keys', JSON.stringify(keyList));
          }
        } catch (e) {
          console.error("Error updating annotation key list:", e);
        }
      } catch (error) {
        console.error("Failed to load annotations from localStorage", error);
        setAnnotations([]);
      }
    } else {
      // Om dialogrutan inte är öppen eller ingen fil-ID/filnamn, gör ingenting
      if (!isOpen) {
        console.log("PDF Viewer is closed, skipping annotation loading");
      } else {
        console.log("Missing file data, cannot load annotations", { fileId: fileData?.fileId, filename: fileData?.filename });
        setAnnotations([]);
      }
    }
  }, [isOpen, fileData?.fileId, fileData?.filename]);
  
  // Hämta tillgängliga versioner när en fil öppnas
  useEffect(() => {
    if (!fileData?.fileId) return;
    
    // Här skulle vi göra ett API-anrop för att hämta alla versioner av denna fil
    // Exempel: fetchFileVersions(fileData.fileId)
    
    // Simulera versionshämtning för demo
    const dummyVersions: FileVersion[] = [
      {
        id: 'version1',
        versionNumber: 1,
        filename: fileData.filename,
        fileUrl: fileUrl || '',
        description: 'Ursprunglig version',
        uploaded: '2025-03-15',
        uploadedBy: 'Johan Andersson',
        commentCount: 2
      },
      {
        id: 'version2',
        versionNumber: 2,
        filename: fileData.filename,
        fileUrl: fileUrl || '',
        description: 'Uppdaterade mått på kök och badrum',
        uploaded: '2025-04-02',
        uploadedBy: 'Anna Svensson',
        commentCount: 5
      },
      {
        id: 'version3',
        versionNumber: 3,
        filename: fileData.filename,
        fileUrl: fileUrl || '',
        description: 'Justerad planlösning med utökad veranda',
        uploaded: fileData.uploaded,
        uploadedBy: fileData.uploadedBy,
        commentCount: 0
      }
    ];
    
    setFileVersions(dummyVersions);
    
    // Sätt aktuell version till den senaste
    const latestVersion = dummyVersions[dummyVersions.length - 1];
    setActiveVersionId(latestVersion.id);
    
  }, [fileData?.fileId, fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber >= 1 && numPages && newPageNumber <= numPages) {
        return newPageNumber;
      }
      return prevPageNumber;
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Hanterar start av markering
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMarking) return;
    
    // Hämta position relativt till PDF-sidan
    if (pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMarkingStart({ x, y });
      setMarkingEnd({ x, y }); // Initialisera slutposition också
    }
  };
  
  // Uppdaterar markeringens storlek när musen flyttas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMarking || !markingStart) return;
    
    if (pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMarkingEnd({ x, y });
    }
  };
  
  // Avslutar markeringen och visar dialogrutan för att lägga till kommentar
  const handleMouseUp = () => {
    if (!isMarking || !markingStart || !markingEnd) return;
    
    // Om markeringen är för liten, ignorera den
    const width = Math.abs(markingEnd.x - markingStart.x);
    const height = Math.abs(markingEnd.y - markingStart.y);
    
    if (width < 10 || height < 10) {
      setMarkingStart(null);
      setMarkingEnd(null);
      return;
    }
    
    // Beräkna rektangeln för markering
    const rect = {
      x: Math.min(markingStart.x, markingEnd.x),
      y: Math.min(markingStart.y, markingEnd.y),
      width: width,
      height: height,
      pageNumber: pageNumber
    };
    
    // Skapa en temporär annotation som vi sedan kan spara
    setTempAnnotation({
      rect,
      color: statusColors.open,
      status: 'open'
    });
    
    setIsAddingComment(true);
    setIsMarking(false);
    setMarkingStart(null);
    setMarkingEnd(null);
  };
  
  // Spara en ny kommentar/markering
  const saveComment = () => {
    if (!tempAnnotation || !user) {
      console.error("Cannot save comment: Missing tempAnnotation or user", { tempAnnotation, user });
      return;
    }
    
    try {
      // Skapa den nya annotationen med unikt ID
      const newAnnotation: PDFAnnotation = {
        id: `annotation_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        rect: tempAnnotation.rect as PDFAnnotation['rect'],
        color: tempAnnotation.color || statusColors.open,
        comment: newComment,
        status: tempAnnotation.status as PDFAnnotation['status'],
        createdBy: user.username || 'Anonymous',
        createdAt: new Date().toISOString()
      };
      
      // Skapa ny array för att forcera state update
      const updatedAnnotations = [...annotations, newAnnotation];
      setAnnotations(updatedAnnotations);
      
      // Spara omedelbart till localStorage
      if (fileData?.fileId && fileData?.filename) {
        const fileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
        const annotationsKey = `pdf_annotations_${fileName}_${fileData.fileId}`;
        
        localStorage.setItem(annotationsKey, JSON.stringify(updatedAnnotations));
        console.log(`Successfully saved ${updatedAnnotations.length} annotations to localStorage with key: ${annotationsKey}`);
        
        // Uppdatera även nyckellistan
        try {
          let keyList = JSON.parse(localStorage.getItem('pdf_annotation_keys') || '[]');
          if (!keyList.includes(annotationsKey)) {
            keyList.push(annotationsKey);
            localStorage.setItem('pdf_annotation_keys', JSON.stringify(keyList));
          }
        } catch (e) {
          console.error("Error updating key list", e);
        }
      }
      
      // Återställ kommentarsläget
      setIsAddingComment(false);
      setTempAnnotation(null);
      setNewComment('');
      
      // Visa feedback
      console.log("Annotation saved successfully:", newAnnotation);
    } catch (error) {
      console.error("Failed to save annotation:", error);
    }
  };
  
  // Avbryt markering eller kommentarsskapande
  const cancelMarkingOrComment = () => {
    setIsMarking(false);
    setIsAddingComment(false);
    setMarkingStart(null);
    setMarkingEnd(null);
    setTempAnnotation(null);
    setNewComment('');
  };
  
  // Zooma in till en specifik annotation med smidig övergång
  const zoomToAnnotation = (annotation: PDFAnnotation) => {
    // Sätt annotation som aktiv omedelbart så färgkodning visas
    setActiveAnnotation(annotation);
    
    // Om på annan sida, byt sida först
    if (annotation.rect.pageNumber !== pageNumber) {
      // Återställ scale först så vi kan zooma in med animation
      setScale(1);
      
      // Byt sida
      setPageNumber(annotation.rect.pageNumber);
      
      // När sidbytet är klart, zooma in och scrolla
      setTimeout(() => {
        // Försäkra oss om att elementet fortfarande finns synligt i DOm efter sidbyte
        const annotationElement = document.getElementById(`annotation-${annotation.id}`);
        
        if (!annotationElement) {
          console.warn("Could not find annotation element after page change");
          // Force re-render to ensure element exists
          setAnnotations(prev => [...prev]);
          
          // Try again after a short delay
          setTimeout(() => doZoomAndScroll(annotation), 200);
        } else {
          // Element exists, proceed with zoom
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
            // Använd en helt annan metod för centrering - hämta rektangeln från PDF:en direkt
            // och använd scroll-koordinatsystemet istället för viewport
            const pdfContainer = pdfContainerRef.current;
            
            // 1. Hitta annotationens position på sidan
            const annotRect = annotationElement.getBoundingClientRect();
            
            // 2. Hitta annotationens position relativt till sidan
            const pageRect = pageRef.current.getBoundingClientRect();
            
            // 3. Beräkna centrum för PDF-behållaren
            const containerCenterX = pdfContainer.offsetWidth / 2;
            const containerCenterY = pdfContainer.offsetHeight / 2;
            
            // 4. Beräkna centrum för annotationen
            const annotCenterX = (annotRect.left - pageRect.left) + (annotRect.width / 2);
            const annotCenterY = (annotRect.top - pageRect.top) + (annotRect.height / 2);
            
            // 5. Beräkna hur mycket vi behöver skrolla för att centrera annotationen
            const scrollX = pdfContainer.scrollLeft + (annotCenterX - containerCenterX);
            const scrollY = pdfContainer.scrollTop + (annotCenterY - containerCenterY);
            
            // 6. Använd en säker scrollningsmetod
            pdfContainer.scrollTo({
              left: Math.max(0, scrollX),
              top: Math.max(0, scrollY),
              behavior: 'smooth'
            });
            
            console.log("Applied safe scrolling to", { 
              scrollX, scrollY, 
              annotCenterX, annotCenterY,
              containerCenterX, containerCenterY
            });
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
    
    // Spara till localStorage enligt nya formatet
    if (fileData?.fileId && fileData?.filename) {
      try {
        const fileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
        const annotationsKey = `pdf_annotations_${fileName}_${fileData.fileId}`;
        
        localStorage.setItem(annotationsKey, JSON.stringify(updatedAnnotations));
        console.log(`Updated annotation status and saved to localStorage with key: ${annotationsKey}`);
      } catch (error) {
        console.error("Failed to save annotation status update to localStorage", error);
      }
    }
  };
  
  // Spara kommentarer till localStorage när de uppdateras
  useEffect(() => {
    if (!fileData?.fileId || !annotations) return;
    
    try {
      // Generera en mer unik nyckel baserad på filnamn och fil-ID
      const fileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
      const annotationsKey = `pdf_annotations_${fileName}_${fileData.fileId}`;
      
      // Spara även om listan är tom (för att rensa tidigare annotationer)
      localStorage.setItem(annotationsKey, JSON.stringify(annotations));
      console.log(`Saved ${annotations.length} annotations to localStorage with key: ${annotationsKey}`);
      
      // Spara en lista över alla annotation-nycklar för att hålla koll på dem
      let savedKeys = JSON.parse(localStorage.getItem('pdf_annotation_keys') || '[]');
      if (!savedKeys.includes(annotationsKey)) {
        savedKeys.push(annotationsKey);
        localStorage.setItem('pdf_annotation_keys', JSON.stringify(savedKeys));
      }
    } catch (error) {
      console.error("Failed to save annotations to localStorage", error);
    }
  }, [annotations, fileData?.fileId, fileData?.filename]);

  // Ladda upp en ny version av filen
  const handleUploadNewVersion = () => {
    setShowUploadVersionDialog(true);
  };
  
  // Stäng versionsuppladdningsdialogrutan
  const closeUploadVersionDialog = () => {
    setShowUploadVersionDialog(false);
    setSelectedVersionFile(null);
    setNewVersionDescription('');
  };
  
  // Hantera val av fil för ny version
  const handleVersionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedVersionFile(e.target.files[0]);
    }
  };
  
  // Spara en ny version
  const saveNewVersion = () => {
    console.log("saveNewVersion called with:", { 
      selectedVersionFile, 
      fileData, 
      newVersionDescription, 
      user 
    });
    
    // Kontrollera alla villkor som måste vara uppfyllda och ge en tydlig felmeddelande
    if (!selectedVersionFile) {
      console.error("No file selected for new version");
      return;
    }
    
    // ÄNDRING: Vi genererar ett fileId om det saknas
    const fileId = fileData?.fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (!user) {
      console.error("No user logged in");
      return;
    }
    
    if (!newVersionDescription || newVersionDescription.trim() === '') {
      console.error("Version description is empty");
      return;
    }
    
    try {
      // Skapa URL till den uppladdade filen
      console.log("Creating object URL for file...");
      const newFileUrl = URL.createObjectURL(selectedVersionFile);
      
      // Generera ny version med unik ID och ökat versionsnummer
      const newVersionNumber = fileVersions.length + 1;
      const newVersionId = `version${newVersionNumber}_${Date.now()}`;
      const now = new Date().toISOString();
      
      console.log("Creating new version object...");
      const newVersion: FileVersion = {
        id: newVersionId,
        versionNumber: newVersionNumber,
        filename: selectedVersionFile.name,
        fileUrl: newFileUrl,
        description: newVersionDescription,
        uploaded: now,
        uploadedBy: user.username,
        commentCount: 0
      };
      
      console.log("New version created:", newVersion);
      
      // Uppdatera listan med versioner
      const updatedVersions = [...fileVersions, newVersion];
      setFileVersions(updatedVersions);
      
      // Byt till den nya versionen
      setActiveVersionId(newVersionId);
      setPdfUrl(newFileUrl);
      
      // Om fileData inte hade ett fileId, uppdatera det
      if (!fileData?.fileId && fileData) {
        const updatedFileData = {
          ...fileData,
          fileId: fileId
        };
        
        // Vi behöver någott sätt att uppdatera fileData här
        // Detta är lite komplext eftersom fileData kommer utifrån
        // Vi får hoppas att URL:en uppdateras!
        console.log("Generated fileId for file:", fileId);
      }
      
      console.log("Version saved and activated successfully");
      
      // Stäng dialogrutan
      closeUploadVersionDialog();
      
      // Visa en användarfeedback (detta är en placeholder - i ett riktigt system skulle vi använda en toast)
      alert("Ny version uppladdad! Du ser nu den nya versionen.");
    } catch (error) {
      console.error("Error saving new version:", error);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileData?.filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleToggleMarkingMode = () => {
    setIsMarking(prev => !prev);
    if (activeAnnotation) setActiveAnnotation(null);
  };

  if (!isOpen) return null;

  // Beräkna rektangel för temporär markering (under pågående markering)
  const getMarkingRectStyles = () => {
    if (!markingStart || !markingEnd) return {};
    
    const left = Math.min(markingStart.x, markingEnd.x);
    const top = Math.min(markingStart.y, markingEnd.y);
    const width = Math.abs(markingEnd.x - markingStart.x);
    const height = Math.abs(markingEnd.y - markingStart.y);
    
    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      background: 'rgba(114, 124, 245, 0.3)',
      border: '2px dashed #727cf5',
      pointerEvents: 'none' as const
    };
  };

  // Hantera byte av version
  const handleChangeVersion = (versionId: string) => {
    const selectedVersion = fileVersions.find(v => v.id === versionId);
    if (!selectedVersion) return;
    
    // Normalt skulle vi hämta ny file URL för denna version
    // För demo använder vi samma URL
    setPdfUrl(selectedVersion.fileUrl);
    setActiveVersionId(versionId);
    
    // Återställ eventuell zoomning/aktiv markering
    setActiveAnnotation(null);
    setScale(1);
    
    // Stäng versionspanelen
    setShowVersionsPanel(false);
  };
  
  // Växla versionssidan när användaren trycker på knapparna i överkanten
  const toggleVersionPanel = () => {
    setShowVersionsPanel(prev => !prev);
  };
  
  // Hitta aktiv version baserat på id
  const activeVersion = fileVersions.find(v => v.id === activeVersionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm" 
        onClick={isMarking || isAddingComment || showVersionsPanel ? cancelMarkingOrComment : onClose}
      />
      
      <div 
        className={`relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden flex border border-gray-200 dark:border-slate-700 transition-all duration-300 ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-[92%] max-w-6xl h-[92%] animate-in fade-in-50 zoom-in-95 duration-200'
        }`}
        style={{
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Vänster sida - PDF-visare */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col border-b bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 shadow-sm">
            {/* Övre delen med filinfo och knappar */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold mr-4 text-gray-800 dark:text-white">
                  {fileData?.filename || "PDF Document"}
                </h2>
                {activeVersion && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    v{activeVersion.versionNumber} | {activeVersion.uploadedBy} | {new Date(activeVersion.uploaded).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-1 mr-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={zoomOut}
                    className="h-7 w-7 rounded-full hover:bg-white dark:hover:bg-slate-700"
                  >
                    <ZoomOut size={15} />
                  </Button>
                  <div className="w-12 text-center text-sm font-medium">
                    {Math.round(scale * 100)}%
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={zoomIn}
                    className="h-7 w-7 rounded-full hover:bg-white dark:hover:bg-slate-700"
                  >
                    <ZoomIn size={15} />
                  </Button>
                </div>
                
                <Button 
                  variant={isMarking ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleMarkingMode}
                  className={`h-8 w-8 rounded-full ${isMarking ? "bg-primary-500 text-white" : ""}`}
                  title={isMarking ? "Avsluta markering" : "Skapa markering"}
                >
                  <MessageSquare size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={rotate}
                  className="h-8 w-8 rounded-full"
                >
                  <Rotate3D size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleDownload}
                  className="h-8 w-8 rounded-full"
                >
                  <Download size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={toggleFullscreen}
                  className="h-8 w-8 rounded-full"
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
            
            {/* Versionsknappar */}
            <div className="flex items-center justify-between px-4 pb-3 pt-1">
              <div className="flex space-x-2">
                {fileVersions.length > 0 && (
                  <>
                    <Button
                      variant={activeVersionId === fileVersions[fileVersions.length - 1]?.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleChangeVersion(fileVersions[fileVersions.length - 1]?.id)}
                      className="rounded-full py-1 h-7 px-3"
                    >
                      <span className="flex items-center">
                        Nuvarande version
                        {activeVersionId === fileVersions[fileVersions.length - 1]?.id && (
                          <Check size={14} className="ml-1" />
                        )}
                      </span>
                    </Button>
                    {fileVersions.length > 1 && (
                      <Button
                        variant={activeVersionId === fileVersions[0]?.id ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => handleChangeVersion(fileVersions[0]?.id)}
                        className="rounded-full py-1 h-7 px-3"
                      >
                        <span className="flex items-center">
                          Ursprunglig version
                          {activeVersionId === fileVersions[0]?.id && (
                            <Check size={14} className="ml-1" />
                          )}
                        </span>
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleUploadNewVersion}
                  className="rounded-full py-1 h-7 px-3 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Upload size={14} className="mr-1" />
                  Ladda upp ny version
                </Button>
              </div>
              
              {fileVersions.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleVersionPanel}
                  className="rounded-full py-1 h-7 px-3"
                >
                  Visa versionshistorik
                </Button>
              )}
            </div>
          </div>
          
          <div 
            ref={pdfContainerRef}
            className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: isMarking ? 'crosshair' : 'default' }}
          >
            {pdfUrl ? (
              <div className="relative" ref={pageRef}>
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary-600 mb-4" />
                      <p className="text-gray-600">Laddar dokument...</p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-red-500 mb-2">Kunde inte ladda dokumentet</p>
                      <p className="text-gray-600 text-sm">Kontrollera att det är en giltig PDF-fil</p>
                    </div>
                  }
                  className="pdfDocument"
                >
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    scale={scale}
                    rotate={rotation}
                    loading={
                      <div className="h-[500px] w-[400px] bg-gray-100 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                      </div>
                    }
                    className="pdfPage shadow-lg relative"
                  />
                  
                  {/* Visa befintliga markeringar */}
                  {annotations
                    .filter(ann => ann.rect.pageNumber === pageNumber)
                    .map(annotation => (
                      <div
                        key={annotation.id}
                        id={`annotation-${annotation.id}`}
                        className={`absolute border-2 transition-all duration-300 ${
                          activeAnnotation?.id === annotation.id 
                            ? 'z-20 ring-4 ring-blue-400 scale-105 shadow-lg' 
                            : 'z-10 hover:scale-102 hover:shadow-md'
                        }`}
                        style={{
                          position: 'absolute',
                          left: `${annotation.rect.x}px`,
                          top: `${annotation.rect.y}px`,
                          width: `${annotation.rect.width}px`,
                          height: `${annotation.rect.height}px`,
                          backgroundColor: `${annotation.color}33`,
                          borderColor: annotation.color,
                          boxShadow: activeAnnotation?.id === annotation.id ? '0 0 15px rgba(59, 130, 246, 0.6)' : 'none',
                          transform: activeAnnotation?.id === annotation.id ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center',
                          cursor: 'pointer',
                          pointerEvents: 'auto' 
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // Förhindra att klicket når underliggande element
                          zoomToAnnotation(annotation);
                        }}
                      >
                        {/* Lägg till en liten indikator i hörnet som alltid syns tydligt */}
                        <div 
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800"
                          style={{ backgroundColor: annotation.color }}
                        />
                      </div>
                    ))}
                  
                  {/* Visa temporär markering under pågående markering */}
                  {markingStart && markingEnd && (
                    <div style={getMarkingRectStyles()} />
                  )}
                </Document>
              </div>
            ) : (
              <div className="text-gray-500">Ingen PDF vald</div>
            )}
          </div>
          
          {numPages && numPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="h-8"
              >
                <ChevronLeft size={16} className="mr-1" />
                Föregående
              </Button>
              
              <div className="text-sm text-gray-600">
                Sida {pageNumber} av {numPages}
              </div>
              
              <Button
                variant="outline"
                onClick={nextPage}
                disabled={Boolean(numPages && pageNumber >= numPages)}
                className="h-8"
              >
                Nästa
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Höger sida - innehåller antingen kommentarpanelen eller versionspanelen */}
        <div className="w-80 border-l border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-full bg-gray-50 dark:bg-slate-900">
          {showVersionsPanel ? (
            <>
              {/* Versionspanel */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 flex justify-between items-center">
                <h3 className="font-medium text-lg text-gray-800 dark:text-white flex items-center">
                  <FileText size={18} className="mr-2 text-blue-500" />
                  Versionshistorik
                </h3>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={toggleVersionPanel}
                  className="text-gray-500 h-7 px-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X size={16} className="mr-1" />
                  Stäng
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
                <div className="space-y-4">
                  {fileVersions.map((version, index) => {
                    const isLatest = index === fileVersions.length - 1;
                    const isFirst = index === 0;
                    
                    return (
                      <div 
                        key={version.id}
                        className={`border rounded-xl p-4 transition-all transform ${
                          version.id === activeVersionId 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800 shadow-md scale-[1.02]' 
                            : 'bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <h4 className="font-medium flex items-center text-gray-800 dark:text-white">
                              Version {version.versionNumber}
                              {isLatest && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">Senaste</span>}
                              {isFirst && <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full">Första</span>}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                              <span className="font-medium text-gray-700 dark:text-gray-300 mr-1">{version.uploadedBy}</span> • {new Date(version.uploaded).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div>
                            {version.id !== activeVersionId ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleChangeVersion(version.id)}
                                className="text-xs h-7 px-2 rounded-full"
                              >
                                Visa
                              </Button>
                            ) : (
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full flex items-center">
                                <Check size={12} className="mr-1" /> Aktiv
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-md">
                          {version.description}
                        </p>
                        
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                            <MessageSquare size={12} className="mr-1" />
                            {version.commentCount || 0} kommentarer
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Kommentarspanel */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 flex justify-between items-center">
                <h3 className="font-medium text-lg text-gray-800 dark:text-white flex items-center">
                  <MessageSquare size={18} className="mr-2 text-primary-500" />
                  Kommentarer
                </h3>
                <Button 
                  variant={isMarking ? "default" : "ghost"}
                  size="sm"
                  onClick={handleToggleMarkingMode}
                  className={`rounded-full h-7 px-2 ${isMarking ? "bg-primary-500 text-white" : "hover:bg-gray-100 dark:hover:bg-slate-800"}`}
                >
                  <MessageSquare size={16} className="mr-1" />
                  {!isMarking ? "Ny kommentar" : "Avbryt"}
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
                {annotations.length === 0 ? (
                  <div className="p-8 text-gray-500 dark:text-gray-400 text-center flex flex-col items-center justify-center h-full">
                    <div className="bg-gray-100 dark:bg-slate-800 p-5 rounded-full mb-4">
                      <MessageSquare size={32} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">Inga kommentarer ännu</p>
                    <p className="text-sm mt-2 max-w-[220px] text-gray-500 dark:text-gray-400">
                      Lägg till kommentarer direkt på ritningen genom att klicka på 
                      <span className="font-medium"> Ny kommentar</span> ovan
                    </p>
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={handleToggleMarkingMode}
                      className="mt-4 bg-primary-500 hover:bg-primary-600 rounded-full px-3"
                    >
                      <MessageSquare size={14} className="mr-1" />
                      Lägg till första kommentaren
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 p-4">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                        {annotations.length} {annotations.length === 1 ? 'kommentar' : 'kommentarer'}
                      </p>
                    </div>
                    
                    {annotations.map(annotation => (
                      <div 
                        key={annotation.id} 
                        className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-300 transform ${
                          activeAnnotation?.id === annotation.id 
                            ? 'ring-2 ring-blue-400 dark:ring-blue-600 scale-[1.02]' 
                            : 'hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-1'
                        }`}
                        onClick={() => zoomToAnnotation(annotation)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2 ring-2 ring-white dark:ring-slate-700" 
                              style={{ backgroundColor: annotation.color }} 
                            />
                            <span className="text-sm font-medium text-gray-800 dark:text-white">
                              {annotation.rect.pageNumber !== pageNumber && `Sida ${annotation.rect.pageNumber}: `}
                              {annotation.status === 'open' && 'Öppen'}
                              {annotation.status === 'resolved' && 'Löst'}
                              {annotation.status === 'action_required' && 'Kräver åtgärd'}
                              {annotation.status === 'reviewing' && 'Under granskning'}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20" 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateAnnotationStatus(annotation.id, 'resolved');
                              }}
                              title="Markera som löst"
                            >
                              <Check size={14} className="text-green-600 dark:text-green-400" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateAnnotationStatus(annotation.id, 'action_required');
                              }}
                              title="Markera som kräver åtgärd"
                            >
                              <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 bg-gray-50 dark:bg-slate-900/50 p-2 rounded-md">
                          {annotation.comment}
                        </p>
                        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700 pt-2">
                          <span className="font-medium">{annotation.createdBy}</span>
                          <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Dialog för att lägga till ny kommentar */}
      {isAddingComment && tempAnnotation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-in fade-in-50 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onClick={cancelMarkingOrComment} />
          <div 
            className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                <MessageSquare size={18} className="mr-2 text-primary-500" />
                Lägg till kommentar
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelMarkingOrComment}
                className="h-7 w-7 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
              >
                <X size={16} />
              </Button>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200 mb-4 flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span>
                Du markerar ett område på sida <span className="font-bold">{tempAnnotation.rect?.pageNumber}</span>. 
                Välj status och lägg till din kommentar nedan.
              </span>
            </div>
            
            <div className="space-y-5 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <div 
                      key={status}
                      className={`flex flex-col items-center border rounded-lg p-2 cursor-pointer transition-all ${
                        tempAnnotation.status === status 
                          ? 'ring-2 ring-primary-500 border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 transform scale-105' 
                          : 'hover:border-blue-300 dark:hover:border-blue-700 dark:border-slate-700'
                      }`}
                      onClick={() => {
                        setTempAnnotation({
                          ...tempAnnotation,
                          status: status as PDFAnnotation['status'],
                          color
                        });
                      }}
                    >
                      <div 
                        className="w-6 h-6 rounded-full mb-2 ring-2 ring-white dark:ring-slate-800"
                        style={{ backgroundColor: color }}
                      />
                      <span className={`text-xs text-center font-medium ${
                        tempAnnotation.status === status ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {status === 'open' && 'Öppen'}
                        {status === 'resolved' && 'Löst'}
                        {status === 'action_required' && 'Åtgärd'}
                        {status === 'reviewing' && 'Granskas'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Kommentar</label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Beskriv problemet eller lämna en kommentar..."
                  rows={4}
                  className="resize-none focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-700"
                  autoFocus
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  Kommentaren kommer att vara synlig för alla som har tillgång till denna fil
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-3 mt-2 border-t border-gray-200 dark:border-slate-700">
              <Button
                variant="outline"
                onClick={cancelMarkingOrComment}
                className="rounded-full px-4 py-2 h-auto"
              >
                Avbryt
              </Button>
              <Button
                onClick={saveComment}
                disabled={!newComment.trim()}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-auto shadow-sm hover:shadow"
              >
                <MessageSquare size={16} className="mr-2" />
                Publicera kommentar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dialog för att ladda upp ny version */}
      {showUploadVersionDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-in fade-in-50 duration-200" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onClick={closeUploadVersionDialog} />
          <div 
            className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white flex items-center">
                <Upload size={18} className="mr-2 text-blue-500" />
                Ladda upp ny version
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeUploadVersionDialog}
                className="h-7 w-7 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
              >
                <X size={16} />
              </Button>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200 mb-4 flex items-start">
              <AlertCircle size={16} className="mr-2 mt-0.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
              <span>
                Ladda upp en ny version av filen <span className="font-bold">{fileData?.filename}</span>. 
                Den nya versionen kommer att läggas till i historiken.
              </span>
            </div>
            
            <div className="space-y-5 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Välj fil</label>
                <div 
                  className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 transition-colors bg-gray-50 dark:bg-slate-800/50 dark:border-slate-700"
                  onClick={() => document.getElementById('version-file-upload')?.click()}
                >
                  {selectedVersionFile ? (
                    <div className="flex items-center justify-center flex-col">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-3">
                        <FileText size={36} className="text-blue-500 dark:text-blue-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">{selectedVersionFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {(selectedVersionFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersionFile(null);
                        }}
                      >
                        <X size={14} className="mr-1" />
                        Ta bort
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center flex-col">
                      <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-full mb-3">
                        <Upload size={36} className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Klicka för att välja fil eller dra och släpp</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF (max 20MB)</p>
                      <p className="mt-3 text-xs text-blue-500 dark:text-blue-400">Klicka eller dra filen hit</p>
                    </div>
                  )}
                  <input
                    type="file"
                    id="version-file-upload"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleVersionFileChange}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Beskrivning av ändringar</label>
                <Textarea
                  value={newVersionDescription}
                  onChange={(e) => setNewVersionDescription(e.target.value)}
                  placeholder="Beskriv vad som har ändrats i denna version..."
                  rows={3}
                  className="resize-none focus:ring-primary-500 dark:bg-slate-800 dark:border-slate-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                  <AlertCircle size={12} className="mr-1" />
                  En kort beskrivning som visas i versionshistoriken
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-3 mt-2 border-t border-gray-200 dark:border-slate-700">
              <Button
                variant="outline"
                onClick={closeUploadVersionDialog}
                className="rounded-full px-4 py-2 h-auto"
              >
                Avbryt
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Upload button clicked");
                  saveNewVersion();
                }}
                disabled={!selectedVersionFile || !newVersionDescription.trim()}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 h-auto shadow-sm hover:shadow"
              >
                <Upload size={16} className="mr-2" />
                Ladda upp ny version
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}