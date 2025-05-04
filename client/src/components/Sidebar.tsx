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
      label: "Home",
      icon: <Home className="w-5 h-5" />,
      active: location === "/"
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      active: location === "/dashboard"
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
          href: "/gantt", // Match the route in App.tsx
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
                  href: "#",
                  label: "1. Ritningar",
                  active: false,
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
        className="fixed top-4 left-4 z-50 p-2 text-neutral-500 hover:text-neutral-700 md:hidden"
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
                      ? "bg-primary-50 text-primary-700 font-medium" 
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                    indentClass
                  )}
                >
                  <div className="flex items-center">
                    <span className={cn(
                      "flex items-center justify-center mr-3",
                      item.active ? "text-primary-700" : "text-neutral-500"
                    )}>
                      {item.icon}
                    </span>
                    <span className={cn(
                      "text-sm",
                      item.active ? "text-primary-700" : "text-neutral-600"
                    )}>
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {item.badge && (
                      <Badge variant="outline" className={cn(
                        "text-xs py-0.5 px-2 rounded-full mr-2",
                        item.active 
                          ? "bg-primary-100 text-primary-700 border-primary-200" 
                          : "bg-neutral-100 text-neutral-600 border-neutral-200"
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
                  ? "bg-primary-50 text-primary-700 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                indentClass
              )}
            >
              <div className="flex items-center">
                <span className={cn(
                  "flex items-center justify-center mr-3",
                  item.active ? "text-primary-700" : "text-neutral-500"
                )}>
                  {item.icon}
                </span>
                <span className={cn(
                  "text-sm",
                  item.active ? "text-primary-700" : "text-neutral-600"
                )}>
                  {item.label}
                </span>
              </div>
              {item.badge && (
                <Badge variant="outline" className={cn(
                  "ml-auto text-xs py-0.5 px-2 rounded-full",
                  item.active 
                    ? "bg-primary-100 text-primary-700 border-primary-200" 
                    : "bg-neutral-100 text-neutral-600 border-neutral-200"
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside 
        className={cn(
          "w-64 bg-white h-full shadow-md transition-all duration-300 overflow-y-auto z-50 flex flex-col",
          isMobile ? "fixed left-0 top-0" : "sticky top-0",
          className
        )}
      >
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="ml-2 text-blue-900 text-xl font-bold">ValvX</span>
            </div>
            <div className="flex space-x-1 items-center">
              <button className="p-1 text-gray-500 hover:text-blue-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              </button>
              {isMobile && (
                <button 
                  onClick={toggleSidebar} 
                  className="p-1 text-neutral-500 hover:text-neutral-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-3 border-b border-neutral-200">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
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
              className="flex items-center px-3 py-2 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <HelpCircle className="w-5 h-5 mr-3 text-neutral-500" />
              <span className="text-sm">Support</span>
            </Link>
            <Link 
              href="/settings"
              className="flex items-center px-3 py-2 rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Settings className="w-5 h-5 mr-3 text-neutral-500" />
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
        
        <div className="p-3 border-t border-neutral-200">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 border border-neutral-200">
              <AvatarFallback className="bg-neutral-100 text-neutral-700 text-xs">
                FH
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 overflow-hidden">
              <p className="text-sm font-medium text-neutral-900 truncate">Fredrik H.</p>
              <p className="text-xs text-neutral-500 truncate">fredrik@valvx.com</p>
            </div>
            <button 
              className="ml-auto text-neutral-400 hover:text-neutral-600 p-1"
              onClick={handleLogout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
