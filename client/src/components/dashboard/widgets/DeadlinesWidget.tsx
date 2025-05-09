import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, AlertCircle, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Traditionella task-objekt
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  dueDate?: string; // ISO date string
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  projectId: number;
  projectName: string;
  priority?: "high" | "medium" | "low";
  assignee?: string;
  assigneeId?: string;
  taskType?: string;
}

// PDF-kommentarer
interface PdfAnnotation {
  id: number;
  pdfVersionId: number;
  projectId: number | null;
  projectName: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  color: string;
  comment: string | null;
  status: "new_comment" | "action_required" | "rejected" | "new_review" | "other_forum" | "resolved";
  createdAt: string;
  createdById: number;
  createdBy: string;
  assignedTo: string;
  taskId: number | null;
  fileName: string;
  filePath: string;
}

// Kombinerad typ för deadline-items
type DeadlineItem = 
  | { type: "task"; data: Task } 
  | { type: "pdf_annotation"; data: PdfAnnotation };

interface DeadlinesWidgetProps {
  limit?: number;
  projectId?: number;
}

export function DeadlinesWidget({ limit = 5, projectId }: DeadlinesWidgetProps) {
  const [, setLocation] = useLocation();
  
  // Hämta uppgifter från API
  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['field-tasks', 'deadlines'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/field-tasks');
        if (!response.ok) {
          console.error("Error fetching tasks for deadlines:", response.status);
          return [] as Task[];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching tasks for deadlines:", error);
        return [];
      }
    }
  });

  // Hämta PDF-kommentarer som är tilldelade användaren
  const { data: pdfAnnotations, isLoading: isLoadingAnnotations } = useQuery({
    queryKey: ['pdf-annotations-assigned', 'deadlines'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/pdf-annotations/assigned');
        
        if (!response.ok) {
          console.error("Error response from PDF annotations API:", response.status);
          return [];
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching PDF annotations for deadlines:", error);
        return [];
      }
    }
  });

  const isLoading = isLoadingTasks || isLoadingAnnotations;

  // Kombinera uppgifter och PDF-kommentarer till deadline-items
  const combinedItems: DeadlineItem[] = [
    ...(tasks || [])
      .filter((task: Task) => task.dueDate || task.endDate) // Endast inkludera tasks med deadline
      .map((task: Task) => ({
        type: "task" as const,
        data: task
      })),
    ...(pdfAnnotations || [])
      .filter((annotation: PdfAnnotation) => 
        // Filtrera annotationer baserat på status som kräver åtgärd
        annotation.status === "action_required" || 
        annotation.status === "new_comment" || 
        annotation.status === "new_review"
      )
      .map((annotation: PdfAnnotation) => ({
        type: "pdf_annotation" as const,
        data: annotation
      }))
  ];

  // Sortera deadlines efter datum (tidiga deadlines först)
  const deadlines = combinedItems.sort((a, b) => {
    const dateA = a.type === "task" 
      ? new Date(a.data.dueDate || a.data.endDate || a.data.startDate || new Date().toISOString()).getTime()
      : new Date(a.data.createdAt).getTime() + (7 * 24 * 60 * 60 * 1000); // PDF kommentarer får en veckas deadline
    
    const dateB = b.type === "task" 
      ? new Date(b.data.dueDate || b.data.endDate || b.data.startDate || new Date().toISOString()).getTime()
      : new Date(b.data.createdAt).getTime() + (7 * 24 * 60 * 60 * 1000); // PDF kommentarer får en veckas deadline
    
    return dateA - dateB; // Sortera stigande (tidiga deadlines först)
  });

  // Få ett datum att visa för deadlines beroende på typ
  const getDeadlineDate = (item: DeadlineItem): string => {
    if (item.type === "task") {
      return item.data.dueDate || item.data.endDate || item.data.startDate || new Date().toISOString();
    } else {
      // För pdf-kommentarer, lägg till 7 dagar från skapandedatum som en deadline
      const date = new Date(item.data.createdAt);
      date.setDate(date.getDate() + 7);
      return date.toISOString();
    }
  };

  // Kontrollera om deadline är passerad
  const isOverdue = (item: DeadlineItem): boolean => {
    const now = new Date();
    const dueDate = new Date(getDeadlineDate(item));
    return now > dueDate;
  };
  
  // Få dagar tills deadline
  const getDaysUntil = (item: DeadlineItem): number => {
    const now = new Date();
    const date = new Date(getDeadlineDate(item));
    return Math.max(0, Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };
  
  // Få tillstånd för en uppgift (avklarad, pågående, etc)
  const getItemStatus = (item: DeadlineItem): "completed" | "in_progress" | "pending" | "cancelled" => {
    if (item.type === "task") {
      return item.data.status;
    } else {
      // Mappa PDF-kommentarens status
      switch (item.data.status) {
        case "new_comment":
        case "action_required":
          return "pending";
        case "new_review":
          return "in_progress";
        case "rejected":
          return "cancelled";
        case "resolved":
          return "completed";
        default:
          return "pending";
      }
    }
  };

  // Få kategoritext för en uppgift
  const getItemCategory = (item: DeadlineItem): string => {
    if (item.type === "task") {
      return item.data.taskType || "Uppgift";
    } else {
      return "PDF Kommentar";
    }
  };

  // Få projekttitel för en uppgift
  const getItemProjectName = (item: DeadlineItem): string => {
    if (item.type === "task") {
      return item.data.projectName || "Generell";
    } else {
      return item.data.projectName || "Dokument";
    }
  };

  // Få titel för en uppgift
  const getItemTitle = (item: DeadlineItem): string => {
    if (item.type === "task") {
      return item.data.title;
    } else {
      return item.data.comment || "PDF Kommentar";
    }
  };
  
  // Klicka på en uppgift för att gå till detaljvyn
  const handleItemClick = (item: DeadlineItem) => {
    if (item.type === "pdf_annotation") {
      // Gå till PDF-visare med annotation ID
      setLocation(`/files/pdf/${item.data.pdfVersionId}?annotationId=${item.data.id}`);
    } else {
      // Gå till kanban-tavlan eller uppgiftsvyn
      setLocation(`/tasks/${item.data.id}`);
    }
  };
  
  // Få status-badge-stil baserat på dagar tills deadline
  // Använder färgpaletten: #ffc35a (orange), #0acf97 (grön), #727cf5 (blå) och #fa5c7c (rosa)
  const getDeadlineBadgeStyle = (item: DeadlineItem) => {
    const status = getItemStatus(item);
    
    if (status === "completed") {
      return "bg-[#0acf97]/10 text-[#0acf97]"; // Completed - green
    }
    
    if (status === "cancelled") {
      return "bg-[#fa5c7c]/10 text-[#fa5c7c]"; // Cancelled - red
    }
    
    if (isOverdue(item)) {
      return "bg-[#fa5c7c]/10 text-[#fa5c7c]"; // Overdue - pink/red
    }
    
    const daysUntil = getDaysUntil(item);
    
    if (daysUntil <= 2) {
      return "bg-[#ffc35a]/10 text-[#ffc35a]"; // Very soon - orange/amber
    }
    
    if (daysUntil <= 7) {
      return "bg-[#ffc35a]/10 text-[#ffc35a]/80"; // Soon - lighter orange
    }
    
    return "bg-[#727cf5]/10 text-[#727cf5]"; // Future - blue
  };
  
  // Få statustext för deadline
  const getDeadlineStatusText = (item: DeadlineItem): string => {
    const status = getItemStatus(item);
    
    if (status === "completed") {
      return "Slutförd";
    }
    
    if (status === "cancelled") {
      return "Avbruten";
    }
    
    if (isOverdue(item)) {
      return "Försenad";
    }
    
    const daysUntil = getDaysUntil(item);
    return `Om ${daysUntil} dagar`;
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span>Kommande deadlines</span>
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
            <span className="ml-2 text-sm text-gray-500">Laddar deadlines...</span>
          </div>
        ) : deadlines && deadlines.length > 0 ? (
          <div className="space-y-1">
            {deadlines.map((item: DeadlineItem) => (
              <div key={`${item.type}-${item.type === 'task' ? item.data.id : item.data.id}`}>
                <div 
                  className="flex items-center py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">{getItemCategory(item)}</div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        getDeadlineBadgeStyle(item)
                      )}>
                        {getDeadlineStatusText(item)}
                      </div>
                    </div>
                    
                    <div className="text-sm font-medium mt-0.5 text-gray-900">
                      {getItemTitle(item)}
                    </div>
                    
                    <div className="mt-1.5 flex items-center space-x-4">
                      <div className="text-xs text-gray-500 flex items-center">
                        <MapPin className="h-3 w-3 mr-1 text-[#727cf5]" />
                        <span className="truncate">{getItemProjectName(item)}</span>
                      </div>
                      
                      <div className="text-xs text-gray-500 flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-[#ffc35a]" />
                        {format(new Date(getDeadlineDate(item)), "dd MMM yyyy")}
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
            <h3 className="text-sm font-medium text-gray-600">Inga kommande deadlines</h3>
            <p className="text-xs text-gray-500 mt-1">Du har inga deadlines för tillfället.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}