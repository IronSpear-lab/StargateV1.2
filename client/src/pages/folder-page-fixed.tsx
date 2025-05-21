import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useParams } from "wouter";
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
import { usePDFDialog } from "@/hooks/use-pdf-dialog";

interface Ritning {
  id: number | string;
  filename: string;
  version: string;
  description: string;
  uploaded: string;
  uploadedBy: string;
  number?: string;
  status?: string;
  annat?: string;
  fileId?: string; // Används för att hålla reda på PDF-filer för uppladdade ritningar
  projectId?: number; // ID för det projekt ritningen tillhör
  folderId?: number | null; // ID för den mapp som filen tillhör
}

export default function FolderPage() {
  // Hämta mappnamnet från URL:en
  const params = useParams<{ folderName: string }>();
  const folderName = params.folderName || "Mapp";
  const [location, navigate] = useLocation();
  
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [versionFilter, setVersionFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<Ritning | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFolderDeleteConfirm, setShowFolderDeleteConfirm] = useState(false);
  const [folderIdToDelete, setFolderIdToDelete] = useState<number | null>(null);
  
  // Håll reda på mappens ID för korrekt filtrering
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  
  // Status för mappen
  const [folderStatus, setFolderStatus] = useState<'loading' | 'found' | 'not_found'>('loading');
  
  // Samma komponenter och state som i ritningar-page för konsekvent användargränssnitt
  // Använd PDF Dialog hook istället för lokal state
  const { showPDFDialog } = usePDFDialog();
  
  // Uppdatera mappens ID när vi har verifierat den
  useEffect(() => {
    const updateFolderId = async () => {
      if (!currentProject?.id || !folderName) return;
      
      try {
        setFolderStatus('loading');
        const folderId = await getFolderIdByName(folderName);
        
        if (folderId) {
          setCurrentFolderId(folderId);
          setFolderStatus('found');
          console.log(`Mapp-ID uppdaterat till: ${folderId} för mapp "${folderName}"`);
        } else {
          console.error(`Kunde inte hitta ID för mappen "${folderName}"`);
          setFolderStatus('not_found');
        }
      } catch (error) {
        console.error("Error updating folder ID:", error);
        setFolderStatus('not_found');
      }
    };
    
    updateFolderId();
  }, [currentProject?.id, folderName]);
  
  // Använd API:et för att hämta filer från databasen med korrekt projektID och folderID-parametrar
  const { data: apiRitningar, isLoading: isLoadingApi } = useQuery<any[]>({
    queryKey: ['/api/files', currentProject?.id, currentFolderId],
    queryFn: async ({ queryKey }) => {
      if (!currentProject?.id) throw new Error("Inget projekt valt");
      
      // Anpassa API-anropet baserat på om vi har ett mappID eller inte
      let url = `/api/files?projectId=${currentProject.id}`;
      
      // Lägg till mappfiltrering om vi har ett mappID
      if (currentFolderId) {
        url += `&folderId=${currentFolderId}`;
        console.log(`Hämtar filer för specifik mapp med ID: ${currentFolderId}`);
      } else {
        console.log(`Hämtar alla filer för projektet eftersom mappID saknas`);
      }
      
      const response = await apiRequest('GET', url);
      if (!response.ok) throw new Error('Kunde inte hämta filer');
      return response.json();
    },
    enabled: !!currentProject?.id && folderStatus !== 'not_found',
  });
  
  // Hämta PDF-versioner som innehåller metadata
  const { data: pdfVersions, isLoading: isLoadingVersions } = useQuery<any[]>({
    queryKey: ['/api/pdf/versions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/pdf/versions');
      if (!response.ok) throw new Error('Kunde inte hämta PDF-versioner');
      return response.json();
    },
  });
  
  // Använd localStorage för temporär lagring av ritningar - samma som i ritningar-page
  const getStorageKey = () => {
    return currentProject 
      ? `project_${currentProject.id}_folder_${folderName.toLowerCase()}_ritningar` 
      : `no_project_folder_${folderName.toLowerCase()}_ritningar`;
  };
  
  // Ladda tidigare sparade ritningar från localStorage som en fallback
  const [ritningarData, setRitningarData] = useState<Ritning[]>(() => {
    if (typeof window !== 'undefined') {
      const savedRitningar = localStorage.getItem(getStorageKey());
      try {
        return savedRitningar ? JSON.parse(savedRitningar) : [];
      } catch (e) {
        console.error('Fel vid parsning av sparade ritningar:', e);
        return [];
      }
    }
    return [];
  });
  
  // Spara ritningar i localStorage när de uppdateras - bra för offline-stöd och snabbare laddning
  useEffect(() => {
    if (ritningarData.length > 0) {
      localStorage.setItem(getStorageKey(), JSON.stringify(ritningarData));
    }
  }, [ritningarData]);
  
  // Skapa en kombinerad lista av ritningar från API och lokal lagring
  const ritningar = React.useMemo(() => {
    const ritningarFromApi = apiRitningar || [];
    const allVersions = pdfVersions || [];
    
    // Debug-information som hjälper oss att se exakt vilken data som kommer från API
    console.log("Ritningar från API (rådata):", JSON.stringify(ritningarFromApi, null, 2));
    console.log("PDF-versioner från API (innehåller metadata):", JSON.stringify(allVersions, null, 2));
    console.log("Aktuell mapp ID för filtrering:", currentFolderId);
    
    // Skapa en lookup-tabell för att hitta versioner baserat på fil-ID
    const versionsByFileId: Record<string, any[]> = {};
    allVersions.forEach(version => {
      if (version.fileId) {
        if (!versionsByFileId[version.fileId]) {
          versionsByFileId[version.fileId] = [];
        }
        versionsByFileId[version.fileId].push(version);
      }
    });
    
    // Mappa om API-data till vårt Ritning-format med korrekta värden för metadata
    // FÖRBÄTTRAD FILTRERING: Visa bara filer som faktiskt tillhör den aktuella mappen
    const mappedApiRitningar = ritningarFromApi
      .filter(file => {
        // Filtrera först baserat på projekt
        const matchesProject = currentProject && file.projectId === currentProject.id;
        
        // KRITISK FÖRBÄTTRING: Filtrera sedan baserat på mappID
        // Om currentFolderId är null, visar vi bara rotfiler (filer utan mappID)
        // Annars visar vi bara filer som har exakt samma mappID
        
        // Använd strikt jämförelse för att hantera både siffror och null korrekt
        let matchesFolder = false;
        
        if (currentFolderId === null) {
          // Om vi visar rotmappen, visa bara filer utan folderId eller med folderId=null
          matchesFolder = file.folderId === null || file.folderId === undefined || file.folderId === 0;
        } else {
          // Annars, konvertera båda till nummer för att säkerställa exakt matchning
          // Detta undviker problem med strängrepresentation vs. nummerrepresentation
          matchesFolder = Number(file.folderId) === Number(currentFolderId);
        }
        
        const shouldInclude = matchesProject && matchesFolder;
        
        // Logga för felsökning om file.folderId inte matchar som förväntat
        if (matchesProject && !matchesFolder) {
          console.log(`Fil "${file.name}" filtreras bort - förväntad mapp: ${currentFolderId}, filens mapp: ${file.folderId}, typ: ${typeof file.folderId}`);
        }
        
        return shouldInclude;
      })
      .map(file => {
        // Hitta relaterade PDF-versioner om de finns
        const fileVersions = versionsByFileId[file.id] || [];
        
        // Använd den senaste versionen för metadata (sortera efter versionsnummer om det finns)
        const latestVersion = fileVersions.length > 0 
          ? fileVersions.sort((a: any, b: any) => (b.versionNumber || 0) - (a.versionNumber || 0))[0] 
          : null;
          
        // Använd data från API i första hand, därefter från metadata om det finns
        return {
          id: file.id,
          filename: file.name,
          uploaded: formatDate(file.uploadedAt),
          uploadedBy: file.uploadedBy || "System",
          version: latestVersion?.versionNumber || "1.0",
          description: file.description || "",
          status: latestVersion?.status || "Ej granskad",
          number: latestVersion?.drawingNumber || file.drawingNumber || "",
          fileId: file.id, // För att kunna öppna PDF-visningen
          projectId: file.projectId,
          folderId: file.folderId // Behåll mappID för att kunna spåra filens placering
        };
      });
      
    // Kombinera data från API och lokal lagring
    const combinedRitningar = [...mappedApiRitningar];
    
    // Sök och versionsfiltrering
    return combinedRitningar
      .filter(ritning => {
        // Sökfiltrering
        if (searchTerm && searchTerm.length > 0) {
          const searchLower = searchTerm.toLowerCase();
          return (
            ritning.filename.toLowerCase().includes(searchLower) ||
            ritning.description.toLowerCase().includes(searchLower) ||
            ritning.number?.toLowerCase().includes(searchLower) ||
            ritning.status?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
      .filter(ritning => {
        // Versionsfiltrering
        if (versionFilter === "all") return true;
        return ritning.status === versionFilter;
      })
      .sort((a, b) => {
        // Sortera efter uppladdningsdatum (senaste först)
        return new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime();
      });
  }, [apiRitningar, pdfVersions, currentProject, searchTerm, versionFilter, currentFolderId]);

  // Toggle för sidopanelen
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Händelsehanterare för filuppladdning
  const uploadMutation = useMutation({
    mutationFn: async (fileData: { file: File, description: string }) => {
      if (!currentProject?.id) {
        throw new Error("Du måste välja ett projekt innan du kan ladda upp filer");
      }

      // Skapa FormData för filuppladdning
      const formData = new FormData();
      formData.append('file', fileData.file);
      formData.append('description', fileData.description);
      formData.append('projectId', currentProject.id.toString());
      
      // Viktigt: Lägg till folderId i formuläret
      if (currentFolderId) {
        formData.append('folderId', currentFolderId.toString());
        console.log(`Laddar upp fil till mapp med ID: ${currentFolderId}`);
      } else {
        console.log("Laddar upp fil till rotmappen (ingen mapp vald)");
      }

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fel vid uppladdning: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Ritning uppladdad",
        description: "Ritningen har laddats upp till systemet.",
      });
      // Stäng uppladdningsdialogrutan
      setShowUploadDialog(false);
      // Uppdatera fillistorna
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pdf/versions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fel vid uppladdning",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Radera fil-mutationen
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number | string) => {
      const response = await apiRequest('DELETE', `/api/files/${fileId}`);
      if (!response.ok) {
        throw new Error('Kunde inte ta bort filen');
      }
      return fileId;
    },
    onSuccess: () => {
      toast({
        title: "Fil borttagen",
        description: "Filen har tagits bort från systemet.",
      });
      // Uppdatera filer via React Query cache
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pdf/versions'] });
      // Rensa delete-dialogens state
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fel vid borttagning",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Radera mapp-mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      const response = await apiRequest('DELETE', `/api/folders/${folderId}`);
      if (!response.ok) {
        throw new Error('Kunde inte ta bort mappen');
      }
      return folderId;
    },
    onSuccess: (folderId) => {
      toast({
        title: "Mapp borttagen",
        description: "Mappen och alla filer i den har tagits bort från systemet.",
      });
      // Uppdatera mappar och filer i UI
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      // Navigera tillbaka till filöversikten
      navigate('/vault/files');
      
      // Skriv om alla ändringar när en mapp tas bort
      const folderKey = `folder_${folderId}`;
      if (typeof window !== 'undefined') {
        // Rensar localStorage från mappen
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes(folderKey)) {
            localStorage.removeItem(key);
          }
        }
      }
      
      // Skickar custom event för att uppdatera sidopanelen
      const event = new CustomEvent('folder-structure-changed', { 
        detail: { action: 'delete', folderId } 
      });
      window.dispatchEvent(event);
      
      // Rensa folder delete dialogens state
      setShowFolderDeleteConfirm(false);
      setFolderIdToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Fel vid borttagning av mapp",
        description: error.message,
        variant: "destructive",
      });
      setShowFolderDeleteConfirm(false);
      setFolderIdToDelete(null);
    }
  });

  // Klickhanterare för att öppna PDF-filen
  const handleFileClick = async (ritning: Ritning) => {
    if (!ritning.fileId) {
      toast({
        title: "Kan inte öppna filen",
        description: "Filen saknar en giltig identifierare.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Försök att hämta URL:en från filsystemet
      let fileUrl = await getStoredFileUrlAsync(ritning.fileId.toString());

      if (!fileUrl) {
        // Om den inte finns lokalt, hämta den från API:et
        fileUrl = await getUploadedFileUrl(ritning.fileId.toString());
      }

      if (fileUrl) {
        showPDFDialog({
          url: fileUrl,
          title: ritning.filename,
          fileId: ritning.fileId.toString(),
          metadata: {
            description: ritning.description,
            version: ritning.version,
            status: ritning.status || "Ej granskad",
            drawingNumber: ritning.number || "",
          }
        });
      } else {
        toast({
          title: "Kunde inte öppna filen",
          description: "Filen kunde inte hittas.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Fel vid öppning av PDF:", error);
      toast({
        title: "Fel vid öppning",
        description: "Ett fel uppstod när filen skulle öppnas.",
        variant: "destructive",
      });
    }
  };

  // Hantera radering av fil
  const handleDeleteClick = (ritning: Ritning) => {
    setFileToDelete(ritning);
    setShowDeleteConfirm(true);
  };

  // Bekräfta radering
  const confirmDelete = () => {
    if (fileToDelete && fileToDelete.id) {
      deleteMutation.mutate(fileToDelete.id);
    } else {
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };

  // Hantera begäran att radera mappen
  const handleDeleteFolder = () => {
    if (currentFolderId) {
      setFolderIdToDelete(currentFolderId);
      setShowFolderDeleteConfirm(true);
    } else {
      toast({
        title: "Kan inte ta bort mappen",
        description: "Ingen mapp är vald eller mappens ID kunde inte hittas.",
        variant: "destructive",
      });
    }
  };

  // Bekräfta borttagning av mappen
  const confirmDeleteFolder = () => {
    if (folderIdToDelete) {
      deleteFolderMutation.mutate(folderIdToDelete);
    } else {
      setShowFolderDeleteConfirm(false);
      setFolderIdToDelete(null);
    }
  };

  // Direkt API-anrop för att hämta folder ID baserat på mappnamn
  const getFolderIdByName = async (name: string): Promise<number | null> => {
    if (!currentProject?.id) return null;
    
    try {
      // Första försöket: Hitta ID direkt från mappnamnet (om det finns i formatet "Mappnamn (123)")
      const folderMatch = name.match(/\((\d+)\)$/);
      if (folderMatch && folderMatch[1]) {
        const folderId = parseInt(folderMatch[1]);
        if (!isNaN(folderId)) {
          console.log(`Direct match - found folder ID: ${folderId} from name: ${name}`);
          return folderId;
        }
      }
      
      // Andra försöket: Gör ett API-anrop för att hitta mappen
      console.log(`Searching for folder by name: ${name} in project: ${currentProject.id}`);
      const cleanName = name.replace(/\s*\(\d+\)$/, '').trim();
      const res = await apiRequest('GET', `/api/folders/by-name?name=${encodeURIComponent(cleanName)}&projectId=${currentProject.id}`);
      
      if (res.ok) {
        const folder = await res.json();
        if (folder && folder.id) {
          console.log(`API lookup - found folder ID: ${folder.id} by name: ${cleanName}`);
          return folder.id;
        }
      }
      
      // Tredje försöket: Hämta alla mappar och sök manuellt
      const allFoldersRes = await apiRequest('GET', `/api/folders?projectId=${currentProject.id}`);
      if (allFoldersRes.ok) {
        const allFolders = await allFoldersRes.json();
        // Sök efter mappen med samma namn (utan ID-delen om det finns)
        const matchedFolder = allFolders.find((folder: any) => 
          folder.name.toLowerCase() === cleanName.toLowerCase() || 
          folder.name.replace(/\s*\(\d+\)$/, '').trim().toLowerCase() === cleanName.toLowerCase()
        );
        
        if (matchedFolder && matchedFolder.id) {
          console.log(`List lookup - found folder ID: ${matchedFolder.id} for name: ${cleanName}`);
          return matchedFolder.id;
        }
      }
      
      console.log(`Could not find any folder ID for name: ${name}`);
      
      // Uppdatera folderStatus om mappen inte hittas - detta triggar felmeddelandet
      setFolderStatus('not_found');
      
      return null;
    } catch (error) {
      console.error("Error finding folder ID:", error);
      setFolderStatus('not_found');
      return null;
    }
  };

  // Hämta alla mappar för det aktuella projektet
  const { data: folders } = useQuery<any[]>({
    queryKey: ['/api/folders', currentProject?.id],
    queryFn: async ({ queryKey }) => {
      if (!currentProject?.id) throw new Error("Inget projekt valt");
      const response = await apiRequest('GET', `/api/folders?projectId=${currentProject.id}`);
      if (!response.ok) throw new Error('Kunde inte hämta mappar');
      return response.json();
    },
    enabled: !!currentProject?.id,
  });

  // Effekt för att kontrollera om mappnamnet finns i aktuellt projekt
  useEffect(() => {
    const checkFolder = async () => {
      if (!currentProject?.id || !folderName) return;
      
      setFolderStatus('loading');
      const folderId = await getFolderIdByName(folderName);
      
      if (folderId) {
        setFolderStatus('found');
      } else {
        setFolderStatus('not_found');
      }
    };
    
    checkFolder();
  }, [currentProject?.id, folderName]);
  
  // Hantera navigering tillbaka till rotfilerna när mappen inte hittas
  const handleNavigateToRoot = () => {
    navigate('/vault/files');
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 overflow-y-auto">
        <Header title={folderName} onToggleSidebar={toggleSidebar} />
        
        <div className="container px-6 py-6">
          <div className="flex items-center text-sm mb-4 text-blue-600 dark:text-blue-400">
            <Home size={14} className="mr-1" />
            <span>Vault</span>
            <ChevronRight size={14} className="mx-1" />
            <span>Files</span>
            <ChevronRight size={14} className="mx-1" />
            <span className="font-semibold">{folderName}</span>
          </div>
          
          {/* Meddelandeområde om mappen inte hittas */}
          {folderStatus === 'not_found' && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">
                    Kunde inte hitta mappen "{folderName}"
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    Mappen hittades inte i systemet. Kontrollera att du är i rätt projekt och att mappen existerar.
                  </p>
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleNavigateToRoot}
                    >
                      Gå till filöversikten
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!currentProject && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Inget projekt är valt. Välj ett projekt från projektväljaren ovan för att se och hantera filer.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1 mr-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Sök efter ritningar..." 
                  className="pl-8" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select value={versionFilter} onValueChange={setVersionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrera status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla status</SelectItem>
                  <SelectItem value="Ej granskad">Ej granskad</SelectItem>
                  <SelectItem value="Godkänd">Godkänd</SelectItem>
                  <SelectItem value="Under granskning">Under granskning</SelectItem>
                  <SelectItem value="Avvisad">Avvisad</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                onClick={() => setShowUploadDialog(true)}
                disabled={folderStatus === 'not_found'}
              >
                <Upload className="mr-2 h-4 w-4" />
                Ladda upp
              </Button>
              
              {/* Endast visa knappen "Ta bort mapp" om vi har en giltig mapp och folderStatus är 'found' */}
              {currentFolderId && folderStatus === 'found' && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteFolder}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Ta bort mapp
                </Button>
              )}
            </div>
          </div>
          
          {/* Visar laddningsindikator medan data hämtas */}
          {(isLoadingApi || isLoadingVersions || deleteMutation.isPending || deleteFolderMutation.isPending) && (
            <div className="flex justify-center my-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* Visa ritningar/filer i en tabell */}
          {!isLoadingApi && !isLoadingVersions && folderStatus === 'found' && (
            ritningar.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filnamn</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Beskrivning</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uppladdad</TableHead>
                    <TableHead>Av</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ritningar.map((ritning) => (
                    <TableRow key={ritning.id}>
                      <TableCell className="font-medium">
                        <div 
                          className="flex items-center cursor-pointer text-blue-600 hover:text-blue-800"
                          onClick={() => handleFileClick(ritning)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {ritning.filename}
                        </div>
                      </TableCell>
                      <TableCell>{ritning.version}</TableCell>
                      <TableCell>{ritning.description}</TableCell>
                      <TableCell>
                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium
                          ${ritning.status === 'Godkänd' ? 'bg-green-100 text-green-800' : 
                            ritning.status === 'Under granskning' ? 'bg-blue-100 text-blue-800' :
                            ritning.status === 'Avvisad' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {ritning.status}
                        </div>
                      </TableCell>
                      <TableCell>{ritning.uploaded}</TableCell>
                      <TableCell>{ritning.uploadedBy}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteClick(ritning)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center my-8 p-8 bg-gray-50 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Inga filer i denna mapp</h3>
                <p className="text-gray-500 mb-4">
                  Ladda upp en fil för att komma igång eller se till att du är i rätt projekt.
                </p>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Ladda upp fil
                </Button>
              </div>
            )
          )}
        </div>
      </div>
      
      {/* Dialoger för uppladdning och borttagning */}
      {showUploadDialog && (
        <UploadDialog
          onClose={() => setShowUploadDialog(false)}
          onUpload={(file, description) => {
            uploadMutation.mutate({ file, description });
          }}
          isLoading={uploadMutation.isPending}
        />
      )}
      
      {/* Dialog för att bekräfta borttagning av fil */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Denna åtgärd kan inte ångras. Filen <strong>{fileToDelete?.filename}</strong> kommer att tas bort permanent från systemet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Ta bort</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Dialog för att bekräfta borttagning av mappen */}
      <AlertDialog open={showFolderDeleteConfirm} onOpenChange={setShowFolderDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker på att du vill ta bort mappen?</AlertDialogTitle>
            <AlertDialogDescription>
              Denna åtgärd kan inte ångras. Mappen <strong>{folderName}</strong> och alla filer i den kommer att tas bort permanent från systemet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFolder}>Ta bort mappen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}