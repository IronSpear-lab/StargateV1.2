import React, { useState, useEffect, ReactNode, useRef } from 'react';
import { useLocation, Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Home, PlusSquare, CheckSquare, MessageSquare, Calendar, BarChart2, LayoutDashboard, Clock, Users, Settings, LogOut, Moon, FileText, ChevronRight, ChevronDown, Plus, Trash2, Folder, FolderOpen, X, Edit2 } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from '@/hooks/use-profile';
import { useFolders } from '@/hooks/use-folders';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useProjectContext } from '@/contexts/project-context';

import AddFolderDialog from '@/components/AddFolderDialog';
import UserProfileDialog from '@/components/UserProfileDialog';
import RemoveFolderDialog from '@/components/RemoveFolderDialog';

export type NavItemType = {
  href?: string;
  label: string;
  active?: boolean;
  icon?: React.ReactNode;
  badge?: string;
  type?: "link" | "folder" | "file";
  indent?: number;
  children?: NavItemType[];
  folderId?: string;
  parentId?: string | null;
  onAddClick?: () => void;
  onRemoveClick?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  isSubmenu?: boolean;
  isCollapsible?: boolean;
  project_id?: number;
  isInCurrentProject?: boolean;
};

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation()[0];
  const { user, logoutMutation } = useAuth();
  const { currentProject } = useProjectContext();
  
  // User profile data för profil och avatar
  const { userAvatar, setUserAvatar, userProfile } = useProfile();
  
  // GDPR / Cookie compliance
  const [showCookieConsent, setShowCookieConsent] = useState(false);
  
  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'true');
    setShowCookieConsent(false);
  };
  
  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'false');
    setShowCookieConsent(false);
  };
  
  useEffect(() => {
    const hasConsent = localStorage.getItem('cookieConsent');
    if (!hasConsent) {
      // Lite fördröjning för att inte visa meddelandet direkt
      const timer = setTimeout(() => {
        setShowCookieConsent(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Navigation state och hantering
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() => {
    const savedState = localStorage.getItem('sidebarOpenItems');
    return savedState ? JSON.parse(savedState) : {};
  });
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [addFolderDialogOpen, setAddFolderDialogOpen] = useState(false);
  const [removeFolderDialogOpen, setRemoveFolderDialogOpen] = useState(false);
  const [currentFolderName, setCurrentFolderName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState("");
  
  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const newState = { ...prev, [key]: !prev[key] };
      // Spara tillståndet i localStorage
      localStorage.setItem('sidebarOpenItems', JSON.stringify(newState));
      return newState;
    });
  };
  
  // Mapphantering
  const [userCreatedFolders, setUserCreatedFolders] = useState<any[]>([]);
  
  // Tillstånd för att spåra om användaren har skapat mappar manuellt
  const hasUserCreatedFolders = useRef(false);
  
  const { folders, isLoadingFolders } = useFolders();
  
  // Lyssnar på folder-structure-changed händelse från Mapphantering-widget
  useEffect(() => {
    const handleFolderStructureChanged = () => {
      console.log("Sidebaren uppdateras från Mapphantering-widget");
      queryClient.invalidateQueries({queryKey: ['/api/folders']});
    };
    
    // Lägg till event listener
    window.addEventListener('folder-structure-changed', handleFolderStructureChanged);
    
    // Rensa event listener när komponenten unmountas
    return () => {
      window.removeEventListener('folder-structure-changed', handleFolderStructureChanged);
    };
  }, []);
  
  // Effekt för att ladda användar-skapade mappar när folders ändrats
  useEffect(() => {
    if (!isLoadingFolders && folders) {
      console.log(`Uppdaterar sidebar med ${folders.length} mappar från API`);
      // Vi vill INTE ersätta mappar om användaren redan har skapat dem manuellt
      if (!hasUserCreatedFolders.current) {
        setUserCreatedFolders(folders);
      }
    }
  }, [folders, isLoadingFolders]);
  
  // Hanterare för att lägga till en mapp i Files-sektionen
  const handleAddFolder = (folderName: string, parentId: string | null = null) => {
    setCurrentFolderName(folderName);
    if (parentId) {
      setCurrentFolderId(parentId);
    } else {
      setCurrentFolderId(""); // tomt för root-nivån
    }
    setAddFolderDialogOpen(true);
  };
  
  const handleRemoveFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setCurrentFolderName(folderName);
    setRemoveFolderDialogOpen(true);
  };
  
  // Funktion för att skapa en ny mapp
  const createFolder = async (name: string, parentId: string | null = null) => {
    try {
      // Endast tillåt skapande av mappar om användaren har rätt roll
      if (user && (user.role === "admin" || user.role === "project_leader" || user.role === "superuser")) {
        // Skapa en ny mapp och lägg till den i både API och lokalt state
        
        // Konstruera rätt förälder-ID baserat på vad vi har
        const actualParentId = parentId === "files_root" ? null : parentId;
        
        // Skapa ny mapp via API
        const projectId = currentProject?.id || null;
        const response = await apiRequest("POST", "/api/folders", {
          name,
          parentId: actualParentId,
          projectId
        });
        
        if (response.ok) {
          const newFolder = await response.json();
          console.log("Ny mapp skapad via API:", newFolder);
          
          // Uppdatera den lokala listan med den nya mappen
          setUserCreatedFolders(prev => {
            // Markera att användaren har skapat mappar manuellt
            hasUserCreatedFolders.current = true;
            
            // Lägg till den nya mappen till den befintliga listan
            // istället för att ersätta listan
            return [...prev, newFolder];
          });
          
          // Visa ett meddelande
          toast({
            title: "Mapp skapad",
            description: `Mappen "${name}" har skapats`
          });
          
          // Utlös händelsen för att tala om för Mapphantering-widgeten att uppdatera sig
          window.dispatchEvent(new CustomEvent('folder-structure-changed'));
          
          // Uppdatera queries för att säkerställa att data är konsistent
          queryClient.invalidateQueries({queryKey: ['/api/folders']});
          
          return true;
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } else {
        toast({
          title: "Behörighet saknas",
          description: "Du har inte behörighet att skapa mappar",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Fel vid skapande av ny mapp:", error);
      toast({
        title: "Fel vid skapande av mapp",
        description: error instanceof Error ? error.message : "Ett okänt fel uppstod",
        variant: "destructive"
      });
      return false;
    }
  };
  
  const removeFolder = async (folderId: string) => {
    try {
      if (user && (user.role === "admin" || user.role === "project_leader" || user.role === "superuser")) {
        const response = await apiRequest("DELETE", `/api/folders/${folderId}`);
        
        if (response.ok) {
          // Uppdatera den lokala listan genom att ta bort mappen
          setUserCreatedFolders(prev => 
            prev.filter(folder => folder.id !== folderId)
          );
          
          // Visa ett meddelande
          toast({
            title: "Mapp borttagen",
            description: `Mappen har tagits bort`
          });
          
          // Utlös händelsen för att tala om för Mapphantering-widgeten att uppdatera sig
          window.dispatchEvent(new CustomEvent('folder-structure-changed'));
          
          // Uppdatera queries för att säkerställa att data är konsistent
          queryClient.invalidateQueries({queryKey: ['/api/folders']});
          
          return true;
        } else {
          const error = await response.text();
          throw new Error(error);
        }
      } else {
        toast({
          title: "Behörighet saknas",
          description: "Du har inte behörighet att ta bort mappar",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Fel vid borttagning av mapp:", error);
      toast({
        title: "Fel vid borttagning",
        description: error instanceof Error ? error.message : "Ett okänt fel uppstod",
        variant: "destructive"
      });
      return false;
    }
  };
  
  // Basnavigationsstruktur
  const baseNavItems: NavItemType[] = [
    {
      href: "/",
      label: "Dashboard",
      active: location === "/",
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      href: "/project-leader-dashboard",
      label: "Project Leader Dashboard",
      active: location === "/project-leader-dashboard",
      icon: <BarChart2 className="w-4 h-4" />
    },
    {
      href: "/time-tracking",
      label: "Tidsrapportering",
      active: location === "/time-tracking",
      icon: <Clock className="w-4 h-4" />
    },
    {
      href: "#",
      label: "Projektplanering",
      active: location.startsWith("/planning") || location.startsWith("/gantt"),
      icon: <Calendar className="w-4 h-4" />,
      type: "link",
      isOpen: openItems["planning"] || false,
      onToggle: () => toggleItem("planning"),
      children: [
        {
          href: "/planning/todo",
          label: "Att-göra lista",
          active: location === "/planning/todo",
          indent: 2
        },
        {
          href: "/planning/kanban",
          label: "Kanban-tavla",
          active: location === "/planning/kanban",
          indent: 2
        },
        {
          href: "/gantt",
          label: "Gantt Schema",
          active: location === "/gantt",
          indent: 2
        }
      ]
    },
    {
      href: "#",
      label: "Kommunikation",
      active: location.startsWith("/messages"),
      icon: <MessageSquare className="w-4 h-4" />,
      type: "link",
      isOpen: openItems["comms"] || false,
      onToggle: () => toggleItem("comms"),
      children: [
        {
          href: "/messages",
          label: "Meddelanden",
          active: location === "/messages",
          indent: 2
        },
        {
          href: "/messages/groups",
          label: "Grupper",
          active: location === "/messages/groups",
          indent: 2
        }
      ]
    },
    {
      href: "#",
      label: "3D Viewer",
      active: location.startsWith("/3d"),
      icon: <div className="w-4 h-4 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3L4 7.5L12 12L20 7.5L12 3Z" />
          <path d="M4 7.5V16.5L12 21L20 16.5V7.5" />
          <path d="M12 12V21" />
          <path d="M8 9.5L16 9.5" />
        </svg>
      </div>,
      type: "link",
      isOpen: openItems["3d"] || false,
      onToggle: () => toggleItem("3d"),
      children: [
        {
          href: "/3d/models",
          label: "Modeller",
          active: location === "/3d/models",
          indent: 2
        },
        {
          href: "/3d/viewer",
          label: "Visa modell",
          active: location === "/3d/viewer",
          indent: 2
        }
      ]
    },
    {
      href: "#",
      label: "Vault",
      active: location.startsWith("/vault"),
      icon: <FileText className="w-4 h-4" />,
      type: "link",
      isOpen: openItems["vault"] || false,
      onToggle: () => toggleItem("vault"),
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
          indent: 2, // Indentera från Files-nivån
          type: "folder",
          icon: <Folder className="w-4 h-4" />,
          folderId: folder.id,
          parentId: folder.parentId,
          onAddClick: () => handleAddFolder(folder.name, folder.id),
          onRemoveClick: () => handleRemoveFolder(folder.id, folder.name),
          children: [],
          project_id: folder.projectId,
          isInCurrentProject: folder.projectId === currentProject?.id
        };
      });
      
      // Skapa en lista över rotmappar (de som inte har en förälder)
      const rootFolders: NavItemType[] = [];
      
      // Sedan koppla dem till deras föräldrar för att bygga trädet
      userCreatedFolders.forEach(folder => {
        const folderNavItem = folderMap[folder.id];
        
        if (folder.parentId === null) {
          // Detta är en rotmapp, så lägg till den direkt till Files-sektionen
          rootFolders.push(folderNavItem);
        } else if (folder.parentId && folderMap[folder.parentId]) {
          // Detta är en undermapp, så lägg till den till sin förälder
          // Om föräldern inte har en children-array, skapa en
          if (!folderMap[folder.parentId].children) {
            folderMap[folder.parentId].children = [];
          }
          
          // Sedan lägg till den aktuella mappen till föräldern
          folderMap[folder.parentId].children!.push(folderNavItem);
        } else {
          // Om föräldraobjektet inte kan hittas (t.ex. föräldern har tagits bort),
          // behandla den som en rotmapp istället
          rootFolders.push(folderNavItem);
        }
      });
      
      // Slutligen, lägg till alla rotmappar till Files-sektionen
      filesSection.children = [...rootFolders];
      
      // Logga resultat för felsökning
      console.log("Sidebar: Hierarkiskt navigationsobjekt skapat, antal rotmappar:", rootFolders.length);
    } else {
      console.warn("Kunde inte hitta Files-sektionen i navigationen");
    }
    
    // Kontrollera filterinställningar för aktuell projekt
    if (currentProject) {
      console.log("Sidebar: Sätter projektkontext:", currentProject.id);
      
      // För varje mapp, kontrollera om den tillhör det aktiva projektet
      const checkProjectMatch = (items: NavItemType[]) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          if (item.project_id !== undefined) {
            console.log(`Sidebar: Kontrollerar mapp ${item.label}, projectId=${item.project_id}, match=${item.project_id === currentProject.id}`);
            item.isInCurrentProject = item.project_id === currentProject.id;
          }
          
          if (item.children && item.children.length > 0) {
            checkProjectMatch(item.children);
          }
        }
      };
      
      // Kör kontrollen på hela navigationsträdet
      checkProjectMatch(navCopy);
      
      // Om vi letar efter en specifik projekts mappar, filtrera bara i Files-sektionen
      if (filesSection && filesSection.children) {
        console.log(`Sidebar: Hittade ${filesSection.children.length} mappar för projekt ${currentProject.id}`);
        console.log("Mappar:", filesSection.children);
      }
    }
    
    return navCopy;
  };
  
  // Hämta de färdiga navigationsobjekten med alla användarmappar
  const navItems = getNavItems();
  
  // Rekursiv renderer för navigationsobjekt
  const renderNavItems = (items: NavItemType[], parentKey: string = ""): ReactNode => {
    return items.map((item, index) => {
      // Skapa en unik nyckel för varje objekt
      const itemKey = `${parentKey}_${index}`;
      
      // Kontrollera om Chevron-pilen ska visas (bara om det är en mapp med undermappar)
      const shouldShowChevron = 
        // Endast visa pil för expanderbara objekt
        ((item.type === "folder" && item.children && item.children.length > 0) || 
         (item.type !== "folder" && item.children && item.children.length > 0)) && 
        item.onToggle !== undefined;
      
      // Avgör om objektet är "öppet" baserat på dess isOpen-egenskap
      const isItemOpen = item.isOpen || false;
      
      // Beräkna indenteringsklassen
      const indentClass = `ml-${item.indent || 0}`;
      
      // Om objektet har barn (undermappar eller underlänkar)
      if (item.children && item.children.length > 0) {
        return (
          <Collapsible
            key={itemKey}
            open={isItemOpen}
            onOpenChange={item.onToggle}
            className="w-full"
          >
            <CollapsibleTrigger asChild className="w-full">
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
                    
                    {/* Plustecken för alla mappar - placeras till vänster om chevron-pilen */}
                    {item.type === "folder" && item.onAddClick && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.onAddClick) item.onAddClick();
                        }}
                        className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 mr-1 text-muted-foreground"
                        aria-label="Lägg till ny mapp"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Chevron-pil visas bara för objekt med undermappar */}
                    {shouldShowChevron && (
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isItemOpen ? "rotate-90" : ""
                      )} />
                    )}
                  </div>
                </button>
              ) : (
                <div className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150 group",
                  item.active
                    ? "bg-primary/10" 
                    : "hover:bg-muted",
                  indentClass
                )}>
                  <div className="flex items-center">
                    {item.icon && (
                      <span className={cn(
                        "flex items-center justify-center mr-3",
                        item.active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {item.icon}
                      </span>
                    )}
                    <span className={cn(
                      "text-sm",
                      item.active ? "text-primary font-medium" : "text-muted-foreground"
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
                    
                    {/* Chevron-pil visas bara för objekt med undermappar */}
                    {shouldShowChevron && (
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isItemOpen ? "rotate-90" : ""
                      )} />
                    )}
                  </div>
                </div>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 mb-1">
                {renderNavItems(item.children!, itemKey)}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      }
      
      // Om objektet är en enkel länk utan barn
      return (
        <Link
          key={itemKey}
          href={item.href || "#"}
          className="block w-full"
          onClick={(e) => {
            if (!item.href || item.href === "#") {
              e.preventDefault();
            }
          }}
        >
          <div className={cn(
            "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors duration-150 group",
            item.active
              ? "bg-primary/10" 
              : "hover:bg-muted",
            indentClass
          )}>
            <div className="flex items-center">
              {item.icon && (
                <span className={cn(
                  "flex items-center justify-center mr-3",
                  item.active ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.icon}
                </span>
              )}
              <span className={cn(
                "text-sm",
                item.active ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </div>
            {item.badge && (
              <Badge variant="outline" className={cn(
                "text-xs py-0.5 px-2 rounded-full",
                item.active 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {item.badge}
              </Badge>
            )}
          </div>
        </Link>
      );
    });
  };
  
  // Stäng profildialogen
  const handleCloseProfile = () => {
    setIsProfileOpen(false);
  };
  
  return (
    <>
      <aside className={cn(
        "border-r bg-background flex flex-col h-screen border-border",
        className
      )}>
        <div className="p-4 flex justify-between items-center">
          <Link href="/">
            <h2 className="text-xl font-semibold tracking-tighter">
              ProManage
            </h2>
          </Link>
          
          <div className="flex items-center space-x-2">
            <ModeToggle />
            
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8 border hover:shadow-md transition-shadow">
                      {userAvatar ? (
                        <AvatarImage src={userAvatar} alt={user.username} />
                      ) : (
                        <AvatarFallback>
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="p-2 text-xs text-muted-foreground">
                    Inloggad som <span className="font-medium text-foreground">{user.username}</span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                    <span className="flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Inställningar
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                    <span className="flex items-center">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logga ut
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {user && currentProject && (
          <div className="px-4 py-2 border-y border-border">
            <div className="text-sm font-medium">{currentProject.name}</div>
            <div className="text-xs text-muted-foreground">
              {currentProject.description?.substring(0, 40) || "Projektbeskrivning saknas"}
              {currentProject.description && currentProject.description.length > 40 ? "..." : ""}
            </div>
          </div>
        )}
        
        <ScrollArea className="flex-grow">
          <div className="py-2">
            <nav className="grid gap-1 px-2">
              {renderNavItems(navItems)}
            </nav>
          </div>
        </ScrollArea>
        
        <footer className="p-3 mt-auto border-t border-border text-xs text-muted-foreground flex items-center justify-center">
          <span>© 2023-2025 ProSE</span>
        </footer>
      </aside>
      
      {/* Dialog för att lägga till mapp */}
      <AddFolderDialog 
        isOpen={addFolderDialogOpen} 
        onClose={() => setAddFolderDialogOpen(false)}
        onSubmit={createFolder}
        parentFolderName={currentFolderName}
        parentFolderId={currentFolderId}
      />
      
      {/* Dialog för att ta bort mapp */}
      <RemoveFolderDialog
        isOpen={removeFolderDialogOpen}
        onClose={() => setRemoveFolderDialogOpen(false)}
        onConfirm={() => removeFolder(currentFolderId)}
        folderName={currentFolderName}
      />
      
      {/* Cookie samtycke dialog */}
      <Dialog open={showCookieConsent} onOpenChange={setShowCookieConsent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cookies och datainsamling</DialogTitle>
            <DialogDescription>
              Vi använder cookies för att förbättra din upplevelse. Dessa används för att komma ihåg inloggningar, dina inställningar och analysera trafik.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Genom att klicka på "Acceptera" godkänner du att vi samlar in och använder cookies som beskrivs i vår integritetspolicy.
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={declineCookies}>
              Avböj
            </Button>
            <Button onClick={acceptCookies}>
              Acceptera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Profil dialog */}
      <UserProfileDialog 
        isOpen={isProfileOpen} 
        onClose={handleCloseProfile} 
        initialAvatar={userAvatar}
        onAvatarChange={setUserAvatar}
        userProfile={userProfile}
      />
    </>
  );
}