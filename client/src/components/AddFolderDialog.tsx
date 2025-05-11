import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProjectContext } from '../contexts/project-context';

const formSchema = z.object({
  folderName: z
    .string()
    .min(1, "Mappnamnet får inte vara tomt")
    .max(50, "Mappnamnet får inte vara längre än 50 tecken")
    .refine(value => /^[^\\\/\?\*\"\<\>\:\|]+$/.test(value), {
      message: "Mappnamnet innehåller otillåtna tecken"
    })
});

type AddFolderDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (folderName: string, parentId: string | null) => Promise<boolean>;
  parentFolderName?: string;
  parentFolderId?: string | null;
};

export default function AddFolderDialog({ 
  isOpen, 
  onClose, 
  onSubmit,
  parentFolderName = "Files",
  parentFolderId = ""
}: AddFolderDialogProps) {
  const { currentProject } = useProjectContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      folderName: ""
    }
  });
  
  // Hanterar inlämning av formuläret
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const success = await onSubmit(values.folderName, parentFolderId);
      if (success) {
        form.reset();
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        // Nollställ formuläret när dialogen stängs
        form.reset();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa ny mapp</DialogTitle>
          <DialogDescription>
            {parentFolderId 
              ? `Lägg till en ny undermapp i "${parentFolderName}"`
              : `Lägg till en ny mapp i "${currentProject?.name || 'projektet'}"`}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="folderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mappnamn</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ange ett namn för mappen" 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button variant="outline" type="button" onClick={onClose}>
                Avbryt
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Skapar..." : "Skapa mapp"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}