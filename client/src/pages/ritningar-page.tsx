import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FileText, Search, Plus, Upload, ChevronRight, Home, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";
import { 
  storeFiles, 
  getUploadedFileUrl, 
  getStoredFile, 
  getStoredFileAsync, 
  getStoredFileUrlAsync 
} from "@/lib/file-utils";
import { getPDFVersions, getPDFVersionContent, getLatestPDFVersion } from "@/lib/pdf-utils";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { UploadDialog } from "@/components/UploadDialog";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
import { formatDate } from "@/lib/ui-utils";

const mockRitningar = [
  { 
    id: 1, 
    filename: "A-400-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 2, 
    filename: "A-400-1-100.pdf", 
    version: "2", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 3, 
    filename: "A-400-1-100.pdf", 
    version: "3", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 4, 
    filename: "A-400-1-105.pdf", 
    version: "1", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 5, 
    filename: "A-400-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 10", 
    uploaded: "7 sep 2023, 05:46", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 6, 
    filename: "A-401-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 11", 
    uploaded: "7 sep 2023, 10:23", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 7, 
    filename: "A-402-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 12", 
    uploaded: "7 sep 2023, 14:15", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 8, 
    filename: "A-403-1-100.pdf", 
    version: "2", 
    description: "HUS PLAN 13", 
    uploaded: "8 sep 2023, 09:12", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 9, 
    filename: "A-404-1-100.pdf", 
    version: "1", 
    description: "HUS PLAN 14", 
    uploaded: "8 sep 2023, 11:30", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 10, 
    filename: "A-405-1-100.pdf", 
    version: "3", 
    description: "HUS PLAN 15", 
    uploaded: "9 sep 2023, 08:45", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 11, 
    filename: "A-406-1-100.pdf", 
    version: "2", 
    description: "HUS SEKTION A-A", 
    uploaded: "9 sep 2023, 14:22", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 12, 
    filename: "A-407-1-100.pdf", 
    version: "1", 
    description: "HUS SEKTION B-B", 
    uploaded: "10 sep 2023, 10:15", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 13, 
    filename: "A-408-1-100.pdf", 
    version: "2", 
    description: "HUS FASAD NORR", 
    uploaded: "10 sep 2023, 15:40", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 14, 
    filename: "A-409-1-100.pdf", 
    version: "1", 
    description: "HUS FASAD SÖDER", 
    uploaded: "11 sep 2023, 09:05", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 15, 
    filename: "A-410-1-100.pdf", 
    version: "1", 
    description: "HUS FASAD ÖSTER", 
    uploaded: "11 sep 2023, 14:30", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  },
  { 
    id: 16, 
    filename: "A-411-1-100.pdf", 
    version: "2", 
    description: "HUS FASAD VÄSTER", 
    uploaded: "12 sep 2023, 11:20", 
    uploadedBy: "Fredrik Helleström", 
    number: "(Value)", 
    status: "(Status_Value)", 
    annat: "(Subject_Text)" 
  }
];

// Utöka ritningarna med ett fileId-fält för att hålla reda på uppladdade filer
interface Ritning {
  id: number;
  filename: string;
  version: string;
  description: string;
  uploaded: string;
  uploadedBy: string;
  number: string;
  status: string;
  annat: string;
  fileId?: string; // Används för att hålla reda på PDF-filer för uppladdade ritningar
  projectId?: number; // ID för det projekt ritningen tillhör
}

export default function RitningarPage() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("uploaded");
  const [sortDirection, setSortDirection] = useState("desc");
  const [versionFilter, setVersionFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<Ritning | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Använd localStorage med projektisolering - separate storage per project
  // API-funktioner för att hämta ritningar från server
  const fetchRitningarFromServer = async (projectId: number): Promise<Ritning[]> => {
    try {
      console.log(`Hämtar ritningar för projekt ${projectId} från server...`);
      // Hämta filerna från API
      const response = await fetch(`/api/projects/${projectId}/files?type=drawing`);
      
      if (!response.ok) {
        throw new Error(`API-anrop misslyckades: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Hämtade ${data.length} ritningar från server:`, data);
      
      // Konvertera API-data till Ritning-format
      const mappedRitningar: Ritning[] = data.map((file: any) => ({
        id: file.id.toString(),
        filename: file.name,
        fileType: file.fileType,
        fileUrl: `/api/files/${file.id}/content`,
        version: file.version || "1.0",
        description: file.description || "",
        uploaded: file.uploadDate || new Date().toISOString(),
        uploadedBy: file.uploaderUsername || "Okänd",
        number: file.metadata?.number || file.id.toString(),
        status: file.metadata?.status || "aktiv",
        annat: file.metadata?.annat || ""
      }));
      
      // Spara även i localStorage som backup
      const storageKey = `project_${projectId}_ritningar`;
      localStorage.setItem(storageKey, JSON.stringify(mappedRitningar));
      
      return mappedRitningar;
    } catch (error) {
      console.error("Fel vid hämtning av ritningar från server:", error);
      // Om server-anropet misslyckas, försök med localStorage
      const storageKey = `project_${projectId}_ritningar`;
      const savedRitningar = localStorage.getItem(storageKey);
      return savedRitningar ? JSON.parse(savedRitningar) : [];
    }
  };
  
  const getStorageKey = () => {
    return currentProject ? `project_${currentProject.id}_ritningar` : 'no_project_ritningar';
  };
  
  // Initiera med tom array och hämta data från server när komponenten laddas
  const [ritningarData, setRitningarData] = useState<Ritning[]>([]);
  
  // Använd PDF-dialog-hooken istället för lokal state
  const { showPDFDialog } = usePDFDialog();
  
  // Hämta ritningar när projektet ändras
  useEffect(() => {
    if (currentProject) {
      // Hämta från server om vi har ett projekt
      fetchRitningarFromServer(currentProject.id)
        .then(ritningar => {
          console.log(`Uppdaterar UI med ${ritningar.length} ritningar från server`);
          setRitningarData(ritningar);
        });
    } else {
      // Om inget projekt är valt, använd localStorage
      const savedRitningar = localStorage.getItem(getStorageKey());
      console.log("Inget projekt valt, använder lokaldata");
      setRitningarData(savedRitningar ? JSON.parse(savedRitningar) : []);
    }
  }, [currentProject]);
  
  // Hämta eventuella URL-parametrar för att direkt öppna en fil
  useEffect(() => {
    const checkUrlParams = async () => {
      // Kontrollera om vi har en viewFile-parameter i URL:en
      const params = new URLSearchParams(window.location.search);
      const fileIdParam = params.get('viewFile');
      
      if (fileIdParam) {
        console.log(`[${Date.now()}] Detected viewFile parameter: ${fileIdParam}`);
        
        try {
          // Försök att hämta filen från persistent lagring
          const storedFileData = await getStoredFileAsync(fileIdParam);
          
          if (storedFileData) {
            console.log(`[${Date.now()}] Successfully loaded file from storage: ${fileIdParam}`);
            
            // Hitta ritningsdatan för den här filen om den finns
            const matchingRitning = ritningarData.find(r => r.fileId === fileIdParam);
            
            // Använd PDF-dialogsystemet istället för lokal state
            showPDFDialog({
              fileId: matchingRitning?.id || `file_${Date.now()}`,
              initialUrl: storedFileData.url,
              filename: matchingRitning?.filename || storedFileData.name || "Dokument",
              projectId: currentProject?.id || null,
              file: storedFileData.file
            });
          } else {
            console.error(`[${Date.now()}] Could not load file with ID: ${fileIdParam}`);
            toast({
              title: "Kunde inte hitta filen",
              description: "Filen du försöker visa finns inte längre tillgänglig.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error(`[${Date.now()}] Error loading file: ${error}`);
          toast({
            title: "Fel vid laddning av fil",
            description: "Ett fel uppstod när filen skulle laddas. Försök igen senare.",
            variant: "destructive",
          });
        }
      }
    };
    
    checkUrlParams();
  }, [ritningarData, currentProject, showPDFDialog]);
  
  // Hämta ritningar från databasen baserat på projekt-ID
  const { data: apiRitningar = [], isLoading: isLoadingApi } = useQuery({
    queryKey: ['/api/files', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return [];
      try {
        const response = await fetch(`/api/files?projectId=${currentProject.id}`);
        if (!response.ok) throw new Error('Failed to fetch files');
        const files = await response.json();
        
        // Transformera API-svaret till Ritning-format
        return files.map((file: any) => ({
          id: file.id,
          filename: file.fileName || file.name || "dokument.pdf",
          version: file.versionNumber?.toString() || "1",
          description: file.description || "PDF-dokument",
          uploaded: formatDate(file.uploadedAt || file.createdAt),
          uploadedBy: file.uploadedBy || "System",
          number: file.id.toString().padStart(3, '0'),
          status: file.status || "Active",
          annat: "PDF",
          projectId: file.projectId
        }));
      } catch (error) {
        console.error('Error fetching project files:', error);
        return [];
      }
    },
    enabled: !!currentProject,
  });

  // Slå ihop lokalt sparade ritningar och API-data
  // Vi prioriterar API-data om samma fil finns i båda källorna (baserat på ID)
  const ritningar = React.useMemo(() => {
    let result = [];
    
    if (apiRitningar.length > 0) {
      // Om vi har data från API, använd främst den
      const apiRitningsMap = new Map(apiRitningar.map(r => [r.id, r]));
      
      // Filtrera lokala ritningar som inte redan finns i API-data
      const uniqueLocalRitningar = ritningarData.filter(
        local => !apiRitningsMap.has(local.id) && 
                 local.projectId === currentProject?.id
      );
      
      result = [...apiRitningar, ...uniqueLocalRitningar];
    } else {
      // Om vi inte har någon API-data, använd bara lokala ritningar
      result = ritningarData.filter(r => r.projectId === currentProject?.id);
    }
    
    // Sortera ritningar efter datum, med nyast först
    return result.sort((a, b) => {
      try {
        const dateA = a.uploaded ? new Date(a.uploaded).getTime() : 0;
        const dateB = b.uploaded ? new Date(b.uploaded).getTime() : 0;
        return dateB - dateA; // Sortera med nyast först (fallande ordning)
      } catch (error) {
        console.error('Fel vid sortering av datum:', error);
        return 0;
      }
    });
  }, [apiRitningar, ritningarData, currentProject]);
  
  const isLoading = isLoadingApi;

  const filteredRitningar = ritningar.filter(ritning => 
    ritning.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ritning.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(ritning => 
    versionFilter === "all" || ritning.version === versionFilter
  );
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Uppladdningsmutationen som använder API:et istället för lokal lagring
  const uploadFileMutation = useMutation({
    mutationFn: async (fileData: { file: File, description: string }) => {
      if (!currentProject) {
        throw new Error("Inget projekt valt");
      }
      
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('projectId', currentProject.id.toString());
      formData.append('description', fileData.description);
      
      // Använd apiRequest för att ladda upp filen till servern
      const response = await apiRequest('POST', '/api/files', formData);
      if (!response.ok) {
        throw new Error('Kunde inte ladda upp filen');
      }
      
      // Returnera den uppladdade filens data
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidera queryn för att uppdatera listan med filer
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id] });
      
      // Visa bekräftelse
      toast({
        title: "Fil uppladdad",
        description: "Filen har laddats upp och lagrats permanent i databasen.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Fel vid uppladdning:", error);
      toast({
        title: "Uppladdning misslyckades",
        description: error.message || "Ett fel uppstod vid uppladdning av fil.",
        variant: "destructive",
      });
    }
  });

  const handleUpload = (files: File[]) => {
    // Kontrollera om användaren har ett aktivt projekt
    if (!currentProject || currentProject.id === 0) {
      toast({
        title: "Uppladdning misslyckades",
        description: "Du måste vara ansluten till ett projekt för att ladda upp filer",
        variant: "destructive",
      });
      return;
    }
    
    // Visa att uppladdningen har startats
    toast({
      title: "Laddar upp filer",
      description: `Laddar upp ${files.length} fil(er)...`,
      variant: "default",
    });
    
    // Ladda upp varje fil genom mutation
    files.forEach(file => {
      uploadFileMutation.mutate({ 
        file,
        description: "Uppladdad via Ritningar-sidan" 
      });
    });
    
    // Stäng uppladdningsdialogen efter att ha startat uppladdningar
    setShowUploadDialog(false);
  };
  
  // Hämta PDF-filen från databasen
  // Ta bort PDF-fil mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      if (!currentProject) {
        throw new Error("Inget projekt valt");
      }
      
      const response = await apiRequest('DELETE', `/api/files/${fileId}`);
      if (!response.ok) {
        throw new Error('Kunde inte ta bort filen');
      }
      
      return { fileId };
    },
    onSuccess: (data) => {
      // Invalidera queryn för att uppdatera listan med filer
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id] });
      
      // Ta bort fil från lokal lagring om den finns där
      // OBS: Vi använder ingen kod för att göra detta här, eftersom det är API som hanterar allt
      
      // Visa bekräftelse
      toast({
        title: "Fil borttagen",
        description: "Filen har tagits bort permanent.",
        variant: "default",
      });
      
      // Återställ state för delete-dialogrutan
      setFileToDelete(null);
      setShowDeleteConfirm(false);
    },
    onError: (error: Error) => {
      console.error("Fel vid borttagning:", error);
      toast({
        title: "Borttagning misslyckades",
        description: error.message || "Ett fel uppstod vid borttagning av fil.",
        variant: "destructive",
      });
      
      // Återställ state för delete-dialogrutan även vid fel
      setFileToDelete(null);
      setShowDeleteConfirm(false);
    }
  });
  
  // Hantera klick på ta bort-knappen
  const handleDeleteClick = (ritning: Ritning) => {
    setFileToDelete(ritning);
    setShowDeleteConfirm(true);
  };
  
  // Hantera bekräftelse på borttagning
  const handleDeleteConfirm = () => {
    if (fileToDelete && fileToDelete.id) {
      deleteFileMutation.mutate(Number(fileToDelete.id));
    }
  };
  
  const fetchFileContentMutation = useMutation({
    mutationFn: async (fileId: number) => {
      try {
        // Först måste vi hämta den senaste versionen av filen
        const latestVersion = await getLatestPDFVersion(fileId);
        if (!latestVersion) {
          throw new Error("Ingen version hittades för filen");
        }
        
        // Sedan hämtar vi innehållet i den versionen
        const content = await getPDFVersionContent(latestVersion.id);
        if (!content) {
          throw new Error("Kunde inte ladda filinnehåll");
        }
        
        return {
          content,
          version: latestVersion
        };
      } catch (error) {
        console.error(`Fel vid hämtning av fil med ID ${fileId}:`, error);
        throw error;
      }
    },
    onSuccess: (data, fileId) => {
      // Konvertera blob till url för att visa i PDF-läsaren
      const fileUrl = URL.createObjectURL(data.content);
      
      // Hitta matchande ritningsinformation
      const ritning = ritningarData.find(r => Number(r.id) === fileId);
      
      if (ritning) {
        setSelectedFile({
          file: null,
          fileUrl,
          fileData: {
            filename: ritning.filename,
            version: data.version.versionNumber.toString(),
            description: data.version.description || ritning.description,
            uploaded: new Date(data.version.uploadedAt).toLocaleString(),
            uploadedBy: data.version.uploadedBy || ritning.uploadedBy
          }
        });
      } else {
        setSelectedFile({
          file: null,
          fileUrl,
          fileData: {
            filename: data.version.metadata?.fileName || "dokument.pdf",
            version: data.version.versionNumber.toString(),
            description: data.version.description || "PDF-dokument",
            uploaded: new Date(data.version.uploadedAt).toLocaleString(),
            uploadedBy: data.version.uploadedBy || "System"
          }
        });
      }
    },
    onError: (error: Error) => {
      console.error("Fel vid hämtning av fil:", error);
      toast({
        title: "Kunde inte öppna filen",
        description: error.message || "Ett fel uppstod när filen skulle öppnas.",
        variant: "destructive",
      });
    }
  });

  // Öppna PDF-visaren när användaren klickar på en fil
  const handleFileClick = async (ritning: Ritning) => {
    // För lokalt sparade filer, försök först att använda den lokala kopian
    if (ritning.fileId && ritning.fileId.startsWith('file_')) {
      try {
        // Använd asynkron version för att hämta från persistent lagring om det behövs
        const storedFileData = await getStoredFileAsync(ritning.fileId);
        
        if (storedFileData) {
          console.log(`[${Date.now()}] Successfully loaded file from local storage for viewing: ${ritning.fileId}`);
          setSelectedFile({
            file: storedFileData.file,
            fileUrl: storedFileData.url,
            fileData: {
              filename: ritning.filename,
              version: ritning.version,
              description: ritning.description,
              uploaded: ritning.uploaded,
              uploadedBy: ritning.uploadedBy
            }
          });
          return;
        }
      } catch (error) {
        console.warn(`[${Date.now()}] Error loading file with ID ${ritning.fileId} from local storage, will try server:`, error);
      }
    }
    
    // För filens numeriska ID, försök att hämta från servern
    if (ritning.id && !isNaN(Number(ritning.id))) {
      try {
        // Starta hämtning av filinnehåll från servern via mutation
        fetchFileContentMutation.mutate(Number(ritning.id));
        return;
      } catch (error) {
        console.error(`[${Date.now()}] Error loading file with ID ${ritning.id} from server:`, error);
      }
    }
    
    // Fallback: För befintliga/mock-filer, använd exempelfilen om inget annat fungerar
    const fileUrl = getUploadedFileUrl(ritning.id);
    console.log(`[${Date.now()}] Using example file URL for file: ${ritning.filename}`);
    setSelectedFile({
      file: null,
      fileUrl,
      fileData: {
        filename: ritning.filename,
        version: ritning.version,
        description: ritning.description,
        uploaded: ritning.uploaded,
        uploadedBy: ritning.uploadedBy
      }
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 overflow-y-auto">
        <Header title="Ritningar" onToggleSidebar={toggleSidebar} />
        
        <div className="container px-6 py-6">
          <div className="flex items-center text-sm mb-4 text-blue-600 dark:text-blue-400">
            <Home size={14} className="mr-1" />
            <span>Vault</span>
            <ChevronRight size={14} className="mx-1" />
            <span>Files</span>
            <ChevronRight size={14} className="mx-1" />
            <span>01- Organisation</span>
            <ChevronRight size={14} className="mx-1" />
            <span>01- Arkitekt</span>
            <ChevronRight size={14} className="mx-1" />
            <span className="font-semibold">Ritningar</span>
          </div>
          
          {!currentProject && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-md p-4 mb-6">
              <h3 className="text-amber-800 dark:text-amber-300 font-medium text-lg mb-2">Inget aktivt projekt</h3>
              <p className="text-amber-700 dark:text-amber-400">
                Du behöver välja ett projekt för att kunna se och hantera ritningar. 
                Använd projektväljaren i toppen av sidan för att välja projekt.
              </p>
            </div>
          )}
        
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Ritningar</h1>
            <div className="flex space-x-2">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                onClick={() => setShowUploadDialog(true)}
                disabled={!currentProject}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              
              {/* Upload Dialog */}
              <UploadDialog 
                open={showUploadDialog} 
                onOpenChange={setShowUploadDialog}
                onUpload={handleUpload}
                acceptedFileTypes=".pdf"
                title="Ladda upp ritningar"
                description="Välj eller dra PDF-filer här"
                currentProject={currentProject}
              />
            </div>
          </div>

          <div className="bg-background rounded-lg shadow border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Sök efter ritningar</h2>
              <div className="mt-2 flex space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Sök..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2">
                  <div className="w-32">
                    <Select
                      value={sortField}
                      onValueChange={setSortField}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sortera" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uploaded">Uppladdad</SelectItem>
                        <SelectItem value="filename">Filnamn</SelectItem>
                        <SelectItem value="version">Version</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Select
                      value={versionFilter}
                      onValueChange={setVersionFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="A-O" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla versioner</SelectItem>
                        <SelectItem value="1">Version 1</SelectItem>
                        <SelectItem value="2">Version 2</SelectItem>
                        <SelectItem value="3">Version 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <Select defaultValue="newest">
                      <SelectTrigger>
                        <SelectValue placeholder="Nyast först" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Nyast först</SelectItem>
                        <SelectItem value="oldest">Äldst först</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Filnamn</TableHead>
                    <TableHead className="w-[80px]">Version</TableHead>
                    <TableHead className="w-[200px]">Innehållsbeskrivning</TableHead>
                    <TableHead className="w-[140px]">Uppladdad</TableHead>
                    <TableHead className="w-[160px]">Uppladdad av</TableHead>
                    <TableHead className="w-[100px]">Nummer</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[120px]">Annat</TableHead>
                    <TableHead className="w-[60px] text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">Laddar...</TableCell>
                    </TableRow>
                  ) : filteredRitningar.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-4">Inga ritningar hittades</TableCell>
                    </TableRow>
                  ) : (
                    filteredRitningar.map((ritning) => (
                      <TableRow key={ritning.id}>
                        <TableCell className="py-2 w-[200px]">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 mr-3 text-red-500 dark:text-red-400">
                              <FileText size={20} />
                            </div>
                            <div 
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
                              onClick={() => handleFileClick(ritning)}
                            >
                              {ritning.filename}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="w-[80px]">{ritning.version}</TableCell>
                        <TableCell className="w-[200px]">{ritning.description}</TableCell>
                        <TableCell className="w-[140px]">{ritning.uploaded}</TableCell>
                        <TableCell className="w-[160px]">{ritning.uploadedBy}</TableCell>
                        <TableCell className="w-[100px]">{ritning.number}</TableCell>
                        <TableCell className="w-[120px]">{ritning.status}</TableCell>
                        <TableCell className="w-[120px]">{ritning.annat}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(ritning);
                              }}
                              title="Ta bort fil"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
      
      {/* PDF-visare - använder den förbättrade visaren med kommentarer och versionshantering */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-background/80">
          <EnhancedPDFViewer
            fileId={Number(selectedFile.fileData?.id) || (selectedFile.fileData as any)?.fileId || `file_${Date.now()}`}
            initialUrl={selectedFile.fileUrl || ""}
            filename={selectedFile.fileData?.filename || "Dokument"}
            onClose={() => setSelectedFile(null)}
            projectId={currentProject?.id || null}
            useDatabase={true} // Använd databasen istället för localStorage för att spara anmärkningar
          />
        </div>
      )}
      
      {/* Bekräftelsedialog för borttagning */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort ritning</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort ritningen "{fileToDelete?.filename}"? 
              <br />
              <br />
              <span className="font-semibold text-red-600 dark:text-red-400">
                Denna åtgärd kan inte ångras.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}