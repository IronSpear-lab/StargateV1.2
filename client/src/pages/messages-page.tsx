import { useState, useEffect } from "react";
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
              <Avatar className="h-10 w-10 border">
                <AvatarImage src="" />
                <AvatarFallback>
                  {/* Safely get participant initials */}
                  {conversation.participants && conversation.participants.length > 0
                    ? (conversation.participants.find(p => p.userId !== (window as any).currentUser?.id)?.user?.username || "UN").substring(0, 2).toUpperCase()
                    : "UN"}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className="font-medium truncate">
                  {conversation.title || 
                    (conversation.participants && conversation.participants.length > 0
                      ? conversation.participants
                          .filter(p => p.userId !== (window as any).currentUser?.id)
                          .map(p => p.user?.username || "Unknown")
                          .join(", ")
                      : "New Conversation")}
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
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };
  
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
  
  conversation.messages?.forEach(message => {
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
              <AvatarImage src="" />
              <AvatarFallback>
                {/* Safely get participant initials */}
                {conversation.participants && conversation.participants.length > 0
                  ? (conversation.participants.find(p => p.userId !== (window as any).currentUser?.id)?.user?.username || "UN").substring(0, 2).toUpperCase()
                  : "UN"}
              </AvatarFallback>
            </Avatar>
          )}
          <div>
            <h3 className="font-medium text-sm">
              {conversation.title || 
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
      
      <ScrollArea className="flex-1 p-3">
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
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {message.sender?.username.substring(0, 2).toUpperCase() || "UN"}
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
      </ScrollArea>
      
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
                        <AvatarFallback>
                          {user.username.substring(0, 2).toUpperCase()}
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
  
  // Get current user from window (temporarily)
  useEffect(() => {
    // Set current user on window for easy access
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const user = await response.json();
          (window as any).currentUser = user;
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    if (!(window as any).currentUser) {
      fetchCurrentUser();
    }
  }, []);
  
  // Fetch all conversations
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    staleTime: 10000, // 10 seconds
  });
  
  // Fetch selected conversation with messages
  const { data: selectedConversation, refetch: refetchConversation } = useQuery<Conversation>({
    queryKey: ['/api/conversations', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      const response = await fetch(`/api/conversations/${selectedConversationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch conversation");
      }
      return response.json();
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