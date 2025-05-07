import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Lägg till anti-cache headers även för apiRequest
  const headers: HeadersInit = data ? 
    { 
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    } : 
    {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    };

  // Särskild hantering för SameSite=None cookie-problem i Replit
  if (url.includes('/api/login') || url.includes('/api/projects')) {
    console.log('Special handling for', url);
    
    // Lägg till en slumpmässig parameter för att kringgå cachen
    const separator = url.includes('?') ? '&' : '?';
    const noCacheUrl = `${url}${separator}nocache=${new Date().getTime()}`;
    
    const res = await fetch(noCacheUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      // Tvinga fetch att respektera cookies även över CORS
      mode: "cors",
    });
    
    return res;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    // Tvinga fetch att respektera cookies även över CORS
    mode: "cors",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Använd samma anti-cache lösning för alla anrop
    const url = queryKey[0] as string;
    
    // Lägg till en slumpmässig parameter för att kringgå cachen
    const separator = url.includes('?') ? '&' : '?';
    const noCacheUrl = `${url}${separator}nocache=${new Date().getTime()}`;
    
    const res = await fetch(noCacheUrl, {
      credentials: "include",
      mode: "cors",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
