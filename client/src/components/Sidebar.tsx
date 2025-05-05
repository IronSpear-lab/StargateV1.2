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
  HelpCircle,
  CircleUser,
  Search,
  Box,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/mode-toggle";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

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
  const { toast } = useToast();
  
  // State för att lagra mappar som användaren har skapat
  const [userCreatedFolders, setUserCreatedFolders] = useState<{name: string; parent: string}[]>([]);

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
  const handleAddFolder = (parentName: string) => {
    setSelectedParentFolder(parentName);
    setFolderDialogOpen(true);
  };
  
  // Funktion för att skapa en ny mapp
  const createFolder = (folderName: string, parentName: string) => {
    // Spara den nya mappen i state så att den visas i sidofältet
    setUserCreatedFolders(prev => [...prev, { name: folderName, parent: parentName }]);
    
    // Visa meddelande om att mappen har skapats
    toast({
      title: "Mapp skapad",
      description: `Mappen "${folderName}" har skapats under "${parentName}"`,
    });
    
    // I en riktig implementation skulle vi också göra en API-anrop för att spara mappen i databasen
  };
  
  // Funktion för att hitta den rätta föräldern för en nyskapad mapp och uppdatera den
  const findParentAndAddFolder = (
    items: NavItemType[], 
    parentName: string, 
    newFolder: { name: string, parent: string }
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
      href: "/communication",
      label: "Communication",
      icon: <MessageSquare className="w-5 h-5" />,
      active: location === "/communication"
    },
    {
      href: "/3d-viewer",
      label: "3D Viewer",
      icon: <Box className="w-5 h-5" />,
      active: location === "/3d-viewer",
      badge: "1"
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
                  href: "#",
                  label: "2. DWG & IFC",
                  active: false,
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
                    "flex items-center justify-center w-full py-2 rounded-md transition-colors duration-150",
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
                    "flex items-center justify-center py-2 rounded-md transition-colors duration-150 w-full",
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
                      className="ml-3 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
                <button 
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-md transition-colors duration-150",
                    item.active
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    indentClass
                  )}
                >
                  <div className="flex items-center">
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
                    
                    {/* Lägg till plustecken för mappar */}
                    {item.type === "folder" && item.onAddClick && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // Förhindra att mappknappen klickas
                          item.onAddClick?.();
                        }}
                        className="mr-1 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 mb-1">
                  {renderNavItems(item.children!, itemKey)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <div className={cn(
              "flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150",
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
              {item.type === "folder" && item.onAddClick && (
                <button
                  onClick={() => item.onAddClick?.()}
                  className="ml-1 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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

  return (
    <>
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
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>
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
                <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </>
  );
}