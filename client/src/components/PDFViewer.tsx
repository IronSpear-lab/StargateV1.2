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
import { storeFileForReuse, getStoredFileById } from "@/lib/file-utils";
import { getConsistentFileId, getLatestPdfVersion } from "@/lib/pdf-utils";

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

  // När en ny PDF-fil öppnas, rensa annotations och versioner och lagra filen
  useEffect(() => {
    if (file) {
      console.log("New PDF file provided to viewer:", file.name, file.size, "bytes");
      
      // Rensa befintliga annotationer och versioner när en ny fil öppnas
      setAnnotations([]);
      setFileVersions([]);
      setActiveVersionId(undefined);
      
      // Persistent lagring av filen för att kunna återanvända den mellan sessioner
      const saveFileForLaterUse = async () => {
        try {
          // Skapa ett unikt fileId för denna specifika uppladdning
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(2, 9);
          const uniqueFileId = `file_${timestamp}_${randomId}`;
          
          // Lagra i IndexedDB med detta unika ID
          const fileId = await storeFileForReuse(file, {
            fromPdfViewer: true,
            uploadDate: new Date().toISOString(),
            uniqueId: uniqueFileId // Använd ett unikt ID för varje uppladdning
          });
          
          console.log(`[${timestamp}] New file ${file.name} stored with unique ID: ${fileId}`);
          
          // Spara globalt för användning i denna session
          (window as any).currentPdfFile = file;
          (window as any).currentPdfFileId = fileId;
        } catch (error) {
          console.error("Failed to store file for reuse:", error);
        }
      };
      
      saveFileForLaterUse();
      
      // Skapa en URL för omedelbar användning
      const url = URL.createObjectURL(file);
      console.log(`[${Date.now()}] Created URL for file ${file.name}:`, url);
      setPdfUrl(url);
      
      // Vi revokar inte URL:en när komponenten unmountas, för att PDFen ska kunna
      // fortsätta visas om komponenten renderas om
      // Detta kan leda till minnesläckage, men är OK för demosyften
    } else if (fileUrl) {
      setPdfUrl(fileUrl);
    } else if (fileData) {
      // Om vi varken har en fil eller URL, men har fildata, försök hitta senaste versionen
      console.log(`[${Date.now()}] No file or URL provided, checking for latest version of: ${fileData.filename}`);
      const latestVersionUrl = getLatestPdfVersion(fileData.filename);
      
      if (latestVersionUrl) {
        console.log(`[${Date.now()}] Found latest version URL: ${latestVersionUrl}`);
        setPdfUrl(latestVersionUrl);
      } else {
        console.log(`[${Date.now()}] No latest version found for: ${fileData.filename}`);
      }
    }
  }, [file, fileUrl, fileData]);
  
  // Hämta sparade annotationer från localStorage när en ny fil öppnas
  useEffect(() => {
    // Rensa eventuella tidigare aktiva annotationer
    setActiveAnnotation(null);
    
    // Försök hämta annotationer från localStorage för denna fil - KRITISKT: Körs när dialogen öppnas
    if (isOpen && fileData) {
      try {
        // Använd vår nya hjälpfunktion från pdf-utils för att få ett konsekvent ID
        const canonicalFileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
        
        // Hämta eller generera konsekvent fileId baserat på filnamn
        let fileId = fileData.fileId;
        const consistentFileId = getConsistentFileId(fileData.filename);
        
        try {
          // Lagra denna koppling för framtida referens
          const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
          
          // Om vi har ett tidigare ID för filen, använd det också för bakåtkompatibilitet
          if (!fileId) {
            fileId = fileIdMappings[fileData.filename] || consistentFileId;
          }
          
          // Uppdatera mappning med den konsekventa ID:n
          fileIdMappings[fileData.filename] = consistentFileId;
          localStorage.setItem('pdf_file_id_mappings', JSON.stringify(fileIdMappings));
          
          console.log(`[${Date.now()}] Using consistent fileId for ${fileData.filename}: ${consistentFileId}`);
        } catch (error) {
          console.error("Error with fileId mappings:", error);
          // Om något går fel, använd ändå det konsekventa ID:t
          fileId = fileId || consistentFileId;
        }
        
        // Använd consistentFileId för alla nycklar
        const annotationsKey = `pdf_annotations_${canonicalFileName}_${consistentFileId}`;
        
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
          // Kolla efter alternativa nycklar som fallback (generösare sökning)
          let foundAnnotations = false;
          
          try {
            // Hämta alla annotationnycklar vi känner till
            const keyList = JSON.parse(localStorage.getItem('pdf_annotation_keys') || '[]');
            
            // Sök efter eventuella tidigare nycklar som kan innehålla denna fil
            for (const key of keyList) {
              if (key.includes(canonicalFileName)) {
                console.log(`[${Date.now()}] Found potential legacy annotation key: ${key}`);
                const legacyAnnotations = localStorage.getItem(key);
                
                if (legacyAnnotations) {
                  try {
                    const parsedLegacyAnnotations = JSON.parse(legacyAnnotations);
                    if (Array.isArray(parsedLegacyAnnotations) && parsedLegacyAnnotations.length > 0) {
                      console.log(`[${Date.now()}] Successfully loaded ${parsedLegacyAnnotations.length} annotations from legacy key`);
                      
                      // Kopiera annotationerna till vår konsekventa nyckel
                      localStorage.setItem(annotationsKey, legacyAnnotations);
                      
                      // För att tvinga React att uppdatera vyn, skapa en ny array
                      const annotationsCopy = [...parsedLegacyAnnotations];
                      setAnnotations(annotationsCopy);
                      foundAnnotations = true;
                      break;
                    }
                  } catch (e) {
                    console.error("Error parsing legacy annotations:", e);
                  }
                }
              }
            }
            
            if (!foundAnnotations) {
              // Kolla med det alternativa fileId vi kan ha från tidigare
              if (fileId && fileId !== consistentFileId) {
                const altKey = `pdf_annotations_${canonicalFileName}_${fileId}`;
                const altAnnotations = localStorage.getItem(altKey);
                
                if (altAnnotations) {
                  try {
                    const parsedAltAnnotations = JSON.parse(altAnnotations);
                    if (Array.isArray(parsedAltAnnotations) && parsedAltAnnotations.length > 0) {
                      console.log(`[${Date.now()}] Found annotations with alternative fileId: ${fileId}`);
                      
                      // Kopiera till vår konsekventa nyckel
                      localStorage.setItem(annotationsKey, altAnnotations);
                      
                      // Uppdatera vyn
                      setAnnotations(parsedAltAnnotations);
                      foundAnnotations = true;
                    }
                  } catch (e) {
                    console.error("Error parsing alternative annotations:", e);
                  }
                }
              }
            }
            
            if (!foundAnnotations) {
              console.log(`[${Date.now()}] No annotations found for file: ${fileData.filename}, starting with empty list`);
              setAnnotations([]);
            }
          } catch (fallbackError) {
            console.error("Error in annotation fallback logic:", fallbackError);
            setAnnotations([]);
          }
        }
        
        // Spara den konsekventa nyckeln för felsökning och framtida användning
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
      // Om dialogrutan inte är öppen eller ingen fildata, gör ingenting
      if (!isOpen) {
        console.log("PDF Viewer is closed, skipping annotation loading");
      } else {
        console.log("Missing file data, cannot load annotations", { filename: fileData?.filename });
        setAnnotations([]);
      }
    }
  }, [isOpen, fileData]);
  
  // Hämta tillgängliga versioner när en fil öppnas
  useEffect(() => {
    if (!isOpen || !fileData) return;
    
    // VIKTIG ÄNDRING: PDF-visaren väljer och visar nu automatiskt senaste versionen
    // istället för att visa versionsvalsdialogen för användaren
    const canonicalFileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
    
    // Använd vår nya hjälpfunktion från pdf-utils för att få ett konsekvent ID
    const consistentFileId = getConsistentFileId(fileData.filename);
    let fileId = fileData.fileId || consistentFileId;
    
    try {
      // Uppdatera mappning med det konsekventa ID:t för framtida referens
      const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
      fileIdMappings[fileData.filename] = consistentFileId;
      localStorage.setItem('pdf_file_id_mappings', JSON.stringify(fileIdMappings));
      
      console.log(`[${Date.now()}] Using consistent fileId for versions: ${consistentFileId}`);
    } catch (error) {
      console.error("Error with fileId mappings for versions:", error);
    }
    
    // Använd det konsekventa ID:t för versionsnyckeln
    const versionsKey = `pdf_versions_${canonicalFileName}_${consistentFileId}`;
    
    console.log(`[${Date.now()}] Attempting to load versions with consistent key:`, versionsKey);
    
    // En funktion för att extrahera filen från IndexedDB vid behov
    const updateFileBinaryIfNeeded = async (versions: FileVersion[]) => {
      // Kolla om vi har originalfilen lagrad i IndexedDB
      try {
        if (!(window as any).currentPdfFile) {
          // Försök hitta den ursprungliga filen i IndexedDB baserat på filnamnet
          const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
          const storedFileId = fileIdMappings[fileData.filename];
          
          if (storedFileId) {
            console.log(`[${Date.now()}] Attempting to retrieve original file from IndexedDB with id: ${storedFileId}`);
            const storedFile = await getStoredFileById(storedFileId);
            
            if (storedFile) {
              console.log(`[${Date.now()}] Successfully retrieved original file from IndexedDB: ${storedFile.name}`);
              (window as any).currentPdfFile = storedFile.file;
              (window as any).currentPdfFileId = storedFileId;
            }
          }
        }
      } catch (error) {
        console.error("Error retrieving file from IndexedDB for versions:", error);
      }
    };
    
    // Först, försök hämta versioner från localStorage med den konsekventa nyckeln
    const savedVersionsStr = localStorage.getItem(versionsKey);
    if (savedVersionsStr) {
      try {
        const savedVersions = JSON.parse(savedVersionsStr);
        if (Array.isArray(savedVersions) && savedVersions.length > 0) {
          console.log(`[${Date.now()}] Successfully loaded ${savedVersions.length} versions with consistent key`);
          setFileVersions(savedVersions);
          
          // VIKTIGT: Alltid säkerställ att vi har en version vald
          // Se först om den nuvarande versionen fortfarande finns
          const versionExists = savedVersions.some(v => v.id === activeVersionId);
          
          // Automatiskt välj den senaste versionen och ladda den
          const latestVersion = savedVersions[savedVersions.length - 1];
          console.log(`[${Date.now()}] Auto-selecting latest version: ${latestVersion.id}`);
          setActiveVersionId(latestVersion.id);
          
          // Säkerställ att PDF URL är uppdaterad
          if (latestVersion.fileUrl) {
            console.log(`[${Date.now()}] Updating PDF URL to match selected version`);
            setPdfUrl(latestVersion.fileUrl);
          }
          
          // Automatiskt kör handleChangeVersion för att faktiskt ladda den valda versionen
          handleChangeVersion(latestVersion.id);
          
          // Hämta faktiska filen från IndexedDB om möjligt
          updateFileBinaryIfNeeded(savedVersions);
          return;
        }
      } catch (error) {
        console.error("Error parsing saved versions with consistent key:", error);
      }
    }
    
    // Om vi inte hittade versioner med den konsekventa nyckeln, titta på alla kända versionsnycklar
    // detta säkerställer att vi hittar versioner oavsett hur de tidigare har sparats
    try {
      let foundVersions = false;
      const versionKeyList = JSON.parse(localStorage.getItem('pdf_version_keys') || '[]');
      
      // Sök igenom alla kända versionsnycklar efter denna fil
      for (const key of versionKeyList) {
        if (key.includes(canonicalFileName)) {
          console.log(`[${Date.now()}] Found potential legacy version key: ${key}`);
          
          try {
            const legacyVersionsStr = localStorage.getItem(key);
            if (legacyVersionsStr) {
              const legacyVersions = JSON.parse(legacyVersionsStr);
              if (Array.isArray(legacyVersions) && legacyVersions.length > 0) {
                console.log(`[${Date.now()}] Successfully loaded ${legacyVersions.length} versions from legacy key`);
                
                // Migrera data till vår konsekventa nyckel
                localStorage.setItem(versionsKey, legacyVersionsStr);
                
                // Se till att versionsnyckellistan innehåller vår konsekventa nyckel
                if (!versionKeyList.includes(versionsKey)) {
                  versionKeyList.push(versionsKey);
                  localStorage.setItem('pdf_version_keys', JSON.stringify(versionKeyList));
                }
                
                setFileVersions(legacyVersions);
                
                // Välj senaste versionen och ladda den direkt
                const latestVersion = legacyVersions[legacyVersions.length - 1];
                setActiveVersionId(latestVersion.id);
                
                // Automatiskt kör handleChangeVersion för att faktiskt ladda den valda versionen
                handleChangeVersion(latestVersion.id);
                
                // Hämta faktiska filen från IndexedDB om möjligt
                updateFileBinaryIfNeeded(legacyVersions);
                
                foundVersions = true;
                return;
              }
            }
          } catch (error) {
            console.error("Error with legacy version:", error);
          }
        }
      }
      
      // Om vi fortfarande inte har hittat några versioner, kolla alternativ fileId
      if (!foundVersions && fileId !== consistentFileId) {
        const altKey = `pdf_versions_${canonicalFileName}_${fileId}`;
        const altVersionsStr = localStorage.getItem(altKey);
        
        if (altVersionsStr) {
          try {
            const altVersions = JSON.parse(altVersionsStr);
            if (Array.isArray(altVersions) && altVersions.length > 0) {
              console.log(`[${Date.now()}] Found versions with alternative fileId: ${fileId}`);
              
              // Kopiera till vår konsekventa nyckel
              localStorage.setItem(versionsKey, altVersionsStr);
              
              // Uppdatera versionsnyckellistan
              if (!versionKeyList.includes(versionsKey)) {
                versionKeyList.push(versionsKey);
                localStorage.setItem('pdf_version_keys', JSON.stringify(versionKeyList));
              }
              
              setFileVersions(altVersions);
              
              // Välj senaste versionen och ladda den direkt
              const latestVersion = altVersions[altVersions.length - 1];
              setActiveVersionId(latestVersion.id);
              
              // Automatiskt kör handleChangeVersion för att faktiskt ladda den valda versionen
              handleChangeVersion(latestVersion.id);
              
              // Hämta faktiska filen från IndexedDB om möjligt
              updateFileBinaryIfNeeded(altVersions);
              
              return;
            }
          } catch (error) {
            console.error("Error with alternative versions:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error checking all version sources:", error);
    }
    
    // Om vi inte hittade några sparade versioner, skapa en initial version
    console.log(`[${Date.now()}] No saved versions found, creating initial version`);
    
    const initialVersion: FileVersion = {
      id: `version1_${Date.now()}`,
      versionNumber: 1,
      filename: fileData.filename,
      fileUrl: fileUrl || '',
      description: fileData.description || 'Ursprunglig fil',
      uploaded: fileData.uploaded || new Date().toISOString(),
      uploadedBy: fileData.uploadedBy || user?.username || 'Användare',
      commentCount: 0
    };
    
    const initialVersions = [initialVersion];
    setFileVersions(initialVersions);
    setActiveVersionId(initialVersion.id);
    
    // Automatiskt kör handleChangeVersion för att faktiskt ladda den valda versionen
    handleChangeVersion(initialVersion.id);
    
    // Spara denna första version till localStorage
    try {
      localStorage.setItem(versionsKey, JSON.stringify(initialVersions));
      console.log(`[${Date.now()}] Saved initial version to localStorage:`, initialVersion);
      
      // Uppdatera nyckellistan 
      try {
        let versionKeyList = JSON.parse(localStorage.getItem('pdf_version_keys') || '[]');
        if (!versionKeyList.includes(versionsKey)) {
          versionKeyList.push(versionsKey);
          localStorage.setItem('pdf_version_keys', JSON.stringify(versionKeyList));
        }
      } catch (e) {
        console.error("Error updating version keys list:", e);
      }
    } catch (error) {
      console.error("Error saving initial version to localStorage:", error);
    }
  }, [isOpen, fileData, fileUrl, user]);

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
      if (fileData) {
        try {
          // Bestäm fileId att använda, skapa ett om det saknas
          let fileId = fileData.fileId;
          
          // Om vi inte har något fileId, kolla om vi har ett mappat ID
          if (!fileId) {
            try {
              const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
              fileId = fileIdMappings[fileData.filename];
              
              if (!fileId) {
                // Skapa ett nytt ID om det saknas
                fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                console.log(`[${Date.now()}] Created new fileId for annotations: ${fileId}`);
                
                // Spara mapping för framtida användning
                fileIdMappings[fileData.filename] = fileId;
                localStorage.setItem('pdf_file_id_mappings', JSON.stringify(fileIdMappings));
              }
            } catch (error) {
              console.error("Error handling fileId mappings:", error);
              fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            }
          }
          
          // Använd det säkra fileId vi nu har
          const fileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
          const annotationsKey = `pdf_annotations_${fileName}_${fileId}`;
          
          localStorage.setItem(annotationsKey, JSON.stringify(updatedAnnotations));
          console.log(`[${Date.now()}] Successfully saved ${updatedAnnotations.length} annotations to localStorage with key: ${annotationsKey}`);
          
          // Uppdatera även nyckellistan för enklare felsökning
          try {
            let keyList = JSON.parse(localStorage.getItem('pdf_annotation_keys') || '[]');
            if (!keyList.includes(annotationsKey)) {
              keyList.push(annotationsKey);
              localStorage.setItem('pdf_annotation_keys', JSON.stringify(keyList));
            }
          } catch (e) {
            console.error("Error updating annotation key list", e);
          }
        } catch (error) {
          console.error("Error saving annotations:", error);
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
    
    // Visa en laddningsindikator medan vi hanterar centreringen
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'annotation-centering-indicator';
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.padding = '12px 20px';
    loadingIndicator.style.borderRadius = '8px';
    loadingIndicator.style.zIndex = '9999';
    loadingIndicator.style.fontWeight = 'bold';
    loadingIndicator.style.fontSize = '16px';
    loadingIndicator.textContent = 'Centrerar kommentar...';
    document.body.appendChild(loadingIndicator);
    
    // Lägg till CSS för bounce-animation om det behövs
    try {
      // Lägg till CSS för bounce-animation (inline funktion för att undvika import-beroenden)
      if (!document.getElementById('pdf-viewer-animations')) {
        const style = document.createElement('style');
        style.id = 'pdf-viewer-animations';
        style.textContent = `
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateY(0);
            }
            40% {
              transform: translateY(-20px);
            }
            60% {
              transform: translateY(-10px);
            }
          }
          
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 0.8;
            }
            50% {
              transform: scale(1.05);
              opacity: 1;
            }
            100% {
              transform: scale(1);
              opacity: 0.8;
            }
          }
        `;
        document.head.appendChild(style);
      }
    } catch (e) {
      console.error("Failed to add animations:", e);
    }
    
    // VIKTIGT: Gör en ny approach där vi:
    // 1. Först centrerar på det ursprungliga (ännu ej zoomade) elementet
    // 2. Sedan zoomar in
    // 3. Efter inzoomningen återcentrerar vi en gång till
    
    // Steg 1: Hitta och centrera på annotations-koordinater med nuvarande zoomnivå
    setTimeout(() => {
      try {
        if (!pdfContainerRef.current || !pageRef.current) {
          console.error("Missing refs for scrolling", { 
            pdfContainerRef: !!pdfContainerRef.current, 
            pageRef: !!pageRef.current 
          });
          if (document.body.contains(loadingIndicator)) {
            document.body.removeChild(loadingIndicator);
          }
          return;
        }
        
        const annotationId = annotation.id;
        const pdfContainer = pdfContainerRef.current;
        const pageContainer = pageRef.current;
        
        // Skapa en provisorisk marker på annotations-platsen
        // Vi använder STORA MARGINALER runt markeringen för att se till att den syns
        const preZoomMarker = document.createElement('div');
        preZoomMarker.id = `pre-zoom-marker-${annotation.id}`;
        preZoomMarker.style.position = 'absolute';
        preZoomMarker.style.left = `${annotation.rect.x - 50}px`;
        preZoomMarker.style.top = `${annotation.rect.y - 50}px`;
        preZoomMarker.style.width = `${Math.max(annotation.rect.width + 100, 200)}px`;
        preZoomMarker.style.height = `${Math.max(annotation.rect.height + 100, 200)}px`;
        preZoomMarker.style.backgroundColor = 'rgba(255, 195, 90, 0.4)'; // Använd en annan färg än de normala markörerna
        preZoomMarker.style.border = '5px dashed #ffc35a';
        preZoomMarker.style.borderRadius = '8px';
        preZoomMarker.style.zIndex = '1500'; 
        preZoomMarker.style.pointerEvents = 'none';
        preZoomMarker.style.boxShadow = '0 0 30px rgba(255, 195, 90, 0.7)';
        pageContainer.appendChild(preZoomMarker);
        
        // Centrera på denna markör INNAN vi zoomar
        preZoomMarker.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
        
        // Steg 2: Efter kort fördröjning, zooma in men håll centering på samma position
        setTimeout(() => {
          console.log("Pre-zoom centering complete, zooming in...");
          
          // Zooma in till 1.5x för bättre detaljvisning
          setScale(1.5);
          
          // Nu när vi zoomar, ta bort den provisoriska markören
          if (pageContainer.contains(preZoomMarker)) {
            pageContainer.removeChild(preZoomMarker);
          }
          
          // Steg 3: Efter zoom, återcentrera och visa markeringar i den zoomade vyn
          setTimeout(() => {
            console.log("Zoom complete, centering on annotation in zoomed view...");
            
            // Försök hitta faktiska annotations-elementet i DOM
            const annotationElement = document.getElementById(`annotation-${annotationId}`);
            
            if (annotationElement) {
              console.log("Found annotation element, positioning...");
              
              // Markera det faktiska elementet
              annotationElement.classList.add('annotation-pulse');
              
              // Skapa en tydligare highlight runt kommentaren
              const zoomedHighlight = document.createElement('div');
              zoomedHighlight.id = `zoomed-highlight-${annotation.id}`;
              zoomedHighlight.style.position = 'absolute';
              zoomedHighlight.style.left = `${annotation.rect.x - 15}px`;
              zoomedHighlight.style.top = `${annotation.rect.y - 15}px`;
              zoomedHighlight.style.width = `${Math.max(annotation.rect.width + 30, 60)}px`;
              zoomedHighlight.style.height = `${Math.max(annotation.rect.height + 30, 60)}px`;
              zoomedHighlight.style.border = '4px solid #fa5c7c';
              zoomedHighlight.style.backgroundColor = 'rgba(250, 92, 124, 0.3)';
              zoomedHighlight.style.borderRadius = '6px';
              zoomedHighlight.style.zIndex = '1000';
              zoomedHighlight.style.pointerEvents = 'none';
              zoomedHighlight.style.boxShadow = '0 0 20px rgba(250, 92, 124, 0.5)';
              pageContainer.appendChild(zoomedHighlight);
              
              // Centrera på vår highlight för bästa visibilitet
              setTimeout(() => {
                // Vi måste återigen centrera eftersom zoomen har ändrat positionerna
                zoomedHighlight.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'center'
                });
                
                // Ta bort laddningsindikatorn
                setTimeout(() => {
                  if (document.body.contains(loadingIndicator)) {
                    document.body.removeChild(loadingIndicator);
                  }
                }, 500);
                
                // Ta bort markeringar efter en stund
                setTimeout(() => {
                  if (annotationElement) {
                    annotationElement.classList.remove('annotation-pulse');
                  }
                  if (pageContainer.contains(zoomedHighlight)) {
                    pageContainer.removeChild(zoomedHighlight);
                  }
                }, 3000);
              }, 100);
            } else {
              // Fallback för när annotations-elementet inte hittas efter zoom
              console.warn(`Could not find annotation element after zoom, creating visual indicators`);
              
              // Skapa större och tydligare markeringar
              const bigMarker = document.createElement('div');
              bigMarker.id = `post-zoom-marker-${annotation.id}`;
              bigMarker.style.position = 'absolute';
              bigMarker.style.left = `${annotation.rect.x - 25}px`;
              bigMarker.style.top = `${annotation.rect.y - 25}px`;
              bigMarker.style.width = `${Math.max(annotation.rect.width + 50, 100)}px`;
              bigMarker.style.height = `${Math.max(annotation.rect.height + 50, 100)}px`;
              bigMarker.style.border = '6px solid #fa5c7c';
              bigMarker.style.backgroundColor = 'rgba(250, 92, 124, 0.3)';
              bigMarker.style.borderRadius = '8px';
              bigMarker.style.zIndex = '1001';
              bigMarker.style.boxShadow = '0 0 30px rgba(250, 92, 124, 0.6)';
              bigMarker.style.pointerEvents = 'none';
              pageContainer.appendChild(bigMarker);
              
              // Lägg till en text-bubble med kommentarstext
              const textBubble = document.createElement('div');
              textBubble.style.position = 'absolute';
              textBubble.style.left = `${annotation.rect.x}px`;
              textBubble.style.top = `${annotation.rect.y - 60}px`;
              textBubble.style.padding = '8px 12px';
              textBubble.style.backgroundColor = '#fa5c7c';
              textBubble.style.color = 'white';
              textBubble.style.borderRadius = '6px';
              textBubble.style.fontWeight = 'bold';
              textBubble.style.zIndex = '1002';
              textBubble.style.maxWidth = '250px';
              textBubble.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
              textBubble.textContent = annotation.comment.length > 25 
                ? `"${annotation.comment.substring(0, 25)}..."` 
                : `"${annotation.comment}"`;
              
              // Lägg till en liten pil nedåt på text-bubblan
              textBubble.style.position = 'relative';
              const arrow = document.createElement('div');
              arrow.style.position = 'absolute';
              arrow.style.bottom = '-8px';
              arrow.style.left = '20px';
              arrow.style.width = '0';
              arrow.style.height = '0';
              arrow.style.borderLeft = '8px solid transparent';
              arrow.style.borderRight = '8px solid transparent';
              arrow.style.borderTop = '8px solid #fa5c7c';
              textBubble.appendChild(arrow);
              
              pageContainer.appendChild(textBubble);
              
              // Centrera på markören i zoomad vy
              setTimeout(() => {
                bigMarker.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'center'
                });
                
                // Ta bort laddningsindikatorn
                setTimeout(() => {
                  if (document.body.contains(loadingIndicator)) {
                    document.body.removeChild(loadingIndicator);
                  }
                }, 500);
                
                // Ta bort markörerna efter en stund
                setTimeout(() => {
                  if (pageContainer.contains(bigMarker)) {
                    pageContainer.removeChild(bigMarker);
                  }
                  if (pageContainer.contains(textBubble)) {
                    pageContainer.removeChild(textBubble);
                  }
                }, 4000);
              }, 100);
            }
          }, 500); // Vänta på att zoomen ska ta effekt
        }, 300); // Vänta tills den första centreringen är klar
      } catch (error) {
        console.error("Error during annotation centering process:", error);
        
        // Ta bort laddningsindikatorn vid fel
        if (document.body.contains(loadingIndicator)) {
          document.body.removeChild(loadingIndicator);
        }
      }
    }, 100);
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
      
      // Använd vår nya hjälpfunktion för att få ett konsekvent ID
      const canonicalFileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
      const consistentFileId = getConsistentFileId(fileData.filename);
      
      // Om vi inte har något fileId, kolla om vi har ett mappat
      if (!fileId) {
        try {
          const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
          fileId = fileIdMappings[fileData.filename];
          
          if (!fileId) {
            // Använd det konsekventa ID:t som fallback
            fileId = consistentFileId;
          }
        } catch (e) {
          console.error("Error getting fileId mapping:", e);
          // Använd det konsekventa ID:t som fallback
          fileId = consistentFileId;
        }
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
      newVersionDescription, 
      user 
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
    
    if (!user) {
      console.error("No user logged in");
      return;
    }
    
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
            const storedFile = await getStoredFileById(persistentFileId);
            if (storedFile) {
              console.log(`[${Date.now()}] Successfully retrieved original file from IndexedDB: ${storedFile.name}`);
              originalFile = storedFile.file;
              
              // Uppdatera också referensen i window-objektet
              (window as any).currentPdfFile = originalFile;
              (window as any).currentPdfFileId = persistentFileId;
            }
          }
        } catch (error) {
          console.error(`[${Date.now()}] Error retrieving file from IndexedDB:`, error);
        }
      }
      
      // Om vi fortfarande inte har en originalfil, använd den valda versionen
      if (!originalFile) {
        console.log(`[${Date.now()}] No original file available, using selected version file`);
        originalFile = selectedVersionFile;
        
        // Spara filen för persistent lagring
        try {
          persistentFileId = await storeFileForReuse(selectedVersionFile, {
            fromPdfViewer: true,
            uploadDate: new Date().toISOString(),
            filename: fileData.filename
          });
          
          console.log(`[${Date.now()}] Stored new file for reuse with ID: ${persistentFileId}`);
          
          // Spara mappad ID för filen
          const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
          fileIdMappings[fileData.filename] = persistentFileId;
          localStorage.setItem('pdf_file_id_mappings', JSON.stringify(fileIdMappings));
          
          // Uppdatera referenserna i window-objektet
          (window as any).currentPdfFile = originalFile;
          (window as any).currentPdfFileId = persistentFileId;
        } catch (error) {
          console.error(`[${Date.now()}] Error storing file for reuse:`, error);
        }
      }
      
      console.log(`[${Date.now()}] Using file for new version: ${originalFile.name}`);
      
      // Skapa URL till den uppladdade filen
      console.log("Creating object URL for file...");
      
      // Revoke eventuell tidigare URL för att undvika minnesläckage
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(pdfUrl.split('#')[0]);
        } catch (e) {
          console.error("Error revoking URL:", e);
        }
      }
      
      // Skapa en ny URL för filen
      const newFileUrl = URL.createObjectURL(originalFile);
      console.log(`[${Date.now()}] Created new URL for version: ${newFileUrl}`);
      
      // Generera ny version med unik ID och ökat versionsnummer
      const newVersionNumber = fileVersions.length + 1;
      const newVersionId = `version${newVersionNumber}_${Date.now()}`;
      const now = new Date().toISOString();
      
      console.log("Creating new version object...");
      const newVersion: FileVersion = {
        id: newVersionId,
        versionNumber: newVersionNumber,
        filename: originalFile.name, // Använd originalfilens namn
        fileUrl: newFileUrl,
        description: newVersionDescription,
        uploaded: now,
        uploadedBy: user.username,
        commentCount: existingAnnotations.length
      };
      
      console.log("New version created:", newVersion);
      
      // Uppdatera listan med versioner
      const updatedVersions = [...fileVersions, newVersion];
      setFileVersions(updatedVersions);
      
      // Byt till den nya versionen
      setActiveVersionId(newVersionId);
      setPdfUrl(newFileUrl);
      
      // Här är förändringen: Kopiera de befintliga annotationerna med konsekvent nyckel
      // Detta säkerställer att kommentarerna finns även efter att vi byter version
      if (existingAnnotations.length > 0) {
        console.log(`[${Date.now()}] Copying ${existingAnnotations.length} annotations to new version`);
        const canonicalFileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
        
        // Skapa ett konsekvent ID med vår hjälpfunktion
        const consistentAnnotationFileId = getConsistentFileId(fileData.filename);
        
        // Använd samma nyckelformat som i auto-save useEffect
        const consistentAnnotationsKey = `pdf_annotations_${canonicalFileName}_${consistentAnnotationFileId}`;
        try {
          localStorage.setItem(consistentAnnotationsKey, JSON.stringify(existingAnnotations));
          console.log(`[${Date.now()}] Successfully copied annotations to new version with consistent key: ${consistentAnnotationsKey}`);
          
          // Uppdatera nyckelregistret
          try {
            let keyList = JSON.parse(localStorage.getItem('pdf_annotation_keys') || '[]');
            if (!keyList.includes(consistentAnnotationsKey)) {
              keyList.push(consistentAnnotationsKey);
              localStorage.setItem('pdf_annotation_keys', JSON.stringify(keyList));
            }
          } catch (e) {
            console.error("Error updating annotation key list:", e);
          }
        } catch (err) {
          console.error("Failed to copy annotations to new version:", err);
        }
      }
      
      // VIKTIG ÄNDRING: Spara versioner till localStorage med konsekvent ID
      try {
        if (!fileData) {
          console.error("Missing fileData when trying to save versions");
          return;
        }
        
        // Använd samma konsistenta nyckelgenereringslogik som i laddningskoden
        const canonicalFileName = fileData.filename.replace(/\s+/g, '_').toLowerCase();
        
        // Använd vår hjälpfunktion för att få ett konsekvent ID
        const currentVersionId = getConsistentFileId(fileData.filename);
        
        // Använd det konsekventa ID:t för att skapa en pålitlig nyckel
        const consistentVersionsKey = `pdf_versions_${canonicalFileName}_${currentVersionId}`;
        
        // Spara med den konsekventa nyckeln
        localStorage.setItem(consistentVersionsKey, JSON.stringify(updatedVersions));
        console.log(`[${Date.now()}] Saved ${updatedVersions.length} versions to localStorage with consistent key: ${consistentVersionsKey}`);
        
        // Uppdatera även nyckellistan för versioner
        let versionKeyList = JSON.parse(localStorage.getItem('pdf_version_keys') || '[]');
        if (!versionKeyList.includes(consistentVersionsKey)) {
          versionKeyList.push(consistentVersionsKey);
          localStorage.setItem('pdf_version_keys', JSON.stringify(versionKeyList));
        }
        
        // För bakåtkompatibilitet, spara även med det eventuellt tidigare ID:t
        if (fileId && fileId !== currentVersionId) {
          const legacyVersionsKey = `pdf_versions_${canonicalFileName}_${fileId}`;
          localStorage.setItem(legacyVersionsKey, JSON.stringify(updatedVersions));
          
          // Se till att även den gamla nyckeln finns i listan
          if (!versionKeyList.includes(legacyVersionsKey)) {
            versionKeyList.push(legacyVersionsKey);
            localStorage.setItem('pdf_version_keys', JSON.stringify(versionKeyList));
          }
        }
      } catch (error) {
        console.error("Failed to save versions to localStorage:", error);
      }
      
      // Uppdatera filnamnsmappning för att använda samma konsekventa ID-system
      // (Vi har redan gjort en null-check på fileData tidigare)
      try {
        // Oavsett om fileData har ett fileId, uppdatera alltid mappningen med det konsekventa ID:t
        // för att säkerställa att alla filer använder samma ID-system framöver
        // Använd vår hjälpfunktion för att få ett konsekvent ID
        const currentConsistentId = getConsistentFileId(fileData.filename);
        
        const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
        // Uppdatera mappningen med det konsekventa ID:t
        fileIdMappings[fileData.filename] = currentConsistentId;
        localStorage.setItem('pdf_file_id_mappings', JSON.stringify(fileIdMappings));
        console.log(`[${Date.now()}] Updated file ID mapping for ${fileData.filename} with consistent ID: ${currentConsistentId}`);
      } catch (error) {
        console.error("Failed to update file ID mapping:", error);
      }
      
      console.log(`[${Date.now()}] Version saved and activated successfully`);
      
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
  const handleChangeVersion = async (versionId: string) => {
    const selectedVersion = fileVersions.find(v => v.id === versionId);
    if (!selectedVersion) {
      console.error("Could not find version with id:", versionId);
      return;
    }
    
    // VIKTIGT: Vi måste använda den ursprungliga filen för alla versioner
    // Eftersom blob-URLer inte är beständiga mellan sessioner
    try {
      // Försök först att använda filen från det globala window-objektet (om den finns)
      let originalFile = (window as any).currentPdfFile;
      
      // Om ingen fil finns i minnet, försök hämta från persistent lagring i IndexedDB
      if (!originalFile && fileData) {
        console.log(`[${Date.now()}] No file in memory, attempting to retrieve from IndexedDB`);
        
        // Försök hämta filId från mappning
        try {
          // Kolla om vi har ett fileId i vår metadata-mappning
          const fileIdMappings = JSON.parse(localStorage.getItem('pdf_file_id_mappings') || '{}');
          const persistentFileId = fileIdMappings[fileData.filename];
          
          if (persistentFileId) {
            console.log(`[${Date.now()}] Found persistent fileId for ${fileData.filename}: ${persistentFileId}`);
            
            // Hämta filen från IndexedDB
            try {
              const storedFile = await getStoredFileById(persistentFileId);
              if (storedFile) {
                console.log(`[${Date.now()}] Successfully retrieved file from IndexedDB: ${storedFile.name}`);
                originalFile = storedFile.file;
                
                // Uppdatera även global referens för framtida användning
                (window as any).currentPdfFile = originalFile;
                (window as any).currentPdfFileId = persistentFileId;
              } else {
                console.error(`[${Date.now()}] Failed to retrieve file from IndexedDB`);
              }
            } catch (error) {
              console.error(`[${Date.now()}] Error retrieving file from IndexedDB:`, error);
            }
          } else {
            console.log(`[${Date.now()}] No fileId mapping found for ${fileData.filename}`);
          }
        } catch (error) {
          console.error(`[${Date.now()}] Error checking file mappings:`, error);
        }
      }
      
      if (originalFile) {
        console.log(`[${Date.now()}] Using file for version ${selectedVersion.versionNumber}: ${originalFile.name}`);
        
        // Skapa en ny URL för filen med en timestamp så att React renderar om
        try {
          // Revoke tidigare URL först för att undvika minnesläckage
          if (pdfUrl && pdfUrl.startsWith('blob:')) {
            URL.revokeObjectURL(pdfUrl.split('#')[0]);
          }
          
          // Skapa en ny URL för samma fil
          const newUrl = URL.createObjectURL(originalFile) + '#' + Date.now();
          console.log(`[${Date.now()}] Created new URL for file: ${newUrl}`);
          setPdfUrl(newUrl);
        } catch (urlError) {
          console.error("Error creating/revoking object URL:", urlError);
        }
      } else if (pdfUrl) {
        // Fallback om vi inte har en originalfil - använd nuvarande URL
        console.log(`[${Date.now()}] No original file available, using current URL with timestamp`);
        const currentFileUrl = pdfUrl.split('#')[0]; // Ta bort eventuella tidigare timestamps
        setPdfUrl(currentFileUrl + '#' + Date.now());
      } else {
        console.error(`[${Date.now()}] No file or URL available for version change`);
        
        // Försök visa ett meddelande till användaren
        alert("Det går inte att visa denna version. Vänligen ladda upp filen igen.");
        return;
      }
    } catch (error) {
      console.error(`[${Date.now()}] Error during version change:`, error);
    }
    
    // Uppdatera aktiv version ID
    setActiveVersionId(versionId);
    
    // Återställ eventuell zoomning/aktiv markering
    setActiveAnnotation(null);
    setScale(1);
    
    // Stäng versionspanelen
    setShowVersionsPanel(false);
    
    // Visa meddelande till användaren
    console.log(`[${Date.now()}] Switched to version ${selectedVersion.versionNumber}: ${selectedVersion.description}`);
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
                {fileVersions.length > 0 ? (
                  <>
                    {/* En säkerhetskontroll för att garantera att senaste versionen alltid finns */}
                    {fileVersions.length > 0 && (
                      <Button
                        variant={activeVersionId === fileVersions[fileVersions.length - 1]?.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const latestVersionId = fileVersions[fileVersions.length - 1]?.id;
                          if (latestVersionId) {
                            handleChangeVersion(latestVersionId);
                          } else {
                            console.error("Latest version ID is missing");
                          }
                        }}
                        className="rounded-full py-1 h-7 px-3"
                      >
                        <span className="flex items-center">
                          Nuvarande version
                          {activeVersionId === fileVersions[fileVersions.length - 1]?.id && (
                            <Check size={14} className="ml-1" />
                          )}
                        </span>
                      </Button>
                    )}
                    
                    {/* Bara visa originalversionsknappen om det finns mer än en version */}
                    {fileVersions.length > 1 && (
                      <Button
                        variant={activeVersionId === fileVersions[0]?.id ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => {
                          const originalVersionId = fileVersions[0]?.id;
                          if (originalVersionId) {
                            handleChangeVersion(originalVersionId);
                          } else {
                            console.error("Original version ID is missing");
                          }
                        }}
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
                ) : null /* Inga versionsval om det inte finns några versioner */}
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
            {file ? (
              <div className="relative" ref={pageRef}>
                <Document
                  file={file}
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