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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Send, MoreVertical, UserPlus, Search, FileIcon, Paperclip, X, FileText, Image as ImageIcon, Loader2, ExternalLink, Edit, Settings, Users, Camera, Shield, UserMinus, LogOut } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sidebar } from "@/components/Sidebar";
import { PDFViewerDialog } from "@/components/ui/pdf-viewer-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Custom event declaration for TypeScript
declare global {
  interface WindowEventMap {
    'conversation-read': CustomEvent<{ conversationId: number }>;
  }
}

// Types for the messaging system
interface UserBasic {
  id: number;
  username: string;
  role: string;
}

interface Participant {
  id: number;
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
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
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
  // Group image URL
  imageUrl?: string | null;
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
  
  // Den här ref-flaggan indikerar om vi har faktiskt läst meddelanden för den valda konversationen
  const conversationReadByRef = useRef<Record<number, boolean>>({});
  const queryClient = useQueryClient(); // Importera från global scope

  // Lyssna på ändringar i conversationReadByRef data från MessageView via vår globala EventEmitter
  useEffect(() => {
    // Lyssna på MessageView-komponenten om när meddelanden faktiskt har markerats som lästa
    const handleConversationRead = (event: CustomEvent) => {
      const { conversationId } = event.detail;
      if (conversationId) {
        console.log("ConversationList: Received conversation read event for:", conversationId);
        conversationReadByRef.current[conversationId] = true;
        
        // Ta bort notifikation när konversationen markeras som läst
        setUnreadCounts(prev => {
          const updated = { ...prev };
          delete updated[conversationId];
          return updated;
        });
      }
    };

    // Skapa en anpassad händelselyssnare
    window.addEventListener('conversation-read', handleConversationRead as EventListener);
    return () => {
      window.removeEventListener('conversation-read', handleConversationRead as EventListener);
    };
  }, []);
  
  // Calculate actual unread messages based on message readBy arrays
  useEffect(() => {
    const actualUnread: Record<number, number> = {};
    
    // Get current user ID
    const currentUserId = (window as any).currentUser?.id;
    if (!currentUserId) return;
    
    conversations.forEach(conv => {
      // Om konversationen är markerad som läst i vår ref, visa inte notifikationer
      if (conversationReadByRef.current[conv.id]) {
        return;
      }
      
      // Don't immediately hide unread indicator when conversation is selected
      // Keep showing the unread badge until the conversation is fully loaded
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
      const newCounts = { ...actualUnread };
      // Behåll alltid olästa räknare för valda konversationer tills de markeras som lästa
      if (selectedConversation && prev[selectedConversation] && !conversationReadByRef.current[selectedConversation]) {
        newCounts[selectedConversation] = prev[selectedConversation];
      }
      return newCounts;
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
              <p className={`text-sm truncate ${
                unreadCounts[conversation.id] > 0 
                  ? "font-bold text-foreground" 
                  : "text-muted-foreground"
              }`}>
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
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const hasMarkedAsRead = useRef(false);
  const { toast } = useToast();
  
  // State for group settings dialog
  const [groupSettingsDialogOpen, setGroupSettingsDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
  const [isUploadingGroupImage, setIsUploadingGroupImage] = useState(false);
  const [showParticipantsTab, setShowParticipantsTab] = useState(false);
  const groupImageInputRef = useRef<HTMLInputElement>(null);
  
  // Determine if current user is an admin in this conversation
  const isCurrentUserAdmin = conversation?.participants?.find(
    p => p.userId === (window as any).currentUser?.id
  )?.isAdmin || false;
  
  // Leave conversation mutation
  const leaveConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/conversations/${conversationId}/leave`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      
      toast({
        title: "Konversation lämnad",
        description: "Du har lämnat konversationen",
      });
    },
    onError: (error) => {
      toast({
        title: "Fel vid borttagning",
        description: "Det gick inte att lämna konversationen",
        variant: "destructive"
      });
      console.error("Failed to leave conversation:", error);
    }
  });
  
  // Update group conversation mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      updates 
    }: { 
      conversationId: number, 
      updates: { 
        title?: string, 
        imageUrl?: string 
      } 
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/conversations/${conversationId}`,
        updates
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId] });
      
      toast({
        title: "Grupp uppdaterad",
        description: "Gruppchattens inställningar har uppdaterats",
      });
      
      // Stäng dialogen
      setGroupSettingsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Fel vid uppdatering",
        description: "Det gick inte att uppdatera gruppchattens inställningar",
        variant: "destructive"
      });
      console.error("Failed to update group:", error);
    }
  });
  
  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: number, userId: number }) => {
      const response = await apiRequest(
        "DELETE",
        `/api/conversations/${conversationId}/participants/${userId}`,
        {}
      );
      return response.status === 204 ? {} : response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId] });
      
      toast({
        title: "Deltagare borttagen",
        description: "Deltagaren har tagits bort från gruppchatten",
      });
    },
    onError: (error) => {
      toast({
        title: "Fel vid borttagning",
        description: "Det gick inte att ta bort deltagaren från gruppchatten",
        variant: "destructive"
      });
      console.error("Failed to remove participant:", error);
    }
  });
  
  // Toggle admin status mutation
  const toggleAdminStatusMutation = useMutation({
    mutationFn: async ({ 
      conversationId, 
      userId, 
      isAdmin 
    }: { 
      conversationId: number, 
      userId: number,
      isAdmin: boolean 
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/conversations/${conversationId}/participants/${userId}`,
        { isAdmin }
      );
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId] });
      
      const actionText = variables.isAdmin ? "tilldelad admin-rättigheter" : "fråntagen admin-rättigheter";
      
      toast({
        title: "Admin-status uppdaterad",
        description: `Deltagaren har blivit ${actionText}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Fel vid statusändring",
        description: "Det gick inte att ändra deltagarens admin-status",
        variant: "destructive"
      });
      console.error("Failed to update admin status:", error);
    }
  });
  
  // Handle group image selection
  const handleGroupImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Check file size (2MB limit for profile images)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Bilden är för stor",
        description: "Maximal bildstorlek är 2MB",
        variant: "destructive"
      });
      return;
    }
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Fel filtyp",
        description: "Välj en bildfil (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }
    
    // Upload the image
    uploadGroupImage(file);
  };
  
  // Upload group image
  const uploadGroupImage = async (file: File) => {
    if (!conversation) return;
    
    setIsUploadingGroupImage(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/conversations/${conversation.id}/image`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      setGroupImageUrl(data.imageUrl);
      
      // Update the conversation with the new image URL
      updateGroupMutation.mutate({
        conversationId: conversation.id,
        updates: { imageUrl: data.imageUrl }
      });
      
    } catch (error) {
      toast({
        title: "Uppladdningsfel",
        description: "Det gick inte att ladda upp bilden",
        variant: "destructive"
      });
      console.error("Error uploading image:", error);
    } finally {
      setIsUploadingGroupImage(false);
    }
  };
  

  
  // Helper to scroll to bottom with a specified delay to ensure DOM update
  const scrollToBottom = (delay = 50) => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        requestAnimationFrame(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
            console.log("Scrolled to bottom, height:", scrollAreaRef.current.scrollHeight);
          }
        });
      }
    }, delay);
  };
  
  // Helper function to check if user is at bottom of scroll
  const isUserAtBottom = () => {
    if (!scrollAreaRef.current) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    // Consider "at bottom" if within 100px of the bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  };
  
  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      console.log("Marking conversation as read:", conversationId);
      
      // Skicka en anpassad event omedelbart för att uppdatera UI direkt
      // utan att vänta på serversvaret
      const event = new CustomEvent('conversation-read', { 
        detail: { conversationId: conversationId } 
      });
      window.dispatchEvent(event);
      
      // Sedan skicka anropet till servern
      const response = await apiRequest(
        "POST",
        `/api/messages/mark-as-read`,
        { conversationId }
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log("Successfully marked messages as read for conversation:", variables);
      
      // Invalidate queries to update data from server
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      console.error("Failed to mark messages as read:", error);
      
      // Återställ händelsen vid fel
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    }
  });
  
  // When conversation is fully loaded, mark messages as read AND scroll to bottom
  useEffect(() => {
    if (conversation && conversation.id && !hasMarkedAsRead.current) {
      console.log("Conversation loaded, marking as read:", conversation.id);
      
      // Mark messages as read
      markAsReadMutation.mutate(conversation.id);
      hasMarkedAsRead.current = true;
      
      // Initial auto-scroll to bottom with a delay to ensure DOM is ready
      scrollToBottom(100);
    }
    
    return () => {
      // Reset flag when component unmounts or conversation changes
      hasMarkedAsRead.current = false;
    };
  }, [conversation?.id]);
  
  // Always scroll to bottom when messages array changes (new messages)
  useEffect(() => {
    if (conversation?.messages?.length) {
      scrollToBottom(100);
    }
  }, [conversation?.messages?.length]);
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };
  
  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // För att hantera PDF-visning
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfTitle, setPdfTitle] = useState("");
  
  // Öppna PDF i dialogrutan
  const openPdfViewer = (url: string, title: string) => {
    setPdfUrl(url);
    setPdfTitle(title);
    setPdfViewerOpen(true);
  };
  
  // Upload file and send message
  const uploadFileAndSendMessage = async () => {
    if (!selectedFile || !conversation?.id) return;
    
    try {
      setIsUploading(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // If we have text content, we'll use it in place of the default file name message
      if (newMessage.trim()) {
        formData.append('content', newMessage.trim());
      }
      
      // Upload the file and create the message in one step
      const response = await fetch(`/api/conversations/${conversation.id}/attachment`, {
        method: 'POST',
        body: formData,
        credentials: 'include' // Important for cookie-based auth
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      const result = await response.json();
      
      // Clear the form
      setNewMessage("");
      clearSelectedFile();
      
      // Add the new message to the conversation
      if (result.message && conversation?.messages) {
        // Create a shallow copy of the messages array and add the new message
        const updatedMessages = [...conversation.messages, result.message];
        
        // Use optimistic update to update the UI immediately
        queryClient.setQueryData(
          [`/api/conversations/${conversation.id}`], 
          (oldData: any) => {
            if (oldData) {
              return {
                ...oldData,
                messages: updatedMessages,
                lastMessageAt: result.message.sentAt
              };
            }
            return oldData;
          }
        );
        
        // Invalidate the query to refetch fresh data from server
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversation.id}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
      
      // Force scroll to bottom after sending
      scrollToBottom(50);
      
      toast({
        title: "File shared",
        description: "Your file has been uploaded and shared",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle form submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there's a file selected, upload it and send the message
    if (selectedFile) {
      await uploadFileAndSendMessage();
      return;
    }
    
    // Otherwise just send a regular text message
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
      
      // Force scroll to bottom after sending a message
      scrollToBottom(50);
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
            {(conversation.isGroup || conversation.participants.length > 2) && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    const currentTitle = conversation.title || conversation.participants
                      .filter(p => p.userId !== (window as any).currentUser?.id)
                      .map(p => p.user?.username || "Unknown")
                      .join(", ");

                    setNewGroupName(currentTitle);
                    setGroupImageUrl(conversation.imageUrl || null);
                    setShowParticipantsTab(false);
                    setGroupSettingsDialogOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Gruppchatten inställningar
                </DropdownMenuItem>
                
                {isCurrentUserAdmin && (
                  <DropdownMenuItem
                    onClick={() => {
                      setShowParticipantsTab(true);
                      setGroupSettingsDialogOpen(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Hantera deltagare
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (window.confirm(`Är du säker på att du vill lämna den här konversationen? Den kommer att tas bort från din lista.`)) {
                  leaveConversationMutation.mutate(conversation.id);
                }
              }}
              className="text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Lämna konversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={false}>
              Stäng av aviseringar
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
                        
                        {/* Display attachment if available */}
                        {message.attachmentUrl && (
                          <div className="mt-2 border rounded-md overflow-hidden">
                            {message.attachmentType?.startsWith('image/') ? (
                              // For images
                              <a 
                                href={message.attachmentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img 
                                  src={message.attachmentUrl} 
                                  alt={message.attachmentName || 'Image attachment'} 
                                  className="max-w-full max-h-[200px] object-contain"
                                />
                              </a>
                            ) : message.attachmentType === 'application/pdf' ? (
                              // For PDFs
                              <div className="p-3 flex items-center gap-2 bg-background/80">
                                <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12.819 14.427c.064.267.077.679-.021.948-.128.351-.381.528-.754.528h-.637v-2.12h.496c.474 0 .803.173.916.644zm3.091-8.65c2.047-.479 4.805.279 6.09 1.179-1.494-1.997-5.23-5.708-7.432-6.882 1.157 1.168 1.563 4.235 1.342 5.703zm-7.457 7.955h-.546v.943h.546c.235 0 .467-.027.576-.227.067-.123.067-.366 0-.489-.121-.198-.352-.227-.576-.227zm13.547-2.732v13h-20v-24h8.409c4.858 0 3.334 8 3.334 8 3.011-.745 8.257-.42 8.257 3zm-12.108 2.761c-.16-.484-.606-.761-1.224-.761h-1.668v3.686h.907v-1.277h.761c.619 0 1.064-.277 1.224-.763.094-.292.094-.597 0-.885zm3.407-.303c-.297-.299-.711-.458-1.199-.458h-1.599v3.686h1.599c.537 0 .961-.181 1.262-.535.554-.659.586-2.035-.063-2.693zm3.701-.458h-2.628v3.686h.907v-1.472h1.49v-.732h-1.49v-.698h1.721v-.784z" />
                                </svg>
                                <div className="flex-1 truncate">
                                  <div className="text-sm font-medium truncate">
                                    {message.attachmentName || 'PDF Document'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {message.attachmentSize ? `${Math.round(message.attachmentSize / 1024)} KB` : 'PDF'}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <a 
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      openPdfViewer(message.attachmentUrl!, message.attachmentName || 'PDF Document');
                                    }}
                                    className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${
                                      isMine ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                                    }`}
                                  >
                                    <ExternalLink className="h-3 w-3" /> View
                                  </a>
                                  <a 
                                    href={message.attachmentUrl} 
                                    download
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`px-2 py-1 text-xs rounded-md ${
                                      isMine ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                                    }`}
                                  >
                                    Download
                                  </a>
                                </div>
                              </div>
                            ) : (
                              // For other file types
                              <div className="p-3 flex items-center gap-2 bg-background/80">
                                <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M15.004 3h2.996v5h-2.996v-5zm8.996 1v20h-24v-24h20l4 4zm-19 5h14v-7h-14v7zm16 4h-18v9h18v-9z" />
                                </svg>
                                <div className="flex-1 truncate">
                                  <div className="text-sm font-medium truncate">
                                    {message.attachmentName || 'File attachment'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {message.attachmentSize ? `${Math.round(message.attachmentSize / 1024)} KB` : 'File'}
                                  </div>
                                </div>
                                <a 
                                  href={message.attachmentUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={`px-2 py-1 text-xs rounded-md ${
                                    isMine ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                                  }`}
                                >
                                  Download
                                </a>
                              </div>
                            )}
                          </div>
                        )}
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
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        />
        
        {/* Selected file preview */}
        {selectedFile && (
          <div className="mb-2 p-2 bg-muted rounded-md flex items-center justify-between">
            <div className="flex items-center space-x-2 overflow-hidden">
              {selectedFile.type.startsWith('image/') ? (
                <ImageIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
              ) : selectedFile.type === 'application/pdf' ? (
                <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
              ) : (
                <FileIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
              )}
              <span className="text-sm truncate">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                {Math.round(selectedFile.size / 1024)} KB
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearSelectedFile}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Button 
            type="button" 
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isUploading}
          />
          
          <Button type="submit" size="icon" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
      
      {/* PDF Viewer Dialog */}
      <PDFViewerDialog
        open={pdfViewerOpen}
        onOpenChange={setPdfViewerOpen}
        url={pdfUrl}
        title={pdfTitle}
      />
      
      {/* Group Settings Dialog */}
      <Dialog open={groupSettingsDialogOpen} onOpenChange={setGroupSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gruppchatten inställningar</DialogTitle>
            <DialogDescription>
              Hantera inställningar för gruppchatt
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={showParticipantsTab ? "participants" : "settings"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings">Inställningar</TabsTrigger>
              <TabsTrigger value="participants">Deltagare</TabsTrigger>
            </TabsList>
            
            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4 py-4">
              <div className="space-y-4">
                {/* Group Image Section */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      {groupImageUrl ? (
                        <AvatarImage src={groupImageUrl} alt="Group image" />
                      ) : (
                        <AvatarFallback className="text-xl bg-primary/10 text-primary">
                          {conversation?.title?.[0]?.toUpperCase() || "G"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    
                    <input
                      type="file"
                      ref={groupImageInputRef}
                      onChange={handleGroupImageSelect}
                      className="hidden"
                      accept="image/*"
                    />
                    
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background"
                      onClick={() => groupImageInputRef.current?.click()}
                      disabled={isUploadingGroupImage}
                    >
                      {isUploadingGroupImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium">Gruppbild</p>
                    <p className="text-xs text-muted-foreground">
                      Klicka för att ändra gruppens bild
                    </p>
                  </div>
                </div>
                
                {/* Group Name Section */}
                <div className="space-y-2">
                  <Label htmlFor="group-name">Gruppnamn</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ange gruppens namn"
                  />
                </div>
              </div>
              
              <DialogFooter className="px-0">
                <Button
                  variant="outline"
                  onClick={() => setGroupSettingsDialogOpen(false)}
                >
                  Avbryt
                </Button>
                <Button
                  onClick={() => {
                    if (newGroupName.trim() !== '') {
                      updateGroupMutation.mutate({
                        conversationId: conversation!.id,
                        updates: {
                          title: newGroupName.trim()
                        }
                      });
                    }
                  }}
                  disabled={newGroupName.trim() === '' || updateGroupMutation.isPending}
                >
                  {updateGroupMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sparar...
                    </>
                  ) : (
                    "Spara"
                  )}
                </Button>
              </DialogFooter>
            </TabsContent>
            
            {/* Participants Tab */}
            <TabsContent value="participants" className="space-y-4 py-2">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {conversation?.participants?.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={`/avatars/${participant.user?.role || 'user'}.svg`} 
                          alt={participant.user?.username || 'User'} 
                        />
                        <AvatarFallback>
                          {participant.user?.username?.slice(0, 2).toUpperCase() || 'US'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {participant.user?.username}
                          {participant.isAdmin && (
                            <Badge variant="outline" className="ml-2 text-xs px-1 py-0 h-5">Admin</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participant.user?.role}
                        </p>
                      </div>
                    </div>
                    
                    {isCurrentUserAdmin && (
                      <div className="flex items-center gap-2">
                        {/* Only show admin toggle for non-current users */}
                        {participant.userId !== (window as any).currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              toggleAdminStatusMutation.mutate({
                                conversationId: conversation!.id,
                                userId: participant.userId,
                                isAdmin: !participant.isAdmin
                              });
                            }}
                            disabled={toggleAdminStatusMutation.isPending}
                            title={participant.isAdmin ? "Ta bort admin-status" : "Gör till admin"}
                          >
                            {toggleAdminStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Shield className={`h-4 w-4 ${participant.isAdmin ? 'text-primary' : 'text-muted-foreground'}`} />
                            )}
                          </Button>
                        )}
                        
                        {/* Only show remove button for non-admin users if current user is admin */}
                        {!participant.isAdmin && participant.userId !== (window as any).currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (window.confirm(`Är du säker på att du vill ta bort ${participant.user?.username} från gruppchatten?`)) {
                                removeParticipantMutation.mutate({
                                  conversationId: conversation!.id,
                                  userId: participant.userId
                                });
                              }
                            }}
                            disabled={removeParticipantMutation.isPending}
                            title="Ta bort från grupp"
                          >
                            {removeParticipantMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
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
      const conversationsWithDisplay = data.map(conversation => {
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
      
      // Sort conversations: unread first, then by last message date
      return conversationsWithDisplay.sort((a, b) => {
        // Get current user ID
        const currentUserId = (window as any).currentUser?.id;
        if (!currentUserId) return 0;
        
        // Check if conversation A has unread messages
        const aHasUnread = a.messages?.some(msg => 
          msg.senderId !== currentUserId && 
          !msg.readBy?.includes(currentUserId)
        ) || false;
        
        // Check if conversation B has unread messages
        const bHasUnread = b.messages?.some(msg => 
          msg.senderId !== currentUserId && 
          !msg.readBy?.includes(currentUserId)
        ) || false;
        
        // If only one has unread, sort that one first
        if (aHasUnread && !bHasUnread) return -1;
        if (!aHasUnread && bHasUnread) return 1;
        
        // Otherwise sort by recency (lastMessageAt)
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
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
      // Gör serveranropet
      const response = await apiRequest(
        "POST", 
        `/api/conversations/${conversationId}/messages`, 
        { content }
      );
      return response.json();
    },
    // Optimistisk uppdatering innan servern svarar
    onMutate: async ({ conversationId, content }) => {
      // Skapa en tillfällig optimistisk meddelande-objekt
      const optNewMessage = {
        id: Date.now(), // Tillfälligt ID som ersätts när servern svarar
        content,
        conversationId,
        senderId: (window as any).currentUser?.id,
        sentAt: new Date().toISOString(),
        readBy: [],
        edited: false,
        attachmentUrl: null,
        sender: (window as any).currentUser
      };
      
      // Avbryt pågående hämtningar för att undvika att de skriver över vår optimistiska uppdatering
      await queryClient.cancelQueries({ queryKey: ['/api/conversations', conversationId] });
      
      // Spara tidigare data för att kunna återställa vid fel
      const previousData = queryClient.getQueryData(['/api/conversations', conversationId]);
      
      // Uppdatera cache med optimistiskt data
      if (selectedConversation) {
        queryClient.setQueryData(
          ['/api/conversations', conversationId], 
          (oldData: Conversation | undefined) => {
            if (!oldData) return oldData;
            
            return {
              ...oldData,
              lastMessageAt: new Date().toISOString(),
              messages: [...(oldData.messages || []), optNewMessage]
            };
          }
        );
        
        // Scrolla till botten när vi gör en optimistisk uppdatering
        // Använd en fördröjning för att ge DOM tid att uppdateras
        setTimeout(() => {
          const messageContainers = document.querySelectorAll('.flex-1.p-3.overflow-y-auto');
          messageContainers.forEach((container) => {
            if (container instanceof HTMLElement) {
              container.scrollTop = container.scrollHeight;
              console.log("Scrolled to bottom after sending message, height:", container.scrollHeight);
            }
          });
        }, 50);
      }
      
      // Returnera tidigare data för att kunna återställa vid fel
      return { previousData };
    },
    onSuccess: (newMessage, variables) => {
      // Invalidera för att hämta korrekta data från servern
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', variables.conversationId] });
      // Uppdatera konversationslistan för att visa senaste meddelandet
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error, variables, context) => {
      // Vid fel, återställ till föregående data
      if (context?.previousData) {
        queryClient.setQueryData(
          ['/api/conversations', variables.conversationId], 
          context.previousData
        );
      }
      
      toast({
        title: "Error",
        description: "Failed to send message: " + (error as Error).message,
        variant: "destructive",
      });
      
      // Vid fel, se till att uppdatera från servern igen
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/conversations', selectedConversationId] });
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      }
    }
  });
  
  // Helper function to check if user is at bottom of scroll
  const isUserAtBottom = () => {
    if (!scrollAreaRef.current) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    // Consider "at bottom" if within 100px of the bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  };
  
  // Helper to scroll to bottom with a specified delay to ensure DOM update
  const scrollToBottom = (delay = 50) => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        requestAnimationFrame(() => {
          if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
            console.log("Scrolled to bottom, height:", scrollAreaRef.current.scrollHeight);
          }
        });
      }
    }, delay);
  };
  
  const handleSendMessage = (content: string) => {
    if (selectedConversationId) {
      // Skicka till servern direkt - optimistisk uppdatering hanteras av sendMessageMutation
      sendMessageMutation.mutate({ 
        conversationId: selectedConversationId, 
        content 
      });
      
      // Scrollningshantering sker i MessageView-komponenten
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