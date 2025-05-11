import { useState } from "react";
import { Sidebar, Header } from "@/components";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Home, FolderTree } from "lucide-react";
import { Link } from "wouter";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  parent?: string;
  projectId: string;
}

export default function FolderHierarchyPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Mappstruktur" onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-background">
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm mb-5">
              <Link href="/" className="text-primary hover:text-primary/80">
                <Home className="h-4 w-4" />
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">Mappstruktur</span>
            </div>

            <div className="mb-6">
              <h1 className="text-xl font-bold text-foreground mb-2">Uppdatera Mappstruktur</h1>
              <p className="text-muted-foreground">
                Med detta verktyg kan du organisera mapparna i en hierarkisk struktur.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <FolderTree className="h-6 w-6 text-primary" />
                  <h2 className="text-lg font-semibold">Mappstruktur</h2>
                </div>
                
                <p className="mb-4">
                  Klicka på knappen nedan för att skapa följande mappstruktur:
                </p>
                
                <div className="bg-muted rounded-md p-4 mb-6 font-mono text-sm">
                  <div>└─ 1</div>
                  <div className="ml-6">└─ 2</div>
                  <div className="ml-12">└─ 3</div>
                  <div className="ml-18">└─ 4</div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Detta kommer att skapa en hierarki där mapp 2 är en undermapp till mapp 1, 
                  mapp 3 är en undermapp till mapp 2, och mapp 4 är en undermapp till mapp 3.
                </p>
                
                <Button
                  onClick={updateFolderHierarchy}
                  disabled={isUpdating || !currentProject?.id}
                  className="w-full"
                >
                  {isUpdating ? "Uppdaterar..." : "Uppdatera mappstruktur"}
                </Button>
              </div>
              
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Instruktioner</h2>
                <ol className="list-decimal ml-5 space-y-2">
                  <li>Välj ett projekt som innehåller mappar med namn "1", "2", "3" och "4".</li>
                  <li>Klicka på "Uppdatera mappstruktur" för att organisera mapparna.</li>
                  <li>När du är klar, navigera till "Filer" i sidomenyn för att se resultatet.</li>
                  <li>Du bör nu se mapparna organiserade i en hierarkisk struktur.</li>
                </ol>
                
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                  <h3 className="text-amber-800 dark:text-amber-300 font-medium mb-2">Observera</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Se till att du har mappar med exakt namnet "1", "2", "3" och "4" i ditt aktuella projekt.
                    Om mapparna inte finns, måste du skapa dem först genom att använda "Mapphantering" widgeten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}