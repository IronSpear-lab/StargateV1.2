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
  // Removed dialog state variables since we're using window.confirm now
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
      const folder = foldersData?.find((f: FolderData) => f.id.toString() === uploadState.selectedFolder);
      
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

  // Build file tree with support for unlimited nesting
  const buildFileTree = () => {
    const tree: FileNode[] = [];
    const folderMap: Record<string, FileNode> = {};
    
    // Add folders to the tree
    if (foldersData) {
      // Säkerhetskontroll - filtrera bara mappar för aktuellt projekt
      const filteredFolders = foldersData.filter((folder: FolderData) => {
        if (!folder.projectId || folder.projectId !== currentProject?.id) {
          console.error(`FileExplorer: SÄKERHETSFILTRERING - Ignorerar mapp ${folder.id} som tillhör projekt ${folder.projectId}, inte aktuellt projekt ${currentProject?.id}`);
          return false;
        }
        return true;
      });
      
      console.log(`FileExplorer: byggTree - ${filteredFolders.length} av ${foldersData.length} mappar tillhör aktuellt projekt ${currentProject?.id}`);
      
      // Steg 1: Skapa alla mappnoder först så att alla har en referens i folderMap
      filteredFolders.forEach((folder: FolderData) => {
        console.log(`FileExplorer: Skapar mappnod ${folder.id} (projektID: ${folder.projectId})`);
        
        const folderNode: FileNode = {
          id: `folder_${folder.id}`,
          name: folder.name, 
          type: 'folder',
          children: []
        };
        
        folderMap[folderNode.id] = folderNode;
      });
      
      // Steg 2: Bygg trädstrukturen genom att lägga till mappar på rätt ställe baserat på parent-child relationer
      filteredFolders.forEach((folder: FolderData) => {
        console.log(`FileExplorer: Placerar mapp ${folder.id} i trädstrukturen (parentId: ${folder.parentId || 'null'})`);
        
        if (folder.parentId) {
          const parentId = `folder_${folder.parentId}`;
          // Kontrollera att föräldern existerar i folderMap (som skapades i steg 1)
          if (folderMap[parentId]) {
            folderMap[parentId].children = folderMap[parentId].children || [];
            folderMap[parentId].children?.push(folderMap[`folder_${folder.id}`]);
          } else {
            // Om föräldern saknas, lägg mappen i rotnivån och logga varning
            console.warn(`FileExplorer: Föräldermapp ${folder.parentId} hittades inte, lägger till mapp ${folder.id} i rotnivån`);
            tree.push(folderMap[`folder_${folder.id}`]);
          }
        } else {
          // Ingen förälder, detta är en rotmapp
          tree.push(folderMap[`folder_${folder.id}`]);
        }
      });
    }
    
    // Add files to the tree
    if (filesData) {
      // Ytterligare filtrering - bara visa filer för aktuellt projekt
      const filteredFiles = filesData.filter((file: FileData) => {
        // Om projektid saknas eller inte matchar aktuellt projekt
        if (!file.projectId || file.projectId !== currentProject?.id) {
          console.error(`FileExplorer: SÄKERHETSFILTRERING - Ignorerar fil ${file.id} som tillhör projekt ${file.projectId}, inte aktuellt projekt ${currentProject?.id}`);
          return false;
        }
        return true;
      });
      
      console.log(`FileExplorer: byggTree - ${filteredFiles.length} av ${filesData.length} filer tillhör aktuellt projekt ${currentProject?.id}`);
      
      filteredFiles.forEach((file: FileData) => {
        console.log(`FileExplorer: Lägger till fil ${file.id} (projektID: ${file.projectId}, mappID: ${file.folderId || 'ingen'}) i trädet`);
        
        const fileNode: FileNode = {
          id: `file_${file.id}`,
          name: file.name,
          type: 'file',
          fileType: getFileExtension(file.name),
          fileSize: file.size,
          selected: `file_${file.id}` === selectedFileId
        };
        
        // Kontrollera att filen har en mappID och endast lägg till i den specifika mappen
        if (file.folderId) {
          const folderId = `folder_${file.folderId}`;
          if (folderMap[folderId]) {
            // Endast lägg till i den specifika mappen som anges av folderId
            folderMap[folderId].children = folderMap[folderId].children || [];
            folderMap[folderId].children?.push(fileNode);
            console.log(`FileExplorer: Fil ${file.id} tillhör mapp ${file.folderId} och har lagts till i den mappen`);
          } else {
            // Mappen som anges i folderId finns inte i trädet, lägg filen i rotnivån
            console.warn(`FileExplorer: Fil ${file.id} tillhör mapp ${file.folderId} som inte finns i trädet, lägger i roten`);
            tree.push(fileNode);
          }
        } else {
          // Filer utan mappID läggs direkt i rotnivån
          console.log(`FileExplorer: Fil ${file.id} har ingen mappID, lägger i rotnivån`);
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
              
              {/* Ta bort radera-knappen helt eftersom vi skapar en widget för detta istället */}
              
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
                            <Label htmlFor="uploadFolder">Målmapp</Label>
                            <span className="text-xs text-neutral-500">
                              Projekt: {currentProject?.name || 'Laddar...'}
                            </span>
                          </div>
                          <Select
                            value={uploadState.selectedFolder || "root"}
                            onValueChange={(value) => setUploadState(prev => ({ ...prev, selectedFolder: value === "root" ? null : value }))}
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