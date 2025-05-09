import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import {
  BarChart2,
  LayoutDashboard,
  ClipboardCheck,
  Clock,
  Settings,
  FileText,
  Users,
  Home,
  HelpCircle,
  Bell,
  Folder,
} from "lucide-react";

interface MainNavProps {
  className?: string;
}

export function MainNav({ className }: MainNavProps) {
  const [location] = useLocation();
  const isMobile = useMobile();

  const isActive = (path: string) => {
    // Match exact path or path with query params
    return location === path || location.startsWith(`${path}?`);
  };

  const navItems = [
    {
      title: "Översikt",
      href: "/",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      title: "Projekt",
      href: "/projects",
      icon: <FileText className="mr-2 h-4 w-4" />,
    },
    {
      title: "Uppgifter",
      href: "/tasks",
      icon: <ClipboardCheck className="mr-2 h-4 w-4" />,
    },
    {
      title: "Dokument",
      href: "/vault",
      icon: <Folder className="mr-2 h-4 w-4" />,
    },
    {
      title: "Tidsrapportering",
      href: "/time-tracking",
      icon: <Clock className="mr-2 h-4 w-4" />,
    },
    {
      title: "Rapporter",
      href: "/analytics",
      icon: <BarChart2 className="mr-2 h-4 w-4" />,
    },
    {
      title: "Team",
      href: "/team",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
  ];

  const secondaryNavItems = [
    {
      title: "Hjälp",
      href: "/help",
      icon: <HelpCircle className="mr-2 h-4 w-4" />,
    },
    {
      title: "Notifieringar",
      href: "/notifications",
      icon: <Bell className="mr-2 h-4 w-4" />,
    },
    {
      title: "Inställningar",
      href: "/settings",
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
  ];

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {isMobile ? (
        // Mobile layout: Just show the home button
        <Button asChild variant={isActive("/") ? "secondary" : "ghost"} className="px-2">
          <Link href="/">
            <Home className="h-5 w-5" />
            <span className="sr-only">Hem</span>
          </Link>
        </Button>
      ) : (
        // Desktop layout: Show all navigation items
        <>
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={isActive(item.href) ? "secondary" : "ghost"}
              className="justify-start"
            >
              <Link href={item.href}>
                {item.icon}
                {item.title}
              </Link>
            </Button>
          ))}
        </>
      )}
    </nav>
  );
}