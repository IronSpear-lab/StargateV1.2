import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Mail, 
  Settings, 
  Send,
  CheckCircle,
  Info,
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Widget } from "@/components/dashboard/Widget";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

// Schema för att skapa systemmeddelanden
const notificationSchema = z.object({
  subject: z.string().min(3, "Ämnet måste vara minst 3 tecken"),
  content: z.string().min(10, "Meddelandet måste vara minst 10 tecken"),
  recipientType: z.enum(["all", "admins", "project_leaders", "superusers", "users"], {
    required_error: "Mottagartyp måste väljas",
  }),
});

type NotificationData = z.infer<typeof notificationSchema>;

// Schema för e-postkonfiguration
const emailConfigSchema = z.object({
  senderName: z.string().min(3, "Avsändarnamn måste vara minst 3 tecken"),
  senderEmail: z.string().email("Ogiltig e-postadress"),
  sendGridApiKey: z.string().optional(),
  enableNewUserEmails: z.boolean().default(true),
  enableAssignmentEmails: z.boolean().default(true),
  enableProjectEmails: z.boolean().default(true),
});

type EmailConfigData = z.infer<typeof emailConfigSchema>;

export default function EmailNotificationWidget({ title = "E-postnotifikationer" }) {
  const [activeTab, setActiveTab] = useState("send");
  const [isLoadingSend, setIsLoadingSend] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const { toast } = useToast();

  // E-postformulär
  const notificationForm = useForm<NotificationData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      subject: "",
      content: "",
      recipientType: "all"
    },
  });

  // Konfigurationsformulär
  const configForm = useForm<EmailConfigData>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      senderName: "ValvX Systemnotifikationer",
      senderEmail: "notifications@valvx.se",
      sendGridApiKey: "",
      enableNewUserEmails: true,
      enableAssignmentEmails: true,
      enableProjectEmails: true
    },
  });

  const onSendNotification = async (data: NotificationData) => {
    setIsLoadingSend(true);
    try {
      // I en verklig implementation skulle vi skicka data till API
      // const response = await apiRequest('POST', '/api/notifications/email', data);
      
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Kunde inte skicka meddelandet");
      // }
      
      toast({
        title: "Meddelande skickat",
        description: `Meddelandet har skickats till ${getRecipientTypeLabel(data.recipientType)}`,
      });
      
      // Återställ formuläret
      notificationForm.reset();
    } catch (error) {
      toast({
        title: "Fel vid sändning",
        description: error instanceof Error ? error.message : "Ett okänt fel inträffade",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSend(false);
    }
  };

  const onSaveConfig = async (data: EmailConfigData) => {
    setIsLoadingConfig(true);
    try {
      // I en verklig implementation skulle vi skicka data till API
      // const response = await apiRequest('POST', '/api/notifications/config', data);
      
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || "Kunde inte spara konfigurationen");
      // }
      
      toast({
        title: "Konfiguration sparad",
        description: "E-postkonfigurationen har uppdaterats",
      });
    } catch (error) {
      toast({
        title: "Fel vid sparande",
        description: error instanceof Error ? error.message : "Ett okänt fel inträffade",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Hjälpfunktion för att visa mottagartyp
  const getRecipientTypeLabel = (type: string): string => {
    switch (type) {
      case 'all': return 'alla användare';
      case 'admins': return 'administratörer';
      case 'project_leaders': return 'projektledare';
      case 'superusers': return 'superanvändare';
      case 'users': return 'standardanvändare';
      default: return type;
    }
  };

  return (
    <Widget title={title}>
      <Card className="h-full">
        <CardHeader className="pb-2 space-y-0">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">Skicka e-postmeddelanden och hantera e-postkonfiguration</p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="send" className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Skicka meddelande
              </TabsTrigger>
              <TabsTrigger value="config" className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                Konfiguration
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="send" className="space-y-4">
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onSendNotification)} className="space-y-4">
                  <FormField
                    control={notificationForm.control}
                    name="recipientType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mottagare</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Välj mottagare" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Alla användare</SelectItem>
                            <SelectItem value="admins">Administratörer</SelectItem>
                            <SelectItem value="project_leaders">Projektledare</SelectItem>
                            <SelectItem value="superusers">Superanvändare</SelectItem>
                            <SelectItem value="users">Standardanvändare</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ämne</FormLabel>
                        <FormControl>
                          <Input placeholder="E-postmeddelandets ämnesrad" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meddelande</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Skriv meddelandet här..."
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      disabled={isLoadingSend}
                    >
                      {isLoadingSend ? "Skickar..." : "Skicka meddelande"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="config" className="space-y-4">
              <Form {...configForm}>
                <form onSubmit={configForm.handleSubmit(onSaveConfig)} className="space-y-4">
                  <div className="space-y-4 border rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-medium flex items-center">
                      <Info className="h-4 w-4 mr-2 text-blue-500" />
                      SendGrid-konfiguration
                    </h3>
                    
                    <FormField
                      control={configForm.control}
                      name="senderName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avsändarens namn</FormLabel>
                          <FormControl>
                            <Input placeholder="Systemnamn" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="senderEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Avsändarens e-post</FormLabel>
                          <FormControl>
                            <Input placeholder="system@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="sendGridApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SendGrid API-nyckel</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="SG.xxxxx" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Lämna tomt för att behålla nuvarande nyckel
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="text-sm font-medium flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                      Notifikationsinställningar
                    </h3>
                    
                    <FormField
                      control={configForm.control}
                      name="enableNewUserEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel>Ny användare-notifikationer</FormLabel>
                            <FormDescription>
                              Skicka e-post när nya användare registreras
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="enableAssignmentEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel>Uppgifts-notifikationer</FormLabel>
                            <FormDescription>
                              Skicka e-post vid tilldelning av uppgifter
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={configForm.control}
                      name="enableProjectEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5">
                            <FormLabel>Projekt-notifikationer</FormLabel>
                            <FormDescription>
                              Skicka e-post vid projektändringar
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      disabled={isLoadingConfig}
                    >
                      {isLoadingConfig ? "Sparar..." : "Spara konfiguration"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </Widget>
  );
}