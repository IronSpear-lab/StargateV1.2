import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Send, MoreVertical, UserPlus, Search } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/Sidebar";

// Types for the messaging system
interface UserBasic {
  id: number;
  username: string;
  role: string;
}

interface Participant {
  conversationId: number;
  userId: number;
  joinedAt: string;
  isAdmin: boolean;
  user: UserBasic;
}

interface Message {
  id: number;
  content: string;
  conversationId: number;
  senderId: number;
  sentAt: string;
  sender?: UserBasic;
  readBy: number[]; // Array of user IDs who have read this message
}

interface Conversation {
  id: number;
  title: string | null;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  participants: Participant[];
  latestMessage?: Message;
  messages?: Message[];
  // For UI display name in conversation list
  displayName?: string;
  // For unread message count
  unreadCount?: number;
}

function formatMessageDate(dateString: string) {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMM d');
  }
}

const ConversationsList = ({ 
  conversations, 
  selectedConversation, 
  onSelectConversation 
}: { 
  conversations: Conversation[], 
  selectedConversation: number | null, 
  onSelectConversation: (id: number) => void 
}) => {
  // Track unread messages (This would normally be server-driven)
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  
  // Calculate actual unread messages based on message readBy arrays
  useEffect(() => {
    const actualUnread: Record<number, number> = {};
    
    // Get current user ID
    const currentUserId = (window as any).currentUser?.id;
    if (!currentUserId) return;
    
    conversations.forEach(conv => {
      // Don't immediately hide unread indicator when conversation is selected
      // Keep showing the unread badge until the conversation is fully loaded
      // This prevents the badge from disappearing before content is visible
      if (conv.latestMessage) {
        // Count messages not read by current user
        const unreadCount = conv.messages?.filter(msg => 
          msg.senderId !== currentUserId && 
          !msg.readBy?.includes(currentUserId)
        )?.length || 0;
        
        if (unreadCount > 0) {
          actualUnread[conv.id] = unreadCount;
        }
      }
    });
    
    setUnreadCounts(prev => {
      // Keep existing unread count for selected conversation
      // so indicator doesn't disappear until fully loaded
      if (selectedConversation && prev[selectedConversation]) {
        return {
          ...actualUnread,
          [selectedConversation]: prev[selectedConversation]
        };
      }
      return actualUnread;
    });
  }, [conversations, selectedConversation]);
  
  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/messages/mark-as-read`,
        { conversationId }
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalidate unread counts query to update badge
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
    }
  });
  
  // Do not mark as read immediately when selecting a conversation
  // We'll mark as read only when the conversation data is loaded and displayed
  
  return (
    <ScrollArea className="h-[calc(100vh-13rem)] pr-3">
      {conversations.length === 0 ? (
        <div className="text-center p-4 text-muted-foreground">
          No conversations yet. Start a new one!
        </div>
      ) : (
        conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted mb-1 ${
              selectedConversation === conversation.id ? "bg-muted" : ""
            }`}
            onClick={() => onSelectConversation(conversation.id)}
          >
            {conversation.isGroup ? (
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className="bg-primary/10 text-primary">
                  G
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="relative">
                <Avatar className="h-10 w-10 border">
                  {/* Hämta användarens avatar om den finns i localStorage */}
                {(() => {
                  // Försök hitta användarens namn från konversationen
                  const otherUser = conversation.participants?.find(p => 
                    p.userId !== (window as any).currentUser?.id
                  )?.user;
                    
                  // Hämta avatar om vi hittade användaren
                  const userAvatar = otherUser?.username 
                    ? localStorage.getItem(`userAvatar_${otherUser.username}`)
                    : null;
                    
                  // Visa användardefinierad avatar eller fallback till standard
                  if (userAvatar) {
                    return <AvatarImage src={userAvatar} alt={otherUser?.username} />;
                  }
                  
                  return <AvatarImage src="/avatars/user.svg" />;
                })()}
                  <AvatarFallback className="bg-[#0acf97]">
                    {/* Use participant initials */}
                    {conversation.displayName ? conversation.displayName.substring(0, 2).toUpperCase() : ""}
                  </AvatarFallback>
                </Avatar>
                
                {/* Unread message indicator */}
                {unreadCounts[conversation.id] > 0 && (
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCounts[conversation.id]}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-medium truncate">
                  {conversation.title || conversation.displayName || "New Conversation"}
                </h3>
                {conversation.latestMessage && (
                  <span className="text-xs text-muted-foreground">
                    {formatMessageDate(conversation.latestMessage.sentAt)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {conversation.latestMessage?.content || "No messages yet"}
              </p>
            </div>
          </div>
        ))
      )}
    </ScrollArea>
  );
};

const MessageView = ({ 
  conversation, 
  onSendMessage 
}: { 
  conversation: Conversation | undefined, 
  onSendMessage: (content: string) => void 
}) => {
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const hasMarkedAsRead = useRef(false);
  
  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      console.log("Marking conversation as read:", conversationId);
      const response = await apiRequest(
        "POST",
        `/api/messages/mark-as-read`,
        { conversationId }
      );
      return response.json();
    },
    onSuccess: () => {
      console.log("Successfully marked messages as read");
      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  });
  
  // When conversation is fully loaded and component is mounted, mark messages as read
  useEffect(() => {
    if (conversation && conversation.id && !hasMarkedAsRead.current) {
      console.log("Conversation loaded, marking as read:", conversation.id);
      markAsReadMutation.mutate(conversation.id);
      hasMarkedAsRead.current = true;
    }
    
    return () => {
      // Reset flag when component unmounts or conversation changes
      hasMarkedAsRead.current = false;
    };
  }, [conversation?.id]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 100);
    }
  }, [conversation?.messages?.length]);
  
  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <User size={48} className="mb-2 text-primary/50" />
        <p>Select a conversation or start a new one</p>
      </div>
    );
  }
  
  // Group messages by date
  const messagesByDate: Record<string, Message[]> = {};
  
  // Ensure we have valid messages to iterate through
  const messages = conversation.messages || [];
  
  messages.forEach(message => {
    const date = new Date(message.sentAt).toLocaleDateString();
    if (!messagesByDate[date]) {
      messagesByDate[date] = [];
    }
    messagesByDate[date].push(message);
  });
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {conversation.isGroup ? (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary">G</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-8 w-8">
              {/* Kontrollera om det finns en användardefinierad avatar i localStorage */}
              {(() => {
                // Hitta den andra personen i konversationen (ej mig själv)
                const otherUser = conversation.participants?.find(p => 
                  p.userId !== (window as any).currentUser?.id
                )?.user;
                  
                // Hämta avatar från localStorage baserat på användarnamn
                const userAvatar = otherUser?.username 
                  ? localStorage.getItem(`userAvatar_${otherUser.username}`) 
                  : null;
                  
                // Om vi har en användardefinierad avatar, visa den
                if (userAvatar) {
                  return <AvatarImage src={userAvatar} alt={otherUser?.username || 'User'} />;
                }
                
                // Annars fall tillbaka på standardavatarer baserat på roll
                return <AvatarImage src={`/avatars/${otherUser?.role || 'user'}.svg`} alt={otherUser?.username || 'User'} />;
              })()}
              <AvatarFallback className="bg-[#727cf5]">
                PL
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h3 className="font-medium text-sm">
              {conversation.title || conversation.displayName || 
                (conversation.participants && conversation.participants.length > 0
                  ? conversation.participants
                      .filter(p => p.userId !== (window as any).currentUser?.id)
                      .map(p => p.user?.username || "Unknown")
                      .join(", ")
                  : "New Conversation")}
            </h3>
            {conversation.isGroup && conversation.participants && (
              <p className="text-xs text-muted-foreground">
                {conversation.participants.length} members
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem checked={false}>
              Mute conversation
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Use a regular div with scroll instead of ScrollArea for direct scroll control */}
      <div 
        ref={scrollAreaRef}
        className="flex-1 p-3 overflow-y-auto"
      >
        {Object.entries(messagesByDate).map(([date, messages]) => (
          <div key={date} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground font-medium">
                {(() => {
                  const messageDate = new Date(date);
                  if (isToday(messageDate)) {
                    return "Today";
                  } else if (isYesterday(messageDate)) {
                    return "Yesterday";
                  } else {
                    return format(messageDate, "MMMM d, yyyy");
                  }
                })()}
              </span>
              <Separator className="flex-1" />
            </div>
            
            {messages.map((message) => {
              const isMine = message.senderId === (window as any).currentUser?.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex mb-3 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex gap-2 max-w-[80%]">
                    {!isMine && (
                      <Avatar className="h-8 w-8 mt-1">
                        {/* Kontrollera om det finns en användardefinierad avatar i localStorage */}
                        {(() => {
                          // Hämta avatar från localStorage baserat på användarnamn
                          const userAvatar = message.sender?.username 
                            ? localStorage.getItem(`userAvatar_${message.sender.username}`) 
                            : null;
                            
                          // Om vi har en användardefinierad avatar, visa den
                          if (userAvatar) {
                            return <AvatarImage src={userAvatar} alt={message.sender?.username || 'User'} />;
                          }
                          
                          // Annars fall tillbaka på standardavatarer
                          return <AvatarImage src={`/avatars/${message.sender?.role || 'user'}.svg`} alt={message.sender?.username || 'User'} />;
                        })()}
                        <AvatarFallback className={`${
                          message.sender?.role === 'project_leader' 
                            ? 'bg-[#727cf5]' 
                            : message.sender?.role === 'admin'
                              ? 'bg-[#fa5c7c]'
                              : message.sender?.role === 'superuser'
                                ? 'bg-[#ffc35a]'
                                : 'bg-[#0acf97]'
                        }`}>
                          {message.sender?.username?.slice(0, 2).toUpperCase() || 'US'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      {!isMine && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {message.sender?.username}
                        </p>
                      )}
                      <div
                        className={`p-3 rounded-lg ${
                          isMine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">
                        {format(new Date(message.sentAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {(!conversation.messages || conversation.messages.length === 0) && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm">Be the first to send a message!</p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

const NewConversationDialog = ({ onCreateConversation }: { onCreateConversation: (data: { title?: string, participantIds: number[], initialMessage?: string }) => void }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserBasic[]>([]);
  
  const { data: users } = useQuery<UserBasic[]>({
    queryKey: ["/api/users"],
    staleTime: 60000, // 1 minute
  });
  
  const filteredUsers = users?.filter(user => 
    user.id !== (window as any).currentUser?.id && 
    (user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.role.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];
  
  const handleCreateConversation = () => {
    if (selectedUsers.length === 0) return;
    
    onCreateConversation({
      title: title || undefined,
      participantIds: selectedUsers.map(u => u.id),
      initialMessage: initialMessage || undefined
    });
    
    // Reset form
    setTitle("");
    setInitialMessage("");
    setSelectedUsers([]);
    setOpen(false);
  };
  
  const toggleUserSelection = (user: UserBasic) => {
    if (selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full mb-4">
          <UserPlus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {selectedUsers.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Group Title (optional)
              </label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Enter group title" 
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Recipients</label>
            <div className="flex items-center border rounded-md">
              <Search className="h-4 w-4 ml-3 text-muted-foreground" />
              <Input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search by name or role" 
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 py-2">
                {selectedUsers.map(user => (
                  <Badge key={user.id} variant="secondary" className="gap-1">
                    {user.username}
                    <button 
                      onClick={() => toggleUserSelection(user)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            <ScrollArea className="h-60 border rounded-md">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 hover:bg-muted cursor-pointer ${
                      selectedUsers.some(u => u.id === user.id) ? "bg-muted/80" : ""
                    }`}
                    onClick={() => toggleUserSelection(user)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`/avatars/${user.role || 'user'}.svg`} alt={user.username || 'User'} />
                        <AvatarFallback className={`${
                          user.role === 'project_leader' ? 'bg-[#727cf5]' : 
                          user.role === 'admin' ? 'bg-[#fa5c7c]' : 
                          user.role === 'superuser' ? 'bg-[#ffc35a]' : 
                          'bg-[#0acf97]'
                        }`}>
                          {user.username ? user.username.substring(0, 2).toUpperCase() : ""}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="h-4 w-4 rounded-sm border flex items-center justify-center">
                      {selectedUsers.some(u => u.id === user.id) && (
                        <div className="h-2 w-2 rounded-sm bg-primary" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Initial Message (optional)
            </label>
            <Input 
              value={initialMessage} 
              onChange={(e) => setInitialMessage(e.target.value)} 
              placeholder="Enter your first message..." 
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleCreateConversation} 
            disabled={selectedUsers.length === 0}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function MessagesPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // State for authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // Get current user from window (temporarily)
  useEffect(() => {
    // Set current user on window for easy access
    const fetchCurrentUser = async () => {
      try {
        setIsAuthLoading(true);
        const response = await fetch('/api/user', {
          credentials: 'include'
        });
        if (response.ok) {
          const user = await response.json();
          (window as any).currentUser = user;
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    
    fetchCurrentUser();
  }, []);
  
  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(loginForm)
      });
      
      if (response.ok) {
        const user = await response.json();
        (window as any).currentUser = user;
        setIsAuthenticated(true);
        toast({
          title: "Welcome back!",
          description: `Logged in as ${user.username}`,
        });
      } else {
        toast({
          title: "Login failed",
          description: "Please check your credentials and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: "An error occurred during login",
        variant: "destructive",
      });
    }
  };
  
  // Fetch all conversations
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    staleTime: 10000, // 10 seconds
    select: (data) => {
      // Make sure we use the conversation participants to get the correct display name
      return data.map(conversation => {
        // For conversation list display, we need to show the other participant's name
        // If you're the sender, it should show the recipient's name
        const otherParticipant = conversation.participants?.find(p => 
          p.userId !== (window as any).currentUser?.id
        );
        
        return {
          ...conversation,
          displayName: otherParticipant?.user?.username || "Unknown"
        };
      });
    }
  });
  
  // Fetch selected conversation with messages
  const { data: selectedConversation, refetch: refetchConversation } = useQuery<Conversation>({
    queryKey: ['/api/conversations', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      
      // Make sure we're including credentials for the session cookie
      const response = await fetch(`/api/conversations/${selectedConversationId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error("Failed to fetch conversation:", await response.text());
        throw new Error("Failed to fetch conversation");
      }
      
      const data = await response.json();
      console.log("Fetched conversation with messages:", data);
      return data;
    },
    enabled: selectedConversationId !== null,
    staleTime: 1000, // 1 second 
  });
  
  // Setup polling for new messages when a conversation is selected
  useEffect(() => {
    if (selectedConversationId === null) return;
    
    const intervalId = setInterval(() => {
      refetchConversation();
    }, 2000); // Poll every 2 seconds
    
    return () => clearInterval(intervalId);
  }, [selectedConversationId, refetchConversation]);
  
  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { title?: string, participantIds: number[], initialMessage?: string }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (newConversation: Conversation) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      // Select the new conversation
      setSelectedConversationId(newConversation.id);
      
      toast({
        title: "Conversation created",
        description: "You can now start chatting",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create conversation: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number, content: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate the conversation to refresh messages
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversationId] });
      // Also update the conversation list to show the latest message
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to send message: " + error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSendMessage = (content: string) => {
    if (selectedConversationId) {
      sendMessageMutation.mutate({ 
        conversationId: selectedConversationId, 
        content 
      });
    }
  };
  
  const handleCreateConversation = (data: { title?: string, participantIds: number[], initialMessage?: string }) => {
    createConversationMutation.mutate(data);
  };
  
  // Show login form if not authenticated
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-xl text-center">Loading...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-xl text-center">Login Required</CardTitle>
            <p className="text-center text-muted-foreground">Please login to access Messages</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={loginForm.username} 
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  placeholder="projectleader"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={loginForm.password} 
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="******"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Login</Button>
              <p className="text-xs text-center text-muted-foreground pt-4">
                Hint: Try projectleader / 123456
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main content when authenticated
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container py-6 px-4 md:px-6">
          <h1 className="text-3xl font-bold mb-6">Messages</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="p-4">
                <CardTitle className="text-xl">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <NewConversationDialog onCreateConversation={handleCreateConversation} />
                
                {isLoading ? (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Loading conversations...</p>
                  </div>
                ) : (
                  <ConversationsList 
                    conversations={conversations}
                    selectedConversation={selectedConversationId}
                    onSelectConversation={(id) => setSelectedConversationId(id)}
                  />
                )}
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardContent className="p-0 h-[calc(100vh-13rem)]">
                <MessageView
                  conversation={selectedConversation}
                  onSendMessage={handleSendMessage}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}