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
import { PDFViewerDialog } from "@/components/ui/pdf-viewer-dialog";
import EnhancedPDFViewer from "@/components/EnhancedPDFViewer";
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

// Interface för ritningar/dokument
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
}

export default function FolderPage() {
  // Hämta mappnamnet från URL:en
  const params = useParams<{ folderName: string }>();
  const folderName = params.folderName || "Mapp";
  const [location] = useLocation();
  
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [versionFilter, setVersionFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<Ritning | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Samma komponenter och state som i ritningar-page för konsekvent användargränssnitt
  const [selectedFile, setSelectedFile] = useState<{
    file: File | null;
    fileUrl?: string;
    fileData?: {
      id?: number;
      fileId?: string;
      filename: string;
      version: string;
      description: string;
      uploaded: string;
      uploadedBy: string;
      number?: string;
      status?: string;
      annat?: string;
    };
  } | null>(null);
  
  // Använd API:et för att hämta filer från databasen med korrekt projektID-parameter
  const { data: apiRitningar, isLoading: isLoadingApi } = useQuery<any[]>({
    queryKey: ['/api/files', currentProject?.id],
    queryFn: async ({ queryKey }) => {
      if (!currentProject?.id) throw new Error("Inget projekt valt");
      const response = await apiRequest('GET', `/api/files?projectId=${currentProject.id}`);
      if (!response.ok) throw new Error('Kunde inte hämta filer');
      return response.json();
    },
    enabled: !!currentProject?.id,
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
    
    // Mappa om API-data till vårt Ritning-format med korrekta värden för metadata
    const mappedApiRitningar = ritningarFromApi
      .filter(file => currentProject && file.projectId === currentProject.id)
      .map(file => ({
        id: file.id,
        filename: file.filename || 'Okänt filnamn',
        version: file.version?.toString() || '1',
        description: file.description || 'Ingen beskrivning',
        uploaded: formatDate(file.uploadedAt) || 'Inget datum',
        uploadedBy: file.uploadedBy || 'Användare',
        number: file.metadata?.number || file.number || '',
        status: file.metadata?.status || file.status || '',
        annat: file.metadata?.annat || file.annat || '',
        projectId: file.projectId,
        // Lägg till ytterligare metadata om de finns
        metadata: file.metadata || {}
      }));
    
    // Kombinera API-ritningar och lokalt lagrade ritningar
    // Filtrera bort dubletter baserat på ID
    const idSet = new Set(mappedApiRitningar.map(r => r.id));
    const filteredLocalRitningar = ritningarData.filter(r => !idSet.has(r.id));
    
    const result = [...mappedApiRitningar, ...filteredLocalRitningar];
    
    // Sortera med nyast först baserat på uppladdningsdatum
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
        description: `Uppladdad via ${folderName}-sidan` 
      });
    });
    
    // Stäng uppladdningsdialogen efter att ha startat uppladdningar
    setShowUploadDialog(false);
  };
  
  // Ta bort PDF-fil mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await apiRequest('DELETE', `/api/files/${fileId}`);
      if (!response.ok) {
        throw new Error('Fel vid borttagning av fil');
      }
      return fileId;
    },
    onSuccess: (fileId) => {
      // Invalidera queryn för att uppdatera listan
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id] });
      
      // Visa bekräftelse
      toast({
        title: "Filen har tagits bort",
        description: "Filen har tagits bort permanent från databasen.",
        variant: "default",
      });
      
      // Stäng bekräftelsedialogen
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Fel vid borttagning:", error);
      toast({
        title: "Borttagning misslyckades",
        description: error.message || "Ett fel uppstod när filen skulle tas bort.",
        variant: "destructive",
      });
    }
  });
  
  // Visa bekräftelsedialog innan borttagning
  const handleDeleteClick = (ritning: Ritning) => {
    setFileToDelete(ritning);
    setShowDeleteConfirm(true);
  };
  
  // Ta bort fil efter bekräftelse
  const handleDeleteConfirm = () => {
    if (fileToDelete && typeof fileToDelete.id === 'number') {
      // Om det är en fil från API:et, använd mutation för att ta bort den
      deleteFileMutation.mutate(fileToDelete.id);
    } else if (fileToDelete) {
      // Om det är en lokalt lagrad fil, ta bort den från localStorage
      const updatedRitningar = ritningarData.filter(r => r.id !== fileToDelete.id);
      setRitningarData(updatedRitningar);
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedRitningar));
      
      toast({
        title: "Filen har tagits bort",
        description: "Den lokalt lagrade filen har tagits bort.",
        variant: "default",
      });
      
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };
  
  // Hämta PDF-fil från servern när användaren klickar på den
  const fetchFileContentMutation = useMutation({
    mutationFn: async (fileId: number) => {
      // Hämta filens binärdata direkt
      const response = await fetch(`/api/files/${fileId}/content`, {
        credentials: 'include' // Se till att cookies skickas med för autentisering
      });
      
      if (!response.ok) {
        throw new Error('Kunde inte hämta filinnehåll');
      }
      
      // Hämta direkt som blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      return url;
    },
    onSuccess: (fileUrl, variables) => {
      if (!fileUrl) {
        toast({
          title: "Kunde inte öppna filen",
          description: "Filinnehållet är tomt eller kunde inte läsas.",
          variant: "destructive",
        });
        return;
      }
      
      // Hitta ritningen baserat på filID för att få metadata
      const ritning = ritningar.find(r => r.id === variables);
      
      if (!ritning) {
        toast({
          title: "Kunde inte hitta filens metadata",
          description: "Filen kan visas men metadata saknas.",
          variant: "destructive",
        });
        return;
      }
      
      // Använd metadatan direkt från ritningar listan
      setSelectedFile({
        file: null,
        fileUrl,
        fileData: {
          id: ritning.id,
          filename: ritning.filename || "dokument.pdf",
          version: ritning.version || "1",
          description: ritning.description || "PDF-dokument",
          uploaded: ritning.uploaded || new Date().toLocaleString(),
          uploadedBy: ritning.uploadedBy || "System",
          number: ritning.number || "",
          status: ritning.status || "",
          annat: ritning.annat || ""
        }
      });
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
              id: typeof ritning.id === 'number' ? ritning.id : 
                  typeof ritning.id === 'string' && !isNaN(Number(ritning.id)) ? Number(ritning.id) : 
                  ritning.fileId || Math.floor(Date.now() / 1000),  // Använd ett numeriskt ID baserat på aktuell tid
              filename: ritning.filename,
              version: ritning.version,
              description: ritning.description,
              uploaded: ritning.uploaded,
              uploadedBy: ritning.uploadedBy,
              number: ritning.number || "",
              status: ritning.status || "",
              annat: ritning.annat || ""
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
    try {
      const fileUrl = getUploadedFileUrl(ritning.id);
      console.log(`[${Date.now()}] Using example file URL for file: ${ritning.filename}`);
      setSelectedFile({
        file: null,
        fileUrl,
        fileData: {
          id: typeof ritning.id === 'number' ? ritning.id : 
              typeof ritning.id === 'string' && !isNaN(Number(ritning.id)) ? Number(ritning.id) : 
              Math.floor(Date.now() / 1000),  // Använd ett numeriskt ID baserat på aktuell tid
          filename: ritning.filename,
          version: ritning.version,
          description: ritning.description,
          uploaded: ritning.uploaded,
          uploadedBy: ritning.uploadedBy,
          number: ritning.number || "",
          status: ritning.status || "",
          annat: ritning.annat || ""
        }
      });
    } catch (error) {
      console.error("Kunde inte öppna fallback-filen:", error);
      toast({
        title: "Kunde inte öppna filen",
        description: "Ett fel uppstod när filen skulle öppnas. Försök igen eller kontakta support.",
        variant: "destructive",
      });
    }
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
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Sök efter fil..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select value={versionFilter} onValueChange={setVersionFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Alla versioner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla versioner</SelectItem>
                  {Array.from(new Set(ritningar.map(r => r.version)))
                    .sort()
                    .map(version => (
                      <SelectItem key={version} value={version}>Ver {version}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              
              <Button 
                variant="default" 
                size="sm" 
                className="flex items-center" 
                onClick={() => setShowUploadDialog(true)}
                disabled={!currentProject}
              >
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp
              </Button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Namn</TableHead>
                    <TableHead className="w-[80px]">Version</TableHead>
                    <TableHead className="w-[200px]">Beskrivning</TableHead>
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
                        <TableCell className="w-[100px]">{ritning.number || '-'}</TableCell>
                        <TableCell className="w-[120px]">{ritning.status || '-'}</TableCell>
                        <TableCell className="w-[120px]">{ritning.annat || '-'}</TableCell>
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
            fileId={
              typeof selectedFile.fileData?.id === 'number' 
                ? selectedFile.fileData.id 
                : typeof selectedFile.fileData?.id === 'string' && !isNaN(Number(selectedFile.fileData.id))
                  ? Number(selectedFile.fileData.id)
                  : Math.floor(Date.now() / 1000) // Använd ett numeriskt ID baserat på aktuell tid
            }
            initialUrl={selectedFile.fileUrl || ""}
            filename={selectedFile.fileData?.filename || "Dokument"}
            onClose={() => setSelectedFile(null)}
            projectId={currentProject?.id || null}
            useDatabase={false} // Använd localStorage för att säkerställa att PDF-visaren fungerar för dynamiska mappar
            file={selectedFile.file} // Lägg till filreferensen direkt
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
      
      {/* Uppladdningsdialog */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        acceptedFileTypes=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        title={`Ladda upp filer till ${folderName}`}
        description="Välj filer att ladda upp till den här mappen."
        currentProject={currentProject}
      />
    </div>
  );
}