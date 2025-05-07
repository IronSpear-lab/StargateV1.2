import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Använda explicitly delay så att sessionen har tid att sparas
      const res = await apiRequest("POST", "/api/login", credentials);
      const userData = await res.json();
      
      // Fördröj något för att låta servern slutföra alla sessionsoperationer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Gör ett efterföljande anrop för att bekräfta att sessionen är aktiv
      await apiRequest("GET", "/api/user");
      
      return userData;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login successful, setting user data:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidera all befintlig data för att tvinga omladdning med nya sessionen
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      const userData = await res.json();
      
      // Fördröj något för att låta servern slutföra alla sessionsoperationer
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Gör ett efterföljande anrop för att bekräfta att sessionen är aktiv
      await apiRequest("GET", "/api/user");
      
      return userData;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration successful, setting user data:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Invalidera all befintlig data för att tvinga omladdning med nya sessionen
      queryClient.invalidateQueries();
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
