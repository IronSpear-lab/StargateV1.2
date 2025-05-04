import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { MessageSquare, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Message {
  id: string;
  category: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

interface MessagesWidgetProps {
  limit?: number;
}

export function MessagesWidget({ limit = 5 }: MessagesWidgetProps) {
  // Fetch messages from API
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      // Simulate API call - in real implementation, replace with actual API call
      const response = await fetch('/api/messages');
      if (!response.ok) {
        return getSampleMessages();
      }
      return await response.json();
    }
  });
  
  // Mark message as read
  const handleMessageClick = (id: string) => {
    // In real implementation, make API call to mark message as read
    console.log(`Marking message ${id} as read`);
  };
  
  // Sample messages data - this would come from your API in a real implementation
  function getSampleMessages(): Message[] {
    const baseTimestamp = new Date();
    
    return [
      {
        id: "1",
        category: "Bygghandling",
        title: "13:1 - Leverans av BH",
        description: "Leverans av bygghandling behöver skickas in senast 25 november.",
        timestamp: baseTimestamp.toISOString(),
        read: false
      },
      {
        id: "2",
        category: "Bygghandling",
        title: "21/12 Uppdatering av CH-BH senast",
        description: "Uppdatering av centrala handlingar behöver göras senast 21 december.",
        timestamp: baseTimestamp.toISOString(),
        read: false
      },
      {
        id: "3",
        category: "Granskningshandling",
        title: "13:1 - Leverans av BH",
        description: "Granska de senaste handlingarna från projekteringsgruppen.",
        timestamp: baseTimestamp.toISOString(),
        read: false
      },
      {
        id: "4",
        category: "Bygghandling",
        title: "21/12 Uppdatering av CH-BH senast",
        description: "Uppdatering av detaljer från central hantering.",
        timestamp: baseTimestamp.toISOString(),
        read: true
      },
      {
        id: "5",
        category: "Granskningshandling",
        title: "13:1 - Leverans av BH",
        description: "Slutleverans inför granskningsmöte på torsdag.",
        timestamp: baseTimestamp.toISOString(),
        read: false
      }
    ];
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <span>Recent Messages</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-blue-600 text-xs font-normal"
        >
          View All
        </Button>
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500">Loading messages...</span>
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-1">
            {messages.slice(0, limit).map((message) => (
              <div key={message.id}>
                <div 
                  className={cn(
                    "flex items-center py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group",
                    !message.read && "bg-blue-50/50"
                  )}
                  onClick={() => handleMessageClick(message.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-500">{message.category}</div>
                      {!message.read && (
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-0.5 text-gray-900">{message.title}</div>
                    
                    <div className="mt-1 flex justify-between items-center">
                      <div className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(parseISO(message.timestamp), "dd MMM yyyy, HH:mm")}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <Separator className="my-1" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
            <AlertCircle className="h-8 w-8 text-gray-300 mb-2" />
            <h3 className="text-sm font-medium text-gray-600">No messages</h3>
            <p className="text-xs text-gray-500 mt-1">You don't have any messages at the moment.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}