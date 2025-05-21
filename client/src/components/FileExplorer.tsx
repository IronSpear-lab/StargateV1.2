import { useEffect, useRef, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { 
  ChevronRight, 
  ChevronDown, 
  FileIcon, 
  Folder, 
  Upload, 
  Loader2, 
  FolderPlus,
  Image,
  FileText,
  File,
  MessageSquare,
  MoreVertical,
  X,
  AlertTriangle,
  Trash,
  FolderInput
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Removing Dialog and AlertDialog imports to avoid HTML validation issues
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useProject } from "@/contexts/ProjectContext";
import { getFileExtension, isFileOfType, formatFileSize } from "@/lib/file-utils";
import { isPdf } from "@/lib/pdf-utils";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: string;
  fileSize?: number;
  children?: FileNode[];
  selected?: boolean;
  folderId?: number | null; // explicit folderId för att garantera mapptillhörighet
  projectId?: number | string; // projektID för striktare filtrering
  expanded?: boolean; // om mappen är expanderad
  isRootFile?: boolean; // flagga för rotfiler
}

interface FileExplorerProps {
  onFileSelect: (file: FileNode) => void;
  selectedFileId?: string;
}

interface FileUploadState {
  selectedFolder: string | null;
  projectId: string;
  isUploading: boolean;
  file: File | null;
  uploadProgress: number;
}

interface FolderFormData {
  name: string;
  projectId: number;
  parentId: number | null;
}

// Definiera gränssnittet för folder-data för att undvika 'any' typer
interface FolderData {
  id: number | string;
  name: string;
  projectId: number | string;
  parentId?: number | string | null;
  children?: FolderData[];
}

// Definiera gränssnittet för file-data för att undvika 'any' typer
interface FileData {
  id: number | string;
  name: string;
  projectId: number | string;
  folderId?: number | string | null;
  size?: number;
}

export function FileExplorer({ onFileSelect, selectedFileId }: FileExplorerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  // Removed dialog state variables since we're using window.confirm now
  const [newFolderName, setNewFolderName] = useState("");
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState<Record<string, boolean>>({});
  
  // Ny state för att spåra vald mapp i filutforskaren
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const [uploadState, setUploadState] = useState<FileUploadState>({
    selectedFolder: null,
    projectId: currentProject?.id?.toString() || "", // Use current project ID
    isUploading: false,
    file: null,
    uploadProgress: 0
  });
  
  // Expanderade mappar
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Uppdatera projektID när current project ändras
  useEffect(() => {
    if (currentProject?.id) {
      setUploadState(prev => ({
        ...prev,
        projectId: currentProject.id.toString()
      }));
    }
  }, [currentProject?.id]);
  
  // Fetch all available projects
  const { data: projectsData } = useQuery({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      const res = await fetch('/api/user-projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });
  
  // Fetch folders
  const { 
    data: foldersData, 
    isLoading: isLoadingFolders,
    error: foldersError,
    refetch: refetchFolders
  } = useQuery({
    queryKey: ['/api/folders', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) {
        // Om inget projekt är valt, returnera en tom array
        console.log("Inget projekt valt, returnerar tom mapplista");
        return [];
      }
      
      console.log(`FileExplorer: Hämtar mappar för projekt ${currentProject.id} med projectId=${currentProject.id}`);
      
      // FORCE EMPTY RESPONSE IF NO PROJECT SELECTED
      if (!currentProject.id) {
        console.warn("FileExplorer: KRITISKT FEL - Inget projektID valt men query kördes ändå");
        return [];
      }
      
      try {
        const res = await fetch(`/api/folders?projectId=${currentProject.id}`, {
          credentials: 'include',  // Säkerställ att cookies skickas med för autentisering
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) {
          console.warn(`FileExplorer: API-anrop för mappar misslyckades med status ${res.status}`);
          const errorText = await res.text();
          console.error(`FileExplorer: Felmeddelande: ${errorText}`);
          throw new Error(`Failed to fetch folders: ${res.status} - ${errorText}`);
        }
        
        const data = await res.json();
        console.log(`FileExplorer: Hittade ${data.length} mappar för projekt ${currentProject.id}`);
        console.log("FileExplorer: Rådata från API:", JSON.stringify(data, null, 2));
        
        // Verifiera att alla mappar tillhör aktuellt projekt
        if (data.some((folder: FolderData) => folder.projectId !== currentProject.id)) {
          console.error("FileExplorer: VARNING: Vissa mappar tillhör inte aktuellt projekt!", 
            data.filter((folder: FolderData) => folder.projectId !== currentProject.id));
        }
        
        // FORCE FILTER mappar som tillhör aktuellt projekt för att vara extra säker
        const filteredData = data.filter((folder: FolderData) => folder.projectId === currentProject.id);
        console.log(`FileExplorer: Efter STRIKT filtrering finns ${filteredData.length} mappar för projekt ${currentProject.id}`);
        
        return filteredData;
      } catch (error) {
        console.error("FileExplorer: Fel vid hämtning av mappar:", error);
        toast({
          title: "Kunde inte hämta mappar",
          description: "Ett fel uppstod vid hämtning av mapparna. Försök igen senare.",
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!currentProject?.id, // Kör bara denna query om vi har ett projekt
    staleTime: 0, // Uppdatera varje gång (deaktivera caching)
    retry: 0 // Försök inte igen om det misslyckas
  });
  
  // Auto-expandera alla mappar när de laddas för att visa dem direkt
  useEffect(() => {
    if (foldersData && foldersData.length > 0) {
      console.log("Auto-expanderar alla mappar för bättre synlighet");
      const newExpandedState: Record<string, boolean> = {};
      
      foldersData.forEach((folder: any) => {
        newExpandedState[`folder_${folder.id}`] = true;
      });
      
      setExpandedFolders(prev => ({
        ...prev,
        ...newExpandedState
      }));
    }
  }, [foldersData]);
  
  // Fetch files - HELT REVIDERAD FÖR ATT GARANTERA UPPDATERING VID MAPPBYTE
  const { 
    data: filesData, 
    isLoading: isLoadingFiles, 
    error: filesError,
    refetch: refetchFiles, // Explicit refetch-funktion
    isRefetching: isRefetchingFiles  // Visar om vi håller på att uppdatera
  } = useQuery({
    // Garantera unik query för varje mappkombination
    // Ta bort slumpmässiga värden som kan orsaka onödiga omladdningar
    queryKey: ['/api/files', currentProject?.id, selectedFolderId],
    queryFn: async () => {
      if (!currentProject?.id) {
        console.log("FileExplorer: Inget projekt valt, inga filer att visa");
        return []; // Returnerar tomt array i konsistent format
      }
      
      console.log(`FileExplorer: STRIKT FILTRERINGSLÄGE. Kontext: ${selectedFolderId ? `MAPP ${selectedFolderId}` : 'ROTFILER'}, Projekt: ${currentProject.id}`);
      
      // Grundläggande URL med projektID
      let url = `/api/files?projectId=${currentProject.id}`;
      
      // Lägg till anti-caching för att garantera färsk data
      url += `&_t=${new Date().getTime()}`;
      
      // Välj rätt filtreringsläge baserat på kontext
      if (selectedFolderId) {
        // MAPPLÄGE: Hämta endast filer för aktuell mapp
        console.log(`FileExplorer: MAPPLÄGE - Hämtar filer för mapp ${selectedFolderId}`);
        url += `&folderId=${selectedFolderId}`;
      } else {
        // ROTLÄGE: Hämta endast filer utan mapptillhörighet
        console.log(`FileExplorer: ROTLÄGE - Hämtar filer utan mapptillhörighet`);
        url += `&rootFilesOnly=true`;
      }
      
      console.log(`FileExplorer: API-anrop: ${url}`);
      
      try {
        // Använd vanliga fetch-options
        const res = await fetch(url, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Ingen felinformation tillgänglig');
          console.error(`FileExplorer: API-fel: ${res.status}`, errorText);
          throw new Error(`Fel vid filhämtning: ${res.status} - ${errorText}`);
        }
        
        // Hämta data från servern
        const responseData = await res.json();
        
        // Hantera både det nya och gamla formatet
        let files = [];
        
        // Om vi har det nya formatet { files: [...], _timestamp: ... }
        if (responseData && responseData.files) {
          console.log(`FileExplorer: Använder nytt API-format med ${responseData.files.length} filer`);
          files = responseData.files;
        }
        // Om vi har det gamla formatet (direkt array)
        else if (Array.isArray(responseData)) {
          console.log(`FileExplorer: Använder gammalt API-format med ${responseData.length} filer`);
          files = responseData;
        }
        else {
          console.warn(`FileExplorer: Okänt API-svarsformat`, responseData);
          files = [];
        }
        
        // Validera och verifiera att vi har rätt filer i rätt kontext - FÖRBÄTTRAD VERSION
        const validatedFiles = files.filter((file: FileData) => {
          // Validera projekttillhörighet först - grundläggande säkerhet
          const isCorrectProject = file.projectId && 
            file.projectId.toString() === currentProject.id.toString();
          
          // FÖRBÄTTRAD STRIKT MAPPTILLHÖRIGHET MED EXTRA SÄKERHET
          let hasCorrectFolderContext = false;
          
          // Hantera null/undefined/0/"" och konvertera konsekvent till korrekta typer
          let fileFolderId = null;
          
          // Explicit typkonvertering med strikt validering
          if (file.folderId !== null && file.folderId !== undefined && file.folderId !== "" && file.folderId !== 0) {
            // Säkerställ att det är ett giltigt nummer
            const numericFolderId = Number(file.folderId);
            if (!isNaN(numericFolderId) && numericFolderId > 0) {
              fileFolderId = numericFolderId;
            }
          }
          
          console.log(`FileExplorer: DIAGNOSTIK (${file.name}) - Rå folderId: "${file.folderId}", Konverterad: ${fileFolderId === null ? 'null' : fileFolderId}`);
          
          if (selectedFolderId) {
            // MAPPLÄGE: Visa ENDAST filer med exakt matchande mapp-ID
            const targetFolderId = Number(selectedFolderId);
            
            // Strikt typkontroll med === och extra validering
            hasCorrectFolderContext = fileFolderId !== null && fileFolderId === targetFolderId;
            
            console.log(`FileExplorer: FilID=${file.id}, MAPPLÄGE (${file.name}): filFolderId=${fileFolderId}, targetFolderId=${targetFolderId}, match=${hasCorrectFolderContext}`);
          } else {
            // ROTLÄGE: Visa ENDAST filer utan mapptillhörighet (folderId === null)
            hasCorrectFolderContext = fileFolderId === null;
            
            console.log(`FileExplorer: FilID=${file.id}, ROTLÄGE (${file.name}): filFolderId=${fileFolderId}, match=${hasCorrectFolderContext}`);
          }
          
          // DETALJERAD DIAGNOSTISK LOGGNING
          if (!hasCorrectFolderContext && isCorrectProject) {
            console.warn(`FileExplorer: Fil ${file.id} (${file.name}) FILTRERADES BORT - fel mapptillhörighet`);
          }
          
          // Kombinerad validering
          return isCorrectProject && hasCorrectFolderContext;
        });
        
        if (validatedFiles.length !== files.length) {
          console.warn(`FileExplorer: Filtrerade bort ${files.length - validatedFiles.length} filer som inte matchar aktuell kontext`);
        }
        
        console.log(`FileExplorer: Returnerar ${validatedFiles.length} validerade filer`);
        return validatedFiles; // Returnera validerade filer i det format komponenten förväntar sig
      } catch (error) {
        console.error("FileExplorer: Fel vid filhämtning:", error);
        toast({
          title: "Kunde inte hämta filer",
          description: "Ett fel uppstod vid hämtning av filerna. Försök igen senare.",
          variant: "destructive",
        });
        return []; // Returnera tomt array vid fel
      }
    },
    enabled: !!currentProject?.id, // Kör bara denna query om vi har ett projekt
    staleTime: 0, // Inaktivera caching för att alltid få färsk data
    retry: 1 // Försök igen en gång vid fel
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: FolderFormData) => {
      // Explicit validering av projektID
      if (!folderData.projectId || isNaN(folderData.projectId)) {
        throw new Error("Ogiltigt projekt-ID");
      }
      
      console.log("Använder följande data för att skapa mapp:", folderData);
      
      // Anropa API med full credentials för autentisering
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(folderData),
        credentials: 'include'
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fel vid skapande av mapp:", res.status, errorText);
        throw new Error(errorText || `Fel vid skapande av mapp: ${res.status}`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Folder created",
        description: "New folder has been created successfully.",
      });
      setCreateFolderDialogOpen(false);
      setNewFolderName("");
      queryClient.invalidateQueries({ queryKey: ['/api/folders', currentProject?.id] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create folder",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive",
      });
    }
  });

  // File upload mutation - UPPDATERAD
  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/files', {  // Korrekt endpoint för filuppladdning
        method: 'POST',
        body: formData,
        credentials: 'include' // Säkerställ att cookies skickas med för autentisering
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Kunde inte ladda upp filen');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Fil uppladdad",
        description: "Din fil har laddats upp framgångsrikt.",
      });
      setUploadDialogOpen(false);
      setUploadState(prev => ({ ...prev, file: null, uploadProgress: 0, isUploading: false }));
      
      // VIKTIGT: Invalidera frågan med rätt nyckel som matchar den nya implementationen
      console.log("✅ Fil uppladdad - Uppdaterar filträdet med rätt mappfiltrering");
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id, selectedFolderId] });
    },
    onError: (error) => {
      toast({
        title: "Uppladdningen misslyckades",
        description: error instanceof Error ? error.message : 'Ett okänt fel inträffade',
        variant: "destructive",
      });
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  });
  
  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      console.log(`Executing delete request for folder ID: ${folderId} in project: ${currentProject?.id}`);
      
      if (!currentProject?.id) {
        console.error("No active project when attempting to delete folder");
        throw new Error("Inget aktivt projekt valt");
      }
      
      const res = await apiRequest('DELETE', `/api/folders/${folderId}`);
      console.log(`Delete folder response status: ${res.status}`);
      
      if (!res.ok) {
        let errorMessage = 'Kunde inte radera mappen';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
          console.error(`Server error when deleting folder: ${errorMessage}`);
        } catch (e) {
          console.error(`Could not parse error response: ${e}`);
        }
        throw new Error(errorMessage);
      }
      
      console.log(`Successfully deleted folder ID: ${folderId}`);
      return true;
    },
    onSuccess: (_, folderId) => {
      console.log(`Folder deletion success callback triggered for folder ID: ${folderId}`);
      toast({
        title: "Mapp borttagen",
        description: "Mappen och dess innehåll har raderats.",
      });
      // Invalidate both folders and files queries since deleting a folder affects files too
      queryClient.invalidateQueries({ queryKey: ['/api/folders', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id, selectedFolderId] });
      
      // Återställ vald mapp om vi raderade den aktiva mappen
      if (selectedFolderId === folderId.toString()) {
        console.log("Återställer vald mapp eftersom den aktiva mappen raderades");
        setSelectedFolderId(null);
      }
    },
    onError: (error, folderId) => {
      console.error(`Failed to delete folder ID: ${folderId}. Error: ${error.message}`);
      toast({
        title: "Kunde inte radera mapp",
        description: error instanceof Error ? error.message : 'Ett okänt fel inträffade',
        variant: "destructive",
      });
    }
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setUploadState(prev => ({ ...prev, file }));
    }
  };

  // Handle file upload
  const handleFileUpload = () => {
    if (!uploadState.file || !currentProject?.id) return;
    
    setUploadState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));
    
    const formData = new FormData();
    formData.append('file', uploadState.file);
    // Använd alltid aktuellt projektets ID
    formData.append('projectId', currentProject.id.toString());
    
    console.log(`Laddar upp fil till projektID: ${currentProject.id}`);
    
    // KRITISK FÖRBÄTTRING: Använd den aktiva mappen först (selectedFolderId)
    const effectiveFolderId = selectedFolderId || uploadState.selectedFolder;
    
    console.log(`Effektiv mapp för uppladdning: ${effectiveFolderId} (selectedFolderId=${selectedFolderId}, uploadState.selectedFolder=${uploadState.selectedFolder})`);
    
    // KRITISK FÖRBÄTTRING: Se till att folderId hanteras korrekt
    if (effectiveFolderId) {
      // Validera att mappen existerar och tillhör rätt projekt
      const folder = foldersData?.find((f: FolderData) => f.id.toString() === effectiveFolderId.toString());
      
      if (!folder) {
        console.error(`ALLVARLIGT FEL: Vald mapp (ID ${effectiveFolderId}) finns inte i mappdata!`);
        toast({
          title: "Felaktig mapp",
          description: "Den valda mappen kunde inte hittas. Välj en annan mapp.",
          variant: "destructive",
        });
        setUploadState(prev => ({ ...prev, isUploading: false }));
        return;
      }
      
      if (folder.projectId.toString() !== currentProject.id.toString()) {
        console.error(`VARNING: Vald mapp (ID ${effectiveFolderId}) tillhör projekt ${folder.projectId}, inte aktuellt projekt ${currentProject.id}`);
        toast({
          title: "Felaktig mapp",
          description: "Den valda mappen tillhör ett annat projekt.",
          variant: "destructive",
        });
        setUploadState(prev => ({ ...prev, isUploading: false }));
        return;
      }
      
      // KRITISKT FÖRBÄTTRAT: Säkerställ korrekt stringifiering av mappID för uppladdning
      const folderIdString = effectiveFolderId.toString();
      console.log(`Laddar upp till mapp: ${folderIdString} (validerad för projekt ${currentProject.id})`);
      
      // Skicka validerat folderId
      formData.append('folderId', folderIdString);
    } else {
      // Explicit loggning när ingen mapp är vald - för felsökning
      console.log(`Laddar upp utan mappval - filen kommer placeras i ROT`);
      
      // KRITISK FÖRBÄTTRING: Skicka explicit 'null' som mappID för att indikera rotfiler
      // Detta kommer att göra att servern explicit sätter folderId = null i databasen
      formData.append('folderId', 'null');
      console.log('Laddar upp med folderId=null - servern kommer placera filen i rotkatalogen');
    }
    
    // Simulate upload progress (in a real app, you'd use XHR or fetch with progress event)
    const interval = setInterval(() => {
      setUploadState(prev => {
        if (prev.uploadProgress >= 99) {
          clearInterval(interval);
          return prev;
        }
        return { ...prev, uploadProgress: Math.min(prev.uploadProgress + 5, 99) };
      });
    }, 100);
    
    uploadFileMutation.mutate(formData, {
      onSettled: () => {
        clearInterval(interval);
        
        // Efter uppladdning, invalidera filcachen för alla relevanta queries
        // för att säkerställa att den nya filen blir synlig omedelbart
        const effectiveFolderId = selectedFolderId || uploadState.selectedFolder;
        
        // Invalidera specifikt den query som matchar den aktiva kontexten
        if (effectiveFolderId) {
          console.log(`Invaliderar filcache för mapp ${effectiveFolderId} efter uppladdning`);
          queryClient.invalidateQueries({ 
            queryKey: ['/api/files', currentProject?.id, effectiveFolderId] 
          });
        } else {
          console.log(`Invaliderar filcache för rotfiler efter uppladdning`);
          queryClient.invalidateQueries({ 
            queryKey: ['/api/files', currentProject?.id, null] 
          });
        }
        
        // För säkerhets skull, invalidera alla filqueries med en bredare selector
        queryClient.invalidateQueries({ 
          queryKey: ['/api/files', currentProject?.id] 
        });
      }
    });
  };
  
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDropzoneActive(true);
  };
  
  const handleDragLeave = () => {
    setDropzoneActive(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropzoneActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadState(prev => ({ ...prev, file: e.dataTransfer.files[0] }));
      setUploadDialogOpen(true);
    }
  };
  
  // Handle folder creation
  const handleCreateFolder = () => {
    if (!newFolderName) {
      toast({
        title: "Felaktigt mappnamn",
        description: "Du måste ange ett namn för mappen",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentProject?.id) {
      toast({
        title: "Inget projekt valt",
        description: "Du måste välja ett projekt först",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Skapar mapp i projekt:", currentProject.id);
    
    const folderData: FolderFormData = {
      name: newFolderName,
      projectId: currentProject.id,
      parentId: uploadState.selectedFolder ? parseInt(uploadState.selectedFolder) : null
    };
    
    console.log("Skickar mappdata:", folderData);
    createFolderMutation.mutate(folderData);
  };

  // HELT OMBYGGD buildFileTree funktion för strikt mappfiltrering
  const buildFileTree = () => {
    // STEG 0: Skapa tomma resultatstrukturer
    const tree: FileNode[] = [];
    const folderMap: Record<string, FileNode> = {};
    
    // Logga diagnostisk information
    console.log("RADIKAL OMBYGGD TRÄDBYGGNAD:", {
      mappkontext: selectedFolderId ? `MAPP ${selectedFolderId}` : 'ROT',
      tillgängligaMappar: foldersData?.length || 0,
      tillgängligaFiler: filesData?.length || 0,
      projektID: currentProject?.id
    });
    
    // Validera att vi har nödvändig data för att bygga trädet
    if (!currentProject?.id) {
      console.warn("FileExplorer: ⛔ KRITISKT - Inget projekt valt, kan inte bygga träd");
      return [];
    }
    
    if (!foldersData || !filesData) {
      console.warn(`FileExplorer: ⚠️ Saknar data - Mappar: ${!!foldersData}, Filer: ${!!filesData}`);
      return [];
    }
    
    // STEG 1: STRIKT PROJEKTMAPPFILTRERING - Endast mappar från detta projekt
    const projektetsMappar = foldersData.filter((folder: FolderData) => 
      folder && folder.projectId && folder.projectId.toString() === currentProject.id.toString()
    );
    
    console.log(`FileExplorer: 📂 Projekt ${currentProject.id} har ${projektetsMappar.length} mappar`);
    
    // STEG 2: STRIKT PROJEKTFILFILTRERING - Endast filer från detta projekt
    const projektetsAllaFiler = filesData.filter((file: FileData) => 
      file && file.projectId && file.projectId.toString() === currentProject.id.toString()
    );
    
    console.log(`FileExplorer: 📄 Projekt ${currentProject.id} har totalt ${projektetsAllaFiler.length} filer`);
    
    // STEG 3: RADIKAL KONTEXTBASERAD FILFILTRERING
    let filerAttVisa: FileData[] = [];
    
    // Bestäm vilka filer som ska visas baserat på den exakta kontexten vi är i
    if (selectedFolderId) {
      // MAPPLÄGE: Visa ENDAST filer som tillhör exakt denna mapp
      console.log(`FileExplorer: 🔍 MAPPLÄGE - Visar endast filer i mapp ${selectedFolderId}`);
      
      // Extremt strikt filtrering med flera nivåer av validering
      filerAttVisa = projektetsAllaFiler.filter((file: FileData) => {
        // Krav 1: Filen måste ha en giltig folderId
        if (file.folderId === null || file.folderId === undefined) {
          console.log(`FileExplorer: ❌ Fil ${file.id} - "${file.name}" har INGEN folderId, visas INTE i mapp ${selectedFolderId}`);
          return false;
        }
        
        // Krav 2: folderId måste vara strikt samma som den valda mappen
        const filFolderId = Number(file.folderId);
        const valdMappId = Number(selectedFolderId);
        
        if (isNaN(filFolderId) || isNaN(valdMappId)) {
          console.log(`FileExplorer: ❌ Fil ${file.id} har ogiltig folderId (${file.folderId}), visas INTE i mapp ${selectedFolderId}`);
          return false;
        }
        
        // Krav 3: Strikt numerisk likhet
        const exactMatch = filFolderId === valdMappId;
        
        if (exactMatch) {
          console.log(`FileExplorer: ✅ Fil ${file.id} - "${file.name}" med folderId=${filFolderId} MATCHAR mapp ${selectedFolderId} - VISAS`);
          return true;
        } else {
          console.log(`FileExplorer: ❌ Fil ${file.id} - "${file.name}" med folderId=${filFolderId} MATCHAR INTE mapp ${selectedFolderId} - VISAS EJ`);
          return false;
        }
      });
    } else {
      // ROTLÄGE: Visa ENDAST filer utan mapptillhörighet
      console.log(`FileExplorer: 🌱 ROTLÄGE - Visar endast filer utan mapptillhörighet`);
      
      filerAttVisa = projektetsAllaFiler.filter((file: FileData) => {
        // STRIKTARE ROTFILKONTROLL: En fil är en rotfil ENDAST om den har null eller undefined som folderId
        // '0' och '' ska inte längre betraktas som rotfiler för att undvika förvirring
        const isRootFile = file.folderId === null || file.folderId === undefined;
        
        if (isRootFile) {
          console.log(`FileExplorer: ✅ Rotfil ${file.id} - "${file.name}" visas i ROT`);
          return true;
        } else {
          console.log(`FileExplorer: ❌ Fil ${file.id} - "${file.name}" med folderId=${file.folderId} är INTE en rotfil - VISAS EJ i ROT`);
          return false;
        }
      });
    }
    
    console.log(`FileExplorer: 🎯 ${filerAttVisa.length} av ${projektetsAllaFiler.length} filer kvalificerade för visning i aktuell kontext`);
    
    // STEG 4: SKAPA MAPP-NODER FÖR TRÄDVISUALISERING
    projektetsMappar.forEach((folder: FolderData) => {
      // Skapa en mapp-nod med alla grundläggande attribut
      folderMap[`folder_${folder.id}`] = {
        id: `folder_${folder.id}`,
        name: folder.name,
        type: 'folder',
        folderId: typeof folder.id === 'string' ? parseInt(folder.id) : folder.id, // Explicit lagra det faktiska mappID:t som nummer
        projectId: folder.projectId, // Lagra även projektID för striktare filtrering
        expanded: expandedFolders[`folder_${folder.id}`] || true, // Som standard expanderade
        children: [] // Börja med tom lista - lägger till filer och undermappar senare
      };
      
      console.log(`FileExplorer: ✓ Skapade mappnod för "${folder.name}" (ID ${folder.id})`);
    });
    
    // STEG 5: ORGANISERA MAPPAR I HIERARKI
    projektetsMappar.forEach((folder: FolderData) => {
      // Har denna mapp en förälder?
      if (folder.parentId) {
        // JA - Denna mapp har en förälder
        const parentKey = `folder_${folder.parentId}`;
        
        if (folderMap[parentKey]) {
          // Föräldern finns, placera mappen som barn under föräldern
          folderMap[parentKey].children = folderMap[parentKey].children || [];
          folderMap[parentKey].children.push(folderMap[`folder_${folder.id}`]);
          console.log(`FileExplorer: ⤵️ Mapp "${folder.name}" (${folder.id}) placerad under förälder ${folder.parentId}`);
        } else {
          // Föräldern saknas (ovanligt, men kan hända) - placera i rot
          tree.push(folderMap[`folder_${folder.id}`]);
          console.warn(`FileExplorer: ⚠️ Kan inte hitta föräldermapp ${folder.parentId} för mapp ${folder.id}, placerar i ROT`);
        }
      } else {
        // NEJ - Denna mapp har ingen förälder, placera direkt i rotträdet
        tree.push(folderMap[`folder_${folder.id}`]);
        console.log(`FileExplorer: ⬆️ Mapp "${folder.name}" (${folder.id}) placerad i ROT (ingen förälder)`);
      }
    });
    
    // STEG 6: LÄGG TILL FILER I TRÄDET - STRIKT ENLIGT KONTEXT
    if (selectedFolderId) {
      // MAPPLÄGE: Lägg alla filer i den valda mappen
      const folderKey = `folder_${selectedFolderId}`;
      
      // Kontrollera att den valda mappen faktiskt finns
      if (!folderMap[folderKey]) {
        console.error(`FileExplorer: ❌❌❌ KRITISKT FEL - Den valda mappen ${selectedFolderId} existerar inte i mappstrukturen!`);
        return tree; // Returnera bara mapparna
      }
      
      // För varje fil som passerade filteringen - lägg till i den valda mappen
      filerAttVisa.forEach(file => {
        const fileNode: FileNode = {
          id: `file_${file.id}`,
          name: file.name,
          type: 'file',
          fileType: getFileExtension(file.name),
          fileSize: file.size,
          folderId: Number(file.folderId), // Explicit lagra mappID
          projectId: file.projectId, // Lagra projektID
          selected: `file_${file.id}` === selectedFileId
        };
        
        // Lägg till filen i den valda mappen
        folderMap[folderKey].children = folderMap[folderKey].children || [];
        folderMap[folderKey].children.push(fileNode);
        console.log(`FileExplorer: ✅ Fil "${file.name}" placerad i mapp ${selectedFolderId}`);
      });
      
      console.log(`FileExplorer: ✅ Alla ${filerAttVisa.length} filer för mapp ${selectedFolderId} har lagts till`);
    } else {
      // ROTLÄGE: Lägg alla rotfiler direkt i trädet
      filerAttVisa.forEach(file => {
        const fileNode: FileNode = {
          id: `file_${file.id}`,
          name: file.name,
          type: 'file',
          fileType: getFileExtension(file.name),
          fileSize: file.size,
          folderId: null, // Explicit NULL för att bekräfta rotfilstatus
          projectId: file.projectId,
          isRootFile: true, // Markera som rotfil för tydlighet
          selected: `file_${file.id}` === selectedFileId
        };
        
        // Lägg till filen direkt i trädet (inte i någon mapp)
        tree.push(fileNode);
        console.log(`FileExplorer: ✅ Rotfil "${file.name}" placerad direkt i ROT`);
      });
      
      console.log(`FileExplorer: ✅ Alla ${filerAttVisa.length} rotfiler har lagts till i trädet`);
    }
    
    // STEG 7: SLUTGILTIG KONTROLL AV TRÄDSTRUKTUREN
    console.log(`FileExplorer: 🔍 SLUTKONTROLL - Trädet innehåller ${tree.length} objekt i roten`);
    
    // Detaljerad inspektering av trädstrukturen för felsökning
    const inspectTree = (nodes: FileNode[], level = 0, path = '') => {
      nodes.forEach(node => {
        const indent = ' '.repeat(level * 2);
        const newPath = path ? `${path} > ${node.name}` : node.name;
        const childCount = node.children?.length || 0;
        const typeInfo = node.type === 'file' ? `[Fil${node.folderId ? ` i mapp ${node.folderId}` : ' (ROT)'}]` : '[Mapp]';
        
        console.log(`${indent}${typeInfo} ${node.name} (${node.id}) - ${childCount} barn`);
        
        if (node.children && node.children.length > 0) {
          inspectTree(node.children, level + 1, newPath);
        }
      });
    };
    
    // Kör inspektionen för att logga allt i detalj
    console.log(`FileExplorer: 🌳 TRÄDINSPEKTION:`);
    inspectTree(tree);
    
    // Returnera det färdigbyggda trädet
    return tree;
  };

  
  
  const fileTree = buildFileTree();
  
  // PDF Dialog setup
  const { showPDFDialog } = usePDFDialog();

  // FÖRBÄTTRAD FILKLICKHANTERING - för strikt mappfiltrering
  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      // Hantera PDF-filer speciellt
      if (file.fileType && isPdf(file.fileType)) {
        // FÖRBÄTTRAD PDF-HANTERING MED EXTRA SÄKERHET
        // 1. Extrahera fil-ID korrekt utan "file_" prefix
        const rawFileId = file.id.toString();
        const cleanFileId = rawFileId.startsWith('file_') ? rawFileId.replace('file_', '') : rawFileId;
        
        // 2. Säkerställ att filens folderId matchar den aktuella kontexten (för strikt säkerhet)
        // FÖRBÄTTRAD TYPJÄMFÖRELSE: Konvertera allt till strängform för jämförelse
        const isInCorrectFolder = selectedFolderId 
          ? file.folderId !== null && file.folderId !== undefined && 
            file.folderId.toString() === selectedFolderId.toString()
          : file.folderId === null || file.folderId === undefined;
        
        // 3. Säkerställ att filen tillhör det aktuella projektet (för extra säkerhet)
        const isInCorrectProject = file.projectId && 
          currentProject && 
          file.projectId.toString() === currentProject.id.toString();
        
        // 4. Detaljerad loggning för felsökning
        console.log(`PDF-DIALOG: Öppnar "${file.name}" (ID: ${cleanFileId})`, {
          fileFolderId: file.folderId, 
          selectedFolder: selectedFolderId, 
          isInCorrectFolder,
          fileProjectId: file.projectId,
          currentProjectId: currentProject?.id,
          isInCorrectProject
        });
        
        // 5. Validera innan visning (extra säkerhetslager för att garantera isolering)
        if (!isInCorrectFolder) {
          console.error(`PDF-DIALOG FEL: Fil "${file.name}" (${cleanFileId}) tillhör inte aktuell mapp`);
          toast({
            title: "Kan inte öppna PDF",
            description: "Filen tillhör inte den aktuella mappen.",
            variant: "destructive",
          });
          return;
        }
        
        if (!isInCorrectProject) {
          console.error(`PDF-DIALOG FEL: Fil "${file.name}" (${cleanFileId}) tillhör inte aktuellt projekt`);
          toast({
            title: "Kan inte öppna PDF",
            description: "Filen tillhör inte det aktuella projektet.",
            variant: "destructive",
          });
          return;
        }
        
        // 6. Öppna PDF-dialogen med validerat fil-ID
        // FÖRBÄTTRAD TYPANVÄNDNING: Konvertera folderId korrekt och använd null istället för undefined för konsekvent mapphantering
        const numericalFolderId = file.folderId !== null && file.folderId !== undefined 
          ? (typeof file.folderId === 'string' ? parseInt(file.folderId) : file.folderId)
          : null;
          
        console.log(`PDF-DIALOG: Skickar folderId=${numericalFolderId} (typ: ${typeof numericalFolderId}) för fil ${file.name}`);
          
        showPDFDialog({
          fileId: cleanFileId,
          filename: file.name,
          projectId: currentProject?.id,
          folderId: numericalFolderId // Skicka med korrekt konverterad folderId
        });
        
        return; // Förhindra standardhantering för PDF-filer
      } else {
        // Standardhantering för andra filtyper
        onFileSelect(file);
      }
    } else {
      // FÖRBÄTTRAD MAPPHANTERING
      // Först expandera/kollapsa trädvyn för mappen
      setExpandedFolders(prev => ({
        ...prev,
        [file.id]: !prev[file.id]
      }));
      
      // Extrahera korrekt mapp-ID från "folder_123" format
      const folderId = typeof file.id === 'string' ? file.id.replace(/^folder_/, '') : String(file.id);
      
      console.log(`MAPPBYTE: Klick på mapp "${file.name}" (ID: ${folderId})`);
      
      // KONSEKVENT MAPPBYTE:
      // När en mapp klickas gör vi två saker konsekvent:
      // 1. Uppdatera selectedFolderId för filvisning
      // 2. Uppdatera uploadState.selectedFolder för uppladdningar
      
      // Om mappen redan är vald (användaren klickar på samma mapp igen)
      if (selectedFolderId === folderId) {
        console.log(`MAPPBYTE: Avmarkerar mapp "${file.name}" (ID: ${folderId}), visar ROT-filer`);
        
        // Återställ både selectedFolderId OCH uploadState för konsistens
        setSelectedFolderId(null);
        setUploadState(prev => ({ ...prev, selectedFolder: null }));
        
        // Visa bekräftelse till användaren för bättre feedback
        toast({
          description: "Visar filer utan mapptillhörighet",
        });
        
        // Explicit refetch istället för att bara invalidera cachcen
        // Detta garanterar att data laddas om omedelbart
        setTimeout(() => {
          refetchFiles();
        }, 100);
      } else {
        // Användaren väljer en ny mapp
        console.log(`MAPPBYTE: Väljer mapp "${file.name}" (ID: ${folderId}), visar ENDAST filer i denna mapp`);
        
        // Uppdatera både selectedFolderId OCH uploadState för konsistens
        setSelectedFolderId(folderId);
        setUploadState(prev => ({ ...prev, selectedFolder: folderId }));
        
        // Visa bekräftelse till användaren för bättre feedback
        toast({
          description: `Visar endast filer i mappen "${file.name}"`,
        });
        
        // Explicit refetch som tvingar omedelbar omladdning
        // Liten timeout för att säkerställa att state har uppdaterats
        setTimeout(() => {
          refetchFiles();
        }, 100);
      }
    }
  };
  
  // Get folder options for select fields
  const getFolderOptions = () => {
    const options: {value: string, label: string}[] = [{ value: "root", label: "Root folder" }];
    
    if (!foldersData) return options;
    
    // Filtrera mappar som tillhör det aktuella projektet
    const filteredFolders = foldersData.filter((folder: FolderData) => {
      if (folder.projectId !== currentProject?.id) {
        console.error(`getFolderOptions: Ignorerar mapp ${folder.id} från fel projekt ${folder.projectId}`);
        return false;
      }
      return true;
    });
    
    console.log(`getFolderOptions: ${filteredFolders.length} av ${foldersData.length} mappar tillhör aktuellt projekt ${currentProject?.id}`);
    
    const addFoldersToOptions = (folders: FolderData[], depth = 0) => {
      folders.forEach((folder: FolderData) => {
        const prefix = depth > 0 ? "└─ ".padStart(depth * 2 + 2, "  ") : "";
        console.log(`getFolderOptions: Lägger till mapp ${folder.id} (projektID: ${folder.projectId}) i options`);
        options.push({
          value: folder.id.toString(),
          label: `${prefix}${folder.name} [Projekt: ${folder.projectId}]`
        });
        
        if (folder.children && folder.children.length > 0) {
          addFoldersToOptions(folder.children, depth + 1);
        }
      });
    };
    
    // Använd filtrerade mappar utan föräldrar för att bygga trädet
    addFoldersToOptions(filteredFolders.filter((f: FolderData) => !f.parentId));
    
    return options;
  };
  
  // Get file icon based on type
  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') {
      return <Folder className="h-4 w-4 text-yellow-500" />;
    }
    
    if (!file.fileType) return <FileIcon className="h-4 w-4 text-neutral-500" />;
    
    switch(file.fileType.toLowerCase()) {
      case 'pdf':
        return <File className="h-4 w-4 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-4 w-4 text-blue-500" />;
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className="h-4 w-4 text-blue-400" />;
      default:
        return <FileIcon className="h-4 w-4 text-neutral-500" />;
    }
  };
  
  // Render file tree - KOMPLETT OMSKRIVEN VERSION för att åtgärda mappvisningsproblemet
  const renderFileTree = (nodes: FileNode[], level = 0) => {
    // Förbättrad loggning för att visa statusen för trädet på denna nivå
    console.log(`🌳 Rendering ${nodes.length} nodes at level ${level}:`, 
      nodes.map(n => `${n.type}: ${n.name} (${n.id})`).join(', '));
    
    // Lägg till extra loggning för varje nodnivå
    if (level === 0) {
      console.log("ROTNODSÖVERSIKT:");
      nodes.forEach(node => {
        console.log(`- ${node.type === 'folder' ? '📁' : '📄'} ${node.name} (${node.id})`);
        if (node.type === 'folder' && node.children?.length) {
          console.log(`  └── Innehåller ${node.children.length} underobjekt`);
        }
      });
    }
    
    return (
      <ul className={cn(
        "space-y-1",
        level > 0 ? "pl-4 pt-1" : ""
      )}>
        {nodes.map(node => {
          const isExpanded = node.type === 'folder' && expandedFolders[node.id];
          // Visa detaljerad status för varje nod under renderingen
          console.log(`🔍 Rendering node: ${node.type} - ${node.name} (${node.id}) - Expanded: ${isExpanded ? 'Yes' : 'No'}`);
          
          return (
            <li key={node.id} className="relative">
              <div 
                className={cn(
                  "flex items-center py-1 px-2 rounded-md cursor-pointer text-sm group transition-colors",
                  node.selected ? "bg-primary-50 text-primary-800" : "hover:bg-neutral-100",
                  node.type === 'folder' && isExpanded ? "font-medium" : ""
                )}
                onClick={() => handleFileClick(node)}
              >
                {node.type === 'folder' ? (
                  <div className="flex-shrink-0 mr-1.5 w-4">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    )}
                  </div>
                ) : (
                  <div className="flex-shrink-0 mr-1.5 w-4" />
                )}
                
                <div className="flex-shrink-0 mr-2">
                  {getFileIcon(node)}
                </div>
                
                <span className="truncate flex-1">
                  {node.name}
                  {node.type === 'folder' && 
                    <span className="text-xs text-neutral-400 ml-1">
                      (ID: {node.id.replace('folder_', '')})
                    </span>
                  }
                </span>
                
                {node.type === 'file' && node.fileSize && (
                  <span className="text-xs text-neutral-500 ml-2 opacity-0 group-hover:opacity-100">
                    {formatFileSize(node.fileSize)}
                  </span>
                )}
                
                {/* Ta bort radera-knappen helt eftersom vi skapar en widget för detta istället */}
                
                {/* För filer visar vi en aktionsmeny med dropdown */}
                {node.type === 'file' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="ml-2 opacity-0 group-hover:opacity-100">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-neutral-100 cursor-pointer">
                          <MoreVertical className="h-3.5 w-3.5 text-neutral-500" />
                        </span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {node.fileType && isPdf(node.fileType) && (
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            showPDFDialog({
                              fileId: node.id,
                              filename: node.name,
                              projectId: currentProject?.id
                            });
                          }}
                        >
                          <File className="h-4 w-4 mr-2 text-red-500" />
                          <span>Visa PDF</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileSelect(node);
                        }}
                      >
                        <FileIcon className="h-4 w-4 mr-2" />
                        <span>Öppna dokument</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {node.type === 'folder' && expandedFolders[node.id] && node.children && node.children.length > 0 && 
                renderFileTree(node.children, level + 1)}
              
              {node.type === 'folder' && expandedFolders[node.id] && (!node.children || node.children.length === 0) && (
                <div className="pl-8 py-2 text-sm text-neutral-500 italic">
                  Empty folder
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div>
      <Card className="shadow-none border-0">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Files</CardTitle>
            <div className="flex space-x-2">
              {/* Ta bort alla knappar för skapande och redigering av mappar - flytta det till en dashboard-widget istället */}
              
              {/* Behåll endast uppladdningsknappen */}
              {user && (
                <>
                  <span 
                    className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 gap-1 cursor-pointer text-sm"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    <span className="text-xs">Ladda upp</span>
                  </span>
                  
                  {/* Custom upload dialog */}
                  {uploadDialogOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => !uploadState.isUploading && setUploadDialogOpen(false)}>
                      <div className="bg-white rounded-lg max-w-lg w-full m-4 p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold leading-none tracking-tight">Ladda upp fil</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Ladda upp en fil till ditt projekt. Stödda format inkluderar PDF, bilder och dokument.
                          </p>
                        </div>
                      <div className="space-y-4 py-2">
                        <div 
                          className={cn(
                            "border-2 border-dashed rounded-md p-6 text-center transition-colors",
                            dropzoneActive ? "border-primary-400 bg-primary-50" : "border-neutral-300",
                            "focus-within:border-primary-500 hover:border-primary-400"
                          )}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadState.file ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-center">
                                {isPdf(uploadState.file.name) ? (
                                  <File className="h-10 w-10 text-red-500" />
                                ) : isFileOfType(uploadState.file.name, ['jpg', 'jpeg', 'png', 'gif']) ? (
                                  <Image className="h-10 w-10 text-blue-500" />
                                ) : (
                                  <FileIcon className="h-10 w-10 text-neutral-500" />
                                )}
                              </div>
                              <div className="text-sm font-medium">{uploadState.file.name}</div>
                              <div className="text-xs text-neutral-500">{formatFileSize(uploadState.file.size)}</div>
                              <span
                                className="inline-flex items-center justify-center px-2 py-1 mt-2 text-xs border border-input rounded-md shadow-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadState(prev => ({ ...prev, file: null }));
                                }}
                              >
                                <X className="mr-1 h-3 w-3" />
                                Ta bort
                              </span>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
                              <p className="text-sm text-neutral-500">
                                Dra och släpp en fil här, eller klicka för att bläddra
                              </p>
                              <p className="text-xs text-neutral-400 mt-1">
                                PDF, bilder och office-dokument upp till 10MB
                              </p>
                            </>
                          )}
                          <Input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          />
                        </div>
                        
                        {uploadState.file && uploadState.file.size > 10 * 1024 * 1024 && (
                          <div className="flex items-center text-amber-600 text-sm">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Filstorleken överstiger gränsen på 10MB
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="uploadFolder">Målmapp för filen</Label>
                            <span className="text-xs text-neutral-500">
                              Projekt: {currentProject?.name || 'Laddar...'}
                            </span>
                          </div>
                          <Select
                            value={selectedFolderId || uploadState.selectedFolder || "root"}
                            onValueChange={(value) => {
                              console.log(`📁 UPPLADDNINGSMENY: Mappval ändrad till: ${value === "root" ? "ROT" : value}`);
                              
                              // STRIKT MAPPVAL SYNKRONISERING:
                              // Vi måste uppdatera BÅDA state-variablerna för konsistens
                              if (value === "root") {
                                // ROT-val
                                setSelectedFolderId(null);
                                setUploadState(prev => ({ ...prev, selectedFolder: null }));
                                console.log(`📁 UPPLADDNINGSMENY: Rotmapp vald, alla filer i ROT kommer att visas`);
                                
                                // Tvinga omfråga för att visa rotfiler
                                void queryClient.invalidateQueries({ 
                                  queryKey: ['/api/files', { rootFilesOnly: true }] 
                                });
                              } else {
                                // Specifik mapptilldelning
                                setSelectedFolderId(value);
                                setUploadState(prev => ({ ...prev, selectedFolder: value }));
                                console.log(`📁 UPPLADDNINGSMENY: Filer för mapp ${value} kommer att visas`);
                                
                                // Tvinga omfråga specifikt för denna mapp
                                void queryClient.invalidateQueries({ 
                                  queryKey: ['/api/files', { folderId: value }] 
                                });
                              }
                            }}
                          >
                            <SelectTrigger id="uploadFolder">
                              <SelectValue placeholder="Välj en mapp" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFolderOptions().map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(selectedFolderId || uploadState.selectedFolder)
                              ? `Filen kommer placeras i mappen med ID: ${selectedFolderId || uploadState.selectedFolder}` 
                              : "Filen kommer placeras i projektets rotkatalog"}
                          </p>
                        </div>
                        
                        {uploadState.isUploading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Laddar upp...</span>
                              <span>{uploadState.uploadProgress}%</span>
                            </div>
                            <Progress value={uploadState.uploadProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
                        <span 
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer ${uploadState.isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                          onClick={() => !uploadState.isUploading && setUploadDialogOpen(false)}
                        >
                          Avbryt
                        </span>
                        <span 
                          className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer ${!uploadState.file || uploadState.isUploading || (uploadState.file && uploadState.file.size > 10 * 1024 * 1024) ? 'opacity-50 pointer-events-none' : ''}`}
                          onClick={() => {
                            if (uploadState.file && !uploadState.isUploading && !(uploadState.file.size > 10 * 1024 * 1024)) {
                              handleFileUpload();
                            }
                          }}
                        >
                          {uploadState.isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Laddar upp...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              <span>Ladda upp</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div 
            className={cn(
              "bg-white border border-neutral-200 rounded-md p-4 tree-view min-h-[300px]",
              "hover:border-neutral-300 transition-colors"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isLoadingFiles || isLoadingFolders ? (
              <div className="flex flex-col justify-center items-center py-8">
                <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-2" />
                <p className="text-sm text-neutral-500">Laddar filer och mappar...</p>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-8">
                <Folder className="h-12 w-12 text-neutral-300 mb-2" />
                <h3 className="text-lg font-medium text-neutral-700 mb-1">Inga filer ännu</h3>
                <p className="text-sm text-neutral-500 mb-4">Ladda upp filer eller skapa mappar för att komma igång</p>
                <div className="flex gap-2">
                  {/* Endast visa uppladdningsknappen */}
                  <span 
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 gap-1 cursor-pointer text-sm"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Ladda upp fil
                  </span>
                </div>
              </div>
            ) : (
              renderFileTree(fileTree)
            )}
          </div>
          
          <div className="mt-4">
            <div className="p-3 bg-white border border-neutral-200 rounded-md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-neutral-700">Lagring</p>
                <p className="text-xs text-primary-600 font-medium cursor-pointer">Hantera</p>
              </div>
              <Progress value={72} className="h-2 mb-2" />
              <div className="flex items-center justify-between text-xs">
                <p className="text-neutral-500">7.2GB använt</p>
                <p className="text-neutral-500">10GB totalt</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog har tagits bort och ersatts med direkt delete via window.confirm */}
    </div>
  );
}