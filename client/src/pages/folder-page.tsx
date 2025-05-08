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

// Interface för dokument i en mapp
interface FolderDocument {
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

export default function FolderPage() {
  // Hämta mappnamnet från URL:en
  const params = useParams<{ folderName: string }>();
  const folderName = params.folderName || "Mapp";
  
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("uploaded");
  const [sortDirection, setSortDirection] = useState("desc");
  const [versionFilter, setVersionFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FolderDocument | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Använd localStorage med projektisolering och mappisolering
  const getStorageKey = () => {
    return currentProject ? `project_${currentProject.id}_folder_${folderName.toLowerCase()}` : `no_project_folder_${folderName.toLowerCase()}`;
  };
  
  // Hämta sparade filer från localStorage om de finns, annars tom lista
  const [folderData, setFolderData] = useState<FolderDocument[]>(() => {
    const savedFolderData = localStorage.getItem(getStorageKey());
    return savedFolderData ? JSON.parse(savedFolderData) : [];
  });
  
  const [selectedFile, setSelectedFile] = useState<{
    file: File | null;
    fileUrl?: string;
    fileData?: {
      filename: string;
      version: string;
      description: string;
      uploaded: string;
      uploadedBy: string;
    };
  } | null>(null);
  
  // Uppdatera filer när projektet ändras
  useEffect(() => {
    const savedData = localStorage.getItem(getStorageKey());
    setFolderData(savedData ? JSON.parse(savedData) : []);
  }, [currentProject, folderName]);
  
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
            
            // Hitta fildatan för den här filen om den finns
            const matchingFile = folderData.find(f => f.fileId === fileIdParam);
            
            setSelectedFile({
              file: storedFileData.file,
              fileUrl: storedFileData.url,
              fileData: matchingFile ? {
                filename: matchingFile.filename,
                version: matchingFile.version,
                description: matchingFile.description,
                uploaded: matchingFile.uploaded,
                uploadedBy: matchingFile.uploadedBy
              } : {
                // Standardvärden om vi inte hittar matchande fildata
                filename: storedFileData.name,
                version: "1",
                description: "Uppladdad fil",
                uploaded: new Date().toLocaleString(),
                uploadedBy: "Du"
              }
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
  }, [folderData]);
  
  // Hämta filer från databasen baserat på projekt-ID och mappnamn
  const { data: apiFiles = [], isLoading: isLoadingApi } = useQuery({
    queryKey: ['/api/files', currentProject?.id, folderName],
    queryFn: async () => {
      if (!currentProject) return [];
      try {
        const response = await fetch(`/api/files?projectId=${currentProject.id}&folder=${encodeURIComponent(folderName)}`);
        if (!response.ok) throw new Error('Failed to fetch files');
        const files = await response.json();
        
        // Transformera API-svaret till FolderDocument-format
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
        console.error(`Error fetching ${folderName} files:`, error);
        return [];
      }
    },
    enabled: !!currentProject,
  });

  // Slå ihop lokalt sparade filer och API-data
  // Vi prioriterar API-data om samma fil finns i båda källorna (baserat på ID)
  const files = React.useMemo(() => {
    let result = [];
    
    if (apiFiles.length > 0) {
      // Om vi har data från API, använd främst den
      const apiFilesMap = new Map(apiFiles.map(f => [f.id, f]));
      
      // Filtrera lokala filer som inte redan finns i API-data
      const uniqueLocalFiles = folderData.filter(
        local => !apiFilesMap.has(local.id) && 
                 local.projectId === currentProject?.id
      );
      
      result = [...apiFiles, ...uniqueLocalFiles];
    } else {
      // Om vi inte har någon API-data, använd bara lokala filer
      result = folderData.filter(f => f.projectId === currentProject?.id);
    }
    
    // Sortera filer efter datum, med nyast först
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
  }, [apiFiles, folderData, currentProject]);
  
  const isLoading = isLoadingApi;

  const filteredFiles = files.filter(file => 
    file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(file => 
    versionFilter === "all" || file.version === versionFilter
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
      formData.append('folder', folderName); // Lägg till mappnamnet
      
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
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id, folderName] });
      
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
        description: `Uppladdad till ${folderName}`
      });
    });
    
    // Stäng uppladdningsdialogen efter att ha startat uppladdningar
    setShowUploadDialog(false);
  };
  
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
      
      return fileId;
    },
    onSuccess: (fileId) => {
      // Invalidera queryn för att uppdatera listan med filer
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id, folderName] });
      
      // För lokala filer som inte finns i databasen
      if (fileToDelete) {
        const newFolderData = folderData.filter(file => file.id !== fileToDelete.id);
        setFolderData(newFolderData);
        localStorage.setItem(getStorageKey(), JSON.stringify(newFolderData));
      }
      
      toast({
        title: "Fil borttagen",
        description: "Filen har tagits bort permanent.",
        variant: "default",
      });
      
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
      setShowDeleteConfirm(false);
    }
  });

  const confirmDelete = () => {
    if (fileToDelete && fileToDelete.id) {
      deleteFileMutation.mutate(fileToDelete.id);
    }
  };
  
  // Hantera åpning av PDF-fil
  const handleOpenPDF = async (file: FolderDocument) => {
    try {
      let fileUrl: string | undefined = undefined;
      
      // Om vi har ett fileId, försök hämta filen från localStorage
      if (file.fileId) {
        const storedFile = await getStoredFileAsync(file.fileId);
        if (storedFile) {
          fileUrl = storedFile.url;
        }
      }
      
      // Om vi inte hittade en lokal fil, försök hämta från API
      if (!fileUrl && currentProject) {
        fileUrl = `/api/files/${file.id}/content`;
      }
      
      if (fileUrl) {
        setSelectedFile({
          file: null,
          fileUrl,
          fileData: {
            filename: file.filename,
            version: file.version,
            description: file.description,
            uploaded: file.uploaded,
            uploadedBy: file.uploadedBy
          }
        });
      } else {
        toast({
          title: "Kunde inte hitta filen",
          description: "Filen du försöker visa finns inte längre tillgänglig.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Fel vid öppning av PDF:', error);
      toast({
        title: "Fel vid öppning av fil",
        description: "Ett fel uppstod när filen skulle öppnas. Försök igen senare.",
        variant: "destructive",
      });
    }
  };
  
  // Få unika versionsnummer för filtrering
  const uniqueVersions = React.useMemo(() => {
    const versions = new Set<string>();
    files.forEach(file => versions.add(file.version));
    return Array.from(versions).sort();
  }, [files]);
  
  return (
    <div className="flex min-h-screen bg-white dark:bg-background">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`flex flex-col flex-1 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'}`}>
        <Header title={`${folderName}`} />
        
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Home className="h-4 w-4 mr-1" />
                <span className="mx-1">/</span>
                <span className="font-medium">Vault</span>
                <span className="mx-1">/</span>
                <span className="font-medium">Files</span>
                <span className="mx-1">/</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{folderName}</span>
              </div>
              
              <div className="flex w-full md:w-auto justify-between md:justify-end space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowUploadDialog(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Ladda upp</span>
                </Button>
              </div>
            </div>
            
            <div className="bg-white dark:bg-card border border-border rounded-lg shadow-sm">
              <div className="p-4 border-b border-border">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Sök efter filer..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={versionFilter}
                      onValueChange={setVersionFilter}
                    >
                      <SelectTrigger className="max-w-[180px]">
                        <SelectValue placeholder="Välj version" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla versioner</SelectItem>
                        {uniqueVersions.map(version => (
                          <SelectItem key={version} value={version}>Version {version}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Nr</TableHead>
                      <TableHead>Filnamn</TableHead>
                      <TableHead>Beskrivning</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Uppladdad</TableHead>
                      <TableHead>Uppladdad av</TableHead>
                      <TableHead className="text-right">Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                            <span>Laddar filer...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Inga filer hittades.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFiles.map((file) => (
                        <TableRow key={`${file.id}-${file.filename}`}>
                          <TableCell className="font-mono text-xs">{file.number}</TableCell>
                          <TableCell className="font-medium">
                            <div 
                              className="flex items-center hover:text-primary cursor-pointer"
                              onClick={() => handleOpenPDF(file)}
                            >
                              <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                              {file.filename}
                            </div>
                          </TableCell>
                          <TableCell>{file.description}</TableCell>
                          <TableCell>{file.version}</TableCell>
                          <TableCell>{file.uploaded}</TableCell>
                          <TableCell>{file.uploadedBy}</TableCell>
                          <TableCell className="text-right">
                            <AlertDialog open={showDeleteConfirm && fileToDelete?.id === file.id} onOpenChange={setShowDeleteConfirm}>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setFileToDelete(file);
                                    setShowDeleteConfirm(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Ta bort fil</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Är du säker på att du vill ta bort filen "{file.filename}"? 
                                    Denna åtgärd kan inte ångras.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={confirmDelete}
                                  >
                                    Ta bort
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Uppladdningsdialog */}
      <UploadDialog 
        open={showUploadDialog} 
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        acceptedFileTypes={["application/pdf", ".pdf"]}
        title={`Ladda upp dokument till ${folderName}`}
        description="Välj PDF-filer som du vill ladda upp. Du kan välja flera filer samtidigt."
        currentProject={currentProject}
      />
      
      {/* PDF Viewer Dialog */}
      {selectedFile && (
        <PDFViewerDialog 
          open={!!selectedFile} 
          onOpenChange={(open) => !open && setSelectedFile(null)}
        >
          <div className="w-full h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-muted border-b">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedFile.fileData?.filename || "PDF Dokument"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedFile.fileData?.description || "Ingen beskrivning"} • 
                  Version {selectedFile.fileData?.version || "1"} • 
                  Uppladdad {selectedFile.fileData?.uploaded || "okänt datum"} av {selectedFile.fileData?.uploadedBy || "okänd användare"}
                </p>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {selectedFile.fileUrl && (
                <EnhancedPDFViewer 
                  fileUrl={selectedFile.fileUrl} 
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </PDFViewerDialog>
      )}
    </div>
  );
}