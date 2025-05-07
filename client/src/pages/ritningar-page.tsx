import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FileText, Search, Plus, Upload, ChevronRight, Home, Loader2 } from "lucide-react";
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
import { PDFViewerDialog } from "@/components/ui/pdf-viewer-dialog";
import EnhancedPDFViewer from "@/components/EnhancedPDFViewer";
import { 
  storeFiles, 
  getUploadedFileUrl, 
  getStoredFile, 
  getStoredFileAsync, 
  getStoredFileUrlAsync 
} from "@/lib/file-utils";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { UploadDialog } from "@/components/UploadDialog";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";

// Tomma dokument som standard - alla dokument som laddas upp tillhör ett specifikt projekt
const emptyDocs = [];

// Utöka dokumenten med ett fileId-fält för att hålla reda på uppladdade filer
interface Dokument {
  id: number;
  filename: string;
  version: string;
  description: string;
  uploaded: string;
  uploadedBy: string;
  number: string;
  status: string;
  annat: string;
  fileId?: string; // Används för att hålla reda på PDF-filer för uppladdade dokument
  projectId?: number; // ID till det projekt dokumentet tillhör
}

export default function RitningarPage() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("uploaded");
  const [sortDirection, setSortDirection] = useState("desc");
  const [versionFilter, setVersionFilter] = useState("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Använd localStorage med projektisolering - separate storage per project
  const getStorageKey = () => {
    return currentProject ? `project_${currentProject.id}_ritningar` : 'no_project_ritningar';
  };
  
  // Hämta sparade dokument från localStorage om de finns, annars använd tomma dokument
  const [dokumentData, setDokumentData] = useState<Dokument[]>(() => {
    const savedDokument = localStorage.getItem(getStorageKey());
    return savedDokument ? JSON.parse(savedDokument) : [];
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
  
  // Uppdatera dokument när projektet ändras
  useEffect(() => {
    const savedDokument = localStorage.getItem(getStorageKey());
    setDokumentData(savedDokument ? JSON.parse(savedDokument) : []);
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
            
            setSelectedFile({
              file: storedFileData.file,
              fileUrl: storedFileData.url,
              fileData: matchingRitning ? {
                filename: matchingRitning.filename,
                version: matchingRitning.version,
                description: matchingRitning.description,
                uploaded: matchingRitning.uploaded,
                uploadedBy: matchingRitning.uploadedBy
              } : {
                // Standardvärden om vi inte hittar matchande ritningsdata
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
  }, [ritningarData]);
  
  // I framtiden skulle vi hämta ritningar från databasen baserat på projekt-ID
  // Detta skulle använda ett API-anrop: `/api/files?projectId=${currentProject?.id}`
  const { data: apiRitningar = [], isLoading: isLoadingApi } = useQuery({
    queryKey: ['/api/files', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return [];
      try {
        const response = await fetch(`/api/files?projectId=${currentProject.id}`);
        if (!response.ok) throw new Error('Failed to fetch files');
        return await response.json();
      } catch (error) {
        console.error('Error fetching project files:', error);
        return [];
      }
    },
    enabled: !!currentProject,
  });

  // Använd lokalt sparade ritningar + API data
  const ritningar = ritningarData;
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
    
    // I en riktig implementering skulle vi skicka filerna till en API-endpoint
    console.log("Uppladdade filer:", files);
    
    // Lagra filerna och spara deras ID:n för senare användning
    const fileIds = storeFiles(files);
    
    // Lägg till de uppladdade filerna i listan
    const now = new Date();
    const timeString = `${now.getDate()} ${['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][now.getMonth()]} ${now.getFullYear()}, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newRitningar = files.map((file, index) => ({
      id: ritningarData.length + index + 1,
      filename: file.name,
      version: "1", // Ny fil får version 1
      description: "Ny uppladdad fil", 
      uploaded: timeString,
      uploadedBy: "Du",
      number: `${ritningarData.length + index + 1}`.padStart(3, '0'),
      status: "Active",
      annat: "PDF",
      fileId: fileIds[index], // Spara ID:t från fillagringen
      projectId: currentProject.id // Koppla ritningen till det aktuella projektet
    }));
    
    // Uppdatera listan med ritningar
    const updatedRitningar = [...newRitningar, ...ritningarData];
    setRitningarData(updatedRitningar);
    
    // Spara till localStorage så att det finns kvar mellan sessioner
    localStorage.setItem(getStorageKey(), JSON.stringify(updatedRitningar));
    
    // Visa bekräftelse
    setTimeout(() => {
      toast({
        title: "Filer uppladdade",
        description: `${files.length} fil(er) har laddats upp framgångsrikt.`,
        variant: "default",
      });
    }, 300);
  };
  
  // Öppna PDF-visaren när användaren klickar på en fil
  const handleFileClick = async (ritning: Ritning) => {
    // För uppladdade filer, använd den lagrade filen
    if (ritning.fileId && ritning.fileId.startsWith('file_')) {
      try {
        // Använd asynkron version för att hämta från persistent lagring om det behövs
        const storedFileData = await getStoredFileAsync(ritning.fileId);
        
        if (storedFileData) {
          console.log(`[${Date.now()}] Successfully loaded file from storage for viewing: ${ritning.fileId}`);
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
        } else {
          console.error(`[${Date.now()}] Could not find stored file with ID: ${ritning.fileId}`);
          toast({
            title: "Kunde inte hitta filen",
            description: "Den uppladdade filen finns inte längre tillgänglig.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(`[${Date.now()}] Error loading file with ID ${ritning.fileId}:`, error);
        toast({
          title: "Fel vid laddning av fil",
          description: "Ett fel uppstod när filen skulle laddas. Försök igen senare.",
          variant: "destructive",
        });
      }
    }
    
    // För befintliga/mock-filer, använd exempelfilen
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
        <Header title="Dokument" onToggleSidebar={toggleSidebar} />
        
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
            <span className="font-semibold">Dokument</span>
          </div>
          
          {!currentProject && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-md p-4 mb-6">
              <h3 className="text-amber-800 dark:text-amber-300 font-medium text-lg mb-2">Inget aktivt projekt</h3>
              <p className="text-amber-700 dark:text-amber-400">
                Du behöver välja ett projekt för att kunna se och hantera dokument. 
                Använd projektväljaren i toppen av sidan för att välja projekt.
              </p>
            </div>
          )}
        
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Dokument</h1>
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
                isOpen={showUploadDialog} 
                onClose={() => setShowUploadDialog(false)}
                onUpload={handleUpload}
              />
            </div>
          </div>

          <div className="bg-background rounded-lg shadow border border-border">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-medium text-foreground">Sök efter dokument</h2>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Laddar...</TableCell>
                    </TableRow>
                  ) : filteredRitningar.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">Inga dokument hittades</TableCell>
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
            fileId={(selectedFile.fileData as any)?.fileId || `file_${Date.now()}`}
            initialUrl={selectedFile.fileUrl || ""}
            filename={selectedFile.fileData?.filename || "Dokument"}
            onClose={() => setSelectedFile(null)}
          />
        </div>
      )}
    </div>
  );
}