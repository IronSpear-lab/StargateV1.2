import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';

type RemoveFolderDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean> | boolean;
  folderName: string;
};

export default function RemoveFolderDialog({
  isOpen,
  onClose,
  onConfirm,
  folderName
}: RemoveFolderDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const success = await onConfirm();
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Ta bort mapp
          </DialogTitle>
          <DialogDescription>
            Är du säker på att du vill ta bort mappen "{folderName}"? 
            Denna åtgärd kan inte ångras och all innehåll i mappen kommer också att tas bort.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Tar bort..." : "Ta bort mapp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}