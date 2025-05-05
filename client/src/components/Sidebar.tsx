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
  Box
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
};

interface NavGroupProps {
  item: NavItemType;
  isOpen: boolean;
  onToggle: () => void;
  location: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "-Planning": false,
    "-Vault": true,
    "-Vault-Files": true
  });

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Define nested navigation based on the image
  const navItems: NavItemType[] = [
    {
      href: "/",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      active: location === "/"
    },
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
          children: [
            {
              href: "#",
              label: "01- Organisation",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              children: []
            },
            {
              href: "#",
              label: "02- Projektering",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              children: []
            },
            {
              href: "#",
              label: "00- Gemensam",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              children: []
            },
            {
              href: "#",
              label: "01- Arkitekt",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
              children: [
                {
                  href: "/vault/files/ritningar",
                  label: "1. Ritningar",
                  active: location === "/vault/files/ritningar",
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  children: []
                },
                {
                  href: "#",
                  label: "2. DWG & IFC",
                  active: false,
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  children: []
                },
                {
                  href: "#",
                  label: "3. Beskrivningar",
                  active: false,
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  children: []
                },
                {
                  href: "#",
                  label: "4. Underlag",
                  active: false,
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
                  children: []
                },
                {
                  href: "#",
                  label: "5. Egenkontroller",
                  active: false,
                  indent: 3,
                  icon: <FolderClosed className="w-3 h-3" />,
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
              children: []
            },
            {
              href: "#",
              label: "02- Brand",
              active: false,
              indent: 2,
              icon: <FolderClosed className="w-4 h-4" />,
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
      if (item.indent === 1) indentClass = 'pl-4';
      else if (item.indent === 2) indentClass = 'pl-8';
      else if (item.indent === 3) indentClass = 'pl-12';
      else if (item.indent === 4) indentClass = 'pl-16';
      
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
            <Link 
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150",
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
          "bg-background h-full shadow-md transition-all duration-300 overflow-y-auto z-50 flex flex-col border-r border-border",
          isOpen ? "w-64" : "w-20",
          isMobile ? "fixed left-0 top-0" : "sticky top-0",
          className
        )}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white dark:text-primary-foreground">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <span className={cn(
                "ml-2 text-foreground text-xl font-bold transition-opacity duration-200",
                !isOpen && !isMobile ? "opacity-0 w-0" : ""
              )}>ValvX</span>
            </div>
            <div className="flex space-x-1 items-center">
              <ModeToggle />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 rounded-full"
                onClick={toggleSidebar}
              >
                {isOpen ? 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="m15 18-6-6 6-6"/>
                  </svg> : 
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                }
              </Button>
            </div>
          </div>
        </div>
        
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search" 
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 py-2 overflow-y-auto">
          <div className="space-y-1">
            {renderNavItems(navItems)}
          </div>
        </div>
        
        <div className="px-3 py-1 mt-auto">
          <div className="space-y-1 mt-1">
            <Link 
              href="/support"
              className="flex items-center px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <HelpCircle className="w-5 h-5 mr-3 text-muted-foreground" />
              <span className="text-sm">Support</span>
            </Link>
            <Link 
              href="/settings"
              className="flex items-center px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Settings className="w-5 h-5 mr-3 text-muted-foreground" />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
        
        <div className="p-3 border-t border-border">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-muted text-foreground text-xs">
                FH
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">Fredrik H.</p>
              <p className="text-xs text-muted-foreground truncate">fredrik@valvx.com</p>
            </div>
            <button 
              className="ml-auto text-muted-foreground hover:text-foreground p-1 transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
