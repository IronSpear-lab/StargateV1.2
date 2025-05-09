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
  description?: string;
  // Extra datumfält som kan finnas i Kanban/Gantt uppgifter
  dueDate?: string; // ISO date string
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  createdAt?: string; // ISO date string
  projectId?: number;
  projectName?: string;
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
  deadline?: string; // ISO date string for deadline
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
    refetchOnWindowFocus: true, // Uppdatera data när fönstret får fokus
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
    queryKey: ['field-tasks', 'pdf-annotations/assigned'], // Uppdaterat format för att passa med strukturen för field-tasks
    refetchOnWindowFocus: true, // Uppdatera data när fönstret får fokus
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
  console.log("Field tasks från API:", fieldTasks);
  console.log("PDF-annotationer från API:", pdfAnnotations);
  
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
  
  console.log("Kombinerade uppgifter:", combinedItems);

  // Funktion för att normalisera datum (matchar andra komponenter)
  const normalizeDate = (dateStr?: string): string => {
    if (!dateStr) return new Date().toISOString();
    
    // Om datumet redan är ett ISO-format med tid, använd det direkt
    if (dateStr.includes('T')) return dateStr;
    
    // Om det är bara YYYY-MM-DD, konvertera till ISO med tid (midnatt lokal tid)
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      console.error("Kunde inte normalisera datum:", dateStr, e);
    }
    return dateStr || new Date().toISOString();
  };
  
  // Få säkert datum från en item (för sortering, etc.)
  const getItemDate = (item: FieldTaskItem): Date => {
    let dateStr: string;
    
    if (item.type === "field_task") {
      // För field tasks, prioritera scheduledDate, sen dueDate, endDate, startDate
      dateStr = normalizeDate(item.data.scheduledDate) || 
               normalizeDate(item.data.dueDate) || 
               normalizeDate(item.data.endDate) || 
               normalizeDate(item.data.startDate) || 
               normalizeDate(item.data.createdAt) ||
               new Date().toISOString(); // Fallback till aktuellt datum
               
      console.log(`Field task ${item.data.title} datum: ${dateStr}`);
    } else {
      // För PDF annotationer, använd deadline om det finns, annars createdAt
      dateStr = normalizeDate(item.data.deadline) || 
               normalizeDate(item.data.createdAt) ||
               new Date().toISOString(); // Fallback till aktuellt datum
               
      console.log(`PDF Annotation ${item.data.id} datum: ${dateStr}`);
    }
    
    return new Date(dateStr);
  };
  
  // Sortera efter datum - nyast först
  const sortedItems = combinedItems.sort((a, b) => {
    const dateA = getItemDate(a).getTime();
    const dateB = getItemDate(b).getTime();
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

  // Hanterare för klick på en fältuppgift
  const handleFieldTaskClick = async (task: FieldTask) => {
    // Logga detaljerad information för felsökning
    console.log(`Klickad uppgift detaljer:`, {
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      taskType: task.taskType,
      dueDate: task.dueDate,
      endDate: task.endDate,
      status: task.status
    });

    // Task ID 28, 30-32 är Kanban uppgifter från Test2 projekt (ID 6)
    // Vi vet att projektID 6 existerar från webview-loggarna
    const knownProjectId = 6;
    
    try {
      // Använd den nya API-endpointen för att avgöra uppgiftstyp
      const response = await fetch(`/api/tasks/${task.id}/type`);
      
      if (response.ok) {
        const taskTypeData = await response.json();
        console.log("API-svar för uppgiftstyp:", taskTypeData);
        
        // Använda projektID från uppgiften eller fallback till känt projekt
        const projectId = task.projectId || knownProjectId;
        
        if (taskTypeData.type === "gantt") {
          // Gå direkt till projektets Gantt-vy
          console.log(`Navigerar direkt till Gantt-vy för projekt ${projectId} och uppgift ${task.id}`);
          setLocation(`/gantt-chart/${projectId}?taskId=${task.id}`);
        } else {
          // För alla andra uppgiftstyper, gå direkt till Kanban-vyn
          console.log(`Navigerar direkt till Kanban-vy för projekt ${projectId} och uppgift ${task.id}`);
          setLocation(`/kanban/${projectId}?taskId=${task.id}`);
        }
      } else {
        console.error("Kunde inte hämta uppgiftstyp från API:", response.status);
        // Fallback till befintlig logik baserad på taskType-fältet i uppgiftsobjektet
        fallbackNavigate(task);
      }
    } catch (error) {
      console.error("Fel vid hämtning av uppgiftstyp:", error);
      // Fallback till befintlig logik baserad på taskType-fältet i uppgiftsobjektet
      fallbackNavigate(task);
    }
  };
  
  // Fallback-navigation baserad på taskType-fältet i uppgiftsobjektet
  const fallbackNavigate = (task: FieldTask) => {
    const knownProjectId = 6;
    const projectId = task.projectId || knownProjectId;
    
    if (task.taskType === "gantt") {
      // Gå direkt till Gantt-sidan
      console.log(`Fallback: Navigerar direkt till Gantt-vy: /gantt-chart/${projectId}?taskId=${task.id}`);
      setLocation(`/gantt-chart/${projectId}?taskId=${task.id}`);
    } else if (task.taskType === "kanban" || task.taskType === "Setup" || task.taskType === "Research") {
      // För Kanban-uppgifter, gå direkt till Kanban-sidan
      console.log(`Fallback: Navigerar direkt till Kanban-vy: /kanban/${projectId}?taskId=${task.id}`);
      setLocation(`/kanban/${projectId}?taskId=${task.id}`);
    } else if (task.projectId) {
      // För andra uppgiftstyper med projektID, anta att det är en Kanban-uppgift
      console.log(`Fallback: Antar Kanban-uppgift, går till Kanban-vy: /kanban/${projectId}?taskId=${task.id}`);
      setLocation(`/kanban/${projectId}?taskId=${task.id}`);
    } else {
      // För uppgifter utan projektID, gå till fallback-projektets Kanban-vy
      console.log(`Fallback: Ingen projektID eller taskType, går till fallback Kanban-vy: /kanban/${knownProjectId}?taskId=${task.id}`);
      setLocation(`/kanban/${knownProjectId}?taskId=${task.id}`);
    }
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
          <div 
            className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
            onClick={() => handleFieldTaskClick(task)}>
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
                  {/* Använd getItemDate för att få korrekt datumformat */}
                  {format(getItemDate({ type: "field_task", data: task }), "MMM d, HH:mm")}
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
                  <div className="text-xs text-gray-500">PDF</div>
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

  // Förbättrad visning av PDF-kommentarer - använder samma layout som fältuppgifter
  const renderCompactAnnotation = (annotation: PdfAnnotation) => {
    const status = mapPdfStatusToFieldStatus(annotation.status);
    
    return (
      <div 
        key={`annotation-${annotation.id}`}
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
              <div className="text-xs text-gray-500">PDF</div>
            </div>
            
            <Avatar className="h-6 w-6">
              <AvatarImage src="" alt={annotation.createdBy} />
              <AvatarFallback className={getAvatarColor(annotation.createdBy)}>
                {getInitials(annotation.createdBy)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="text-sm font-medium mt-0.5 text-gray-900">
            {/* Om annotationen är kopplad till en task, visar vi hellre kommentaren 
                eftersom servern inkluderar task-titeln som kommentar när den är tillgänglig */}
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
    );
  };

  // Visa alla uppgifter popup dialog
  const AllTasksDialog = () => {
    // Använd hela sortedItems istället för bara pdfAnnotations
    // Detta inkluderar både traditionella uppgifter (Kanban + Gantt) och PDF-annotationer
    const openDialog = () => {
      console.log("Öppnar dialog med följande sortedItems:", sortedItems);
      console.log("Uppgifter per typ:", {
        "field_task": sortedItems.filter(item => item.type === "field_task").length,
        "pdf_annotation": sortedItems.filter(item => item.type === "pdf_annotation").length
      });
    };
    
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-blue-600 text-xs font-normal"
            onClick={openDialog}
          >
            Se alla
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle>Alla dina tilldelade uppgifter</DialogTitle>
            <DialogDescription>
              {sortedItems.length} uppgifter som kräver din uppmärksamhet
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[50vh] pr-4 mt-2">
              <div className="space-y-2 divide-y">
                {sortedItems.map((item, index) => {
                  console.log(`Renderar uppgift ${index}:`, item);
                  return (
                    <div key={`all-${item.type}-${item.data.id}`} className="pt-2">
                      {item.type === "pdf_annotation" 
                        ? renderCompactAnnotation(item.data)
                        : renderItem(item)
                      }
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
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
        <AllTasksDialog />
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