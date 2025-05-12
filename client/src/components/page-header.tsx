import { Button } from "@/components/ui/button";
import { Bell, Menu, User, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface PageHeaderProps {
  title: string;
  onToggleSidebar?: () => void;
}

export function PageHeader({ title, onToggleSidebar }: PageHeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  
  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast({
        title: "Fel",
        description: "E-postadressen får inte vara tom",
        variant: "destructive",
      });
      return;
    }
    
    setIsInviting(true);
    
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte skicka inbjudan");
      }
      
      toast({
        title: "Inbjudan skickad",
        description: `Inbjudan skickad till ${inviteEmail}`,
      });
      
      setInviteEmail("");
    } catch (error) {
      toast({
        title: "Fel",
        description: error instanceof Error ? error.message : "Något gick fel vid inbjudan",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Växla meny</span>
      </Button>
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative"
            >
              <UserPlus className="h-5 w-5" />
              <span className="sr-only">Bjud in användare</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Bjud in användare</DialogTitle>
              <DialogDescription>
                Skicka en inbjudan till en ny användare. De kommer att få ett e-postmeddelande med en länk för att registrera sig.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">E-postadress</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="namn@exempel.se"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="role">Roll</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value) => setInviteRole(value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Välj roll" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Användare</SelectItem>
                    <SelectItem value="project_leader">Projektledare</SelectItem>
                    <SelectItem value="admin">Administratör</SelectItem>
                    <SelectItem value="superuser">Superanvändare</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                onClick={handleInviteUser} 
                disabled={isInviting}
              >
                {isInviting ? "Skickar..." : "Skicka inbjudan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative"
            >
              <Bell className="h-5 w-5" />
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-1"
                variant="destructive"
              >
                3
              </Badge>
              <span className="sr-only">Notifieringar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Notifieringar</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <div className="flex flex-col">
                <span className="font-medium">Ny kommentar på dokument</span>
                <span className="text-xs text-muted-foreground">
                  För 5 min sedan
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col">
                <span className="font-medium">Uppgift tilldelad</span>
                <span className="text-xs text-muted-foreground">
                  För 30 min sedan
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col">
                <span className="font-medium">Påminnelse: Möte</span>
                <span className="text-xs text-muted-foreground">
                  För 2 timmar sedan
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/notifications">
                <span className="w-full text-center font-medium">
                  Visa alla
                </span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatar.png" alt="Användare" />
                <AvatarFallback>
                  {user ? getInitials(user.username || "Användare") : "AN"}
                </AvatarFallback>
              </Avatar>
              <span className="sr-only">Användarmeny</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Min profil</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <span>Inställningar</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              Logga ut
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}