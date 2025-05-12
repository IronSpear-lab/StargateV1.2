import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

const inviteFormSchema = z.object({
  email: z.string().email({
    message: 'Ange en giltig e-postadress.',
  }),
  role: z.enum(['admin', 'project_leader', 'user'], {
    required_error: 'Välj en roll för användaren.',
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role: 'user',
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const response = await apiRequest('POST', '/api/users/invite', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Inbjudan skickad',
        description: 'Användaren har bjudits in till plattformen.',
      });
      form.reset();
      setOpen(false);
      // Vid behov kan du uppdatera ev. relaterad data i cachen
      queryClient.invalidateQueries({ queryKey: ['/api/users/invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fel vid inbjudan',
        description: error.message || 'Kunde inte skicka inbjudan.',
        variant: 'destructive',
      });
    },
  });

  function onSubmit(data: InviteFormValues) {
    inviteUserMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Bjud in användare
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bjud in användare</DialogTitle>
          <DialogDescription>
            Skicka en inbjudan till en ny användare att ansluta till plattformen.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-postadress</FormLabel>
                  <FormControl>
                    <Input placeholder="exempel@domän.se" {...field} />
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
                        <SelectValue placeholder="Välj roll" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">Användare</SelectItem>
                      <SelectItem value="project_leader">Projektledare</SelectItem>
                      <SelectItem value="admin">Administratör</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="mr-2"
              >
                Avbryt
              </Button>
              <Button 
                type="submit" 
                disabled={inviteUserMutation.isPending}
              >
                {inviteUserMutation.isPending ? "Skickar..." : "Bjud in"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}