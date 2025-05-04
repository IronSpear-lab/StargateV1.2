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
  Bell,
  MessageSquare,
  HelpCircle,
  CircleUser,
  Search
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
    "-Vault": true,
    "-Vault-Files": true,
    "-Vault-Files-Banker": true,
    "-Planning": false,
    "-Communication": false,
    "-Personnel": false
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
      href: "/planning",
      label: "Planning",
      icon: <Calendar className="w-5 h-5" />,
      active: location.startsWith("/planning")
    },
    {
      href: "/communication",
      label: "Communication",
      icon: <MessageSquare className="w-5 h-5" />,
      active: location.startsWith("/communication")
    },
    {
      href: "/viewer",
      label: "Viewer",
      icon: <FileText className="w-5 h-5" />,
      active: location.startsWith("/viewer"),
      badge: "1"
    },
    {
      href: "/vault",
      label: "Vault",
      icon: <FolderClosed className="w-5 h-5" />,
      active: location.startsWith("/vault"),
      children: [
        {
          href: "/vault/home",
          label: "Home",
          icon: <Home className="w-4 h-4" />,
          active: location === "/vault/home",
          indent: 1
        },
        {
          href: "/vault/comments",
          label: "Comments",
          icon: <MessageSquare className="w-4 h-4" />,
          active: location === "/vault/comments",
          indent: 1
        },
        {
          href: "/vault/review-reports",
          label: "Review Reports",
          icon: <FileText className="w-4 h-4" />,
          active: location === "/vault/review-reports",
          indent: 1
        },
        {
          href: "/vault/files",
          label: "Files",
          icon: <FolderClosed className="w-4 h-4" />,
          active: location === "/vault/files" || location.startsWith("/vault/files/"),
          indent: 1,
          children: [
            {
              href: "/vault/files/01-organization",
              label: "01. Organization",
              icon: <FileText className="w-4 h-4" />,
              active: location === "/vault/files/01-organization",
              indent: 2
            },
            {
              href: "/vault/files/02-preparation",
              label: "02. Preparation",
              icon: <FileText className="w-4 h-4" />,
              active: location === "/vault/files/02-preparation",
              indent: 2
            },
            {
              href: "/vault/files/03-admin",
              label: "03. Admin",
              icon: <FileText className="w-4 h-4" />,
              active: location === "/vault/files/03-admin",
              indent: 2
            },
            {
              href: "/vault/files/banker",
              label: "Banker",
              icon: <FileText className="w-4 h-4" />,
              active: location === "/vault/files/banker",
              indent: 2,
              children: [
                {
                  href: "/vault/files/banker/1-invoices",
                  label: "1. Invoices",
                  icon: <FileText className="w-3 h-3" />,
                  active: location === "/vault/files/banker/1-invoices",
                  indent: 3
                },
                {
                  href: "/vault/files/banker/2-bankutdrag",
                  label: "2. Bankutdrag",
                  icon: <FileText className="w-3 h-3" />,
                  active: location === "/vault/files/banker/2-bankutdrag",
                  indent: 3
                },
                {
                  href: "/vault/files/banker/3-underlag",
                  label: "3. Underlag",
                  icon: <FileText className="w-3 h-3" />,
                  active: location === "/vault/files/banker/3-underlag",
                  indent: 3
                },
                {
                  href: "/vault/files/banker/4-egenkontroller",
                  label: "4. Egenkontroller",
                  icon: <FileText className="w-3 h-3" />,
                  active: location === "/vault/files/banker/4-egenkontroller",
                  indent: 3
                }
              ]
            },
            {
              href: "/vault/files/05-faktura",
              label: "05. Faktura",
              icon: <FileText className="w-4 h-4" />,
              active: location === "/vault/files/05-faktura",
              indent: 2
            },
            {
              href: "/vault/files/06-offert",
              label: "06. Offert",
              icon: <FileText className="w-4 h-4" />,
              active: location === "/vault/files/06-offert",
              indent: 2
            }
          ]
        },
        {
          href: "/vault/personnel",
          label: "Personnel",
          icon: <Users className="w-4 h-4" />,
          active: location === "/vault/personnel",
          indent: 1
        },
        {
          href: "/vault/meetings",
          label: "Meetings",
          icon: <Users className="w-4 h-4" />,
          active: location === "/vault/meetings",
          indent: 1
        }
      ]
    },
    {
      href: "/support",
      label: "Support",
      icon: <HelpCircle className="w-5 h-5" />,
      active: location === "/support"
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
      active: location === "/settings"
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
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <span className="ml-2 text-primary-900 text-xl font-bold">ValvX</span>
            </div>
            {isMobile && (
              <button 
                onClick={toggleSidebar} 
                className="ml-auto text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
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
        
        <div className="p-3 border-t border-neutral-200 mt-auto">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 border border-neutral-200">
              <AvatarFallback className="bg-neutral-100 text-neutral-700 text-xs">
                {user ? getInitials(user.username) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-2 overflow-hidden">
              <p className="text-sm font-medium text-neutral-900 truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-neutral-500 truncate">maria@valvxl.se</p>
            </div>
            <button 
              className="ml-auto text-neutral-400 hover:text-neutral-600"
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
