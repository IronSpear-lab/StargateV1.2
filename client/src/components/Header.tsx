import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, HelpCircle, Menu, Search } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
}

export function Header({ title, onToggleSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useMobile();

  return (
    <header className="bg-background border-b border-border shadow-sm p-4 flex items-center">
      {isMobile && (
        <Button 
          variant="ghost" 
          size="icon"
          className="mr-4 text-muted-foreground"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>
      
      <div className={cn("flex items-center gap-4", isMobile ? "gap-2" : "gap-4")}>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "px-4 py-2 text-sm focus:ring-primary focus:border-primary",
              isMobile ? "w-[120px]" : "w-auto"
            )}
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        </div>
        
        <ModeToggle />
        
        <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-muted relative">
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-brand-red rounded-full"></span>
        </Button>
        
        <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-muted">
          <HelpCircle className="h-5 w-5 text-foreground" />
        </Button>
      </div>
    </header>
  );
}
