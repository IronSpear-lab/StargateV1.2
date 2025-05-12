import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type Invitation = {
  id: number;
  email: string;
  role: string;
  status: string;
  invitedAt: string;
  expiresAt: string;
  invitedByUsername: string;
};

export function InvitationsList() {
  const { data: invitations, isLoading, error } = useQuery<Invitation[]>({
    queryKey: ['/api/users/invitations'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/users/invitations', { signal });
      if (!response.ok) {
        throw new Error('Kunde inte hämta inbjudningar');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        Fel vid hämtning av inbjudningar: {error.message}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <div className="text-gray-500 p-4 text-center">
        Inga aktiva inbjudningar hittades.
      </div>
    );
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administratör';
      case 'project_leader':
        return 'Projektledare';
      case 'user':
        return 'Användare';
      default:
        return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Väntar</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Accepterad</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Utgången</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Användarinbjudningar</CardTitle>
        <CardDescription>
          Lista över utskickade inbjudningar till systemet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-post</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Skickat av</TableHead>
              <TableHead>Skickat</TableHead>
              <TableHead>Giltigt till</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>{getRoleName(invitation.role)}</TableCell>
                <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                <TableCell>{invitation.invitedByUsername}</TableCell>
                <TableCell>
                  {format(new Date(invitation.invitedAt), 'PP', { locale: sv })}
                </TableCell>
                <TableCell>
                  {format(new Date(invitation.expiresAt), 'PP', { locale: sv })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}