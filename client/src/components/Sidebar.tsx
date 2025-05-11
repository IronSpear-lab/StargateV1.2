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
  Hammer,
  AlertTriangle
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
  type?: 'folder' | 'file' | 'link' | 'section' | string; // För att kunna identifiera mappar, sektioner och visa plustecken
  onAddClick?: () => void;
  onDeleteAll?: () => void; // Funktion för att radera alla mappar
  folderId?: string; // ID för mappen, används för borttagning
  sectionId?: string; // ID för sektioner som ska kunna öppnas/stängas
  isOpen?: boolean; // Om en sektion är öppen eller stängd
  onToggle?: () => void; // Funktion för att toggla öppna/stängda sektioner
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
  const [openSections, setOpenSections] = useState<string[]>(() => {
    // Retrieve open sections from localStorage if available
    if (typeof window !== 'undefined') {
      const savedSections = localStorage.getItem('openSections');
      return savedSections ? JSON.parse(savedSections) : [];
    }
    return [];
  });
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "-Planning": false,
    "-Vault": false,
    "-Vault-Files": false
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
  
  // Uppdatera mappar när användaren ändras eller loggar in, eller när komponenten renderas
  useEffect(() => {
    if (user) {
      // Hämta och uppdatera mappar från localStorage varje gång komponenten renderas
      const savedFolders = localStorage.getItem('userCreatedFolders');
      if (savedFolders) {
        try {
          const parsedFolders = JSON.parse(savedFolders);
          setUserCreatedFolders(parsedFolders);
          
          // Säkerställ att user_created_folders också är synkroniserat för App.tsx
          const simplifiedFolders = parsedFolders.map((folder: any) => ({
            label: folder.name,
            parent: folder.parent
          }));
          localStorage.setItem('user_created_folders', JSON.stringify(simplifiedFolders));
        } catch (e) {
          console.error("Fel vid parsning av mappar från localStorage:", e);
        }
      }
    }
  }, [user]);
  
  // Lägg till en periodisk kontroll för uppdateringar av localStorage
  // och lyssna på custom events från FolderManagementWidget
  useEffect(() => {
    // Funktionen som kontrollerar localStorage för förändringar
    const checkForFolderUpdates = () => {
      if (typeof window !== 'undefined') {
        const savedFolders = localStorage.getItem('userCreatedFolders');
        if (savedFolders) {
          try {
            const parsedFolders = JSON.parse(savedFolders);
            
            // Hämta aktuellt project-ID
            const projectId = localStorage.getItem('currentProjectId');
            
            // Filtrera mappar baserat på aktuellt projekt, om ett projekt är valt
            const filteredFolders = projectId
              ? parsedFolders.filter((folder: any) => {
                  // Inkludera mappar som saknar projektId och mappar som tillhör aktuellt projekt
                  const matchesProject = !folder.projectId || folder.projectId === projectId;
                  console.log(`Sidebar: Kontrollerar mapp ${folder.name}, projectId=${folder.projectId}, match=${matchesProject}`);
                  return matchesProject;
                })
              : parsedFolders;
              
            // Loggning av mappinformation
            console.log(`Sidebar: Hittade ${filteredFolders.length} mappar för projekt ${projectId || 'inget projekt'}`);
            console.log("Mappar:", filteredFolders.map((f: any) => `${f.name} (${f.projectId || 'ingen projektId'})`));
            
            // Jämför med aktuell state för att undvika onödiga renderingar - med strikt jämförelse
            const currentFolderIds = userCreatedFolders.map((f: any) => f.id).sort().join(',');
            const newFolderIds = filteredFolders.map((f: any) => f.id).sort().join(',');
            
            if (currentFolderIds !== newFolderIds) {
              console.log("Sidebar: Uppdaterar mapplistan från localStorage", {
                gammalt: currentFolderIds,
                nytt: newFolderIds,
                antal: filteredFolders.length
              });
              
              // Uppdatera state med de filtrerade mapparna
              setUserCreatedFolders(filteredFolders);
              
              // Öppna Files-sektionen automatiskt om det finns mappar
              // Ta bort automatisk öppning av Vault och Files när det finns mappar
              // Om användaren vill se mapparna får de öppna Vault manuellt
              if (filteredFolders.length > 0) {
                console.log("Det finns mappar, men vi öppnar inte Vault automatiskt längre");
                // Kommentera bort automatisk öppning av Vault och Files
                // Låt användaren öppna dessa sektioner själv
              }
            }
          } catch (e) {
            console.error("Fel vid periodisk kontroll av mappar i localStorage:", e);
          }
        }
      }
    };
    
    // Eventlyssnare för manuell refresh av mappar (utlöst av FolderManagementWidget)
    const handleFolderStructureChanged = (event: CustomEvent) => {
      console.log("Sidebar: Mottog folder-structure-changed-event", event.detail);
      checkForFolderUpdates();
    };
    
    // Lägg till lyssnare för den anpassade händelsen
    window.addEventListener('folder-structure-changed', handleFolderStructureChanged as EventListener);
    
    // Kör direkt och sätt sedan intervall
    checkForFolderUpdates();
    
    // Sätt ett intervall för att kontrollera var 2:a sekund istället för var 3:e
    const intervalId = setInterval(checkForFolderUpdates, 2000);
    
    // Städa upp intervall och event listener vid unmount
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('folder-structure-changed', handleFolderStructureChanged as EventListener);
    };
  }, [userCreatedFolders]);
  
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
  
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const newOpenSections = prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];
        
      // Save to localStorage whenever the open sections change
      if (typeof window !== 'undefined') {
        localStorage.setItem('openSections', JSON.stringify(newOpenSections));
      }
      
      return newOpenSections;
    });
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
    // Hämta aktuellt project-ID för att knyta mappen till rätt projekt
    const currentProjectId = localStorage.getItem('currentProjectId');
    
    console.log(`createFolder: Skapar mapp '${folderName}' under '${parentName}' för projekt ${currentProjectId || 'inget projekt'}`);
    
    // Skapa ett unikt ID för mappen
    const folderId = `folder_${Date.now()}`;
    
    // Skapa den nya mappen med unik ID och projektID
    const newFolder = { 
      name: folderName, 
      parent: parentName, 
      id: folderId,
      parentId: null, // Denna sätts bara när mappen skapas under en annan mapp
      projectId: currentProjectId, // Lägg till projektId för korrekt filtrering
      label: folderName, // Samma som name, men enklare att använda i andra delar av koden
      href: `/vault/files/${encodeURIComponent(folderName)}` // Länk till den dynamiska sidan
    };
    
    // Hämta alla befintliga mappar från localStorage
    const allUserFolders = JSON.parse(localStorage.getItem('userCreatedFolders') || '[]');
    console.log(`createFolder: Hittade ${allUserFolders.length} existerande mappar i localStorage`);
    
    // Dela upp mapparna mellan aktuellt projekt och andra projekt
    const otherProjectFolders = allUserFolders.filter((f: any) => {
      return !f.projectId || f.projectId !== currentProjectId;
    });
    
    // Hämta mapparna från det aktuella projektet separat
    const currentProjectFolders = allUserFolders.filter((f: any) => {
      return f.projectId && f.projectId === currentProjectId;
    });
    
    console.log(`createFolder: Behåller ${otherProjectFolders.length} mappar från andra projekt och ${currentProjectFolders.length} mappar från aktuellt projekt`);
    
    // Kombinera mappar från både aktuellt projekt och andra projekt med den nya mappen
    const updatedFolders = [...otherProjectFolders, ...currentProjectFolders, newFolder];
    
    // Uppdatera state
    setUserCreatedFolders(updatedFolders);
    console.log(`createFolder: State uppdaterad med ${updatedFolders.length} mappar`);
    
    // Spara i localStorage
    localStorage.setItem('userCreatedFolders', JSON.stringify(updatedFolders));
    
    // Spara även i user_created_folders för App.tsx som behöver känna till mappnamnen
    // Detta behövs för den dynamiska routern
    const existingFoldersForApp = localStorage.getItem('user_created_folders');
    const foldersForApp = existingFoldersForApp ? JSON.parse(existingFoldersForApp) : [];
    
    // Filtrera först ut mappar från andra projekt
    const otherProjectFoldersForApp = foldersForApp.filter((f: any) => {
      return !f.projectId || f.projectId !== currentProjectId;
    });
    
    // Filtrera ut mappar från aktuellt projekt
    const currentProjectFoldersForApp = foldersForApp.filter((f: any) => {
      return f.projectId && f.projectId === currentProjectId;
    });
    
    // Lägg till den nya mappen i listan
    const newFolderForApp = { 
      label: folderName,
      parent: parentName,
      projectId: currentProjectId // Lägg till projektId för korrekt filtrering
    };
    
    // Kombinera mappar från både aktuellt projekt och andra projekt med den nya mappen
    const updatedFoldersForApp = [...otherProjectFoldersForApp, ...currentProjectFoldersForApp, newFolderForApp];
    
    localStorage.setItem('user_created_folders', JSON.stringify(updatedFoldersForApp));
    
    // Säkerställ att Vault-sektionen är öppen
    if (!openSections.includes("vault")) {
      toggleSection("vault");
    }
    
    // Säkerställ att Files-sektionen är öppen
    if (!openItems["file_folders"]) {
      toggleItem("file_folders");
    }
    
    // Utlös en uppdatering av sidofältet
    console.log("createFolder: Utlöser folder-structure-changed event");
    window.dispatchEvent(new CustomEvent('folder-structure-changed', { 
      detail: { projectId: currentProjectId } 
    }));
    
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
    
    // Ta även bort från user_created_folders listan som App.tsx använder
    const existingFoldersForApp = localStorage.getItem('user_created_folders');
    if (existingFoldersForApp) {
      const foldersForApp = JSON.parse(existingFoldersForApp);
      const updatedFoldersForApp = foldersForApp.filter((folder: any) => 
        folder.label !== folderToDelete.name
      );
      localStorage.setItem('user_created_folders', JSON.stringify(updatedFoldersForApp));
    }
    
    // Visa meddelande om att mappen har tagits bort
    toast({
      title: "Mapp borttagen",
      description: `Mappen "${folderToDelete.name}" har tagits bort`,
    });
    
    // Återställ mapp-ID och stäng dialogen
    setFolderToDeleteId(null);
    setDeleteDialogOpen(false);
  };
  
  // Funktion för att ta bort alla mappar
  const deleteAllFolders = () => {
    // Kontrollera behörighet för att endast tillåta project_leader, admin och superuser
    if (!user || !(user.role === "project_leader" || user.role === "admin" || user.role === "superuser")) {
      toast({
        title: "Behörighet saknas",
        description: "Du har inte behörighet att ta bort mappar",
        variant: "destructive"
      });
      return;
    }
    
    // Rensa alla sparade mappar
    localStorage.setItem('userCreatedFolders', '[]');
    localStorage.setItem('user_created_folders', '[]');
    
    // Uppdatera state
    setUserCreatedFolders([]);
    
    // Visa ett meddelande
    toast({
      title: "Alla mappar borttagna",
      description: "Alla mappar har tagits bort från systemet",
    });
    
    // Utlös en uppdatering av sidofältet
    window.dispatchEvent(new CustomEvent('folder-structure-changed'));
  };
  
  // Funktion för att hitta den rätta föräldern för en nyskapad mapp och uppdatera den
  const findParentAndAddFolder = (
    items: NavItemType[], 
    parentName: string, 
    newFolder: { name: string, parent: string, id: string, parentId?: string | null }
  ): NavItemType[] => {
    return items.map(item => {
      // Extra loggutskrift för att hjälpa debug
      console.log(`Checking item ${item.label}, parent=${parentName}, type=${item.type}, folderId=${item.folderId}`);
      
      // STRIKT MATCHNING: Kontrollera om denna mapp är föräldern
      // Vi matchar nu med striktare regler för att undvika dubletter
      const isParentMatch = 
        // Om förälder är "Files" (huvudmappen), matcha på exakt namn 
        // OCH kontrollera att "Files" finns under Vault-sektionen
        (item.label === "Files" && parentName === "Files" && item.folderId === "files_root") ||
        // ELLER om vi har en användarskapad mapp som förälder, matcha strikt på ID
        (item.folderId && newFolder.parentId && item.folderId === newFolder.parentId);
        
      if (isParentMatch) {
        console.log(`✅ STRIKT MATCH! Tilldelar mapp ${newFolder.name} ENDAST till ${item.label} (ID: ${item.folderId})`);
        
        // Kontrollera om mappen redan finns för att undvika dubletter
        const folderAlreadyExists = (item.children || []).some(
          child => child.folderId === newFolder.id || child.label === newFolder.name
        );
        
        if (folderAlreadyExists) {
          console.log(`⚠️ Mappen ${newFolder.name} (ID: ${newFolder.id}) finns redan i ${item.label}, hoppar över`);
          return item; // Returnera oförändrad om mappen redan finns
        }
        
        // Skapa en kopia med den nya mappen
        return {
          ...item,
          type: "folder", // Säkerställ att typen är folder för att visa undermappar
          children: [
            ...(item.children || []),
            {
              href: `/vault/files/${encodeURIComponent(newFolder.name)}`,
              label: newFolder.name,
              active: location === `/vault/files/${encodeURIComponent(newFolder.name)}`,
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
      
      // Om detta objekt har barn, sök rekursivt, men BARA om det är en mapp
      // Detta eliminerar rekursion genom alla typer av element
      if (item.type === "folder" && item.children && item.children.length > 0) {
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
      href: "/time-tracking",
      label: "Tidsrapportering",
      icon: <Clock className="w-5 h-5" />,
      active: location.startsWith("/time-tracking"),
      type: "link",
    },
    {
      href: "#", // No direct planning page
      label: "Projektplanering",
      icon: <Briefcase className="w-5 h-5" />,
      active: location === "/kanban" || location === "/gantt" || 
              location === "/planning/kanban" || location === "/planning/gantt-chart",
      type: "section",
      sectionId: "project-planning",
      isOpen: openSections.includes("project-planning"),
      onToggle: () => toggleSection("project-planning"),
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
      label: "Kommunikation",
      icon: <MessageSquare className="w-5 h-5" />,
      active: location === "/communication" || location === "/messages" || location.startsWith("/communication/"),
      badge: unreadData?.count && unreadData.count > 0 ? String(unreadData.count) : undefined,
      type: "section",
      sectionId: "communication",
      isOpen: openSections.includes("communication"),
      onToggle: () => toggleSection("communication"),
      children: [
        {
          href: "/messages",
          label: "Meddelanden",
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
      type: "section",
      sectionId: "3d-viewer",
      isOpen: openSections.includes("3d-viewer"),
      onToggle: () => toggleSection("3d-viewer"),
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
      type: "section",
      sectionId: "vault",
      isOpen: openSections.includes("vault"),
      onToggle: () => toggleSection("vault"),
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
          type: "link", // Ändra till link för att dölja plus/kryss
          children: []
        },
        {
          href: "#",
          label: "Files",
          active: location.startsWith("/vault/files"),
          indent: 1,
          icon: <FileText className="w-4 h-4" />,
          type: "folder", // För att kunna visa mappar under Files-sektionen
          folderId: "files_root", // Unikt ID för rotkatalogen
          onAddClick: () => handleAddFolder("Files"), // För att lägga till mappar under Files
          isOpen: openItems["file_folders"] || false, // För att hålla mappen öppen/stängd
          onToggle: () => toggleItem("file_folders"), // För att toggla öppen/stängd status
          children: [
            // Dynamiska undermappar kommer att läggas till i useEffect nedan
            // tillsammans med userCreatedFolders
          ]
        },
        {
          href: "#",
          label: "Versionset",
          active: location.startsWith("/vault/versions"),
          indent: 1,
          icon: <Clock className="w-4 h-4" />,
          type: "link", // Ändra till link för att dölja plus/kryss
          children: []
        },
        {
          href: "#",
          label: "Meetings",
          active: location.startsWith("/vault/meetings"),
          indent: 1,
          icon: <Users className="w-4 h-4" />,
          type: "link", // Ändra till link för att dölja plus/kryss
          children: []
        }
      ]
    }
  ];
  
  // Skapa slutliga navigationsobjektet med användar-skapade mappar
  const getNavItems = (): NavItemType[] => {
    // Börja med kopian av grundnavigationen
    let navCopy = [...baseNavItems];
    
    // Logga alla mappar som vi ska försöka lägga till
    console.log(`getNavItems: Försöker lägga till ${userCreatedFolders.length} mappar i Sidebar`);
    
    // Iterera först igenom navigationsobjekten för att hitta Files-sektionen
    let filesSection = null;
    
    // Rekursiv funktion för att hitta Files-sektionen i navigationsobjektet
    const findFilesSection = (items: NavItemType[]): NavItemType | null => {
      for (const item of items) {
        if (item.label === "Files" && item.folderId === "files_root") {
          return item;
        }
        
        if (item.children && item.children.length > 0) {
          const found = findFilesSection(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    // Sök igenom för att hitta Files-sektionen
    const vaultSection = navCopy.find(item => item.label === "Vault");
    if (vaultSection && vaultSection.children) {
      filesSection = findFilesSection(vaultSection.children);
    }
    
    // Om Files-sektionen hittades, lägg till mappar direkt till den
    if (filesSection) {
      console.log("Hittade Files-sektionen i navigationsobjektet:", filesSection.label);
      
      // Skapa barnmappar direkt till Files-sektionen
      if (!filesSection.children) {
        filesSection.children = [];
      }
      
      // Bygg en mappning av alla mappar för snabb åtkomst vid byggande av hierarkin
      const folderMap: Record<string, NavItemType> = {};
      
      // Först skapa alla mappobjekt och spara dem i mappningen
      userCreatedFolders.forEach(folder => {
        folderMap[folder.id] = {
          href: `/vault/files/${encodeURIComponent(folder.name)}`,
          label: folder.name,
          active: location === `/vault/files/${encodeURIComponent(folder.name)}`,
          indent: (filesSection!.indent || 0) + 1, // Standardvärde, justeras senare
          icon: <FolderClosed className="w-4 h-4" />,
          type: "folder",
          onAddClick: () => handleAddFolder(folder.name),
          folderId: folder.id,
          children: []
        };
        
        console.log(`Skapade NavItem för mapp ${folder.name} (ID: ${folder.id})`);
      });
      
      // Identifiera rotmappar (mappar utan förälder eller med förälder "Files")
      const rootFolders = userCreatedFolders.filter(folder => 
        !folder.parent || folder.parent === "Files"
      );
      
      // Lägg till rotmapparna direkt till Files-sektionen
      rootFolders.forEach(folder => {
        // Kontrollera om mappen redan finns i Files-sektionen för att undvika dubletter
        const existingFolder = filesSection!.children!.find(child => 
          child.folderId === folder.id || child.label === folder.name
        );
        
        if (!existingFolder) {
          // Lägg till mappen direkt som ett barnelement till Files-sektionen
          filesSection!.children!.push(folderMap[folder.id]);
          console.log(`Lade till rotmapp ${folder.name} (ID: ${folder.id}) direkt i Files-sektionen`);
        } else {
          console.log(`Rotmappen ${folder.name} finns redan i Files-sektionen, hoppar över`);
        }
      });
      
      // Hantera undermappar genom att koppla dem till sina föräldramappar
      userCreatedFolders.forEach(folder => {
        // Om denna mapp har en förälder som INTE är "Files"
        if (folder.parent && folder.parent !== "Files") {
          // Hitta föräldermappen baserat på namn
          const parentFolder = userCreatedFolders.find(p => p.name === folder.parent);
          
          if (parentFolder && folderMap[parentFolder.id]) {
            // Hitta förälderns NavItem objekt
            const parentNavItem = folderMap[parentFolder.id];
            
            // Kontrollera om barnet redan finns i föräldern för att undvika dubletter
            const childExists = parentNavItem.children?.some(child => 
              child.folderId === folder.id || child.label === folder.name
            );
            
            if (!childExists) {
              // Justera indent-nivån baserat på förälderns nivå
              folderMap[folder.id].indent = (parentNavItem.indent || 0) + 1;
              
              // Lägg till som ett barn till föräldern
              parentNavItem.children = [...(parentNavItem.children || []), folderMap[folder.id]];
              console.log(`Lade till undermapp ${folder.name} i föräldermappen ${folder.parent}`);
            }
          } else {
            console.log(`Kunde inte hitta föräldermappen för ${folder.name}, lägger den på rotnivå`);
            
            // Om föräldern inte hittades, lägg till på rotnivå som säkerhet
            const existingFolder = filesSection!.children!.find(child => 
              child.folderId === folder.id || child.label === folder.name
            );
            
            if (!existingFolder) {
              filesSection!.children!.push(folderMap[folder.id]);
            }
          }
        }
      });
      
      // Säkerställ att Files-sektionen är öppen om den har mappar
      if (filesSection.children && filesSection.children.length > 0) {
        filesSection.isOpen = true;
        // Öppna även Vault-sektionen
        if (vaultSection) {
          vaultSection.isOpen = true;
          if (!openSections.includes("vault")) {
            toggleSection("vault");
          }
        }
      }
    } else {
      console.warn("Kunde inte hitta Files-sektionen i navigationsobjektet!");
    }
    
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
  // Hjälpfunktion för att rendera plus-knapp med korrekt positionering
  const renderAddFolderButton = (item: NavItemType, isFilesRoot: boolean) => {
    if (!item.onAddClick) return null;
    
    if (isFilesRoot) {
      // Särskild hantering för Files-mappen, positionera plus-ikonen till vänster
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            item.onAddClick?.();
          }}
          className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 mx-2"
          aria-label="Lägg till ny mapp"
        >
          <Plus className="h-4 w-4" />
        </button>
      );
    } else {
      // Standard positionering för alla andra mappar
      return (
        <div className={item.folderId === "files_root" ? "inline-flex items-center mx-2" : "absolute right-2 top-1/2 transform -translate-y-1/2"}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              item.onAddClick?.();
            }}
            className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Lägg till ny mapp"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      );
    }
  };
  
  const renderNavItems = (items: NavItemType[], parentKey: string = '') => {
    return items.map((item, index) => {
      const itemKey = `${parentKey}-${item.label}`;
      const hasChildren = item.children && item.children.length > 0;
      
      // Handle section-specific open state if item is a section
      let isItemOpen = false;
      if (item.type === 'section' && item.sectionId) {
        isItemOpen = item.isOpen ?? false;
      } else {
        isItemOpen = openItems[itemKey] !== undefined ? openItems[itemKey] : false;
      }
      
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
                    <div className="flex items-center">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          item.onAddClick?.();
                        }}
                        className={`p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer z-10 ${item.folderId === "files_root" ? "ml-1" : "ml-3"}`}
                        title="Lägg till ny mapp"
                      >
                        <Plus className="h-3 w-3" />
                      </span>
                      
                      {/* Rensa-ikon för Files root-mappen */}
                      {item.folderId === "files_root" && item.onDeleteAll && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            item.onDeleteAll?.();
                          }}
                          className="ml-1 p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer z-10"
                          title="Rensa alla mappar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </span>
                      )}
                    </div>
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
            <Collapsible 
              open={isItemOpen} 
              onOpenChange={() => {
                if (item.type === 'section' && item.sectionId && item.onToggle) {
                  item.onToggle();
                } else {
                  toggleItem(itemKey);
                }
              }}
            >
              <CollapsibleTrigger asChild>
                {/* Om det är en användarskapad mapp med folderId */}
                {item.type === "folder" && item.folderId ? (
                  <button 
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors duration-150 group relative",
                      item.active
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      indentClass
                    )}
                  >
                    <div className="flex items-center flex-grow">
                      {/* Ta bort-knapp för användarskapade mappar - temporärt borttagen */}
                      <span className={cn(
                        "flex items-center justify-center mr-3",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.icon}
                      </span>
                      
                      {/* Plustecken för mappar - nu till vänster, endast för files_root */}
                      {item.type === "folder" && item.onAddClick && item.folderId === "files_root" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.onAddClick) item.onAddClick();
                          }}
                          className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2"
                          aria-label="Lägg till ny mapp"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                      
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
                      
                      {/* Chevron-pil - alltid till höger */}
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isItemOpen ? "rotate-90" : ""
                      )} />
                      
                      {/* Plustecken för vanliga mappar (inte files_root) fortsätter vara till höger */}
                      {item.type === "folder" && item.onAddClick && item.folderId !== "files_root" && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.onAddClick) item.onAddClick();
                            }}
                            className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            aria-label="Lägg till ny mapp"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </button>
                ) : (
                  <button 
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors duration-150 group relative",
                      item.active
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      indentClass
                    )}
                  >
                    <div className="flex items-center flex-grow">
                      {/* Ta bort-knapp för alla mappar - temporärt borttagen */}
                      <span className={cn(
                        "flex items-center justify-center mr-3",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.icon}
                      </span>
                      
                      {/* Plustecken för mappar - nu till vänster, endast för files_root */}
                      {item.type === "folder" && item.onAddClick && item.folderId === "files_root" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.onAddClick) item.onAddClick();
                          }}
                          className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-2"
                          aria-label="Lägg till ny mapp"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                      
                      <span className={cn(
                        "text-sm",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center relative">
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
                      
                      {/* Chevron-pil - alltid till höger */}
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isItemOpen ? "rotate-90" : ""
                      )} />
                      
                      {/* Plustecken för vanliga mappar (inte files_root) fortsätter vara till höger */}
                      {item.type === "folder" && item.onAddClick && item.folderId !== "files_root" && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.onAddClick) item.onAddClick();
                            }}
                            className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            aria-label="Lägg till ny mapp"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
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
                  {/* Ta bort-knapp som bara visas vid hover - temporärt borttagen */}
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
              
              {/* Plus-ikon för mappar */}
              {item.type === "folder" && item.onAddClick && user && (user.role === "project_leader" || user.role === "admin" || user.role === "superuser") && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    item.onAddClick && item.onAddClick();
                  }}
                  className="ml-2 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Lägg till undermapp"
                >
                  <Plus className="h-3.5 w-3.5" />
                </span>
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) {
          setFolderToDeleteId(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bekräfta borttagning</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort {folderToDelete?.name ? `"${folderToDelete.name}"` : "denna mapp"}? 
              Alla undermappar till mappen tas också bort. Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded mb-4 mt-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">
              Alla filer och undermappar kommer att raderas permanent.
            </span>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              console.log("Avbryter borttagning av mapp");
              setFolderToDeleteId(null);
            }}>
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                console.log("Bekräftar borttagning av mapp", folderToDeleteId);
                deleteFolder();
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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