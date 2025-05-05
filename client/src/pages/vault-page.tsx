import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  FileText, 
  Folder, 
  FolderPlus,
  PlusCircle,
  Trash,
  Pencil,
  MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Sample data for inbox comments
const inboxComments = [
  { id: 1, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 2, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 3, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 4, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 5, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 6, code: "839", date: new Date(2023, 1, 3), color: "red" },
  { id: 7, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 8, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 9, code: "854", date: new Date(2023, 1, 3), color: "blue" },
  { id: 10, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 11, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 12, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 13, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 14, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 15, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 16, code: "900", date: new Date(2023, 1, 3), color: "green" },
  { id: 17, code: "900", date: new Date(2023, 1, 3), color: "green" }
];

// Sample data for recent files
const recentFiles = [
  { id: 1, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 2, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 3, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 4, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 5, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 6, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 7, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 8, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 9, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 10, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 11, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 12, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 13, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 14, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 15, name: "AFA Landella.zip", date: new Date(2023, 1, 3), type: "zip" },
  { id: 16, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" },
  { id: 17, name: "Underlag Temp.pdf", date: new Date(2023, 1, 3), type: "pdf" }
];

// Sample data for projects and folders
const projects = [
  { id: 1, name: "Project Alpha" },
  { id: 2, name: "Project Beta" },
  { id: 3, name: "Project Gamma" }
];

// Sample data for folders
const folderData = [
  { id: 1, name: "Documents", projectId: 1, parentId: null },
  { id: 2, name: "Images", projectId: 1, parentId: null },
  { id: 3, name: "Contracts", projectId: 2, parentId: null },
  { id: 4, name: "Invoices", projectId: 1, parentId: 1 },
  { id: 5, name: "Reports", projectId: 1, parentId: 1 },
  { id: 6, name: "Project Screenshots", projectId: 1, parentId: 2 }
];

interface FolderLocation {
  projectId: number;
  parentId: number | null;
}

// Folder interface
interface Folder {
  id: number;
  name: string;
  projectId: number;
  parentId: number | null;
}

export default function VaultPage() {
  const [activeTab, setActiveTab] = useState("home");
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>(folderData);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<FolderLocation>({
    projectId: 1,
    parentId: null
  });
  const [selectedFolderForDeletion, setSelectedFolderForDeletion] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const { toast } = useToast();

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <div className="w-5 h-5 mr-2 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-500">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M9 15h6M9 18h6M9 12h2" />
            </svg>
          </div>
        );
      case 'zip':
        return (
          <div className="w-5 h-5 mr-2 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-500">
              <path d="M21 8v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9"></path>
              <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
              <line x1="12" y1="8" x2="12" y2="14"></line>
              <polyline points="10 12 12 14 14 12"></polyline>
            </svg>
          </div>
        );
      default:
        return <FileText className="w-5 h-5 mr-2 text-blue-500" />;
    }
  };

  const getCommentStatusColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'red':
        return 'bg-red-500';
      case 'blue':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Filtrera mappar efter projekt
  const projectFolders = folders.filter(
    folder => folder.projectId === selectedProjectId
  );
  
  // Hitta rotmappar (mappar utan förälder)
  const rootFolders = projectFolders.filter(
    folder => folder.parentId === null
  );
  
  // Hitta undermappar för en viss föräldermapp
  const getSubfolders = (parentId: number) => {
    return projectFolders.filter(
      folder => folder.parentId === parentId
    );
  };
  
  // Funktion för att hantera skapande av ny mapp
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    // Skapa ett nytt mapp-objekt
    const newFolder: Folder = {
      id: folders.length + 1, // I en riktig app skulle detta hanteras av servern
      name: newFolderName,
      projectId: selectedLocation.projectId,
      parentId: selectedLocation.parentId
    };
    
    // Lägg till mappen i listan
    setFolders([...folders, newFolder]);
    
    // Visa bekräftelse
    toast({
      title: "Success",
      description: `Folder "${newFolderName}" created in ${
        projects.find(p => p.id === selectedLocation.projectId)?.name || "Project"
      }${selectedLocation.parentId ? " as subfolder" : ""}`,
    });
    
    // Återställ form och stäng dialog
    setNewFolderName("");
    setIsAddFolderOpen(false);
  };
  
  // Funktion för att hantera borttagning av mappar
  const handleDeleteFolder = () => {
    if (selectedFolderForDeletion === null) return;
    
    // Ta bort mapp och alla dess undermappar
    const deleteFolder = (folderId: number) => {
      // Hitta alla undermappar
      const subfolders = folders.filter(folder => folder.parentId === folderId);
      
      // Ta bort undermappar rekursivt
      subfolders.forEach(subfolder => deleteFolder(subfolder.id));
      
      // Ta bort mappen själv
      setFolders(folders.filter(folder => folder.id !== folderId));
    };
    
    deleteFolder(selectedFolderForDeletion);
    
    // Visa bekräftelse
    toast({
      title: "Success",
      description: "Folder and its subfolders deleted successfully",
    });
    
    // Stäng dialog och återställ state
    setIsDeleteFolderOpen(false);
    setSelectedFolderForDeletion(null);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <nav className="flex mb-4 text-sm" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 md:space-x-2">
                  <li className="inline-flex items-center">
                    <a href="#" className="inline-flex items-center text-muted-foreground hover:text-primary">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                      </svg>
                      Home
                    </a>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                      </svg>
                      <a href="#" className="ml-1 text-primary hover:text-primary/80 md:ml-2">Vault</a>
                    </div>
                  </li>
                </ol>
              </nav>
              <h1 className="text-2xl font-semibold text-foreground">Vault</h1>
            </div>
            
            {/* Add Folder Button */}
            <Dialog open={isAddFolderOpen} onOpenChange={setIsAddFolderOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2" size="sm">
                  <FolderPlus className="h-4 w-4" />
                  <span>Add Folder</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Add a new folder to organize your files in the project.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="folderName">Folder Name</Label>
                    <Input 
                      id="folderName" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Enter folder name" 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="project">Project</Label>
                    <Select 
                      value={selectedLocation.projectId.toString()} 
                      onValueChange={(value) => 
                        setSelectedLocation({ ...selectedLocation, projectId: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="parentFolder">Parent Folder (Optional)</Label>
                    <Select 
                      value={selectedLocation.parentId?.toString() || "root"} 
                      onValueChange={(value) => 
                        setSelectedLocation({ 
                          ...selectedLocation, 
                          parentId: value !== "root" ? parseInt(value) : null 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Root Folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Root Folder</SelectItem>
                        <SelectItem value="1">Documents</SelectItem>
                        <SelectItem value="2">Images</SelectItem>
                        <SelectItem value="3">Contracts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddFolderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFolder}>
                    Create Folder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Project selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="projectSelect">Project</Label>
            </div>
            <div className="w-full md:w-1/3">
              <Select 
                value={selectedProjectId.toString()} 
                onValueChange={(value) => setSelectedProjectId(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Folders management section */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-medium">Folders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectFolders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No folders found. Create a new folder to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projectFolders.map((folder) => (
                      <TableRow key={folder.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Folder className="h-4 w-4 mr-2 text-primary" />
                            {folder.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {folder.parentId 
                            ? `Subfolder of ${folders.find(f => f.id === folder.parentId)?.name || "Unknown"}` 
                            : "Root folder"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedFolderForDeletion(folder.id);
                                  setIsDeleteFolderOpen(true);
                                }}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Delete folder dialog */}
          <Dialog open={isDeleteFolderOpen} onOpenChange={setIsDeleteFolderOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this folder and all its subfolders? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteFolderOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteFolder}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inbox Comments Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <span>Inbox Comments</span>
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    4
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t border-border">
                  {inboxComments.slice(0, 15).map((comment) => (
                    <div 
                      key={comment.id} 
                      className="flex items-center justify-between py-2 px-4 border-b border-border hover:bg-muted/50"
                    >
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-sm ${getCommentStatusColor(comment.color)} mr-4`} />
                        <span className="text-sm font-medium text-foreground">{comment.code}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(comment.date, 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2 pb-2">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs flex items-center">
                  View All <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Files Section */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Recent files</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t border-border">
                  {recentFiles.slice(0, 15).map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between py-2 px-4 border-b border-border hover:bg-muted/50"
                    >
                      <div className="flex items-center overflow-hidden">
                        {getFileIcon(file.type)}
                        <span className="text-sm font-medium text-foreground truncate">{file.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(file.date, 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2 pb-2">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs flex items-center">
                  View All <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}