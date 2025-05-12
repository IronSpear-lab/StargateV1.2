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
    // Create timestamps with slight variations to create a more realistic timeline
    const now = new Date();
    const today = new Date(now.setHours(9, 30, 0, 0)).toISOString();
    const yesterday = new Date(now.setDate(now.getDate() - 1)).toISOString();
    const twoDaysAgo = new Date(now.setDate(now.getDate() - 1)).toISOString();
    
    return [
      {
        id: "1",
        category: "Frontend",
        title: "UI Component Library Update",
        description: "We've released v2.1 of our Design System with new components. Check the documentation for more info.",
        timestamp: today,
        read: false
      },
      {
        id: "2",
        category: "Project",
        title: "Milestone Review Meeting",
        description: "Don't forget our Q2 milestone review meeting on Friday at 2pm. Please prepare your progress reports.",
        timestamp: today,
        read: false
      },
      {
        id: "3",
        category: "Backend",
        title: "API Schema Changes",
        description: "Important: We're updating the user profile API schema next week. Check Slack for migration details.",
        timestamp: yesterday,
        read: false
      },
      {
        id: "4",
        category: "DevOps",
        title: "New Deployment Pipeline",
        description: "The CI/CD pipeline has been updated with improved test coverage reports and performance metrics.",
        timestamp: yesterday,
        read: true
      },
      {
        id: "5",
        category: "Security",
        title: "OAuth Implementation Complete",
        description: "The new OAuth2 flow has been implemented. All team members should update their authentication methods.",
        timestamp: twoDaysAgo,
        read: false
      }
    ];
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-gray-500 flex items-center space-x-1.5">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          <span>Senaste meddelanden</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-blue-600 text-xs font-normal"
        >
          Visa alla
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
            {messages.slice(0, limit).map((message: Message) => (
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