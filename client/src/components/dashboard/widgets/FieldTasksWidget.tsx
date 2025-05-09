import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
  AlertCircle, 
  Calendar, 
  ChevronRight, 
  Clock, 
  File, 
  FileText, 
  Map, 
  MapPin, 
  MessageSquare, 
  MoreHorizontal,
  X 
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// Traditionella fältuppgifter
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

// PDF-kommentarer med status
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

// Kombinerad typ för allt som kan visas i widgeten
type FieldTaskItem = 
  | { type: "field_task"; data: FieldTask } 
  | { type: "pdf_annotation"; data: PdfAnnotation };

interface FieldTasksWidgetProps {
  limit?: number;
  userId?: string;
}

export function FieldTasksWidget({ limit = 5, userId }: FieldTasksWidgetProps) {
  const [, setLocation] = useLocation();
  
  // Hämta traditionella fältuppgifter
  const { data: fieldTasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['field-tasks', userId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/field-tasks${userId ? `?userId=${userId}` : ''}`);
        if (!response.ok) {
          return [] as FieldTask[];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching field tasks:", error);
        return [];
      }
    }
  });

  // Hämta PDF-kommentarer som är tilldelade användaren
  const { data: pdfAnnotations, isLoading: isLoadingAnnotations } = useQuery({
    queryKey: ['pdf-annotations-assigned'],
    queryFn: async () => {
      try {
        console.log("Hämtar PDF-annotationer...");
        const response = await fetch('/api/pdf-annotations/assigned');
        console.log("PDF-annotations response status:", response.status);
        
        if (!response.ok) {
          console.error("Error response from PDF annotations API:", response.status);
          return [];
        }
        
        const data = await response.json();
        console.log("PDF-annotationer hämtade:", data);
        return data;
      } catch (error) {
        console.error("Error fetching PDF annotations:", error);
        return [];
      }
    }
  });

  // Kombinera uppgifter och sortera efter datum
  const combinedItems: FieldTaskItem[] = [
    ...(fieldTasks || []).map((task: FieldTask) => ({
      type: "field_task" as const,
      data: task
    })),
    ...(pdfAnnotations || []).map((annotation: PdfAnnotation) => ({
      type: "pdf_annotation" as const,
      data: annotation
    }))
  ];

  // Sortera efter datum - nyast först
  const sortedItems = combinedItems.sort((a, b) => {
    const dateA = a.type === "field_task" 
      ? new Date(a.data.scheduledDate).getTime()
      : new Date(a.data.createdAt).getTime();
    
    const dateB = b.type === "field_task" 
      ? new Date(b.data.scheduledDate).getTime()
      : new Date(b.data.createdAt).getTime();
    
    return dateB - dateA;
  });

  const isLoading = isLoadingTasks || isLoadingAnnotations;

  // Konvertera PDF-kommentarens status till motsvarande fältuppgiftstatus
  const mapPdfStatusToFieldStatus = (status: PdfAnnotation["status"]): FieldTask["status"] => {
    switch (status) {
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
  };

  // Stilar för olika statusar
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

  // PDF-annotationers statusetiketter
  const pdfStatusLabels: Record<PdfAnnotation["status"], string> = {
    "new_comment": "Ny kommentar",
    "action_required": "Åtgärd krävs",
    "rejected": "Avvisad",
    "new_review": "Under granskning",
    "other_forum": "Annat forum",
    "resolved": "Löst"
  };

  // Hanterare för klick på en PDF-kommentar
  const handlePdfAnnotationClick = (annotation: PdfAnnotation) => {
    // Navigera till PDF-visaren med annotation ID
    setLocation(`/files/pdf/${annotation.pdfVersionId}?annotationId=${annotation.id}`);
  };

  // Få initialerna från ett namn
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Få en slumpmässig pastellfärg som bakgrund baserat på namnet
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

  // Formatera ett element baserat på dess typ
  const renderItem = (item: FieldTaskItem) => {
    if (item.type === "field_task") {
      const task = item.data;
      return (
        <div key={`task-${task.id}`}>
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
      );
    } else {
      // PDF-kommentar
      const annotation = item.data;
      const status = mapPdfStatusToFieldStatus(annotation.status);
      
      return (
        <div key={`annotation-${annotation.id}`}>
          <div 
            className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={() => handlePdfAnnotationClick(annotation)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "px-2 py-0.5 rounded text-xs",
                    statusStyles[status].bg,
                    statusStyles[status].text
                  )}>
                    <div className="flex items-center">
                      {statusStyles[status].icon}
                      <span>{pdfStatusLabels[annotation.status]}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">PDF Kommentar</div>
                </div>
                
                <Avatar className="h-6 w-6">
                  <AvatarImage src="" alt={annotation.createdBy} />
                  <AvatarFallback className={getAvatarColor(annotation.createdBy)}>
                    {getInitials(annotation.createdBy)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="text-sm font-medium mt-0.5 text-gray-900">
                {annotation.comment || "PDF-kommentar"}
              </div>
              
              <div className="mt-1.5 flex items-center space-x-4">
                <div className="text-xs text-gray-500 flex items-center">
                  <FileText className="h-3 w-3 mr-1 text-[#727cf5]" />
                  <span className="truncate">{annotation.fileName}</span>
                </div>
                
                <div className="text-xs text-gray-500 flex items-center">
                  <MessageSquare className="h-3 w-3 mr-1 text-[#ffc35a]" />
                  {annotation.projectName}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <Separator className="my-1" />
        </div>
      );
    }
  };

  // Förbättrad visning av PDF-kommentarer - allt på en rad
  const renderCompactAnnotation = (annotation: PdfAnnotation) => {
    const status = mapPdfStatusToFieldStatus(annotation.status);
    
    return (
      <div 
        key={`annotation-${annotation.id}`}
        className="flex items-center py-2 px-3 hover:bg-gray-50 transition-colors cursor-pointer rounded-md"
        onClick={() => handlePdfAnnotationClick(annotation)}
      >
        <div className={cn(
          "px-2 py-0.5 rounded text-xs mr-2 flex-shrink-0",
          statusStyles[status].bg,
          statusStyles[status].text
        )}>
          <div className="flex items-center">
            {statusStyles[status].icon}
            <span>{pdfStatusLabels[annotation.status]}</span>
          </div>
        </div>
        
        <div className="flex-1 flex items-center min-w-0">
          <FileText className="h-3.5 w-3.5 text-[#727cf5] mr-1.5 flex-shrink-0" />
          <span className="truncate text-xs font-medium">{annotation.fileName}</span>
          <span className="mx-1.5 text-gray-400">·</span>
          <span className="truncate text-xs text-gray-600">{annotation.comment || "Kommentar"}</span>
        </div>
        
        <Avatar className="h-6 w-6 ml-2 flex-shrink-0">
          <AvatarImage src="" alt={annotation.createdBy} />
          <AvatarFallback className={getAvatarColor(annotation.createdBy)}>
            {getInitials(annotation.createdBy)}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  };

  // Visa alla kommentarer popup dialog
  const AllAnnotationsDialog = () => {
    const allAnnotations = (pdfAnnotations || []) as PdfAnnotation[];
    
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-blue-600 text-xs font-normal"
          >
            Se alla
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Alla PDF-kommentarer</DialogTitle>
            <DialogDescription>
              {allAnnotations.length} PDF-kommentarer som kräver din uppmärksamhet
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[60vh] pr-4 mt-2">
            <div className="space-y-2 divide-y">
              {allAnnotations.map(annotation => (
                <div key={`all-annotation-${annotation.id}`} className="pt-2">
                  {renderCompactAnnotation(annotation)}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <MapPin className="h-4 w-4 text-blue-500" />
          <span>My Field Tasks</span>
        </div>
        <AllAnnotationsDialog />
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500">Loading field tasks...</span>
          </div>
        ) : sortedItems.length > 0 ? (
          <div className="space-y-1.5 divide-y">
            {sortedItems.slice(0, Math.max(8, limit)).map(item => 
              item.type === "pdf_annotation" 
                ? <div key={`item-${item.type}-${item.data.id}`} className="pt-1.5">
                    {renderCompactAnnotation(item.data)}
                  </div>
                : <div key={`item-${item.type}-${item.data.id}`} className="pt-1.5">
                    {renderItem(item)}
                  </div>
            )}
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