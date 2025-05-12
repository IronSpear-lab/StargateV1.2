import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  Copy,
  MoreVertical,
  RefreshCcw,
  Trash2,
  Link,
  CheckCircle,
  AlertCircle,
  ClockIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Invitation {
  id: number;
  email: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  invitedAt: string;
  expiresAt: string;
  invitedByUsername: string;
  token?: string;
}

export function InvitationsList() {
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [invitationLink, setInvitationLink] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading, isError } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations"],
    queryFn: getQueryFn(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/invitations/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte ta bort inbjudan");
      }
      return id;
    },
    onSuccess: () => {
      toast({
        title: "Inbjudan borttagen",
        description: "Inbjudan har tagits bort framgångsrikt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/invitations/${id}/resend`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte skicka om inbjudan");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inbjudan skickad igen",
        description: "Inbjudan har skickats om framgångsrikt.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInvitationLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("GET", `/api/invitations/${id}/token`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte hämta inbjudningslänk");
      }
      return await response.json();
    },
    onSuccess: (invitation: Invitation) => {
      // Create the invitation link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/register?token=${invitation.token}`;
      setInvitationLink(link);
      setShowLinkDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Fel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationLink);
    toast({
      title: "Kopierad",
      description: "Inbjudningslänken har kopierats till urklipp.",
    });
  };

  const handleDelete = (invitation: Invitation) => {
    if (confirm(`Är du säker på att du vill ta bort inbjudan till ${invitation.email}?`)) {
      deleteMutation.mutate(invitation.id);
    }
  };

  const handleResend = (invitation: Invitation) => {
    resendMutation.mutate(invitation.id);
  };

  const handleGetLink = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    getInvitationLinkMutation.mutate(invitation.id);
  };

  const translateRole = (role: string) => {
    switch (role) {
      case "admin":
        return "Administratör";
      case "project_leader":
        return "Projektledare";
      case "superuser":
        return "Superanvändare";
      case "user":
        return "Användare";
      default:
        return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600">
            <ClockIcon className="h-3 w-3 mr-1" />
            Väntar
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepterad
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Utgången
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Inbjudningar</h2>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white dark:bg-gray-800">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-full max-w-[250px]" />
              <Skeleton className="h-4 w-full max-w-[180px]" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center pt-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Inbjudningar</h2>
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-red-500">Fel</CardTitle>
            <CardDescription>Kunde inte ladda inbjudningar</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/invitations"] })}
            >
              Försök igen
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Inbjudningar</h2>
      
      {invitations && invitations.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Inga inbjudningar</CardTitle>
            <CardDescription>
              Det finns inga aktiva inbjudningar. Använd knappen "Bjud in användare" för att skapa nya inbjudningar.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        invitations?.map((invitation) => (
          <Card key={invitation.id} className="bg-white dark:bg-gray-800">
            <CardHeader className="pb-2">
              <CardTitle>{invitation.email}</CardTitle>
              <CardDescription>
                Roll: {translateRole(invitation.role)} | Inbjuden av: {invitation.invitedByUsername}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>
                    Skapad: {formatDistanceToNow(new Date(invitation.invitedAt), { addSuffix: true, locale: sv })}
                  </span>
                </div>
                <div>{getStatusBadge(invitation.status)}</div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Utgår: {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true, locale: sv })}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Öppna meny</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Alternativ</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {invitation.status !== "accepted" && (
                    <>
                      <DropdownMenuItem onClick={() => handleGetLink(invitation)}>
                        <Link className="mr-2 h-4 w-4" />
                        Hämta länk
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResend(invitation)}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Skicka om
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem 
                    onClick={() => handleDelete(invitation)}
                    className="text-red-500 hover:text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Ta bort
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))
      )}

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Inbjudningslänk</DialogTitle>
            <DialogDescription>
              Kopiera denna länk och dela med användaren. Länken är giltig tills inbjudan går ut eller
              användaren registrerar sig.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input
              value={invitationLink}
              readOnly
              className="flex-1"
            />
            <Button onClick={handleCopyLink} size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLinkDialog(false)}>Stäng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}