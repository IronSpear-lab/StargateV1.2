import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    // Växla direkt mellan ljust och mörkt läge
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full transition-colors duration-300"
    >
      {/* I light mode visar vi månen (för att byta till dark mode) */}
      {theme === "light" && (
        <Moon className="h-[1.2rem] w-[1.2rem] text-blue-600 transition-transform duration-300" />
      )}
      
      {/* I dark mode visar vi solen (för att byta till light mode) */}
      {theme === "dark" && (
        <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-400 transition-transform duration-300" />
      )}
      
      <span className="sr-only">Byt tema</span>
    </Button>
  );
}