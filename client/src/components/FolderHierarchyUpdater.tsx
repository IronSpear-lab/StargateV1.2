import { useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FolderTree, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  parent?: string;
  projectId: string;
}

export function FolderHierarchyUpdater() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateFolderHierarchy = () => {
    if (!currentProject?.id) {
      toast({
        title: "Inget projekt valt",
        description: "Du måste välja ett projekt först.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // Hämta befintliga mappar från localStorage
      const existingFolders = JSON.parse(localStorage.getItem("userCreatedFolders") || "[]");

      // Filtrera ut mappar från det aktuella projektet
      const projectFolders = existingFolders.filter(
        (folder: FolderItem) => folder.projectId === currentProject.id.toString()
      );

      // Hitta mapparna 1, 2, 3 och 4
      const folder1 = projectFolders.find((f: FolderItem) => f.name === "1");
      const folder2 = projectFolders.find((f: FolderItem) => f.name === "2");
      const folder3 = projectFolders.find((f: FolderItem) => f.name === "3");
      const folder4 = projectFolders.find((f: FolderItem) => f.name === "4");

      // Kontrollera att alla mappar finns
      if (!folder1 || !folder2 || !folder3 || !folder4) {
        toast({
          title: "Saknar mappar",
          description: "Kunde inte hitta alla mappar (1, 2, 3, 4) för hierarkin.",
          variant: "destructive",
        });
        setIsUpdating(false);
        return;
      }

      console.log("Uppdaterar mapparhierarkin för projekt", currentProject.id);
      console.log("Mappar före uppdatering:", { folder1, folder2, folder3, folder4 });

      // Uppdatera parent-child relationer
      // 1 är rot (har ingen förälder)
      folder1.parentId = null;
      folder1.parent = "Files"; // Detta anger att den ska visas direkt under Files-sektionen

      // 2 har 1 som förälder
      folder2.parentId = folder1.id;
      folder2.parent = folder1.name;

      // 3 har 2 som förälder
      folder3.parentId = folder2.id;
      folder3.parent = folder2.name;

      // 4 har 3 som förälder
      folder4.parentId = folder3.id;
      folder4.parent = folder3.name;

      // Skapa en ny array med uppdaterade mappar
      const updatedFolders = existingFolders.map((folder: FolderItem) => {
        // Om mappen är en av de vi har uppdaterat, returnera den uppdaterade versionen
        if (folder.id === folder1.id) return folder1;
        if (folder.id === folder2.id) return folder2;
        if (folder.id === folder3.id) return folder3;
        if (folder.id === folder4.id) return folder4;

        // Annars, behåll mappen som den är
        return folder;
      });

      // Spara de uppdaterade mapparna till localStorage
      localStorage.setItem("userCreatedFolders", JSON.stringify(updatedFolders));

      console.log("Mapparhierarkin har uppdaterats", updatedFolders);

      // Meddela Sidebar att mappstrukturen har ändrats
      window.dispatchEvent(
        new CustomEvent("folder-structure-changed", {
          detail: { projectId: currentProject.id },
        })
      );

      toast({
        title: "Mappstruktur uppdaterad",
        description: "Mapparna 1, 2, 3 och 4 har organiserats i en hierarkisk struktur.",
      });
    } catch (error) {
      console.error("Fel vid uppdatering av mappstruktur:", error);
      toast({
        title: "Ett fel inträffade",
        description: "Kunde inte uppdatera mappstrukturen.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={updateFolderHierarchy}
            disabled={isUpdating || !currentProject?.id}
            className="mr-2"
          >
            {isUpdating ? (
              <ArrowRight className="h-4 w-4 animate-pulse" />
            ) : (
              <FolderTree className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Uppdatera mappstruktur (1, 2, 3, 4) till hierarkisk layout</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}