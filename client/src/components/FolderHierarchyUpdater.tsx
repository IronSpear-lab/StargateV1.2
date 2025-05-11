import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { updateFolderHierarchy } from '@/update-folder-hierarchy';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export function FolderHierarchyUpdater() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateHierarchy = () => {
    if (!currentProject?.id) {
      toast({
        title: 'Inget projekt valt',
        description: 'Du måste välja ett projekt först.',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      updateFolderHierarchy(currentProject.id);
      
      toast({
        title: 'Mappstruktur uppdaterad',
        description: 'Mapparna 1, 2, 3 och 4 har organiserats i en hierarkisk struktur.',
      });
    } catch (error) {
      console.error('Fel vid uppdatering av mappstruktur:', error);
      toast({
        title: 'Ett fel inträffade',
        description: 'Kunde inte uppdatera mappstrukturen.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-background shadow-sm">
      <h3 className="text-lg font-medium">Uppdatera mappstruktur</h3>
      <p className="text-sm text-muted-foreground">
        Klicka på knappen nedan för att skapa den hierarkiska mappstrukturen där:
        <br />
        Mapp 2 placeras under mapp 1
        <br />
        Mapp 3 placeras under mapp 2
        <br />
        Mapp 4 placeras under mapp 3
      </p>
      <Button 
        onClick={handleUpdateHierarchy} 
        disabled={isUpdating || !currentProject?.id}
      >
        {isUpdating ? 'Uppdaterar...' : 'Uppdatera mappstruktur'}
      </Button>
    </div>
  );
}