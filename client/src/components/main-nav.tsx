import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BellIcon, CalendarDays, FileIcon, Home, User, UserCircle2 } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { User as UserType } from "@shared/schema";

export function MainNav() {
  const [location] = useLocation();
  
  // Användardata
  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Kunde inte ladda användaren");
      return await res.json();
    },
  });

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 container">
        <div className="flex items-center mr-6">
          <Link href="/" className="flex items-center space-x-2">
            <FileIcon className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              ProjectFlow
            </span>
          </Link>
        </div>
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <Button asChild variant={location === "/" ? "secondary" : "ghost"}>
            <Link href="/" className="text-sm font-medium">
              <Home className="w-4 h-4 mr-2" />
              Hem
            </Link>
          </Button>
          <Button asChild variant={location.includes("/calendar") ? "secondary" : "ghost"}>
            <Link
              href="/calendar"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              Kalender
            </Link>
          </Button>
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifikationer"
          >
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-600" />
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              asChild
            >
              <Link href="/profile">
                <UserCircle2 className="h-5 w-5" />
                <span className="hidden md:inline">{user.username}</span>
              </Link>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              asChild
            >
              <Link href="/auth">
                <User className="h-5 w-5" />
                <span className="hidden md:inline">Logga in</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}