import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FolderClosed, 
  CheckSquare, 
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
  Users,
  Clock,
  PieChart,
  Bell,
  UserCircle,
  HelpCircle,
  CircleUser
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SidebarProps {
  className?: string;
}

type NavItemType = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  active?: boolean;
};

type NavGroupType = {
  title: string;
  items: NavItemType[];
};

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    dashboard: true,
    projectManagement: true,
    collaboration: true
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

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const navGroups: NavGroupType[] = [
    {
      title: "Dashboard",
      items: [
        { 
          href: "/", 
          label: "Overview", 
          icon: <LayoutDashboard className="w-5 h-5" />,
          active: location === "/" 
        },
        { 
          href: "/analytics", 
          label: "Analytics", 
          icon: <PieChart className="w-5 h-5" />,
          active: location === "/analytics" 
        }
      ]
    },
    {
      title: "Project Management",
      items: [
        { 
          href: "/projects", 
          label: "Projects", 
          icon: <Briefcase className="w-5 h-5" />,
          badge: "4",
          active: location === "/projects" 
        },
        { 
          href: "/tasks", 
          label: "Tasks", 
          icon: <CheckSquare className="w-5 h-5" />,
          badge: "8",
          active: location === "/tasks" 
        },
        { 
          href: "/timeline", 
          label: "Timeline", 
          icon: <Calendar className="w-5 h-5" />,
          active: location === "/timeline" 
        },
        { 
          href: "/gantt", 
          label: "Gantt Chart", 
          icon: <BarChart2 className="w-5 h-5" />,
          active: location === "/gantt" 
        },
        { 
          href: "/kanban", 
          label: "Kanban Board", 
          icon: <Columns className="w-5 h-5" />,
          active: location === "/kanban" 
        },
        { 
          href: "/time-tracking", 
          label: "Time Tracking", 
          icon: <Clock className="w-5 h-5" />,
          active: location === "/time-tracking" 
        }
      ]
    },
    {
      title: "Collaboration",
      items: [
        { 
          href: "/files", 
          label: "Files", 
          icon: <FolderClosed className="w-5 h-5" />,
          active: location === "/files" 
        },
        { 
          href: "/wiki", 
          label: "Wiki", 
          icon: <BookOpen className="w-5 h-5" />,
          active: location === "/wiki" 
        },
        { 
          href: "/team", 
          label: "Team", 
          icon: <Users className="w-5 h-5" />,
          active: location === "/team" 
        }
      ]
    }
  ];

  const accountItems: NavItemType[] = [
    { 
      href: "/profile", 
      label: "Profile", 
      icon: <CircleUser className="w-5 h-5" />,
      active: location === "/profile"
    },
    { 
      href: "/notifications", 
      label: "Notifications", 
      icon: <Bell className="w-5 h-5" />,
      badge: "3",
      active: location === "/notifications"
    },
    { 
      href: "/settings", 
      label: "Settings", 
      icon: <Settings className="w-5 h-5" />,
      active: location === "/settings"
    }
  ];
  
  const helpItems: NavItemType[] = [
    { 
      href: "/help", 
      label: "Help Center", 
      icon: <HelpCircle className="w-5 h-5" />,
      active: location === "/help"
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

  const NavItem = ({ item }: { item: NavItemType }) => (
    <Link href={item.href} 
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-md transition-colors duration-150",
        item.active
          ? "bg-primary-50 text-primary-700 font-medium" 
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
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
        )}>{item.label}</span>
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
  );

  const NavGroup = ({ group, name }: { group: NavGroupType, name: string }) => (
    <Collapsible open={openGroups[name]} onOpenChange={() => toggleGroup(name)}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          <span>{group.title}</span>
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform duration-200",
            openGroups[name] ? "rotate-90" : ""
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 mt-1 mb-3">
          {group.items.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

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
          "w-72 bg-white h-full shadow-md transition-all duration-300 overflow-y-auto z-50 flex flex-col",
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
              <span className="ml-2 text-primary-900 text-xl font-bold">ValvXl</span>
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
        
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 border-2 border-primary-100">
              <AvatarFallback className="bg-primary-50 text-primary-700">
                {user ? getInitials(user.username) : '--'}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-neutral-900">{user?.username || 'User'}</p>
              <p className="text-xs text-neutral-500">{user?.role || 'User'}</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navGroups.map((group, index) => (
            <NavGroup key={index} group={group} name={Object.keys(openGroups)[index]} />
          ))}
          
          <div className="pt-2">
            <Separator className="mb-4" />
            
            <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Account
            </div>
            <div className="space-y-1 mt-1 mb-3">
              {accountItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
            
            <Separator className="mb-4 mt-4" />
            
            <div className="space-y-1 mt-1 mb-3">
              {helpItems.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-neutral-200 mt-auto">
          <Button 
            variant="ghost"
            className="flex items-center w-full justify-start text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100" 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Logout</span>
            {logoutMutation.isPending && <span className="ml-auto">...</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
