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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(!isMobile);

  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { href: "/files", label: "Files", icon: <FolderClosed className="w-5 h-5" /> },
    { href: "/tasks", label: "Tasks", icon: <CheckSquare className="w-5 h-5" /> },
    { href: "/timeline", label: "Timeline", icon: <Calendar className="w-5 h-5" /> },
    { href: "/kanban", label: "Kanban", icon: <Columns className="w-5 h-5" /> },
    { href: "/wiki", label: "Wiki", icon: <BookOpen className="w-5 h-5" /> },
    { href: "/settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
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
          "w-64 bg-white h-full shadow-md transition-all duration-300 overflow-y-auto z-50",
          isMobile ? "fixed left-0 top-0" : "sticky top-0",
          className
        )}
      >
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center">
            <span className="text-primary-600 text-2xl font-bold">ValvXl</span>
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
        
        <div className="p-4">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
              <span className="font-semibold">{user ? getInitials(user.username) : '--'}</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.username || 'User'}</p>
              <p className="text-xs text-neutral-500">{user?.role || 'User'}</p>
            </div>
          </div>
          
          <nav>
            <ul>
              {navItems.map((item) => (
                <li key={item.href} className="mb-1">
                  <Link href={item.href}>
                    <a 
                      className={cn(
                        "flex items-center p-2 rounded-md",
                        location === item.href 
                          ? "bg-primary-50 text-primary-700" 
                          : "text-neutral-700 hover:bg-neutral-100"
                      )}
                    >
                      {item.icon}
                      <span className="ml-3">{item.label}</span>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        
        <div className="p-4 border-t border-neutral-200 mt-auto">
          <Button 
            variant="ghost" 
            className="flex items-center w-full justify-start" 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
