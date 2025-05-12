import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  FolderPlus,
  Folder,
  FolderInput,
  Trash,
  ChevronRight,
  ChevronDown,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

interface FolderData {
  id: number | string;
  name: string;
  projectId: number | string;
  parentId?: number | string | null;
  children?: FolderData[];
}

interface FolderNode {
  id: string;
  name: string;
  original: FolderData;
  children?: FolderNode[];
}

interface FolderFormData {
  name: string;
  projectId: number;
  parentId: number | null;
}

export function FolderManagementWidget() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentProject } = useProject();
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedParentFolder, setSelectedParentFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderData | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Fetch folders
  const { 
    data: foldersData, 
    isLoading: isLoadingFolders,
    refetch: refetchFolders
  } = useQuery({
    queryKey: ['/api/folders', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) {
        return [];
      }
      
      try {
        const res = await fetch(`/api/folders?projectId=${currentProject.id}`, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch folders: ${res.status}`);
        }
        
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Error fetching folders:", error);
        return [];
      }
    },
    enabled: !!currentProject?.id
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: FolderFormData) => {
      if (!folderData.projectId) {
        throw new Error("Ogiltigt projekt-ID");
      }
      
      // Modifierar föräldrarmappen (parent) för att säkerställa att nya mappar hamnar under Files-sektionen
      // Om ingen föräldermapp valts, sätt parent_folder='Files' för att mappar ska visas under Files-sektionen
      const requestData = {
        ...folderData,
        // Vi använder ett särskilt fält 'sidebarParent' som backend ignorerar
        // men som frontend använder för att placera mappar i rätt sektion
        sidebarParent: 'Files'
      };
      
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error(`Fel vid skapande av mapp: ${res.status}`);
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Använd föräldermappens namn i meddelandetexten
      const parentInfo = selectedParentFolder ? 
        `under "${foldersData.find((f: FolderData) => f.id.toString() === selectedParentFolder)?.name || 'vald'} mappen"` : 
        "i rotkatalogen";
      
      toast({
        title: "Mapp skapad",
        description: `Mappen "${data.name}" har skapats ${parentInfo}`,
      });
      
      setNewFolderName("");
      setSelectedParentFolder(null);
      
      // Säkerställ att expandState uppdateras för att visa den nya undermappen
      if (selectedParentFolder) {
        setExpandedFolders(prev => ({
          ...prev,
          [selectedParentFolder]: true // Expandera föräldermappen
        }));
      }
      
      // Uppdatera queries för att återspegla ändringar
      queryClient.invalidateQueries({ queryKey: ['/api/folders', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id, 'all=true'] });
      
      // Uppdatera lokalt lagrade mappar i localStorage för att de ska visas i sidomenyn
      // Sparar en temporär referens i lokalstorage med speciell struktur
      // för att respektera mappstrukturen i sidofältet och projektspecifik avgränsning
      try {
        // Hämta alla befintliga mappar från localStorage
        const allUserFolders = JSON.parse(localStorage.getItem('userCreatedFolders') || '[]');
        
        // Filtrera ut mappar från andra projekt så vi inte skriver över dem
        const otherProjectFolders = allUserFolders.filter((f: any) => {
          // Behåll mappar som inte har ett projectId eller som tillhör ett annat projekt
          return !f.projectId || f.projectId !== currentProject?.id.toString();
        });
        
        // Hämta befintliga mappar för det aktuella projektet
        const currentProjectFolders = allUserFolders.filter((f: any) => 
          f.projectId === currentProject?.id.toString()
        );
        
        // Identifiera föräldermappens namn från dess ID
        let parentFolderName = 'Files'; // Standardvärde om ingen föräldermapp är vald
        
        if (data.parentId) {
          // Hitta föräldermappens namn baserat på ID
          const parentFromDB = foldersData.find((f: FolderData) => 
            f.id.toString() === data.parentId.toString()
          );
          
          if (parentFromDB) {
            parentFolderName = parentFromDB.name;
            console.log(`Found parent folder name: ${parentFolderName} for ID: ${data.parentId}`);
          } else {
            console.log(`Could not find parent folder with ID: ${data.parentId}, using Files as parent`);
          }
        }
        
        // Skapa den nya mappen med explicit projektID-referens
        const newFolder = {
          name: data.name,
          parent: parentFolderName, // Använd föräldermappens namn för korrekt hierarki
          id: data.id.toString(),
          parentId: data.parentId ? data.parentId.toString() : null,
          projectId: currentProject?.id.toString(), // Lägg till projektID för korrekt filtrering
          type: 'folder' // Explicit typ för korrekt rendering
        };
        
        console.log('Saving new folder to localStorage:', newFolder);
        console.log(`Current project: ${currentProject?.id}, Adding to ${currentProjectFolders.length} existing folders`);
        
        // Kombinera mappar från andra projekt och uppdaterad lista för aktuellt projekt
        const updatedFolders = [...otherProjectFolders, ...currentProjectFolders, newFolder];
        localStorage.setItem('userCreatedFolders', JSON.stringify(updatedFolders));
        
        // Tvinga en refresh av sidebar-menyn genom att utlösa en custom event
        // Sidomenyn lyssnar efter denna händelse för att uppdatera sig
        window.dispatchEvent(new CustomEvent('folder-structure-changed', { 
          detail: { projectId: currentProject?.id } 
        }));
        
      } catch (e) {
        console.error("Error updating local storage folders:", e);
      }
    },
    onError: (error) => {
      toast({
        title: "Kunde inte skapa mapp",
        description: error instanceof Error ? error.message : 'Ett okänt fel inträffade',
        variant: "destructive",
      });
    }
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error(`Kunde inte radera mappen: ${res.status}`);
      }
      
      return folderId;
    },
    onSuccess: (deletedFolderId) => {
      toast({
        title: "Mapp borttagen",
        description: "Mappen och dess innehåll har raderats",
      });
      
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/folders', currentProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/files', currentProject?.id, 'all=true'] });
      
      // Also remove folder from localStorage for sidebar
      try {
        const userFolders = JSON.parse(localStorage.getItem('userCreatedFolders') || '[]');
        
        // Identifiera den borttagna mappen
        const folderToRemove = userFolders.find((folder: any) => 
          folder.id === deletedFolderId.toString()
        );
        
        // Ta bort den markerade mappen och alla dess underliggande mappar
        if (folderToRemove) {
          const folderName = folderToRemove.name;
          console.log(`Removing folder ${folderName} and all its children from local storage`);
          
          // Funktionen identifierar alla undermappar rekursivt
          const findChildFolderIds = (parentName: string): string[] => {
            const directChildren = userFolders.filter((folder: any) => 
              folder.parent === parentName
            );
            
            return [
              ...directChildren.map((child: any) => child.id),
              ...directChildren.flatMap((child: any) => findChildFolderIds(child.name))
            ];
          };
          
          // Hitta IDs för alla mappar som ska tas bort (den valda mappen + undermappar)
          const idsToRemove = [
            deletedFolderId.toString(),
            ...findChildFolderIds(folderToRemove.name)
          ];
          
          console.log(`Will remove ${idsToRemove.length} folders in total`);
          
          // Filtrera bort de mappar som ska tas bort
          const updatedFolders = userFolders.filter((folder: any) => 
            !idsToRemove.includes(folder.id)
          );
          
          // Spara de uppdaterade mapparna till localStorage
          localStorage.setItem('userCreatedFolders', JSON.stringify(updatedFolders));
          
          // Tvinga en refresh av sidebar-menyn genom att utlösa en custom event
          window.dispatchEvent(new CustomEvent('folder-structure-changed', { 
            detail: { projectId: currentProject?.id } 
          }));
        }
      } catch (e) {
        console.error("Error updating local storage folders after deletion:", e);
      }
    },
    onError: (error) => {
      toast({
        title: "Kunde inte radera mapp",
        description: error instanceof Error ? error.message : 'Ett okänt fel inträffade',
        variant: "destructive",
      });
    }
  });
  


  // Handle folder deletion
  const handleDeleteFolder = (folder: FolderData) => {
    setFolderToDelete(folder);
    setDeleteAlertOpen(true);
  };
  
  // Confirm folder deletion
  const confirmDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolderMutation.mutate(Number(folderToDelete.id));
      setDeleteAlertOpen(false);
      setFolderToDelete(null);
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
    
    const folderData: FolderFormData = {
      name: newFolderName,
      projectId: Number(currentProject.id),
      parentId: selectedParentFolder ? Number(selectedParentFolder) : null
    };
    
    console.log("Creating new folder with data:", folderData);
    createFolderMutation.mutate(folderData);
  };

  // Handle clearing all local storage folders
  const handleClearAllFolders = () => {
    setShowClearAllConfirm(true);
  };
  
  // Confirm clearing all local storage folders
  const confirmClearAllFolders = () => {
    try {
      // Clear all folders from localStorage
      localStorage.setItem('userCreatedFolders', '[]');
      
      // Trigger sidebar update
      window.dispatchEvent(new CustomEvent('folder-structure-changed', { 
        detail: { projectId: currentProject?.id } 
      }));
      
      // Reset the confirm dialog
      setShowClearAllConfirm(false);
      
      // Provide feedback to the user
      toast({
        title: "Lokala mappar rensade",
        description: "Alla lokalt lagrade mappar har rensats från sidofältet",
      });
      
      // Refresh the folders data
      refetchFolders();
    } catch (error) {
      console.error("Error clearing localStorage folders:", error);
      toast({
        title: "Kunde inte rensa mappar",
        description: "Ett fel uppstod vid rensning av lokala mappar",
        variant: "destructive",
      });
    }
  };

  // Build folder tree with support for unlimited nesting
  const buildFolderTree = () => {
    if (!foldersData || !Array.isArray(foldersData)) return [];
    
    // Filter folders for current project
    const filteredFolders = foldersData.filter((folder: FolderData) => 
      folder.projectId === currentProject?.id
    );
    
    // Logga mapparna för felsökning
    console.log("Filtered folders for tree building:", filteredFolders);
    
    const folderMap: Record<string, FolderNode> = {};
    const tree: FolderNode[] = [];
    
    // First pass: Create all folder nodes without children
    filteredFolders.forEach((folder: FolderData) => {
      folderMap[folder.id.toString()] = {
        id: folder.id.toString(),
        name: folder.name,
        original: folder,
        children: [] // Initializera alltid children-array
      };
    });
    
    // Second pass: Build the tree structure
    filteredFolders.forEach((folder: FolderData) => {
      if (folder.parentId) {
        const parentId = folder.parentId.toString();
        if (folderMap[parentId]) {
          // Om föräldermappen existerar, lägg till som barn till den
          folderMap[parentId].children?.push(folderMap[folder.id.toString()]);
          console.log(`Added folder ${folder.name} as child of ${folderMap[parentId].name}`);
        } else {
          // Om föräldermappen inte finns, lägg till på rotnivå
          console.log(`Parent folder ID ${parentId} for ${folder.name} not found, adding to root`);
          tree.push(folderMap[folder.id.toString()]);
        }
      } else {
        // Mapp utan förälder, lägg till på rotnivå
        tree.push(folderMap[folder.id.toString()]);
      }
    });
    
    // Logga det slutliga trädet för felsökning
    console.log("Final folder tree:", JSON.stringify(tree, null, 2));
    
    return tree;
  };

  // Get folder options for select field
  const getFolderOptions = () => {
    const options: {value: string, label: string}[] = [{ value: "root", label: "Rotkatalog" }];
    
    if (!foldersData || !Array.isArray(foldersData)) return options;
    
    // Använd folderTree som redan är organiserad i en hierarki
    const addFolderNodesToOptions = (nodes: FolderNode[], depth = 0) => {
      nodes.forEach((node) => {
        const prefix = depth > 0 ? "└─ ".padStart(depth * 2 + 2, "  ") : "";
        options.push({
          value: node.id,
          label: `${prefix}${node.name}`
        });
        
        // Rekursivt lägg till alla barn
        if (node.children && node.children.length > 0) {
          addFolderNodesToOptions(node.children, depth + 1);
        }
      });
    };
    
    // Använd den redan byggda trästrukturen
    addFolderNodesToOptions(buildFolderTree());
    
    return options;
  };

  // Handle folder toggle
  const handleFolderToggle = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Render folder tree
  const renderFolderTree = (nodes: FolderNode[], level = 0) => {
    return (
      <ul className={cn(
        "space-y-1",
        level > 0 ? "ml-4 pl-2 border-l border-neutral-200" : ""
      )}>
        {nodes.map(node => (
          <li key={node.id} className="relative py-0.5">
            <div className="flex items-center group">
              <button
                type="button"
                onClick={() => handleFolderToggle(node.id)}
                className="mr-1 p-1 rounded-md hover:bg-neutral-100"
              >
                {expandedFolders[node.id] ? (
                  <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
                )}
              </button>
              
              <Folder className="h-4 w-4 text-yellow-500 mr-2" />
              
              <span className="text-sm font-medium text-neutral-700 flex-1">
                {node.name}
              </span>
              
              <button
                type="button"
                onClick={() => handleDeleteFolder(node.original)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 hover:text-red-600"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {node.children && expandedFolders[node.id] && (
              renderFolderTree(node.children, level + 1)
            )}
          </li>
        ))}
      </ul>
    );
  };

  const folderTree = buildFolderTree();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium text-gray-600 dark:text-gray-400">Mapphantering</CardTitle>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClearAllFolders}
              title="Rensa lokala mappar"
              className="text-gray-500 hover:text-red-600"
            >
              <Trash className="h-4 w-4 mr-1" />
              Rensa mappar
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetchFolders()} 
              title="Uppdatera mapplistan"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Create folder form */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Skapa ny mapp</h3>
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label htmlFor="folderName" className="text-gray-500 dark:text-gray-400">Mappnamn</Label>
                <Input
                  id="folderName"
                  placeholder="t.ex. Projektdokumentation"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>
              
              <div className="grid gap-1">
                <Label htmlFor="parentFolder" className="text-gray-500 dark:text-gray-400">Föräldermapp (Valfritt)</Label>
                <Select
                  value={selectedParentFolder || "root"}
                  onValueChange={(value) => setSelectedParentFolder(value === "root" ? null : value)}
                >
                  <SelectTrigger id="parentFolder">
                    <SelectValue placeholder="Välj föräldermapp" />
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
              
              <Button 
                onClick={handleCreateFolder} 
                disabled={!newFolderName || !currentProject?.id || createFolderMutation.isPending}
                className="mt-1"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Skapa mapp
              </Button>
            </div>
          </div>
          
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Projektmappar</h3>
            
            {isLoadingFolders ? (
              <div className="py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                Laddar mappstruktur...
              </div>
            ) : folderTree.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                Inga mappar att visa. Skapa en mapp för att komma igång.
              </div>
            ) : (
              <div className="bg-white border border-neutral-100 rounded-md py-2 px-1">
                {renderFolderTree(folderTree)}
              </div>
            )}
          </div>
        </div>
        
        {/* Delete folder confirmation dialog */}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-neutral-800">Bekräfta borttagning</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-600">
                Är du säker på att du vill radera mappen "{folderToDelete?.name}" och allt dess innehåll?
                <br /><br />
                <span className="font-medium">Denna åtgärd kan inte ångras.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-neutral-200 text-neutral-700">Avbryt</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteFolder} 
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Ta bort
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Clear all folders confirmation dialog */}
        <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-neutral-800">Bekräfta rensning av lokala mappar</AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-600">
                Detta kommer att ta bort alla lokalt lagrade mappinformationer från sidofältet. Mapparna kommer fortfarande finnas i databasen om de inte har raderats därifrån.
                <br /><br />
                <span className="font-medium">Detta är användbart om mapparna i sidofältet inte stämmer överens med de faktiska mapparna i systemet.</span>
                <br /><br />
                <span className="font-medium">Vill du fortsätta?</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-neutral-200 text-neutral-700">Avbryt</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmClearAllFolders} 
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Rensa lokala mappar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}