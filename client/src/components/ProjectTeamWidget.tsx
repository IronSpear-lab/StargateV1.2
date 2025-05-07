import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Users, UserPlus, Search, X, UserMinus, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  username: string;
  role?: string;
}

interface ProjectMember extends User {
  role: string;
}

interface ProjectTeamWidgetProps {
  projectId: number;
}

export default function ProjectTeamWidget({ projectId }: ProjectTeamWidgetProps) {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Hämta alla projektmedlemmar
  const { data: projectMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['/api/project-members', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/project-members/${projectId}`);
      if (!res.ok) throw new Error('Kunde inte hämta projektmedlemmar');
      return res.json();
    },
    enabled: !!projectId,
  });

  // Hämta alla användare i systemet för att kunna lägga till dem
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Kunde inte hämta användare');
      return res.json();
    },
  });

  // Filtrera användare som ännu inte är medlemmar i projektet
  const filteredUsers = allUsers.filter(
    (user: User) => !projectMembers.some((member: ProjectMember) => member.id === user.id)
  ).filter(
    (user: User) => user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutation för att lägga till en användare till projektet
  const addUserMutation = useMutation({
    mutationFn: async (data: { userId: number, role: string }) => {
      return await apiRequest('POST', `/api/projects/${projectId}/members`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-members', projectId] });
      toast({
        title: 'Användare tillagd',
        description: 'Användaren har lagts till i projektet.',
      });
      setIsAddUserDialogOpen(false);
      setSelectedUserId(null);
      setSearchTerm('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Ett fel uppstod',
        description: `Kunde inte lägga till användaren: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation för att ta bort en användare från projektet
  const removeUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest('DELETE', `/api/projects/${projectId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/project-members', projectId] });
      toast({
        title: 'Användare borttagen',
        description: 'Användaren har tagits bort från projektet.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Ett fel uppstod',
        description: `Kunde inte ta bort användaren: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleAddUser = () => {
    if (!selectedUserId) {
      toast({
        title: 'Ingen användare vald',
        description: 'Välj en användare att lägga till i projektet.',
        variant: 'destructive',
      });
      return;
    }
    
    addUserMutation.mutate({ 
      userId: selectedUserId, 
      role: selectedRole
    });
  };

  const handleRemoveUser = (userId: number) => {
    removeUserMutation.mutate(userId);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'project_leader':
        return 'Projektledare';
      case 'user':
        return 'Användare';
      case 'observer':
        return 'Observatör';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'outline' | 'secondary' | 'destructive' => {
    switch (role) {
      case 'project_leader':
        return 'default';
      case 'user':
        return 'secondary';
      case 'observer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Projektteam
        </CardTitle>
        <CardDescription>
          Hantera medlemmar i projektet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={() => setIsAddUserDialogOpen(true)}
              className="flex items-center"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Lägg till medlem
            </Button>
          </div>
          
          {membersLoading ? (
            <div className="flex justify-center items-center h-24">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : projectMembers.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Inga medlemmar i detta projekt ännu
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {projectMembers.map((member: ProjectMember) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-background hover:bg-accent/50"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{member.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.username}</p>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleLabel(member.role)}
                      </Badge>
                    </div>
                  </div>
                  {/* Visa inte borttagningsknappen om detta är den inloggade användaren och hen är projektledare */}
                  {(member.id === user?.id && member.role === 'project_leader') ? (
                    <span className="h-8 w-8 flex items-center justify-center" title="Du kan inte ta bort dig själv som projektledare">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </span>
                  ) : (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleRemoveUser(member.id)}
                      className="h-8 w-8"
                    >
                      <UserMinus className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Dialog för att lägga till användare */}
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lägg till projektmedlem</DialogTitle>
              <DialogDescription>
                Sök efter användare och lägg till dem i projektet med önskad roll.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök användare..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {usersLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    {searchTerm ? 'Inga matchande användare hittades' : 'Alla användare är redan i projektet'}
                  </p>
                ) : (
                  filteredUsers.map((user: User) => (
                    <div 
                      key={user.id} 
                      className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer ${selectedUserId === user.id ? 'bg-primary/10' : 'hover:bg-accent/50'}`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <Avatar>
                        <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.role || 'Användare'}</p>
                      </div>
                      {selectedUserId === user.id && (
                        <div className="h-5 w-5 rounded-full bg-primary" />
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <Select defaultValue="user" onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj roll" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project_leader">Projektledare</SelectItem>
                  <SelectItem value="user">Användare</SelectItem>
                  <SelectItem value="observer">Observatör</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                Avbryt
              </Button>
              <Button 
                onClick={handleAddUser}
                disabled={!selectedUserId || addUserMutation.isPending}
              >
                {addUserMutation.isPending ? "Lägger till..." : "Lägg till"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}