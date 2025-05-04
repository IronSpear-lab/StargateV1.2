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
  AlertTriangle
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
  projectId: string;
  parentId: string | null;
}

export function FileExplorer({ onFileSelect, selectedFileId }: FileExplorerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState<Record<string, boolean>>({});
  
  const [uploadState, setUploadState] = useState<FileUploadState>({
    selectedFolder: null,
    projectId: "1", // Default project ID
    isUploading: false,
    file: null,
    uploadProgress: 0
  });

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

  // Use first project as default if available
  useEffect(() => {
    if (projectsData && projectsData.length > 0 && projectsData[0].id) {
      setUploadState(prev => ({ ...prev, projectId: projectsData[0].id.toString() }));
    }
  }, [projectsData]);

  // Fetch files from the server
  const { data: filesData, isLoading: isLoadingFiles } = useQuery({
    queryKey: ['/api/files', { projectId: uploadState.projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/files?projectId=${uploadState.projectId}`);
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    enabled: !!uploadState.projectId
  });

  // Fetch folders from the server
  const { data: foldersData, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['/api/folders', { projectId: uploadState.projectId }],
    queryFn: async () => {
      const res = await fetch(`/api/folders?projectId=${uploadState.projectId}`);
      if (!res.ok) throw new Error('Failed to fetch folders');
      return res.json();
    },
    enabled: !!uploadState.projectId
  });

  // Mutation for file upload
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Use XMLHttpRequest to track upload progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadState(prev => ({ ...prev, uploadProgress: progress }));
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error("Failed to parse response"));
            }
          } else {
            reject(new Error(xhr.statusText || "Upload failed"));
          }
        };
        
        xhr.onerror = () => reject(new Error("Network error during upload"));
        
        xhr.open("POST", "/api/files");
        xhr.send(formData);
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "File uploaded successfully",
        description: uploadState.file?.name ? `${uploadState.file.name} has been uploaded.` : "Your file has been uploaded."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setUploadDialogOpen(false);
      setUploadState(prev => ({ 
        ...prev, 
        file: null, 
        isUploading: false, 
        uploadProgress: 0 
      }));
      
      // If the uploaded file is a PDF, select it automatically
      if (data && data.fileType === "application/pdf") {
        onFileSelect({
          id: data.id.toString(),
          name: data.name,
          type: 'file',
          fileType: data.fileType
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: `${error}`,
        variant: "destructive"
      });
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        uploadProgress: 0 
      }));
    }
  });

  // Mutation for creating new folders
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: FolderFormData) => {
      const response = await apiRequest('POST', '/api/folders', folderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Folder created",
        description: `Folder "${newFolderName}" has been created.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      setCreateFolderDialogOpen(false);
      setNewFolderName("");
    },
    onError: (error) => {
      toast({
        title: "Failed to create folder",
        description: `${error}`,
        variant: "destructive"
      });
    }
  });

  // Convert API data to FileNode structure
  const buildFileTree = (): FileNode[] => {
    if (!foldersData || !filesData) return [];
    
    // Map folders with their children
    const folderMap: Record<string, FileNode> = {};
    const rootItems: FileNode[] = [];
    
    // First pass: create all folder nodes
    foldersData.forEach((folder: any) => {
      folderMap[folder.id] = {
        id: folder.id.toString(),
        name: folder.name,
        type: 'folder',
        children: []
      };
      
      // Expand folders by default
      if (!expandedFolders.hasOwnProperty(folder.id.toString())) {
        setExpandedFolders(prev => ({
          ...prev,
          [folder.id.toString()]: true
        }));
      }
    });
    
    // Second pass: establish parent-child relationships
    foldersData.forEach((folder: any) => {
      const folderNode = folderMap[folder.id];
      
      if (folder.parentId && folderMap[folder.parentId]) {
        // Add as child to parent folder
        folderMap[folder.parentId].children = folderMap[folder.parentId].children || [];
        folderMap[folder.parentId].children?.push(folderNode);
      } else {
        // Add to root level
        rootItems.push(folderNode);
      }
    });
    
    // Add files to their respective folders
    filesData.forEach((file: any) => {
      const fileNode: FileNode = {
        id: file.id.toString(),
        name: file.name,
        type: 'file',
        fileType: file.fileType,
        fileSize: file.fileSize
      };
      
      if (file.folderId && folderMap[file.folderId]) {
        // Add file to its folder
        folderMap[file.folderId].children = folderMap[file.folderId].children || [];
        folderMap[file.folderId].children?.push(fileNode);
      } else {
        // Add file to root level
        rootItems.push(fileNode);
      }
    });
    
    return rootItems;
  };
  
  const fileTree = buildFileTree();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadState(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleFileUpload = () => {
    if (!uploadState.file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    setUploadState(prev => ({ 
      ...prev, 
      isUploading: true, 
      uploadProgress: 0 
    }));

    const formData = new FormData();
    formData.append('file', uploadState.file);
    formData.append('projectId', uploadState.projectId);
    if (uploadState.selectedFolder) {
      formData.append('folderId', uploadState.selectedFolder);
    }

    uploadMutation.mutate(formData);
  };
  
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Folder name required",
        description: "Please provide a name for the new folder",
        variant: "destructive"
      });
      return;
    }
    
    const folderData: FolderFormData = {
      name: newFolderName.trim(),
      projectId: uploadState.projectId,
      parentId: uploadState.selectedFolder
    };
    
    createFolderMutation.mutate(folderData);
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      onFileSelect(file);
    }
  };
  
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadState(prev => ({ ...prev, file }));
      setUploadDialogOpen(true);
    }
  };
  
  const getFolderOptions = () => {
    if (!foldersData) return [{ value: "root", label: "Root folder" }];
    
    const options = [{ value: "root", label: "Root folder" }];
    
    foldersData.forEach((folder: any) => {
      options.push({
        value: folder.id.toString(),
        label: folder.name
      });
    });
    
    return options;
  };
  
  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') {
      return <Folder className="h-4 w-4 text-amber-500" />;
    }
    
    const extension = file.name ? getFileExtension(file.name).toLowerCase() : '';
    
    if (isPdf(file.name)) {
      return <File className="h-4 w-4 text-red-500" />;
    }
    
    if (isFileOfType(file.name, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    
    if (isFileOfType(file.name, ['doc', 'docx', 'txt', 'md'])) {
      return <FileText className="h-4 w-4 text-blue-700" />;
    }
    
    if (isFileOfType(file.name, ['xls', 'xlsx', 'csv'])) {
      return <File className="h-4 w-4 text-green-600" />;
    }
    
    if (isFileOfType(file.name, ['html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json'])) {
      return <File className="h-4 w-4 text-yellow-600" />;
    }
    
    if (isFileOfType(file.name, ['zip', 'rar', 'tar', 'gz'])) {
      return <File className="h-4 w-4 text-neutral-600" />;
    }
    
    return <FileIcon className="h-4 w-4 text-neutral-500" />;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return (
      <ul className={cn("space-y-1", level > 0 ? "pl-4 mt-1" : "")}>
        {nodes.map((node) => (
          <li key={node.id} className="relative">
            <div 
              className={cn(
                "flex items-center py-1.5 px-2 rounded-md",
                node.type === 'file' && selectedFileId === node.id 
                  ? "bg-primary-50 text-primary-700 font-medium" 
                  : "hover:bg-neutral-100",
                "group"
              )}
              onClick={(e) => {
                e.stopPropagation();
                node.type === 'folder' ? toggleFolder(node.id) : handleFileClick(node);
              }}
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
              
              <span className="truncate flex-1">{node.name}</span>
              
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
                    <DropdownMenuItem className="text-red-600">
                      Delete
                    </DropdownMenuItem>
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
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="parentFolder">Parent Folder</Label>
                      <Select
                        value={uploadState.selectedFolder || "root"}
                        onValueChange={(value) => setUploadState(prev => ({ ...prev, selectedFolder: value === "root" ? null : value }))}
                      >
                        <SelectTrigger id="parentFolder">
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
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreateFolderDialogOpen(false)}
                      disabled={createFolderMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateFolder}
                      disabled={!newFolderName.trim() || createFolderMutation.isPending}
                    >
                      {createFolderMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Folder'
                      )}
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
                          Project: {projectsData?.find((p: any) => p.id.toString() === uploadState.projectId)?.name || 'Loading...'}
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
    </div>
  );
}
