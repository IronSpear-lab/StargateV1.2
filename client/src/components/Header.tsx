import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, HelpCircle, Menu, Search } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  onToggleSidebar: () => void;
}

export function Header({ title, onToggleSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useMobile();

  return (
    <header className="bg-white shadow-sm p-4 flex items-center">
      {isMobile && (
        <Button 
          variant="ghost" 
          size="icon"
          className="mr-4 text-neutral-500"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      
      <div className={cn("flex items-center gap-4", isMobile ? "gap-2" : "gap-4")}>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "px-4 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              isMobile ? "w-[120px]" : "w-auto"
            )}
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
        </div>
        
        <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-neutral-100 relative">
          <Bell className="h-5 w-5 text-neutral-600" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full"></span>
        </Button>
        
        <Button variant="ghost" size="icon" className="p-2 rounded-full hover:bg-neutral-100">
          <HelpCircle className="h-5 w-5 text-neutral-600" />
        </Button>
      </div>
    </header>
  );
}
