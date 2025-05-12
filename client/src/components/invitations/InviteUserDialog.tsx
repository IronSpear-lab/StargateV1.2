import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";

const inviteFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: "E-post krävs" })
    .email({ message: "Ogiltig e-postadress" }),
  role: z.string().min(1, { message: "En roll måste väljas" }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

const defaultValues: Partial<InviteFormValues> = {
  email: "",
  role: "user",
};

interface InviteUserDialogProps {
  trigger: React.ReactNode;
}

export function InviteUserDialog({ trigger }: InviteUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues,
  });

  const inviteMutation = useMutation({
    mutationFn: async (values: InviteFormValues) => {
      const response = await apiRequest("POST", "/api/invitations", values);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte skicka inbjudan");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inbjudan skickad",
        description: "Användaren har bjudits in framgångsrikt.",
      });
      form.reset(defaultValues);
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: InviteFormValues) {
    inviteMutation.mutate(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="ml-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Bjud in användare
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bjud in ny användare</DialogTitle>
          <DialogDescription>
            Fyll i användarens e-postadress och välj en roll för dem i systemet. Ett e-postmeddelande med en inbjudningslänk kommer att skickas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-post</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="namn@exempel.se"
                      type="email"
                      {...field}
                      autoComplete="off"
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
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? "Skickar..." : "Bjud in"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}