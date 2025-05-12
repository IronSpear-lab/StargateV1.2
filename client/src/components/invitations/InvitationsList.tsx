import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, RefreshCw, Copy, CheckCircle } from "lucide-react";

type Invitation = {
  id: number;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  expiresAt: string;
  invitedByUsername: string;
  token?: string;
};

export function InvitationsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteInvitationId, setDeleteInvitationId] = useState<number | null>(null);
  const [resendInvitationId, setResendInvitationId] = useState<number | null>(null);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch invitations
  const { data: invitations, isLoading, error } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/invitations');
      return response.json();
    }
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/invitations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Inbjudan borttagen",
        description: "Inbjudan har tagits bort framgångsrikt."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fel",
        description: `Kunde inte ta bort inbjudan: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/invitations/${id}/resend`);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inbjudan skickad igen",
        description: "Inbjudan har skickats igen framgångsrikt."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      setSelectedInvitation(data);
      setShowTokenDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Fel",
        description: `Kunde inte skicka inbjudan igen: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Get invitation link mutation
  const getInvitationLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('GET', `/api/invitations/${id}/token`);
      return await response.json();
    },
    onSuccess: (data) => {
      setSelectedInvitation(data);
      setShowTokenDialog(true);
      setIsCopied(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Fel",
        description: `Kunde inte hämta inbjudningslänk: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const handleDeleteInvitation = (id: number) => {
    setDeleteInvitationId(id);
  };

  const confirmDeleteInvitation = () => {
    if (deleteInvitationId) {
      deleteInvitationMutation.mutate(deleteInvitationId);
      setDeleteInvitationId(null);
    }
  };

  const handleResendInvitation = (id: number) => {
    setResendInvitationId(id);
  };

  const confirmResendInvitation = () => {
    if (resendInvitationId) {
      resendInvitationMutation.mutate(resendInvitationId);
      setResendInvitationId(null);
    }
  };

  const handleGetInvitationLink = (invitation: Invitation) => {
    getInvitationLinkMutation.mutate(invitation.id);
  };

  const copyInvitationLink = () => {
    if (selectedInvitation?.token) {
      const baseUrl = window.location.origin;
      const invitationLink = `${baseUrl}/auth?token=${selectedInvitation.token}`;
      
      navigator.clipboard.writeText(invitationLink)
        .then(() => {
          setIsCopied(true);
          toast({
            title: "Kopierad!",
            description: "Inbjudningslänken har kopierats till urklipp."
          });
        })
        .catch((err) => {
          toast({
            title: "Kunde inte kopiera",
            description: "Det gick inte att kopiera till urklipp. Försök att kopiera länken manuellt.",
            variant: "destructive"
          });
        });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'd MMM yyyy, HH:mm', { locale: sv });
    } catch (error) {
      return dateString;
    }
  };

  const getRoleName = (role: string): string => {
    const roleMap: Record<string, string> = {
      user: "Användare",
      project_leader: "Projektledare",
      admin: "Administratör",
      superuser: "Superanvändare"
    };
    return roleMap[role] || role;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">Väntar</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Accepterad</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Utgången</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="border rounded-lg">
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-4">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-red-700 dark:text-red-400">
        <p>Ett fel uppstod vid hämtning av inbjudningar.</p>
        <p className="text-sm mt-2">{(error as Error).message}</p>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">Inga inbjudningar att visa</p>
        <p className="text-sm mt-2">
          Använd knappen "Bjud in användare" för att skapa nya inbjudningar
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-post</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inbjuden av</TableHead>
              <TableHead>Inbjuden</TableHead>
              <TableHead>Utgår</TableHead>
              <TableHead className="text-right">Åtgärder</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell>{getRoleName(invitation.role)}</TableCell>
                <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                <TableCell>{invitation.invitedByUsername}</TableCell>
                <TableCell>{formatDate(invitation.invitedAt)}</TableCell>
                <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {invitation.status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGetInvitationLink(invitation)}
                          title="Visa länk"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={resendInvitationId === invitation.id} onOpenChange={(open) => !open && setResendInvitationId(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation.id)}
                              title="Skicka igen"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Skicka inbjudan igen</AlertDialogTitle>
                              <AlertDialogDescription>
                                Är du säker på att du vill skicka denna inbjudan igen till {invitation.email}? 
                                Detta kommer att förlänga utgångsdatumet.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction onClick={confirmResendInvitation}>
                                Skicka igen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    <AlertDialog open={deleteInvitationId === invitation.id} onOpenChange={(open) => !open && setDeleteInvitationId(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-800 dark:hover:bg-red-950"
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          title="Ta bort"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Ta bort inbjudan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Är du säker på att du vill ta bort inbjudan till {invitation.email}? 
                            Denna åtgärd kan inte ångras.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            onClick={confirmDeleteInvitation}
                          >
                            Ta bort
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog for showing invitation link */}
      <Dialog open={showTokenDialog} onOpenChange={(open) => setShowTokenDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inbjudningslänk</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-link">Kopiera denna länk och dela med användaren:</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="invitation-link"
                  value={selectedInvitation?.token ? 
                    `${window.location.origin}/auth?token=${selectedInvitation.token}` : 
                    ''}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={copyInvitationLink}
                  variant={isCopied ? "default" : "secondary"}
                  className={isCopied ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {isCopied ? 
                    <CheckCircle className="h-4 w-4" /> : 
                    <Copy className="h-4 w-4" />
                  }
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Inbjudan är giltig till {selectedInvitation?.expiresAt ? 
                formatDate(selectedInvitation.expiresAt) : 'N/A'}
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" onClick={() => setShowTokenDialog(false)}>
              Stäng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}