import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";

const inviteFormSchema = z.object({
  email: z.string().email("Ogiltig e-postadress"),
  role: z.string().min(1, "En roll måste väljas")
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "user"
    }
  });
  
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormValues) => {
      const response = await apiRequest("POST", "/api/invitations", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inbjudan skickad",
        description: "Användaren har bjudits in till systemet.",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/invitations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fel vid inbjudan",
        description: error.message || "Ett fel uppstod vid inbjudan av användaren. Försök igen.",
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: InviteFormValues) {
    inviteMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          title="Bjud in användare"
        >
          <UserPlus className="h-5 w-5" />
          <span className="sr-only">Bjud in användare</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bjud in användare</DialogTitle>
          <DialogDescription>
            Skicka en inbjudan till en ny användare.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-postadress</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="namn@exempel.se" 
                      {...field} 
                    />
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
                      <SelectItem value="superuser">Superanvändare</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Skickar..." : "Skicka inbjudan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}