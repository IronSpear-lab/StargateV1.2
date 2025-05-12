import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  CheckCircle2, 
  UserCog, 
  Shield, 
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Schema för att ändra roll för en användare
const roleChangeSchema = z.object({
  userId: z.number({
    required_error: "Användare måste väljas",
  }),
  role: z.enum(["admin", "project_leader", "superuser", "user"], {
    required_error: "Roll måste väljas",
  }),
});

type RoleChangeData = z.infer<typeof roleChangeSchema>;

interface User {
  id: number;
  username: string;
  role: string;
}

export default function RoleManagementWidget({ title = "Rollhantering" }) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const { toast } = useToast();
  
  // Ladda användarlistan
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return await response.json();
    }
  });

  const form = useForm<RoleChangeData>({
    resolver: zodResolver(roleChangeSchema),
    defaultValues: {
      userId: 0,
      role: "user",
    },
  });

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    form.setValue("userId", user.id);
    form.setValue("role", user.role);
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: RoleChangeData) => {
    setIsLoadingSubmit(true);
    try {
      const response = await apiRequest('PATCH', `/api/users/${data.userId}/role`, { role: data.role });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kunde inte uppdatera användarens roll");
      }
      
      toast({
        title: "Roll uppdaterad",
        description: `Användarens roll har uppdaterats till ${getRoleDisplayName(data.role)}.`,
      });
      
      // Uppdatera användarlistan
      refetch();
      
      // Stäng dialogen
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Fel vid uppdatering av roll",
        description: error instanceof Error ? error.message : "Ett okänt fel inträffade",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  // Hjälpfunktion för att visa rollnamn
  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'admin': return 'Administratör';
      case 'project_leader': return 'Projektledare';
      case 'superuser': return 'Superanvändare';
      case 'user': return 'Användare';
      default: return role;
    }
  };

  // Hjälpfunktion för att visa rollikoner och färger
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'project_leader':
        return <UserCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'superuser':
        return <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'user':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">Hantera användarroller i systemet</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Laddar användare...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-sm text-muted-foreground">Inga användare hittades</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Användarnamn
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nuvarande roll
                      </th>
                      <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Åtgärd
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-2 text-sm">{user.username}</td>
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span className={`inline-block px-2 py-1 rounded-full text-xs
                              ${user.role === 'admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : ''}
                              ${user.role === 'project_leader' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : ''}
                              ${user.role === 'superuser' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100' : ''}
                              ${user.role === 'user' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : ''}
                            `}>
                              {getRoleDisplayName(user.role)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleUserSelect(user)}
                          >
                            Ändra roll
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dialog för att ändra roll */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ändra roll för {selectedUser?.username}</DialogTitle>
                <DialogDescription>
                  Välj ny roll för användaren. Detta påverkar användarens behörigheter i systemet.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ny roll</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Välj roll" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Användare</SelectItem>
                            <SelectItem value="project_leader">Projektledare</SelectItem>
                            <SelectItem value="superuser">Superanvändare</SelectItem>
                            <SelectItem value="admin">Administratör</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isLoadingSubmit}
                    >
                      Avbryt
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoadingSubmit}
                    >
                      {isLoadingSubmit ? "Sparar..." : "Spara ändring"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </Widget>
  );
}