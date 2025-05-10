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
    <div className="min-h-screen grid md:grid-cols-2 gap-0 relative dark:bg-gray-950 transition-colors duration-500">
      {/* Vänster sida med formulär */}
      <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 relative transition-colors duration-500">
        {/* Theme toggle i övre högra hörnet av formulärfältet med transition-effekt */}
        <div className="absolute top-4 right-4 z-50">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
          >
            {theme === "dark" ? (
              <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-400 transition-transform duration-500 rotate-0" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem] text-blue-600 transition-transform duration-500 rotate-0" />
            )}
            <span className="sr-only">Växla tema</span>
          </Button>
        </div>
        
        <Card className="w-full max-w-md dark:border-gray-700 transition-all duration-500 shadow-md dark:shadow-lg dark:shadow-gray-900/30">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold transition-colors duration-500">ValvXlstart</CardTitle>
            <CardDescription className="transition-colors duration-500">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="transition-colors duration-500">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 transition-colors duration-500">
                <TabsTrigger value="login" className="transition-colors duration-300">Login</TabsTrigger>
                <TabsTrigger value="register" className="transition-colors duration-300">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="transition-colors duration-500">
                          <FormLabel className="transition-colors duration-500">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="johndoe" 
                              {...field} 
                              className="transition-all duration-500 border-gray-200 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400" 
                            />
                          </FormControl>
                          <FormMessage className="transition-colors duration-500" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="transition-colors duration-500">
                          <FormLabel className="transition-colors duration-500">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className="transition-all duration-500 border-gray-200 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400" 
                            />
                          </FormControl>
                          <FormMessage className="transition-colors duration-500" />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full transition-all duration-300 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" 
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
                        <FormItem className="transition-colors duration-500">
                          <FormLabel className="transition-colors duration-500">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="johndoe" 
                              {...field} 
                              className="transition-all duration-500 border-gray-200 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400" 
                            />
                          </FormControl>
                          <FormMessage className="transition-colors duration-500" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="transition-colors duration-500">
                          <FormLabel className="transition-colors duration-500">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className="transition-all duration-500 border-gray-200 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400" 
                            />
                          </FormControl>
                          <FormMessage className="transition-colors duration-500" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem className="transition-colors duration-500">
                          <FormLabel className="transition-colors duration-500">Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className="transition-all duration-500 border-gray-200 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400" 
                            />
                          </FormControl>
                          <FormMessage className="transition-colors duration-500" />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full transition-all duration-300 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600" 
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
      
      {/* Höger sida med bild - med transition-effekter */}
      <div className="hidden md:block relative h-full w-full overflow-hidden">
        {/* Ljus bild */}
        <img 
          src={stockholmLightImage} 
          alt="Stockholm stadshus (ljus)" 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${theme === 'dark' ? 'opacity-0' : 'opacity-100'}`}
        />
        
        {/* Mörk bild */}
        <img 
          src={stockholmDarkImage} 
          alt="Stockholm stadshus (mörk)" 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Bakgrundseffekt utan text */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-transparent"></div>
      </div>
    </div>
  );
}