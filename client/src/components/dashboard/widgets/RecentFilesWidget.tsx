import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  AlertCircle, 
  Calendar, 
  ChevronRight, 
  File, 
  FileText, 
  FolderOpen,
  Image,
  Music,
  Table,
  Video,
  FileArchive as Archive
} from "lucide-react";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";

interface File {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  lastModified: string;
  folder: string;
  uploadedBy: string;
  uploadedById: string;
  fileId?: string; // ID för att referera till filen i file-utils lagringen
}

interface RecentFilesWidgetProps {
  limit?: number;
  projectId?: number;
}

export function RecentFilesWidget({ limit = 5, projectId }: RecentFilesWidgetProps) {
  // Hämta PDF-dialog hook på toppnivån
  const { showPDFDialog } = usePDFDialog();
  
  // Fetch recent files from API & localStorage
  const { data: files, isLoading } = useQuery({
    queryKey: ['recent-files', projectId],
    queryFn: async () => {
      // Om projektId är 0 eller undefined, vilket motsvarar "No Project" eller när användaren inte har behörighet till något projekt,
      // returnera en tom lista istället för att visa mockdata
      if (!projectId || projectId === 0) {
        console.log("No active project or 'No Project' selected - skipping file loading");
        return [];
      }
      
      console.log(`Laddar filer för projekt ${projectId}`);
      
      const allFiles: File[] = [];
      
      // 1. Först hämta alla uppladdade filer från ritningar-sidan via localStorage
      const savedRitningar = localStorage.getItem('saved_ritningar');
      if (savedRitningar) {
        try {
          const ritningar = JSON.parse(savedRitningar);
          console.log("Ritningar från localStorage:", ritningar);
          
          // Filtrera bara de ritningar som tillhör det aktuella projektet
          ritningar.forEach((ritning: any) => {
            if (ritning.filename && ritning.projectId === projectId) {
              allFiles.push({
                id: ritning.id.toString(),
                name: ritning.filename,
                fileType: "pdf",
                fileSize: 2450000, // Uppskattat storlek
                lastModified: new Date().toISOString(),
                folder: "Ritningar",
                uploadedBy: ritning.uploadedBy || "Du",
                uploadedById: "currentUser",
                fileId: ritning.fileId // För att kunna öppna filen direkt
              });
            }
          });
          console.log(`Hittade ${allFiles.length} ritningar i localStorage för projektId=${projectId}`);
        } catch (error) {
          console.error('Failed to parse saved ritningar:', error);
        }
      } else {
        console.log("Inga sparade ritningar hittades i localStorage");
      }
      
      // 2. Hämta filer från API:et för det aktuella projektet
      try {
        // Hämta alla filer för projektet från API:et
        console.log(`Anropar API: /api/files/recent?projectId=${projectId}`);
        
        const response = await fetch(`/api/files/recent?projectId=${projectId}`);
        console.log("API-svar status:", response.status);
        
        if (response.ok) {
          const recentFilesFromAPI = await response.json();
          console.log("API-svar innehåll:", recentFilesFromAPI);
          
          if (Array.isArray(recentFilesFromAPI) && recentFilesFromAPI.length > 0) {
            // Lägg till API-filerna i vår lista
            allFiles.push(...recentFilesFromAPI);
            console.log(`Successfully loaded ${recentFilesFromAPI.length} files from API`);
          } else {
            console.log("API returnerade ingen eller tom array");
          }
        } else {
          console.warn(`API call failed for files with status ${response.status}`);
          const errorText = await response.text();
          console.warn("API error response:", errorText);
        }
      } catch (error) {
        console.error("Error fetching recent files from API:", error);
      }
      
      // 3. Sortera alla filer efter uppladdningsdatum (senaste först)
      allFiles.sort((a, b) => {
        const dateA = new Date(a.lastModified).getTime();
        const dateB = new Date(b.lastModified).getTime();
        return dateB - dateA; // Fallande ordning (senaste först)
      });
      
      console.log(`Totalt antal filer att visa: ${allFiles.length}`);
      if (allFiles.length > 0) {
        console.log("Första filen:", allFiles[0]);
      }
      
      return allFiles;
    },
    // Uppdatera widgeten automatiskt efter 5 sekunder för att fånga nya filer
    refetchInterval: 5000
  });

  // Format file size to human readable format
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    const iconClasses = "h-4 w-4";
    
    switch(fileType.toLowerCase()) {
      case 'pdf':
        return <File className={cn(iconClasses, "text-[#fa5c7c]")} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return <Image className={cn(iconClasses, "text-[#0acf97]")} />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <Table className={cn(iconClasses, "text-[#727cf5]")} />;
      case 'doc':
      case 'docx':
      case 'txt':
        return <FileText className={cn(iconClasses, "text-[#727cf5]")} />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <Music className={cn(iconClasses, "text-[#ffc35a]")} />;
      case 'mp4':
      case 'avi':
      case 'mov':
        return <Video className={cn(iconClasses, "text-[#fa5c7c]")} />;
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className={cn(iconClasses, "text-[#ffc35a]")} />;
      default:
        return <FileText className={cn(iconClasses, "text-gray-500")} />;
    }
  };

  // Get file type style for badge
  const getFileTypeStyle = (fileType: string) => {
    switch(fileType.toLowerCase()) {
      case 'pdf':
        return "bg-[#fa5c7c]/10 text-[#fa5c7c] border-[#fa5c7c]/20 dark:bg-[#fa5c7c]/20 dark:border-[#fa5c7c]/30";
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return "bg-[#0acf97]/10 text-[#0acf97] border-[#0acf97]/20 dark:bg-[#0acf97]/20 dark:border-[#0acf97]/30";
      case 'xlsx':
      case 'xls':
      case 'csv':
        return "bg-[#727cf5]/10 text-[#727cf5] border-[#727cf5]/20 dark:bg-[#727cf5]/20 dark:border-[#727cf5]/30";
      case 'doc':
      case 'docx':
      case 'txt':
        return "bg-[#727cf5]/10 text-[#727cf5] border-[#727cf5]/20 dark:bg-[#727cf5]/20 dark:border-[#727cf5]/30";
      case 'mp3':
      case 'wav':
      case 'ogg':
        return "bg-[#ffc35a]/10 text-[#ffc35a] border-[#ffc35a]/20 dark:bg-[#ffc35a]/20 dark:border-[#ffc35a]/30";
      case 'mp4':
      case 'avi':
      case 'mov':
        return "bg-[#fa5c7c]/10 text-[#fa5c7c] border-[#fa5c7c]/20 dark:bg-[#fa5c7c]/20 dark:border-[#fa5c7c]/30";
      case 'zip':
      case 'rar':
      case '7z':
        return "bg-[#ffc35a]/10 text-[#ffc35a] border-[#ffc35a]/20 dark:bg-[#ffc35a]/20 dark:border-[#ffc35a]/30";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <FolderOpen className="h-4 w-4 text-[#727cf5]" />
          <span className="text-gray-600 dark:text-gray-400">Senaste filer i Arkivet</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-blue-600 dark:text-blue-400 text-xs font-normal"
          onClick={() => window.location.href = "/vault"}
        >
          Visa Arkivet
        </Button>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading files...</span>
          </div>
        ) : files && files.length > 0 ? (
          <div className="space-y-1">
            {files.slice(0, limit).map((file: File) => (
              <div key={file.id}>
                <div 
                  className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
                  onClick={() => {
                    // Hantera klick på olika typer av filer med PDF-dialog för PDF-filer
                    if (file.fileType.toLowerCase() === "pdf" && file.fileId) {
                      // Om PDF har filID, använd PDF-dialog istället för navigering
                      showPDFDialog({
                        versionId: Number(file.fileId),
                        filename: file.name
                      });
                    } else if (file.folder === "Ritningar" && file.fileType.toLowerCase() === "pdf") {
                      // Utan filID, visa ett fel eller navigera till ritningar-sidan
                      window.location.href = "/ritningar";
                    } else {
                      // Alla andra filer går till vault
                      window.location.href = "/vault";
                    }
                  }}
                >
                  <div className="mr-3 mt-1">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-100 truncate">{file.name}</div>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getFileTypeStyle(file.fileType))}>
                        {file.fileType.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="mt-1 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <span className="truncate">{formatFileSize(file.fileSize)}</span>
                        <span className="mx-1.5">•</span>
                        <span className="truncate">{file.folder}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(parseISO(file.lastModified), "MMM d, HH:mm")}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                </div>
                <Separator className="my-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <FolderOpen className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Inga senaste filer</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Det finns inga senaste filer i arkivet.
              <Button 
                variant="link" 
                className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400 ml-1"
                onClick={() => window.location.href = "/ritningar"}
              >
                Ladda upp en fil
              </Button>
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}