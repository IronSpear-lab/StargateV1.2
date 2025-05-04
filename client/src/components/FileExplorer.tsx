import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Folder, File, ChevronDown, ChevronRight, Upload, Loader2 } from "lucide-react";
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
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
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
}

export function FileExplorer({ onFileSelect, selectedFileId }: FileExplorerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    selectedFolder: null,
    projectId: "1", // Default project ID
    isUploading: false,
    file: null
  });

  // Fetch files from the server
  const { data: filesData, isLoading: isLoadingFiles } = useQuery({
    queryKey: ['/api/files', { projectId: uploadState.projectId }],
    queryFn: () => fetch(`/api/files?projectId=${uploadState.projectId}`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    }),
    enabled: !!uploadState.projectId
  });

  // Fetch folders from the server
  const { data: foldersData, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['/api/folders', { projectId: uploadState.projectId }],
    queryFn: () => fetch(`/api/folders?projectId=${uploadState.projectId}`).then(res => {
      if (!res.ok) throw new Error('Failed to fetch folders');
      return res.json();
    }),
    enabled: !!uploadState.projectId
  });

  // Mutation for file upload
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest('POST', '/api/files', formData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File uploaded successfully",
        description: uploadState.file?.name ? `${uploadState.file.name} has been uploaded.` : "Your file has been uploaded."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      setUploadDialogOpen(false);
      setUploadState(prev => ({ ...prev, file: null, isUploading: false }));
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: `${error}`,
        variant: "destructive"
      });
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  });

  // For demo purposes, still using mock data until API integration is complete
  const [files, setFiles] = useState<FileNode[]>([
    {
      id: 'folder-1',
      name: 'Project Documentation',
      type: 'folder',
      children: [
        {
          id: 'file-1',
          name: 'Requirements.pdf',
          type: 'file',
        },
        {
          id: 'file-2',
          name: 'Architecture.pdf',
          type: 'file',
        },
        {
          id: 'folder-2',
          name: 'Design Files',
          type: 'folder',
          children: [
            {
              id: 'file-3',
              name: 'Mockups.pdf',
              type: 'file',
            }
          ]
        }
      ]
    },
    {
      id: 'folder-3',
      name: 'Meeting Notes',
      type: 'folder',
      children: []
    },
    {
      id: 'folder-4',
      name: 'Reference Materials',
      type: 'folder',
      children: []
    }
  ]);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'folder-1': true,
    'folder-2': true,
  });
  
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

    setUploadState(prev => ({ ...prev, isUploading: true }));

    const formData = new FormData();
    formData.append('file', uploadState.file);
    formData.append('projectId', uploadState.projectId);
    if (uploadState.selectedFolder) {
      formData.append('folderId', uploadState.selectedFolder);
    }

    uploadMutation.mutate(formData);
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

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return (
      <ul className={cn("space-y-2", level > 0 ? "pl-4 mt-2" : "")}>
        {nodes.map((node) => (
          <li key={node.id} className="mb-2">
            <div 
              className={cn(
                "flex items-center py-1 cursor-pointer",
                node.type === 'file' && selectedFileId === node.id ? "text-primary-600 font-medium" : "",
                "hover:bg-neutral-100 rounded px-1"
              )}
              onClick={() => node.type === 'folder' ? toggleFolder(node.id) : handleFileClick(node)}
            >
              {node.type === 'folder' ? (
                <>
                  {expandedFolders[node.id] ? (
                    <ChevronDown className="h-4 w-4 text-neutral-500 mr-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-neutral-500 mr-1" />
                  )}
                  <Folder className="h-4 w-4 text-neutral-500 mr-2" />
                </>
              ) : (
                <File className="h-4 w-4 text-neutral-500 mr-2" />
              )}
              <span>{node.name}</span>
            </div>
            
            {node.type === 'folder' && expandedFolders[node.id] && node.children && 
              renderFileTree(node.children, level + 1)}
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
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1 text-primary-600 hover:bg-primary-50 hover:text-primary-700">
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="file">Select File</Label>
                    <Input 
                      ref={fileInputRef}
                      id="file" 
                      type="file" 
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="folder">Destination Folder</Label>
                    <Select 
                      value={uploadState.selectedFolder || "root"}
                      onValueChange={(value) => setUploadState(prev => ({ ...prev, selectedFolder: value === "root" ? null : value }))}>
                      <SelectTrigger id="folder">
                        <SelectValue placeholder="Select a folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Root folder</SelectItem>
                        <SelectItem value="folder-1">Project Documentation</SelectItem>
                        <SelectItem value="folder-2">Design Files</SelectItem>
                        <SelectItem value="folder-3">Meeting Notes</SelectItem>
                        <SelectItem value="folder-4">Reference Materials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                    disabled={!uploadState.file || uploadState.isUploading}
                    className="gap-2"
                  >
                    {uploadState.isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload</span>
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="bg-neutral-50 rounded-md p-4 tree-view">
            {isLoadingFiles || isLoadingFolders ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
              </div>
            ) : (
              renderFileTree(files)
            )}
          </div>
          
          <div className="mt-4">
            <div className="p-3 bg-neutral-50 rounded-md">
              <p className="text-sm text-neutral-500 mb-3">Storage</p>
              <Progress value={72} className="h-2 mb-2" />
              <p className="text-xs text-neutral-500">7.2GB of 10GB used</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
