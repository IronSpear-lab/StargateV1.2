import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  File, 
  Archive, 
  Table, 
  Image, 
  FileText as FilePdf, 
  Download, 
  AlertCircle, 
  FolderOpen 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  path?: string;
  downloadUrl?: string;
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
      // Simulate API call - in real implementation, replace with actual API call
      try {
        const response = await fetch(`/api/files${projectId ? `?projectId=${projectId}` : ''}`);
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching files:", error);
        return [];
      }
    }
  });
  
  // Format file size
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };
  
  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    if (type.includes('pdf')) {
      return <FilePdf className="h-4 w-4 text-red-500" />;
    } else if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return <Image className="h-4 w-4 text-purple-500" />;
    } else if (type.includes('excel') || type.includes('spreadsheet') || type.includes('csv') || type.includes('xls')) {
      return <Table className="h-4 w-4 text-green-600" />;
    } else if (type.includes('zip') || type.includes('archive') || type.includes('compressed')) {
      return <Archive className="h-4 w-4 text-amber-500" />;
    } else if (type.includes('text') || type.includes('doc') || type.includes('word')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    } else {
      return <File className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Handle file click (open file)
  const handleFileClick = (file: FileItem) => {
    // In real implementation, open file viewer
    console.log(`Opening file: ${file.name}`);
  };
  
  // Handle file download
  const handleDownload = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation();
    // In real implementation, trigger file download
    console.log(`Downloading file: ${file.name}`);
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
          View All
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
            {files.slice(0, limit).map((file: FileItem) => (
              <div key={file.id}>
                <div 
                  className="flex items-center py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => handleFileClick(file)}
                >
                  {getFileIcon(file.type)}
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                    <div className="flex items-center mt-0.5">
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="text-gray-300 mx-1.5">•</span>
                      <span className="text-xs text-gray-500">
                        {format(parseISO(file.uploadDate), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-blue-50 opacity-0 group-hover:opacity-100"
                    onClick={(e) => handleDownload(e, file)}
                  >
                    <Download className="h-3.5 w-3.5 text-blue-500" />
                  </Button>
                </div>
                <Separator className="my-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
            <h3 className="text-sm font-medium text-gray-600">No files found</h3>
            <p className="text-xs text-gray-500 mt-1">There are no files in this project yet.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}