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
    error: foldersError
  } = useQuery({
    queryKey: ['/api/folders', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) {
        // Om inget projekt är valt, returnera en tom array
        return [];
      }
      
      const res = await fetch(`/api/folders?projectId=${currentProject.id}`, {
        credentials: 'include'  // Säkerställ att cookies skickas med för autentisering
      });
      if (!res.ok) {
        console.warn("API call failed for folders with status", res.status);
        throw new Error(`Failed to fetch folders: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!currentProject?.id // Kör bara denna query om vi har ett projekt
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
      const res = await apiRequest('DELETE', `/api/folders/${folderId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete folder');
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Mapp borttagen",
        description: "Mappen och dess innehåll har raderats.",
      });
      // Invalidate both folders and files queries since deleting a folder affects files too
      queryClient.invalidateQueries({ queryKey: ['/api/folders', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id] });
    },
    onError: (error) => {
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
    
    if (uploadState.selectedFolder) {
      formData.append('folderId', uploadState.selectedFolder);
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
      foldersData.forEach((folder: any) => {
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
      filesData.forEach((file: any) => {
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
    const options = [{ value: "root", label: "Root folder" }];
    
    if (!foldersData) return options;
    
    const addFoldersToOptions = (folders: any[], depth = 0, parent = "") => {
      folders.forEach(folder => {
        const prefix = depth > 0 ? "└─ ".padStart(depth * 2 + 2, "  ") : "";
        options.push({
          value: folder.id.toString(),
          label: `${prefix}${folder.name}`,
          parent: parent
        });
        
        if (folder.children && folder.children.length > 0) {
          addFoldersToOptions(folder.children, depth + 1, folder.id.toString());
        }
      });
    };
    
    addFoldersToOptions(foldersData.filter((f: any) => !f.parentId));
    
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
              
              <div 
                className="ml-2 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionsMenuOpen(prev => ({
                    ...prev,
                    [node.id]: !prev[node.id]
                  }));
                }}
              >
                <DropdownMenu open={actionsMenuOpen[node.id]} onOpenChange={(open) => {
                  setActionsMenuOpen(prev => ({ ...prev, [node.id]: open }));
                }}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-3.5 w-3.5 text-neutral-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    {node.type === 'file' && isPdf(node.name) && (
                      <DropdownMenuItem onClick={() => handleFileClick(node)}>
                        Open
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>
                      {node.type === 'folder' ? 'Share folder' : 'Share file'}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Add comment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {/* Bara visa radera-knapp för mappar om användaren har rätt behörighet */}
                    {(node.type === 'folder' && user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser")) && (
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          const folderId = parseInt(node.id.replace('folder_', ''));
                          setFolderToDelete({ id: folderId, name: node.name });
                          setDeleteFolderDialogOpen(true);
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Radera mapp
                      </DropdownMenuItem>
                    )}
                    {/* Visa standard radera-knapp för filer */}
                    {node.type === 'file' && (
                      <DropdownMenuItem className="text-red-600">
                        <Trash className="mr-2 h-4 w-4" />
                        Radera
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                      <Button variant="outline" size="sm" className="h-8 gap-1">
                        <FolderPlus className="h-4 w-4" />
                        <span className="text-xs">New Folder</span>
                      </Button>
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
                      <Button variant="default" size="sm" className="h-8 gap-1">
                        <Upload className="h-4 w-4" />
                        <span className="text-xs">Upload</span>
                      </Button>
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
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadState(prev => ({ ...prev, file: null }));
                                }}
                              >
                                <X className="mr-1 h-3 w-3" />
                                Remove
                              </Button>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCreateFolderDialogOpen(true)}
                  >
                    <FolderPlus className="mr-1 h-4 w-4" />
                    New Folder
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setUploadDialogOpen(true)}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Upload File
                  </Button>
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
      
      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Radera mapp</DialogTitle>
            <DialogDescription>
              Är du säker på att du vill radera mappen "{folderToDelete?.name}" och allt dess innehåll? Denna åtgärd kan inte ångras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFolderDialogOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (folderToDelete) {
                  deleteFolderMutation.mutate(folderToDelete.id);
                  setDeleteFolderDialogOpen(false);
                }
              }}
            >
              Radera mapp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}