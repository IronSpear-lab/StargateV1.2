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
    "-Planning": false
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
          href: "/gantt", // Match the route in App.tsx
          label: "Gantt Chart",
          icon: <BarChart2 className="w-4 h-4" />,
          active: location === "/gantt" || location === "/planning/gantt-chart",
          indent: 1
        }
      ]
    },
    {
      href: "/notifications", // Changed to a route that exists in App.tsx
      label: "Communication",
      icon: <MessageSquare className="w-5 h-5" />,
      active: location === "/notifications"
    },
    {
      href: "/files", // Changed to match the files route in App.tsx
      label: "Files",
      icon: <FileText className="w-5 h-5" />,
      active: location === "/files",
      badge: "1"
    },
    {
      href: "/tasks", // Match tasks route
      label: "Tasks",
      icon: <CheckSquare className="w-5 h-5" />,
      active: location === "/tasks",
    },
    {
      href: "/timeline", // Match timeline route
      label: "Timeline",
      icon: <Calendar className="w-5 h-5" />,
      active: location === "/timeline",
    },
    {
      href: "/team", // Match team route
      label: "Team",
      icon: <Users className="w-5 h-5" />,
      active: location === "/team",
    },
    {
      href: "/wiki", // Match wiki route
      label: "Wiki",
      icon: <BookOpen className="w-5 h-5" />,
      active: location === "/wiki",
    },
    {
      href: "/time-tracking", // Match time-tracking route
      label: "Time Tracking",
      icon: <Clock className="w-5 h-5" />,
      active: location === "/time-tracking",
    },
    {
      href: "/analytics", // Match analytics route
      label: "Analytics",
      icon: <PieChart className="w-5 h-5" />,
      active: location === "/analytics",
    },
    {
      href: "/help", // Match help route
      label: "Help",
      icon: <HelpCircle className="w-5 h-5" />,
      active: location === "/help",
    },
    {
      href: "/settings", // Match settings route
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
      active: location === "/settings",
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
