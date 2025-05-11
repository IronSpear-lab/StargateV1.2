import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  birthDate: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().optional(),
  avatarDataUrl: z.string().optional() // För att hålla den aktuella avataren
});

type UserProfileDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  initialAvatar?: string | null;
  onAvatarChange?: (avatar: string | null) => void;
  userProfile?: {
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    birthDate?: string;
    jobTitle?: string;
    department?: string;
    bio?: string;
  };
};

export default function UserProfileDialog({ 
  isOpen, 
  onClose, 
  initialAvatar, 
  onAvatarChange,
  userProfile = {}
}: UserProfileDialogProps) {
  const { user } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatar || null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: userProfile?.displayName || '',
      email: userProfile?.email || '',
      phoneNumber: userProfile?.phoneNumber || '',
      birthDate: userProfile?.birthDate || '',
      jobTitle: userProfile?.jobTitle || '',
      department: userProfile?.department || '',
      bio: userProfile?.bio || '',
      avatarDataUrl: initialAvatar || ''
    }
  });
  
  // Hanterare för att förhandsgranska och konvertera avatarbilden
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kontrollera filtyp och storlek
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        toast({
          title: "Ogiltig filtyp",
          description: "Endast JPG, PNG och GIF-bilder är tillåtna",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB gräns
        toast({
          title: "Filen är för stor",
          description: "Maximal filstorlek är 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Konvertera bild till data URL för förhandsgranskning
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAvatarPreview(dataUrl);
        form.setValue('avatarDataUrl', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Spara användarprofiländringar
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Spara avatar om det finns en ny
    if (avatarPreview && onAvatarChange) {
      onAvatarChange(avatarPreview);
    }
    
    // Spara profilinformation i localStorage
    if (user?.username) {
      const userPrefix = `${user.username}_`;
      localStorage.setItem(`${userPrefix}displayName`, data.displayName || '');
      localStorage.setItem(`${userPrefix}email`, data.email || '');
      localStorage.setItem(`${userPrefix}phoneNumber`, data.phoneNumber || '');
      localStorage.setItem(`${userPrefix}birthDate`, data.birthDate || '');
      localStorage.setItem(`${userPrefix}jobTitle`, data.jobTitle || '');
      localStorage.setItem(`${userPrefix}department`, data.department || '');
      localStorage.setItem(`${userPrefix}bio`, data.bio || '');
    }
    
    toast({
      title: "Profilinformation uppdaterad",
      description: "Dina profilinställningar har sparats"
    });
    
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redigera profil</DialogTitle>
          <DialogDescription>
            Uppdatera din profilinformation och avatar
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Avatar upload sektion */}
            <div className="flex flex-col items-center justify-center mb-4">
              <Avatar className="w-20 h-20 mb-2 border-2 border-border">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Avatar preview" />
                ) : (
                  <AvatarFallback>
                    {user?.username ? user.username.slice(0, 2).toUpperCase() : 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div>
                <Input
                  type="file"
                  accept="image/jpeg, image/png, image/gif"
                  onChange={handleAvatarChange}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG eller GIF. Max 5MB.
                </p>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visningsnamn</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ange ditt namn" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="din@epost.se" type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefonnummer</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+46 70 123 4567" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jobbtitel</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Projektledare" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avdelning</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="IT-avdelningen" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Om mig</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Skriv en kort beskrivning om dig själv" 
                      className="resize-none h-20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <input type="hidden" {...form.register('avatarDataUrl')} />
            
            <DialogFooter className="flex justify-between sm:justify-between gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Avbryt
              </Button>
              <Button type="submit">
                Spara ändringar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}