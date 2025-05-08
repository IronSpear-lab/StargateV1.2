import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Folder, 
  File as FileIcon, 
  ChevronDown, 
  ChevronRight, 
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
  Trash
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: string;
  fileSize?: number;
  children?: FileNode[];
  selected?: boolean;
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

export function FileExplorer({ onFileSelect, selectedFileId }: FileExplorerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{id: number, name: string} | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState<Record<string, boolean>>({});
  
  const [uploadState, setUploadState] = useState<FileUploadState>({
    selectedFolder: null,
    projectId: currentProject?.id?.toString() || "", // Use current project ID
    isUploading: false,
    file: null,
    uploadProgress: 0
  });
  
  // Uppdatera projektID när current project ändras
  useEffect(() => {
    if (currentProject?.id) {
      setUploadState(prev => ({
        ...prev,
        projectId: currentProject.id.toString()
      }));
    }
  }, [currentProject?.id]);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Fetch all available projects
  const { data: projectsData } = useQuery({
    queryKey: ['/api/user-projects'],
    queryFn: async () => {
      const res = await fetch('/api/user-projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    }
  });
  
  // Fetch files
  const { 
    data: filesData, 
    isLoading: isLoadingFiles, 
    error: filesError 
  } = useQuery({
    queryKey: ['/api/files', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) {
        // Om inget projekt är valt, returnera en tom array
        return [];
      }
      
      const res = await fetch(`/api/files?projectId=${currentProject.id}`, {
        credentials: 'include'  // Säkerställ att cookies skickas med för autentisering
      });
      if (!res.ok) {
        console.warn("API call failed for files with status", res.status);
        throw new Error(`Failed to fetch files: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!currentProject?.id // Kör bara denna query om vi har ett projekt
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
        if (data.some(folder => folder.projectId !== currentProject.id)) {
          console.error("FileExplorer: VARNING: Vissa mappar tillhör inte aktuellt projekt!", 
            data.filter(folder => folder.projectId !== currentProject.id));
        }
        
        // FORCE FILTER mappar som tillhör aktuellt projekt för att vara extra säker
        const filteredData = data.filter(folder => folder.projectId === currentProject.id);
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

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include' // Säkerställ att cookies skickas med för autentisering
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
      setUploadDialogOpen(false);
      setUploadState(prev => ({ ...prev, file: null, uploadProgress: 0, isUploading: false }));
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
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
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id] });
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
    
    if (uploadState.selectedFolder) {
      // Kontrollera att vald mapp faktiskt tillhör det aktuella projektet
      const folder = foldersData?.find(f => f.id.toString() === uploadState.selectedFolder);
      
      if (folder && folder.projectId !== currentProject.id) {
        console.error(`VARNING: Vald mapp (ID ${uploadState.selectedFolder}) tillhör projekt ${folder.projectId}, inte aktuellt projekt ${currentProject.id}`);
        toast({
          title: "Felaktig mapp",
          description: "Den valda mappen tillhör ett annat projekt.",
          variant: "destructive",
        });
        setUploadState(prev => ({ ...prev, isUploading: false }));
        return;
      }
      
      formData.append('folderId', uploadState.selectedFolder);
      console.log(`Laddar upp till mapp: ${uploadState.selectedFolder}`);
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
      onSettled: () => clearInterval(interval)
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
  
  // Build file tree
  const buildFileTree = () => {
    const tree: FileNode[] = [];
    const folderMap: Record<string, FileNode> = {};
    
    // Add folders to the tree
    if (foldersData) {
      // Ytterligare en sista säkerhetskontroll - filtrera bara mappar för aktuellt projekt
      const filteredFolders = foldersData.filter(folder => {
        // Om projektid saknas eller inte matchar aktuellt projekt
        if (!folder.projectId || folder.projectId !== currentProject?.id) {
          console.error(`FileExplorer: SÄKERHETSFILTRERING - Ignorerar mapp ${folder.id} som tillhör projekt ${folder.projectId}, inte aktuellt projekt ${currentProject?.id}`);
          return false;
        }
        return true;
      });
      
      console.log(`FileExplorer: byggTree - ${filteredFolders.length} av ${foldersData.length} mappar tillhör aktuellt projekt ${currentProject?.id}`);
      
      filteredFolders.forEach((folder: any) => {
        console.log(`FileExplorer: Lägger till mapp ${folder.id} (projektID: ${folder.projectId}) i trädet`);
        
        const folderNode: FileNode = {
          id: `folder_${folder.id}`,
          name: folder.name, 
          type: 'folder',
          children: []
        };
        
        folderMap[folderNode.id] = folderNode;
        
        if (folder.parentId) {
          const parentId = `folder_${folder.parentId}`;
          if (folderMap[parentId]) {
            folderMap[parentId].children = folderMap[parentId].children || [];
            folderMap[parentId].children?.push(folderNode);
          }
        } else {
          tree.push(folderNode);
        }
      });
    }
    
    // Add files to the tree
    if (filesData) {
      // Ytterligare filtrering - bara visa filer för aktuellt projekt
      const filteredFiles = filesData.filter(file => {
        // Om projektid saknas eller inte matchar aktuellt projekt
        if (!file.projectId || file.projectId !== currentProject?.id) {
          console.error(`FileExplorer: SÄKERHETSFILTRERING - Ignorerar fil ${file.id} som tillhör projekt ${file.projectId}, inte aktuellt projekt ${currentProject?.id}`);
          return false;
        }
        return true;
      });
      
      console.log(`FileExplorer: byggTree - ${filteredFiles.length} av ${filesData.length} filer tillhör aktuellt projekt ${currentProject?.id}`);
      
      filteredFiles.forEach((file: any) => {
        console.log(`FileExplorer: Lägger till fil ${file.id} (projektID: ${file.projectId}) i trädet`);
        
        const fileNode: FileNode = {
          id: `file_${file.id}`,
          name: file.name,
          type: 'file',
          fileType: getFileExtension(file.name),
          fileSize: file.size,
          selected: `file_${file.id}` === selectedFileId
        };
        
        if (file.folderId) {
          const folderId = `folder_${file.folderId}`;
          if (folderMap[folderId]) {
            folderMap[folderId].children = folderMap[folderId].children || [];
            folderMap[folderId].children?.push(fileNode);
          } else {
            // Om mappen inte finns i trädet (kanske för att den inte tillhör rätt projekt), 
            // lägg till filen direkt i rotkatalogen
            console.warn(`FileExplorer: Fil ${file.id} tillhör mapp ${file.folderId} som inte finns i trädet, lägger i roten`);
            tree.push(fileNode);
          }
        } else {
          tree.push(fileNode);
        }
      });
    }
    
    return tree;
  };
  
  const fileTree = buildFileTree();
  
  // Handle file click
  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      onFileSelect(file);
    } else {
      setExpandedFolders(prev => ({
        ...prev,
        [file.id]: !prev[file.id]
      }));
    }
  };
  
  // Get folder options for select fields
  const getFolderOptions = () => {
    const options: {value: string, label: string}[] = [{ value: "root", label: "Root folder" }];
    
    if (!foldersData) return options;
    
    // Filtrera mappar som tillhör det aktuella projektet
    const filteredFolders = foldersData.filter((folder: any) => {
      if (folder.projectId !== currentProject?.id) {
        console.error(`getFolderOptions: Ignorerar mapp ${folder.id} från fel projekt ${folder.projectId}`);
        return false;
      }
      return true;
    });
    
    console.log(`getFolderOptions: ${filteredFolders.length} av ${foldersData.length} mappar tillhör aktuellt projekt ${currentProject?.id}`);
    
    const addFoldersToOptions = (folders: any[], depth = 0) => {
      folders.forEach((folder: any) => {
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
    addFoldersToOptions(filteredFolders.filter((f: any) => !f.parentId));
    
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
  
  // Render file tree
  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return (
      <ul className={cn(
        "space-y-1",
        level > 0 ? "pl-4 pt-1" : ""
      )}>
        {nodes.map(node => (
          <li key={node.id} className="relative">
            <div 
              className={cn(
                "flex items-center py-1 px-2 rounded-md cursor-pointer text-sm group transition-colors",
                node.selected ? "bg-primary-50 text-primary-800" : "hover:bg-neutral-100",
                node.type === 'folder' && expandedFolders[node.id] ? "font-medium" : ""
              )}
              onClick={() => handleFileClick(node)}
            >
              {node.type === 'folder' ? (
                <div className="flex-shrink-0 mr-1.5 w-4">
                  {expandedFolders[node.id] ? (
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
              
              {/* Använder en helt anpassad meny med bara en knapp för mappborttagning (enklaste lösningen) */}
              {node.type === 'folder' && user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && (
                <div 
                  className="ml-2 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const folderId = parseInt(node.id.replace('folder_', ''));
                    console.log(`Preparing to delete folder: ${node.name} with ID: ${folderId}`);
                    setFolderToDelete({ id: folderId, name: node.name });
                    setDeleteFolderDialogOpen(true);
                  }}
                >
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-red-100 cursor-pointer text-red-600">
                    <Trash className="h-3.5 w-3.5" />
                  </span>
                </div>
              )}
              
              {/* För filer visar vi bara en actions-knapp utan meny (för att undvika HTML-validering) */}
              {node.type === 'file' && (
                <div 
                  className="ml-2 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Här skulle vi kunna lägga till filspecifika åtgärder
                  }}
                >
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-neutral-100 cursor-pointer">
                    <MoreVertical className="h-3.5 w-3.5 text-neutral-500" />
                  </span>
                </div>
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
        ))}
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
              {/* Endast visa dessa knappar för project_leader och admin/superuser */}
              {user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && (
                <>
                  <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
                    <DialogTrigger asChild>
                      <span className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground gap-1 cursor-pointer text-sm">
                        <FolderPlus className="h-4 w-4" />
                        <span className="text-xs">New Folder</span>
                      </span>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                          Add a new folder to organize your files
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label htmlFor="folderName">Folder Name</Label>
                          <Input
                            id="folderName"
                            placeholder="e.g. Project Documentation"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                          />
                        </div>
                        
                        {/* Projektväljaren borttagen - vi använder alltid det aktiva projektet */}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="parentFolder">Parent Folder (Optional)</Label>
                          </div>
                          <Select
                            value={uploadState.selectedFolder || "root"}
                            onValueChange={(value) => setUploadState(prev => ({ ...prev, selectedFolder: value === "root" ? null : value }))}
                          >
                            <SelectTrigger id="parentFolder">
                              <SelectValue placeholder="Root folder" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFolderOptions().map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateFolder}
                          disabled={!newFolderName || !currentProject?.id}
                        >
                          Create Folder
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <span className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 gap-1 cursor-pointer text-sm">
                        <Upload className="h-4 w-4" />
                        <span className="text-xs">Upload</span>
                      </span>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload File</DialogTitle>
                        <DialogDescription>
                          Upload a file to your project. Supported formats include PDF, images, and documents.
                        </DialogDescription>
                      </DialogHeader>
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
                                Remove
                              </span>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
                              <p className="text-sm text-neutral-500">
                                Drag & drop a file here, or click to browse
                              </p>
                              <p className="text-xs text-neutral-400 mt-1">
                                PDF, images, and office documents up to 10MB
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
                            File size exceeds the 10MB limit
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="uploadFolder">Destination Folder</Label>
                            <span className="text-xs text-neutral-500">
                              Project: {currentProject?.name || 'Loading...'}
                            </span>
                          </div>
                          <Select
                            value={uploadState.selectedFolder || "root"}
                            onValueChange={(value) => setUploadState(prev => ({ ...prev, selectedFolder: value === "root" ? null : value }))}
                          >
                            <SelectTrigger id="uploadFolder">
                              <SelectValue placeholder="Select a folder" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFolderOptions().map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {uploadState.isUploading && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Uploading...</span>
                              <span>{uploadState.uploadProgress}%</span>
                            </div>
                            <Progress value={uploadState.uploadProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setUploadDialogOpen(false)}
                          disabled={uploadState.isUploading}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleFileUpload}
                          disabled={!uploadState.file || uploadState.isUploading || (uploadState.file && uploadState.file.size > 10 * 1024 * 1024)}
                          className="gap-1"
                        >
                          {uploadState.isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                              Upload
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                <p className="text-sm text-neutral-500">Loading files and folders...</p>
              </div>
            ) : fileTree.length === 0 ? (
              <div className="flex flex-col justify-center items-center py-8">
                <Folder className="h-12 w-12 text-neutral-300 mb-2" />
                <h3 className="text-lg font-medium text-neutral-700 mb-1">No files yet</h3>
                <p className="text-sm text-neutral-500 mb-4">Upload files or create folders to get started</p>
                <div className="flex gap-2">
                  <span 
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground gap-1 cursor-pointer text-sm"
                    onClick={() => setCreateFolderDialogOpen(true)}
                  >
                    <FolderPlus className="mr-1 h-4 w-4" />
                    New Folder
                  </span>
                  <span 
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 gap-1 cursor-pointer text-sm"
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Upload File
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
                <p className="text-sm font-medium text-neutral-700">Storage</p>
                <p className="text-xs text-primary-600 font-medium cursor-pointer">Manage</p>
              </div>
              <Progress value={72} className="h-2 mb-2" />
              <div className="flex items-center justify-between text-xs">
                <p className="text-neutral-500">7.2GB used</p>
                <p className="text-neutral-500">10GB total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Använder Dialog för att radera mappar (förenklad implementation) */}
      <Dialog open={deleteFolderDialogOpen} onOpenChange={(open) => {
        setDeleteFolderDialogOpen(open);
        if (!open) {
          setFolderToDelete(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera mapp</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera mappen "{folderToDelete?.name}" och allt dess innehåll? Denna åtgärd kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded mb-4 mt-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Alla filer och undermappar kommer att raderas permanent.</span>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                console.log("Avbryter borttagning av mapp");
                setDeleteFolderDialogOpen(false);
                setFolderToDelete(null);
              }}
            >
              Avbryt
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (folderToDelete) {
                  console.log(`Executing delete for folder ID: ${folderToDelete.id}`);
                  deleteFolderMutation.mutate(folderToDelete.id);
                  setDeleteFolderDialogOpen(false);
                  setFolderToDelete(null);
                }
              }}
              disabled={deleteFolderMutation.isPending}
            >
              {deleteFolderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Raderar...</span>
                </>
              ) : (
                <span>Radera mapp</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}