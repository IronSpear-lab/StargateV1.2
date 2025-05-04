import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { AlertCircle, Calendar, ChevronRight, Clock, Map, MapPin, MoreHorizontal } from "lucide-react";

interface FieldTask {
  id: string;
  title: string;
  location: string;
  address: string;
  assignee: string;
  assigneeId: string;
  assigneeAvatar?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  scheduledDate: string;
  priority: "high" | "medium" | "low";
  taskType: string;
}

interface FieldTasksWidgetProps {
  limit?: number;
  userId?: string;
}

export function FieldTasksWidget({ limit = 5, userId }: FieldTasksWidgetProps) {
  // Fetch field tasks from API
  const { data: fieldTasks, isLoading } = useQuery({
    queryKey: ['field-tasks', userId],
    queryFn: async () => {
      // In real implementation, fetch from API
      try {
        const response = await fetch(`/api/field-tasks${userId ? `?userId=${userId}` : ''}`);
        if (!response.ok) {
          // Return sample data for demonstration
          return [
            {
              id: "1",
              title: "On-site Client Meeting",
              location: "Client HQ",
              address: "123 Business Ave, Suite 400",
              assignee: "Alex Johnson",
              assigneeId: "user1",
              assigneeAvatar: "",
              status: "pending",
              scheduledDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
              priority: "high",
              taskType: "Meeting"
            },
            {
              id: "2",
              title: "Hardware Installation",
              location: "Server Room B",
              address: "200 Tech Park, Building C",
              assignee: "Morgan Smith",
              assigneeId: "user2",
              assigneeAvatar: "",
              status: "in_progress",
              scheduledDate: new Date(new Date().setHours(new Date().getHours() + 3)).toISOString(),
              priority: "high",
              taskType: "Installation"
            },
            {
              id: "3",
              title: "Network Troubleshooting",
              location: "Branch Office",
              address: "45 Commerce St, Floor 2",
              assignee: "Alex Johnson",
              assigneeId: "user1",
              assigneeAvatar: "",
              status: "pending",
              scheduledDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
              priority: "medium",
              taskType: "Support"
            },
            {
              id: "4",
              title: "Security System Audit",
              location: "Main Campus",
              address: "500 Enterprise Blvd",
              assignee: "Jamie Watson",
              assigneeId: "user3",
              assigneeAvatar: "",
              status: "pending",
              scheduledDate: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString(),
              priority: "medium",
              taskType: "Audit"
            }
          ] as FieldTask[];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching field tasks:", error);
        return [];
      }
    }
  });

  // Define statuses with our branding colors
  const statusStyles: Record<string, { bg: string, text: string, icon?: JSX.Element }> = {
    pending: { 
      bg: "bg-[#727cf5]/10", 
      text: "text-[#727cf5]",
      icon: <Clock className="h-3 w-3 mr-1" />
    },
    in_progress: { 
      bg: "bg-[#ffc35a]/10", 
      text: "text-[#ffc35a]",
      icon: <Calendar className="h-3 w-3 mr-1" />
    },
    completed: { 
      bg: "bg-[#0acf97]/10", 
      text: "text-[#0acf97]" 
    },
    cancelled: { 
      bg: "bg-[#fa5c7c]/10", 
      text: "text-[#fa5c7c]" 
    },
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Get random pastel color for avatar background based on name
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      "bg-blue-200", "bg-green-200", "bg-yellow-200", 
      "bg-red-200", "bg-purple-200", "bg-pink-200",
      "bg-indigo-200", "bg-teal-200"
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <MapPin className="h-4 w-4 text-blue-500" />
          <span>My Field Tasks</span>
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
            <span className="ml-2 text-sm text-gray-500">Loading field tasks...</span>
          </div>
        ) : fieldTasks && fieldTasks.length > 0 ? (
          <div className="space-y-1">
            {fieldTasks.slice(0, limit).map((task: FieldTask) => (
              <div key={task.id}>
                <div className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={cn(
                          "px-2 py-0.5 rounded text-xs",
                          statusStyles[task.status].bg,
                          statusStyles[task.status].text
                        )}>
                          <div className="flex items-center">
                            {statusStyles[task.status].icon}
                            <span>{task.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">{task.taskType}</div>
                      </div>
                      
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assigneeAvatar} alt={task.assignee} />
                        <AvatarFallback className={getAvatarColor(task.assignee)}>
                          {getInitials(task.assignee)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <div className="text-sm font-medium mt-0.5 text-gray-900">{task.title}</div>
                    
                    <div className="mt-1.5 flex items-center space-x-4">
                      <div className="text-xs text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-[#727cf5]" />
                        <span className="truncate">{task.location}</span>
                      </div>
                      
                      <div className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-[#ffc35a]" />
                        {format(parseISO(task.scheduledDate), "MMM d, HH:mm")}
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
            <Map className="h-8 w-8 text-gray-300 mb-2" />
            <h3 className="text-sm font-medium text-gray-600">No field tasks assigned</h3>
            <p className="text-xs text-gray-500 mt-1">You don't have any field tasks assigned at the moment.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}