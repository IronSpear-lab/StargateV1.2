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

interface File {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  lastModified: string;
  folder: string;
  uploadedBy: string;
  uploadedById: string;
}

interface RecentFilesWidgetProps {
  limit?: number;
  projectId?: number;
}

export function RecentFilesWidget({ limit = 5, projectId }: RecentFilesWidgetProps) {
  // Fetch recent files from API
  const { data: files, isLoading } = useQuery({
    queryKey: ['recent-files', projectId],
    queryFn: async () => {
      // In real implementation, fetch from API
      try {
        const response = await fetch(`/api/files/recent${projectId ? `?projectId=${projectId}` : ''}`);
        if (!response.ok) {
          // Return sample data for demonstration
          return [
            {
              id: "1",
              name: "Project Requirements.pdf",
              fileType: "pdf",
              fileSize: 2450000,
              lastModified: new Date(new Date().setHours(new Date().getHours() - 2)).toISOString(),
              folder: "Documentation",
              uploadedBy: "Alex Johnson",
              uploadedById: "user1",
            },
            {
              id: "2",
              name: "Marketing Assets.zip",
              fileType: "zip",
              fileSize: 15200000,
              lastModified: new Date(new Date().setHours(new Date().getHours() - 5)).toISOString(),
              folder: "Assets",
              uploadedBy: "Morgan Smith",
              uploadedById: "user2",
            },
            {
              id: "3",
              name: "Q2 Financial Report.xlsx",
              fileType: "xlsx",
              fileSize: 1800000,
              lastModified: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
              folder: "Finance",
              uploadedBy: "Jamie Watson",
              uploadedById: "user3",
            },
            {
              id: "4",
              name: "UI Design Mockups.png",
              fileType: "png",
              fileSize: 4300000,
              lastModified: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
              folder: "Design",
              uploadedBy: "Alex Johnson",
              uploadedById: "user1",
            }
          ] as File[];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching recent files:", error);
        return [];
      }
    }
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
        return "bg-[#fa5c7c]/10 text-[#fa5c7c] border-[#fa5c7c]/20";
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return "bg-[#0acf97]/10 text-[#0acf97] border-[#0acf97]/20";
      case 'xlsx':
      case 'xls':
      case 'csv':
        return "bg-[#727cf5]/10 text-[#727cf5] border-[#727cf5]/20";
      case 'doc':
      case 'docx':
      case 'txt':
        return "bg-[#727cf5]/10 text-[#727cf5] border-[#727cf5]/20";
      case 'mp3':
      case 'wav':
      case 'ogg':
        return "bg-[#ffc35a]/10 text-[#ffc35a] border-[#ffc35a]/20";
      case 'mp4':
      case 'avi':
      case 'mov':
        return "bg-[#fa5c7c]/10 text-[#fa5c7c] border-[#fa5c7c]/20";
      case 'zip':
      case 'rar':
      case '7z':
        return "bg-[#ffc35a]/10 text-[#ffc35a] border-[#ffc35a]/20";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <FolderOpen className="h-4 w-4 text-blue-500" />
          <span>Recent Files in Vault</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-blue-600 text-xs font-normal"
        >
          View Vault
        </Button>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500">Loading files...</span>
          </div>
        ) : files && files.length > 0 ? (
          <div className="space-y-1">
            {files.slice(0, limit).map((file: File) => (
              <div key={file.id}>
                <div className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="mr-3 mt-1">
                    <File className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getFileTypeStyle(file.fileType))}>
                        {file.fileType.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="mt-1 flex justify-between items-center text-xs text-gray-500">
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
                  <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                </div>
                <Separator className="my-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <FolderOpen className="h-8 w-8 text-gray-300 mb-2" />
            <h3 className="text-sm font-medium text-gray-600">No recent files</h3>
            <p className="text-xs text-gray-500 mt-1">
              There are no recent files in the vault.
              <Button variant="link" className="h-auto p-0 text-xs text-blue-600">
                Upload a file
              </Button>
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}