import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  UserPlus, 
  Save, 
  X,
  AlertTriangle, 
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

// Schema för att skapa en ny användare
const userFormSchema = z.object({
  username: z.string().min(3, "Användarnamnet måste vara minst 3 tecken"),
  password: z.string().min(6, "Lösenordet måste vara minst 6 tecken"),
  firstName: z.string().min(1, "Förnamn krävs"),
  lastName: z.string().min(1, "Efternamn krävs"),
  email: z.string().email("Ogiltigt e-postformat"),
  role: z.enum(["admin", "project_leader", "superuser", "user"], {
    required_error: "Roll måste väljas",
  }),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface User {
  id: number;
  username: string;
  role: string;
}

export default function UserManagementWidget({ title = "Användarhantering" }) {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isLoadingSubmit, setIsLoadingSubmit] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  
  // Ladda användarlistan
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      return await response.json();
    }
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "user",
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setIsLoadingSubmit(true);
    try {
      const response = await apiRequest('POST', '/api/users', data);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kunde inte skapa användaren");
      }
      
      toast({
        title: "Användaren skapad",
        description: `Användaren ${data.username} har skapats framgångsrikt.`,
      });
      
      // Uppdatera användarlistan
      refetch();
      
      // Återställ formuläret och stäng det
      form.reset();
      setIsAddUserOpen(false);
    } catch (error) {
      toast({
        title: "Fel vid skapande av användare",
        description: error instanceof Error ? error.message : "Ett okänt fel inträffade",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSubmit(false);
    }
  };

  const toggleAddUser = () => {
    setIsAddUserOpen(!isAddUserOpen);
    if (!isAddUserOpen) {
      form.reset();
    }
  };
  
  const confirmDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await apiRequest('DELETE', `/api/users/${userToDelete.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kunde inte ta bort användaren");
      }
      
      toast({
        title: "Användaren borttagen",
        description: `Användaren ${userToDelete.username} har tagits bort.`,
      });
      
      // Uppdatera användarlistan
      refetch();
    } catch (error) {
      toast({
        title: "Fel vid borttagning av användare",
        description: error instanceof Error ? error.message : "Ett okänt fel inträffade",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <Button size="sm" onClick={toggleAddUser}>
            {isAddUserOpen ? (
              <>
                <X className="h-4 w-4 mr-1" /> Stäng
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" /> Ny användare
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          
          {/* Bekräftelsedialog för användarborttagning */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bekräfta borttagning</AlertDialogTitle>
                <AlertDialogDescription>
                  {userToDelete ? (
                    <>
                      Är du säker på att du vill ta bort användaren <strong>{userToDelete.username}</strong>?
                      <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                        All data kopplad till denna användare kommer också att tas bort. Denna åtgärd kan inte ångras.
                      </div>
                    </>
                  ) : (
                    "Är du säker på att du vill ta bort den här användaren?"
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteUser();
                  }}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <span className="mr-2">Tar bort...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Ta bort
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {isAddUserOpen && (
            <div className="mb-4 p-4 border rounded-lg dark:border-gray-700 bg-background">
              <h3 className="text-sm font-medium mb-3">Skapa ny användare</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Användarnamn</FormLabel>
                          <FormControl>
                            <Input placeholder="användarnamn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lösenord</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="****" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Förnamn</FormLabel>
                          <FormControl>
                            <Input placeholder="Förnamn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Efternamn</FormLabel>
                          <FormControl>
                            <Input placeholder="Efternamn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-post</FormLabel>
                          <FormControl>
                            <Input placeholder="namn@exempel.se" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Välj användarroll" />
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
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={toggleAddUser}
                      disabled={isLoadingSubmit}
                    >
                      Avbryt
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isLoadingSubmit}
                    >
                      {isLoadingSubmit ? "Sparar..." : "Skapa användare"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-sm font-medium">Befintliga användare</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Användarnamn
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Roll
                    </th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-sm text-center">
                        Laddar användare...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-sm text-center">
                        Inga användare hittades
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-4 py-2 text-sm">{user.username}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs
                            ${user.role === 'admin' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : ''}
                            ${user.role === 'project_leader' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : ''}
                            ${user.role === 'superuser' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100' : ''}
                            ${user.role === 'user' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : ''}
                          `}>
                            {user.role === 'admin' && 'Administratör'}
                            {user.role === 'project_leader' && 'Projektledare'}
                            {user.role === 'superuser' && 'Superanvändare'}
                            {user.role === 'user' && 'Användare'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => confirmDeleteUser(user)}
                            disabled={user.role === 'admin' || user.id === 1} // Förhindra borttagning av admins och användare med ID 1
                            title={user.role === 'admin' ? "Administratörer kan inte tas bort" : ""}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Ta bort
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </Widget>
  );
}