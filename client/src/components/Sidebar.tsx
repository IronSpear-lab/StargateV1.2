import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  Home, 
  LayoutDashboard, 
  FolderClosed, 
  CheckSquare, 
  FileText,
  Calendar, 
  Columns, 
  BookOpen, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Briefcase,
  BarChart2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Users,
  Clock,
  PieChart,
  MessageSquare,
  Mail,
  HelpCircle,
  CircleUser,
  Search,
  Box,
  Plus,
  Shield,
  Trash2,
  Package,
  Hammer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ModeToggle } from "@/components/mode-toggle";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from "@/components/ui/context-menu";
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

interface SidebarProps {
  className?: string;
}

type NavItemType = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  active?: boolean;
  indent?: number;
  children?: NavItemType[];
  type?: 'folder' | 'file' | 'link' | string; // För att kunna identifiera mappar och visa plustecken
  onAddClick?: () => void;
  folderId?: string; // ID för mappen, används för borttagning
};

interface NavGroupProps {
  item: NavItemType;
  isOpen: boolean;
  onToggle: () => void;
  location: string;
}

// Folder creation dialog component
function AddFolderDialog({ 
  isOpen, 
  onClose, 
  parentFolderName, 
  onCreateFolder 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  parentFolderName: string;
  onCreateFolder: (folderName: string, parentName: string) => void;
}) {
  const [folderName, setFolderName] = useState("");
  const { toast } = useToast();
  
  const handleSubmit = () => {
    if (!folderName.trim()) {
      toast({
        title: "Fel",
        description: "Mappnamn kan inte vara tomt",
        variant: "destructive"
      });
      return;
    }
    
    onCreateFolder(folderName, parentFolderName);
    setFolderName(""); // Återställ formuläret
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skapa ny mapp</DialogTitle>
          <DialogDescription>
            Skapa en ny mapp under "{parentFolderName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="folderName">Mappnamn</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ange mappnamn"
              autoFocus
            />
          </div>
        </div>
        
        <DialogFooter className="sm:justify-end">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
          >
            Avbryt
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
          >
            Skapa mapp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Profile Settings Dialog Component
function ProfileSettingsDialog({
  isOpen,
  onClose,
  currentUser,
  onSaveProfile
}: {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSaveProfile: (formData: FormData) => void;
}) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // För nya profilfält
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [jobTitle, setJobTitle] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  
  // Aktiv flik i profilen
  const [activeTab, setActiveTab] = useState<"personal" | "appearance" | "notifications" | "account">("personal");
  
  // Återställ state när dialogrutan öppnas eller användaren ändras
  useEffect(() => {
    if (isOpen && currentUser) {
      // Ställ in förhandsgranskning av avatar
      if (currentUser?.avatarUrl) {
        setPreviewUrl(currentUser.avatarUrl);
      } else if (currentUser?.role) {
        setPreviewUrl(`/avatars/${currentUser.role}.svg`);
      } else {
        setPreviewUrl(null);
      }
      setSelectedImage(null);
      
      // Hämta sparade profiluppgifter från localStorage
      const userPrefix = `userProfile_${currentUser.username}_`;
      
      setDisplayName(localStorage.getItem(`${userPrefix}displayName`) || currentUser.username || "");
      setEmail(localStorage.getItem(`${userPrefix}email`) || "");
      setPhoneNumber(localStorage.getItem(`${userPrefix}phoneNumber`) || "");
      setBirthDate(localStorage.getItem(`${userPrefix}birthDate`) || "");
      setJobTitle(localStorage.getItem(`${userPrefix}jobTitle`) || "");
      setDepartment(localStorage.getItem(`${userPrefix}department`) || "");
      setBio(localStorage.getItem(`${userPrefix}bio`) || "");
    }
  }, [isOpen, currentUser]);
  
  // Hantera filinladdning
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB gräns
        toast({
          title: "Filen är för stor",
          description: "Vänligen välj en bild som är mindre än 5MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ogiltigt filformat",
          description: "Vänligen välj en bildfil",
          variant: "destructive"
        });
        return;
      }
      
      setSelectedImage(file);
      
      // Skapa förhandsgransknings-URL
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleSave = () => {
    // Kontrollera avatar
    if (activeTab === "appearance" && !selectedImage && !previewUrl) {
      toast({
        title: "Ingen bild vald",
        description: "Vänligen välj en profilbild",
        variant: "destructive"
      });
      return;
    }
    
    // Skapa FormData för att skicka till föräldrakomponenten
    const formData = new FormData();
    
    // Lägg till profilbild om den finns
    if (selectedImage) {
      formData.append('avatar', selectedImage);
    } else if (previewUrl && previewUrl.startsWith('/avatars/')) {
      // Använd befintlig avatar från fördefinierade
      formData.append('avatarPath', previewUrl);
    } else if (previewUrl) {
      // Använd dataBild 
      formData.append('avatarDataUrl', previewUrl);
    }
    
    // Lägg till övriga profiluppgifter
    formData.append('displayName', displayName);
    formData.append('email', email);
    formData.append('phoneNumber', phoneNumber);
    formData.append('birthDate', birthDate);
    formData.append('jobTitle', jobTitle);
    formData.append('department', department);
    formData.append('bio', bio);
    
    // Spara all information i localStorage med användarspecifikt prefix
    if (currentUser?.username) {
      const userPrefix = `userProfile_${currentUser.username}_`;
      localStorage.setItem(`${userPrefix}displayName`, displayName);
      localStorage.setItem(`${userPrefix}email`, email);
      localStorage.setItem(`${userPrefix}phoneNumber`, phoneNumber);
      localStorage.setItem(`${userPrefix}birthDate`, birthDate);
      localStorage.setItem(`${userPrefix}jobTitle`, jobTitle);
      localStorage.setItem(`${userPrefix}department`, department);
      localStorage.setItem(`${userPrefix}bio`, bio);
    }
    
    // Skicka till parent
    onSaveProfile(formData);
    onClose();
  };
  
  const handleSelectPredefined = (role: string) => {
    setSelectedImage(null);
    setPreviewUrl(`/avatars/${role}.svg`);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Profilinställningar</DialogTitle>
          <DialogDescription>
            Hantera din profilinformation och inställningar
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-1 overflow-hidden gap-6 pt-6">
          {/* Sidomeny för flikar */}
          <div className="w-48 border-r pr-4 flex flex-col gap-2">
            <Button 
              variant={activeTab === "personal" ? "default" : "ghost"} 
              className="justify-start" 
              onClick={() => setActiveTab("personal")}
            >
              <CircleUser className="h-4 w-4 mr-2" />
              Personuppgifter
            </Button>
            <Button 
              variant={activeTab === "appearance" ? "default" : "ghost"} 
              className="justify-start" 
              onClick={() => setActiveTab("appearance")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Utseende
            </Button>
            <Button 
              variant={activeTab === "notifications" ? "default" : "ghost"} 
              className="justify-start" 
              onClick={() => setActiveTab("notifications")}
            >
              <Mail className="h-4 w-4 mr-2" />
              Notifikationer
            </Button>
            <Button 
              variant={activeTab === "account" ? "default" : "ghost"} 
              className="justify-start" 
              onClick={() => setActiveTab("account")}
            >
              <Shield className="h-4 w-4 mr-2" />
              Konto
            </Button>
          </div>
          
          {/* Huvudinnehåll */}
          <div className="flex-1 overflow-y-auto pr-2">
            {/* Personuppgifter */}
            {activeTab === "personal" && (
              <div className="space-y-6">
                <div className="flex gap-4 items-center">
                  <Avatar className="h-20 w-20">
                    {previewUrl ? (
                      <AvatarImage src={previewUrl} alt="Profilbild" />
                    ) : null}
                    <AvatarFallback className={`text-lg ${
                      currentUser?.role === 'project_leader' ? 'bg-[#727cf5]' :
                      currentUser?.role === 'admin' ? 'bg-[#fa5c7c]' :
                      currentUser?.role === 'superuser' ? 'bg-[#ffc35a]' :
                      'bg-[#0acf97]'
                    }`}>
                      {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : "??"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="text-lg font-semibold">{displayName || currentUser?.username || "Användare"}</h3>
                    <p className="text-muted-foreground text-sm capitalize">{currentUser?.role || "användare"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Visningsnamn</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ditt namn"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">E-post</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="din.mail@exempel.se"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Telefonnummer</Label>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+46 70 123 45 67"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Födelsedatum</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Jobbtitel</Label>
                    <Input
                      id="jobTitle"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Projektledare"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department">Avdelning</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Teknik"
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="bio">Om mig</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Berätta lite om dig själv..."
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Utseende */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <h3 className="text-lg font-semibold self-start">Profilbild</h3>
                  
                  <Avatar className="h-32 w-32">
                    {previewUrl ? (
                      <AvatarImage src={previewUrl} alt="Förhandsgranskning" />
                    ) : null}
                    <AvatarFallback className={`text-xl ${
                      currentUser?.role === 'project_leader' ? 'bg-[#727cf5]' :
                      currentUser?.role === 'admin' ? 'bg-[#fa5c7c]' :
                      currentUser?.role === 'superuser' ? 'bg-[#ffc35a]' :
                      'bg-[#0acf97]'
                    }`}>
                      {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : "??"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button type="button" onClick={handleBrowseClick} variant="outline">
                    Välj från dator
                  </Button>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="mb-2 block">Eller välj en fördefinierad avatar</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="p-3 h-auto"
                      onClick={() => handleSelectPredefined('admin')}
                    >
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/avatars/admin.svg" alt="Admin" />
                        <AvatarFallback className="bg-[#fa5c7c]">AD</AvatarFallback>
                      </Avatar>
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="p-3 h-auto"
                      onClick={() => handleSelectPredefined('project_leader')}
                    >
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/avatars/project_leader.svg" alt="Project Leader" />
                        <AvatarFallback className="bg-[#727cf5]">PL</AvatarFallback>
                      </Avatar>
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="p-3 h-auto"
                      onClick={() => handleSelectPredefined('user')}
                    >
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/avatars/user.svg" alt="User" />
                        <AvatarFallback className="bg-[#0acf97]">US</AvatarFallback>
                      </Avatar>
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="p-3 h-auto"
                      onClick={() => handleSelectPredefined('superuser')}
                    >
                      <Avatar className="h-16 w-16">
                        <AvatarImage src="/avatars/superuser.svg" alt="Super User" />
                        <AvatarFallback className="bg-[#ffc35a]">SU</AvatarFallback>
                      </Avatar>
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Temainställningar</h3>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Mörkt läge</h4>
                      <p className="text-sm text-muted-foreground">Byt mellan ljust och mörkt läge</p>
                    </div>
                    <ModeToggle />
                  </div>
                </div>
              </div>
            )}
            
            {/* Notifikationer */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Notifikationsinställningar</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">E-post notifikationer</h4>
                      <p className="text-sm text-muted-foreground">Få uppdateringar via e-post</p>
                    </div>
                    <Switch id="email-notifications" />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Webbnotifikationer</h4>
                      <p className="text-sm text-muted-foreground">Få notifikationer i webbläsaren</p>
                    </div>
                    <Switch id="browser-notifications" />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Nya meddelanden</h4>
                      <p className="text-sm text-muted-foreground">Notifiera mig om nya meddelanden</p>
                    </div>
                    <Switch id="message-notifications" defaultChecked />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Uppgiftsändringar</h4>
                      <p className="text-sm text-muted-foreground">Notifiera mig när uppgifter ändras</p>
                    </div>
                    <Switch id="task-notifications" defaultChecked />
                  </div>
                </div>
              </div>
            )}
            
            {/* Kontoinställningar */}
            {activeTab === "account" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Kontoinställningar</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Användarnamn</Label>
                    <Input
                      id="username"
                      value={currentUser?.username || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Kontakta administratören för att ändra användarnamn</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Roll</Label>
                    <Input
                      id="role"
                      value={currentUser?.role || ""}
                      disabled
                      className="bg-muted capitalize"
                    />
                    <p className="text-xs text-muted-foreground">Din användarroll i systemet</p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Byt lösenord</h4>
                    <p className="text-sm text-muted-foreground mb-4">Uppdatera ditt lösenord</p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Nuvarande lösenord</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-password">Nytt lösenord</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Bekräfta nytt lösenord</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                      
                      <Button type="button" className="mt-2">
                        Uppdatera lösenord
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="border-t pt-4 mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Avbryt
          </Button>
          <Button type="button" onClick={handleSave}>
            Spara ändringar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Sidebar({ className }: SidebarProps): JSX.Element {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "-Planning": false,
    "-Vault": true,
    "-Vault-Files": true
  });
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedParentFolder, setSelectedParentFolder] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderToDeleteId, setFolderToDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // State för att lagra mappar som användaren har skapat
  const [userCreatedFolders, setUserCreatedFolders] = useState<{name: string; parent: string; id: string}[]>(() => {
    // Försök att hämta sparade mappar från localStorage vid initialisering
    if (typeof window !== 'undefined') {
      const savedFolders = localStorage.getItem('userCreatedFolders');
      return savedFolders ? JSON.parse(savedFolders) : [];
    }
    return [];
  });
  
  // State för användarens profilbild med lagring i localStorage
  const [userAvatar, setUserAvatar] = useState<string | null>(() => {
    // Hämta profil från localStorage vid initialisering
    if (typeof window !== 'undefined' && user?.username) {
      const savedAvatar = localStorage.getItem(`userAvatar_${user.username}`);
      return savedAvatar;
    }
    return null;
  });
  
  // Uppdatera avatar när användaren ändras
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.username) {
      const savedAvatar = localStorage.getItem(`userAvatar_${user.username}`);
      setUserAvatar(savedAvatar);
    }
  }, [user?.username]);
  
  // Import queryClient vid toppen av filen
  const queryClient = useQueryClient();

  // Fetch unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread-count'],
    refetchInterval: 5000, // Polling every 5 seconds for faster updates
    staleTime: 2000, // Mark data as stale quickly
  });
  
  // Ta bort automatisk nollställning när messages-sidan öppnas
  // Notiser ska endast försvinna när en specifik konversation öppnas
  // Inte bara när messages-sidan navigeras till

  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleItem = (itemName: string) => {
    setOpenItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const getInitials = (username: string) => {
    // Om användarnamnet innehåller mellanslag, använd första bokstaven i varje ord
    // Annars, använd de två första bokstäverna
    if (username.includes(' ')) {
      return username
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase();
    } else {
      return username.slice(0, 2).toUpperCase();
    }
  };

  // Funktion för att hantera "Lägg till mapp" i olika mappar
  // Kontrollera behörighet för att endast tillåta project_leader, admin och superuser
  const handleAddFolder = (parentName: string) => {
    // Om användaren inte har rätt roll, visa en toast med felmeddelande
    if (!user || !(user.role === "project_leader" || user.role === "admin" || user.role === "superuser")) {
      toast({
        title: "Behörighet saknas",
        description: "Du har inte behörighet att skapa mappar",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedParentFolder(parentName);
    setFolderDialogOpen(true);
  };
  
  // Funktion för att skapa en ny mapp
  const createFolder = (folderName: string, parentName: string) => {
    // Skapa ett unikt ID för mappen
    const folderId = `folder_${Date.now()}`;
    
    // Skapa den nya mappen med unik ID
    const newFolder = { name: folderName, parent: parentName, id: folderId };
    
    // Uppdatera state
    const updatedFolders = [...userCreatedFolders, newFolder];
    setUserCreatedFolders(updatedFolders);
    
    // Spara i localStorage
    localStorage.setItem('userCreatedFolders', JSON.stringify(updatedFolders));
    
    // Visa meddelande om att mappen har skapats
    toast({
      title: "Mapp skapad",
      description: `Mappen "${folderName}" har skapats under "${parentName}"`,
    });
  };
  
  // Funktion för att hantera klick på "Ta bort" ikonen
  const handleDeleteClick = (folderId: string) => {
    // Kontrollera behörighet för att endast tillåta project_leader, admin och superuser
    if (!user || !(user.role === "project_leader" || user.role === "admin" || user.role === "superuser")) {
      toast({
        title: "Behörighet saknas",
        description: "Du har inte behörighet att ta bort mappar",
        variant: "destructive"
      });
      return;
    }
    
    setFolderToDeleteId(folderId);
    setDeleteDialogOpen(true);
  };
  
  // Funktion för att ta bort en mapp
  const deleteFolder = () => {
    // Om ingen mapp är markerad för borttagning, avbryt
    if (!folderToDeleteId) return;
    
    // Hitta mappen som ska tas bort
    const folderToDelete = userCreatedFolders.find(folder => folder.id === folderToDeleteId);
    if (!folderToDelete) return;
    
    // Filtrera bort mappen och eventuella undermappar
    const updatedFolders = userCreatedFolders.filter(folder => {
      // Ta bort den specifika mappen
      if (folder.id === folderToDeleteId) return false;
      
      // Ta bort alla undermappar till den här mappen
      if (folder.parent === folderToDelete.name) return false;
      
      return true;
    });
    
    // Uppdatera state
    setUserCreatedFolders(updatedFolders);
    
    // Spara i localStorage
    localStorage.setItem('userCreatedFolders', JSON.stringify(updatedFolders));
    
    // Visa meddelande om att mappen har tagits bort
    toast({
      title: "Mapp borttagen",
      description: `Mappen "${folderToDelete.name}" har tagits bort`,
    });
    
    // Återställ mapp-ID och stäng dialogen
    setFolderToDeleteId(null);
    setDeleteDialogOpen(false);
  };
  
  // Funktion för att hitta den rätta föräldern för en nyskapad mapp och uppdatera den
  const findParentAndAddFolder = (
    items: NavItemType[], 
    parentName: string, 
    newFolder: { name: string, parent: string, id: string }
  ): NavItemType[] => {
    return items.map(item => {
      // Om denna mapp är föräldern, lägg till den nya mappen som ett barn
      if (item.label === parentName && item.type === "folder") {
        // Skapa en kopia med den nya mappen
        return {
          ...item,
          children: [
            ...(item.children || []),
            {
              href: "#",
              label: newFolder.name,
              active: false,
              indent: (item.indent || 0) + 1,
              icon: <FolderClosed className={`w-4 h-4`} />,
              type: "folder",
              onAddClick: () => handleAddFolder(newFolder.name),
              folderId: newFolder.id, // Lägg till ID för identifiering och borttagning
              children: []
            }
          ]
        };
      }
      
      // Om detta objekt har barn, sök rekursivt
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: findParentAndAddFolder(item.children, parentName, newFolder)
        };
      }
      
      // Annars returnera objektet oförändrat
      return item;
    });
  };
  
  // Lista med de grundläggande navigationslänkarna
  const baseNavItems: NavItemType[] = [
    {
      href: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      active: location === "/",
      type: "link"
    },
    // Projektledardashboard - endast synlig för project_leader och admin
    ...((user?.role === "project_leader" || user?.role === "admin") ? [{
      href: "/project-leader-dashboard",
      label: "Project Leader Dashboard",
      icon: <BarChart2 className="w-5 h-5" />,
      active: location === "/project-leader-dashboard",
      type: "link",
      badge: "New"
    }] : []),
    {
      href: "#", // No direct planning page
      label: "Planning",
      icon: <Briefcase className="w-5 h-5" />,
      active: location === "/kanban" || location === "/gantt" || 
              location === "/planning/kanban" || location === "/planning/gantt-chart",
      children: [
        {
          href: "/kanban", // Match the route in App.tsx
          label: "Kanban",
          icon: <Columns className="w-4 h-4" />,
          active: location === "/kanban" || location === "/planning/kanban",
          indent: 1
        },
        {
          href: "/planning/gantt-chart", // Match the route in App.tsx
          label: "Gantt Chart",
          icon: <BarChart2 className="w-4 h-4" />,
          active: location === "/gantt" || location === "/planning/gantt-chart",
          indent: 1
        }
      ]
    },
    {
      href: "#",
      label: "Communication",
      icon: <MessageSquare className="w-5 h-5" />,
      active: location === "/communication" || location === "/messages" || location.startsWith("/communication/"),
      badge: unreadData?.count && unreadData.count > 0 ? String(unreadData.count) : undefined,
      children: [
        {
          href: "/messages",
          label: "Messages",
          icon: <Mail className="w-4 h-4" />,
          active: location === "/messages" || location === "/communication/messages",
          indent: 1,
          badge: unreadData?.count && unreadData.count > 0 ? String(unreadData.count) : undefined
        }
      ]
    },
    {
      href: "#",
      label: "3D Viewer",
      icon: <Box className="w-5 h-5" />,
      active: location === "/3d-viewer" || 
              location === "/3d-viewer/design" || 
              location === "/3d-viewer/byggarbetsplats",
      children: [
        {
          href: "/3d-viewer",
          label: "3D Översikt",
          icon: <Box className="w-4 h-4" />,
          active: location === "/3d-viewer",
          indent: 1
        },
        {
          href: "/3d-viewer/design",
          label: "Design",
          icon: <Package className="w-4 h-4" />,
          active: location === "/3d-viewer/design",
          indent: 1
        },
        {
          href: "/3d-viewer/byggarbetsplats",
          label: "Byggarbetsplats",
          icon: <Hammer className="w-4 h-4" />,
          active: location === "/3d-viewer/byggarbetsplats",
          indent: 1
        }
      ]
    },
    {
      href: "#",
      label: "Vault",
      icon: <FolderClosed className="w-5 h-5" />,
      active: location.startsWith("/vault"),
      children: [
        {
          href: "/vault",
          label: "Home",
          active: location === "/vault",
          indent: 1,
          icon: <Home className="w-4 h-4" />
        },
        {
          href: "/vault/comments",
          label: "Comments",
          active: location === "/vault/comments",
          indent: 1,
          icon: <MessageSquare className="w-4 h-4" />
        },
        {
          href: "#",
          label: "Review Package",
          active: location.startsWith("/vault/review"),
          indent: 1,
          icon: <CheckSquare className="w-4 h-4" />,
          children: []
        },
        {
          href: "#",
          label: "Files",
          active: location.startsWith("/vault/files"),
          indent: 1,
          icon: <FileText className="w-4 h-4" />,
          type: "folder",
          onAddClick: () => handleAddFolder("Files"),
          children: [
            {
              href: "#",
              label: "01- Organisation",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              type: "folder",
              onAddClick: () => handleAddFolder("01- Organisation"),
              children: []
            },
            {
              href: "#",
              label: "02- Projektering",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              type: "folder",
              onAddClick: () => handleAddFolder("02- Projektering"),
              children: []
            },
            {
              href: "#",
              label: "00- Gemensam",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              type: "folder",
              onAddClick: () => handleAddFolder("00- Gemensam"),
              children: []
            },
            {
              href: "#",
              label: "01- Arkitekt",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              type: "folder",
              onAddClick: () => handleAddFolder("01- Arkitekt"),
              children: [
                {
                  href: "/vault/files/ritningar",
                  label: "1. Ritningar",
                  active: location === "/vault/files/ritningar",
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  type: "folder",
                  onAddClick: () => handleAddFolder("1. Ritningar"),
                  children: []
                },
                {
                  href: "/dwg-ifc-viewer",
                  label: "2. DWG & IFC",
                  active: location === "/dwg-ifc-viewer",
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  type: "folder",
                  onAddClick: () => handleAddFolder("2. DWG & IFC"),
                  children: []
                },
                {
                  href: "#",
                  label: "3. Beskrivningar",
                  active: false,
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  type: "folder",
                  onAddClick: () => handleAddFolder("3. Beskrivningar"),
                  children: []
                },
                {
                  href: "#",
                  label: "4. Underlag",
                  active: false,
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  type: "folder",
                  onAddClick: () => handleAddFolder("4. Underlag"),
                  children: []
                },
                {
                  href: "#",
                  label: "5. Egenkontroller",
                  active: false,
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  type: "folder",
                  onAddClick: () => handleAddFolder("5. Egenkontroller"),
                  children: []
                }
              ]
            },
            {
              href: "#",
              label: "02- Akustik",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              type: "folder",
              onAddClick: () => handleAddFolder("02- Akustik"),
              children: []
            },
            {
              href: "#",
              label: "02- Brand",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              type: "folder",
              onAddClick: () => handleAddFolder("02- Brand"),
              children: []
            }
          ]
        },
        {
          href: "#",
          label: "Versionset",
          active: location.startsWith("/vault/versions"),
          indent: 1,
          icon: <Clock className="w-4 h-4" />,
          children: []
        },
        {
          href: "#",
          label: "Meetings",
          active: location.startsWith("/vault/meetings"),
          indent: 1,
          icon: <Users className="w-4 h-4" />,
          children: []
        }
      ]
    }
  ];
  
  // Skapa slutliga navigationsobjektet med användar-skapade mappar
  const getNavItems = (): NavItemType[] => {
    // Börja med kopian av grundnavigationen
    let navCopy = [...baseNavItems];
    
    // Lägg till alla användar-skapade mappar
    userCreatedFolders.forEach(folder => {
      navCopy = findParentAndAddFolder(navCopy, folder.parent, folder);
    });
    
    return navCopy;
  };
  
  // Hämta den aktiva navigationslistan
  const navItems = getNavItems();

  if (!isOpen && isMobile) {
    return (
      <button 
        onClick={toggleSidebar} 
        className="fixed top-4 left-4 z-50 p-2 text-muted-foreground hover:text-foreground md:hidden"
      >
        <Menu className="w-6 h-6" />
      </button>
    );
  }

  // Recursive function to render navigation items
  const renderNavItems = (items: NavItemType[], parentKey: string = '') => {
    return items.map((item, index) => {
      const itemKey = `${parentKey}-${item.label}`;
      const hasChildren = item.children && item.children.length > 0;
      const isItemOpen = openItems[itemKey] !== undefined ? openItems[itemKey] : false;
      
      // Calculate indentation based on level
      let indentClass = '';
      if (item.indent === 1) indentClass = isOpen ? 'pl-4' : 'pl-0';
      else if (item.indent === 2) indentClass = isOpen ? 'pl-8' : 'pl-0';
      else if (item.indent === 3) indentClass = isOpen ? 'pl-12' : 'pl-0';
      else if (item.indent === 4) indentClass = isOpen ? 'pl-16' : 'pl-0';
      
      // Om sidofältet är minimerat och inte är mobilvy
      if (!isOpen && !isMobile) {
        const isHovered = item.active; // Vi använder 'active' för att simulera hover i detta exempel
        
        return (
          <div key={itemKey} className="relative group">
            <div className="flex w-full">
              {/* Ikon till vänster */}
              {hasChildren ? (
                <button 
                  className={cn(
                    "flex items-center justify-center w-full py-2 rounded-md transition-colors duration-150 sidebar-nav-item group",
                    item.active
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    "px-0 mx-auto"
                  )}
                  onClick={() => toggleItem(itemKey)}
                >
                  <span className={cn(
                    "flex items-center justify-center",
                    item.active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.icon}
                  </span>
                </button>
              ) : (
                <Link 
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center py-2 rounded-md transition-colors duration-150 w-full sidebar-nav-item group",
                    item.active
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    "px-0 mx-auto"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center",
                    item.active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.icon}
                  </span>
                </Link>
              )}
              
              {/* Tooltip som visas vid hover (endast för när sidebar är minimerad) */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 bg-white dark:bg-white/5 border border-border rounded-md shadow-md transition-opacity duration-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible">
                <div className="py-2 px-3 whitespace-nowrap flex items-center justify-between">
                  <span className="font-medium text-sm">{item.label}</span>
                  
                  {/* Plus-ikon för mappar i minimerat läge */}
                  {item.type === "folder" && item.onAddClick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        item.onAddClick?.();
                      }}
                      className="ml-3 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                  
                  {/* Badge (om det finns) */}
                  {item.badge && (
                    <Badge variant="outline" className={cn(
                      "text-xs py-0.5 px-2 rounded-full ml-2",
                      item.active 
                        ? "bg-primary/10 text-primary border-primary/20" 
                        : "bg-muted text-muted-foreground border-border"
                    )}>
                      {item.badge}
                    </Badge>
                  )}
                </div>
                
                {/* Om det är en undermenygrupp och den är öppen, visa undermenyerna */}
                {hasChildren && isItemOpen && (
                  <div className="border-t border-border pt-1 mt-1">
                    {item.children!.map((child, idx) => (
                      <Link 
                        key={idx}
                        href={child.href}
                        className="block px-3 py-1 hover:bg-muted whitespace-nowrap"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Original rendering for expanded sidebar
      return (
        <div key={itemKey}>
          {hasChildren ? (
            <Collapsible open={isItemOpen} onOpenChange={() => toggleItem(itemKey)}>
              <CollapsibleTrigger asChild>
                {/* Om det är en användarskapad mapp med folderId */}
                {item.type === "folder" && item.folderId ? (
                  <button 
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors duration-150 group",
                      item.active
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      indentClass
                    )}
                  >
                    <div className="flex items-center">
                      {/* Ta bort-knapp för användarskapade mappar */}
                      {user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && item.type === "folder" && item.folderId && (
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item.folderId!);
                          }}
                          className={cn(
                            "h-5 w-5 p-0 mr-1 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
                            "text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          )}
                          aria-label="Ta bort mapp"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <span className={cn(
                        "flex items-center justify-center mr-3",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.icon}
                      </span>
                      <span className={cn(
                        "text-sm",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {item.badge && (
                        <Badge variant="outline" className={cn(
                          "text-xs py-0.5 px-2 rounded-full mr-2",
                          item.active 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-muted text-muted-foreground border-border"
                        )}>
                          {item.badge}
                        </Badge>
                      )}
                      
                      {/* Borttagningsknappen har flyttats till vänster om mappikonen */}
                      
                      {/* Lägg till plustecken för mappar - endast för project_leader, admin och superuser */}
                      {item.type === "folder" && item.onAddClick && user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Förhindra att mappknappen klickas
                            item.onAddClick?.();
                          }}
                          className="mr-1 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                      
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isItemOpen ? "rotate-90" : ""
                      )} />
                    </div>
                  </button>
                ) : (
                  <button 
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors duration-150 group",
                      item.active
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      indentClass
                    )}
                  >
                    <div className="flex items-center">
                      {/* Ta bort-knapp för alla mappar */}
                      {user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && item.type === "folder" && (
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Hantera borttagning endast om mappen har ett folderId (användarskapad)
                            if (item.folderId) {
                              handleDeleteClick(item.folderId);
                            }
                          }}
                          className={cn(
                            "h-5 w-5 p-0 mr-1 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
                            // Avaktivera för inbyggda mappar som saknar folderId
                            item.folderId 
                              ? "text-destructive hover:text-destructive-foreground hover:bg-destructive" 
                              : "text-muted pointer-events-none opacity-0"
                          )}
                          aria-label="Ta bort mapp"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <span className={cn(
                        "flex items-center justify-center mr-3",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.icon}
                      </span>
                      <span className={cn(
                        "text-sm",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {item.badge && (
                        <Badge variant="outline" className={cn(
                          "text-xs py-0.5 px-2 rounded-full mr-2",
                          item.active 
                            ? "bg-primary/10 text-primary border-primary/20" 
                            : "bg-muted text-muted-foreground border-border"
                        )}>
                          {item.badge}
                        </Badge>
                      )}
                      
                      {/* Lägg till plustecken för mappar - endast för project_leader, admin och superuser */}
                      {item.type === "folder" && item.onAddClick && user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Förhindra att mappknappen klickas
                            item.onAddClick?.();
                          }}
                          className="mr-1 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                      
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isItemOpen ? "rotate-90" : ""
                      )} />
                    </div>
                  </button>
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 mb-1">
                  {renderNavItems(item.children!, itemKey)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className={cn(
              "flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150 group",
              item.active
                ? "bg-primary/10" 
                : "hover:bg-muted",
              indentClass
            )}>
              <Link 
                href={item.href}
                className={cn(
                  "flex items-center justify-between flex-grow",
                  item.active
                    ? "text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center">
                  {/* Ta bort-knapp som bara visas vid hover */}
                  {user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && item.type === "folder" && (
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Hantera borttagning endast om mappen har ett folderId (användarskapad)
                        if (item.folderId) {
                          handleDeleteClick(item.folderId);
                        }
                      }}
                      className={cn(
                        "h-5 w-5 p-0 mr-1 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
                        // Avaktivera för inbyggda mappar som saknar folderId
                        item.folderId 
                          ? "text-destructive hover:text-destructive-foreground hover:bg-destructive" 
                          : "text-muted pointer-events-none opacity-0"
                      )}
                      aria-label="Ta bort mapp"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <span className={cn(
                    "flex items-center justify-center mr-3",
                    item.active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.icon}
                  </span>
                  <span className={cn(
                    "text-sm",
                    item.active ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <Badge variant="outline" className={cn(
                    "ml-auto text-xs py-0.5 px-2 rounded-full",
                    item.active 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "bg-muted text-muted-foreground border-border"
                  )}>
                    {item.badge}
                  </Badge>
                )}
              </Link>
              
              {/* Plus-ikon för mappar - endast för project_leader, admin och superuser */}
              {item.type === "folder" && item.onAddClick && user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && (
                <button
                  onClick={() => item.onAddClick?.()}
                  className="ml-1 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  // Bekräftelsedialog för borttagning av mapp
  const folderToDelete = folderToDeleteId ? userCreatedFolders.find(f => f.id === folderToDeleteId) : null;
  
  return (
    <>
      {/* Bekräftelsedialog för borttagning av mapp */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Är du säker?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {folderToDelete?.name ? `"${folderToDelete.name}"` : "denna mapp"}? 
              Alla undermappar till mappen tas också bort. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFolderToDeleteId(null)}>
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction onClick={deleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 dark:bg-black dark:bg-opacity-70"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside 
        className={cn(
          "bg-white dark:bg-slate-900 h-full shadow-md transition-all duration-300 overflow-y-auto z-50 flex flex-col border-r border-border",
          isOpen ? "w-64" : "w-20",
          isMobile ? "fixed left-0 top-0" : "sticky top-0",
          className
        )}
      >
        {/* Top Header with Logo */}
        <div className={cn("border-b border-border", isOpen ? "p-4" : "p-2")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white dark:text-primary-foreground">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              {isOpen && (
                <span className="ml-2 text-foreground text-xl font-bold">ValvX</span>
              )}
            </div>
            {isOpen && (
              <div className="flex space-x-1 items-center">
                <ModeToggle />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-full"
                  onClick={toggleSidebar}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Expansion Button - visas endast i minimerat läge */}
        {!isOpen && (
          <div className="flex justify-center py-2">
            <div className="relative group">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-full"
                onClick={toggleSidebar}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Button>
              <div className="absolute left-full ml-2 px-3 py-2 rounded-md bg-white dark:bg-white/5 border border-border shadow-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                Expand Sidebar
              </div>
            </div>
          </div>
        )}

        {/* Dark mode toggle - bara i minimerat läge */}
        {!isOpen && (
          <div className="flex justify-center py-2">
            <div className="relative group">
              <ModeToggle />
              <div className="absolute left-full ml-2 px-3 py-2 rounded-md bg-white dark:bg-white/5 border border-border shadow-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                Toggle Theme
              </div>
            </div>
          </div>
        )}
        
        {isOpen ? (
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search" 
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="py-2 border-b border-border flex justify-center">
            <div className="relative group">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Search className="h-4 w-4 text-muted-foreground" />
              </Button>
              <div className="absolute left-full ml-2 px-3 py-2 rounded-md bg-white dark:bg-white/5 border border-border shadow-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                Search
              </div>
            </div>
          </div>
        )}
        
        <div className="py-2 flex-1 overflow-y-auto">
          {renderNavItems(navItems)}
        </div>
        
        <div className={cn(
          "border-t border-border mt-auto",
          isOpen ? "p-3" : "py-3 px-0"
        )}>
          <Button 
            onClick={handleLogout}
            size="sm"
            variant="ghost"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isOpen ? "w-full justify-start" : "mx-auto"
            )}
          >
            <div className="relative group flex items-center">
              <LogOut className="h-4 w-4" />
              {isOpen && <span className="ml-2 text-sm">Logga ut</span>}
              
              {!isOpen && (
                <div className="absolute left-full ml-2 px-3 py-2 rounded-md bg-white dark:bg-white/5 border border-border shadow-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                  Logga ut
                </div>
              )}
            </div>
          </Button>
          
          <Separator className="my-3" />
          
          <div className={cn(
            "flex items-center",
            isOpen ? "px-1" : "px-2 flex-col space-y-2"
          )}>
            <div className="relative group">
              <Avatar className="h-8 w-8">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt={user?.username || "Användare"} />
                ) : user?.role ? (
                  <AvatarImage src={`/avatars/${user.role}.svg`} alt={user.username} />
                ) : (
                  <AvatarImage src="https://github.com/shadcn.png" />
                )}
                <AvatarFallback className={`${
                  user?.role === 'project_leader' ? 'bg-[#727cf5]' :
                  user?.role === 'admin' ? 'bg-[#fa5c7c]' :
                  user?.role === 'superuser' ? 'bg-[#ffc35a]' :
                  'bg-[#0acf97]'
                }`}>
                  {user ? getInitials(user.username) : "??"}
                </AvatarFallback>
              </Avatar>
              
              {!isOpen && (
                <div className="absolute left-full ml-2 px-3 py-2 rounded-md bg-white dark:bg-white/5 border border-border shadow-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
                  {user ? user.username : "Ej inloggad"}
                </div>
              )}
            </div>
            
            {isOpen && (
              <div className="ml-2">
                <div className="text-sm font-medium">
                  {user ? user.username : "Ej inloggad"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user ? user.role || "Användare" : "Logga in"}
                </div>
              </div>
            )}
            
            {isOpen && (
              <div className="ml-auto">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setProfileDialogOpen(true)}
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
      
      {/* Dialog för att skapa mapp */}
      <AddFolderDialog
        isOpen={folderDialogOpen}
        onClose={() => setFolderDialogOpen(false)}
        parentFolderName={selectedParentFolder}
        onCreateFolder={createFolder}
      />
      
      {/* Profile settings dialog */}
      <ProfileSettingsDialog
        isOpen={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        currentUser={user}
        onSaveProfile={(formData) => {
          // I verklig implementering skulle detta anropa ett API-endpoint
          // som uppdaterar användarens profilinformation
          
          // För demo: spara profilinformation i localStorage
          const userPrefix = user?.username ? `userProfile_${user.username}_` : '';
          
          // Hantera profilbild
          if (formData.get('avatarPath')) {
            const avatarPath = formData.get('avatarPath') as string;
            setUserAvatar(avatarPath);
            
            // Spara i localStorage för att behålla mellan sessioner
            if (user?.username) {
              localStorage.setItem(`userAvatar_${user.username}`, avatarPath);
            }
          } else if (formData.get('avatar')) {
            // I en verklig implementering skulle vi ladda upp bilden till servern
            // och spara URL:en i databasen
            const file = formData.get('avatar') as File;
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              setUserAvatar(dataUrl);
              
              // Spara i localStorage för att behålla mellan sessioner
              if (user?.username) {
                localStorage.setItem(`userAvatar_${user.username}`, dataUrl);
              }
            };
            reader.readAsDataURL(file);
          } else if (formData.get('avatarDataUrl')) {
            const dataUrl = formData.get('avatarDataUrl') as string;
            setUserAvatar(dataUrl);
            
            if (user?.username) {
              localStorage.setItem(`userAvatar_${user.username}`, dataUrl);
            }
          }
          
          // Spara övriga profilinställningar om användaren är inloggad
          if (user?.username) {
            // Hämta värden från formData
            const displayName = formData.get('displayName') as string;
            const email = formData.get('email') as string;
            const phoneNumber = formData.get('phoneNumber') as string;
            const birthDate = formData.get('birthDate') as string;
            const jobTitle = formData.get('jobTitle') as string;
            const department = formData.get('department') as string;
            const bio = formData.get('bio') as string;
            
            // Spara i localStorage med användarspecifikt prefix
            localStorage.setItem(`${userPrefix}displayName`, displayName || '');
            localStorage.setItem(`${userPrefix}email`, email || '');
            localStorage.setItem(`${userPrefix}phoneNumber`, phoneNumber || '');
            localStorage.setItem(`${userPrefix}birthDate`, birthDate || '');
            localStorage.setItem(`${userPrefix}jobTitle`, jobTitle || '');
            localStorage.setItem(`${userPrefix}department`, department || '');
            localStorage.setItem(`${userPrefix}bio`, bio || '');
          }
          
          toast({
            title: "Profilinformation uppdaterad",
            description: "Dina profilinställningar har sparats"
          });
        }}
      />
    </>
  );
}