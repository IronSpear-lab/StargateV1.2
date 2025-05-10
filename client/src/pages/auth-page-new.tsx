import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

// Importera bilderna för light/dark mode
import stockholmLightImage from "../assets/Stadshusljus.webp";
import stockholmDarkImage from "../assets/Stadshusmörk.jpg";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully.",
        });
        
        // Efter en lyckad inloggning, manuellt hämta projektdata
        // medan React Query uppdaterar cache i bakgrunden
        try {
          console.log("Manuellt hämtar projekt efter login...");
          const response = fetch('/api/user-projects');
          console.log("Manuell projekthämtning efter login:", response);
        } catch (e) {
          console.error("Error vid manuell projekthämtning:", e);
        }
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData, {
      onSuccess: () => {
        toast({
          title: "Account created!",
          description: "Your account has been created successfully.",
        });
      },
      onError: (error) => {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  if (user) {
    return null; // Will be redirected
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 gap-0 relative dark:bg-gray-950">
      {/* Vänster sida med formulär */}
      <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 relative">
        {/* Theme toggle i övre högra hörnet av formulärfältet */}
        <div className="absolute top-4 right-4 z-50">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === "dark" ? (
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem]" />
            )}
            <span className="sr-only">Växla tema</span>
          </Button>
        </div>
        
        <Card className="w-full max-w-md dark:border-gray-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">ValvXlstart</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Höger sida med bild */}
      <div className="hidden md:block relative h-full w-full">
        <img 
          src={theme === "dark" ? stockholmDarkImage : stockholmLightImage} 
          alt="Stockholm stadshus" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-blue-900/20 flex flex-col justify-center p-12 text-white shadow-inner">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4 drop-shadow-md">Project Management Platform</h1>
            <p className="text-lg mb-6 drop-shadow">A comprehensive solution for file management, task tracking, and team collaboration.</p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <svg className="w-6 h-6 text-white drop-shadow mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium">File Management</h3>
                  <p className="text-sm text-gray-100">Upload, organize, and share files securely with your team.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <svg className="w-6 h-6 text-white drop-shadow mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium">Task Tracking</h3>
                  <p className="text-sm text-gray-100">Monitor progress with Gantt charts, kanban boards, and task lists.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <svg className="w-6 h-6 text-white drop-shadow mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="text-lg font-medium">Team Collaboration</h3>
                  <p className="text-sm text-gray-100">Work together in real-time with messaging and document annotation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}