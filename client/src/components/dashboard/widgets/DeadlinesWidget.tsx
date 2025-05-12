import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, AlertCircle, Clock, MapPin, MessageSquare, FileText } from "lucide-react";
import { usePDFDialog } from "@/hooks/use-pdf-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, parseISO, parse, addDays } from "date-fns";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

// Traditionella field task-objekt (matchande FieldTasksWidget)
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
  dueDate?: string; // ISO date string
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  projectId?: number;
  projectName?: string;
  createdAt?: string; // ISO date string för skapandedatum
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
  deadline?: string; // ISO date string för deadline
}

// Kombinerad typ för deadline-items
type DeadlineItem = 
  | { type: "task"; data: FieldTask } 
  | { type: "pdf_annotation"; data: PdfAnnotation };

interface DeadlinesWidgetProps {
  limit?: number;
  projectId?: number;
}

export function DeadlinesWidget({ limit = 5, projectId }: DeadlinesWidgetProps) {
  const [, setLocation] = useLocation();
  
  // Hämta uppgifter från API med samma queryKey-format som i FieldTasksWidget
  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['field-tasks', null], // Null för att hämta alla tasks (inte begränsa till userId)
    refetchOnWindowFocus: true, // Uppdatera data när fönstret får fokus
    queryFn: async () => {
      try {
        console.log("DeadlinesWidget: Hämtar field tasks...");
        const response = await fetch('/api/field-tasks');
        if (!response.ok) {
          console.error("Error fetching tasks for deadlines:", response.status);
          return [] as FieldTask[];
        }
        const data = await response.json();
        console.log("DeadlinesWidget: Tasks hämtade:", data);
        return data;
      } catch (error) {
        console.error("Error fetching tasks for deadlines:", error);
        return [];
      }
    }
  });

  // Hämta PDF-kommentarer som är tilldelade användaren
  const { data: pdfAnnotations, isLoading: isLoadingAnnotations } = useQuery({
    queryKey: ['field-tasks', 'pdf-annotations/assigned'], // Uppdaterat format för att matcha övriga i systemet
    refetchOnWindowFocus: true, // Uppdatera data när fönstret får fokus  
    queryFn: async () => {
      try {
        console.log("DeadlinesWidget: Hämtar PDF-annotationer...");
        const response = await fetch('/api/pdf-annotations/assigned');
        console.log("DeadlinesWidget: PDF-annotations response status:", response.status);
        
        if (!response.ok) {
          console.error("Error response from PDF annotations API:", response.status);
          return [];
        }
        
        const data = await response.json();
        console.log("DeadlinesWidget: PDF-annotationer hämtade:", data);
        return data;
      } catch (error) {
        console.error("Error fetching PDF annotations for deadlines:", error);
        return [];
      }
    }
  });

  const isLoading = isLoadingTasks || isLoadingAnnotations;

  // Få ett datum att visa för deadlines beroende på typ
  const getDeadlineDate = (item: DeadlineItem): string => {
    // Förbättrad funktion för att normalisera datum
    const normalizeDate = (dateStr?: string): string | undefined => {
      if (!dateStr) return undefined;
      
      try {
        // Använd parseISO from date-fns istället för new Date() för konsekvent parsning
        let date;
        
        // Om datumet redan är i ISO-format eller innehåller tid
        if (dateStr.includes('T')) {
          date = parseISO(dateStr);
        } else {
          // Om det bara är YYYY-MM-DD, lägg till tid 00:00:00
          date = parse(dateStr, 'yyyy-MM-dd', new Date());
        }
        
        // Kontrollera om parsningen lyckades
        if (!isNaN(date.getTime())) {
          // Logga detaljerad info för debugging
          console.log(`Normaliserar '${dateStr}' -> ${format(date, 'yyyy-MM-dd HH:mm:ss')}`);
          
          // Returnera konsekvent ISO-sträng
          return date.toISOString();
        } else {
          console.error(`Misslyckades med att tolka datum: ${dateStr}`);
        }
      } catch (e) {
        console.error("Kunde inte normalisera datum:", dateStr, e);
      }
      
      // Sista utväg - returnera ursprunglig sträng
      return dateStr;
    };
    
    if (item.type === "task") {
      const isGanttTask = item.data.taskType === "gantt";
      let deadlineDate;
      
      // Prioritera de rätta datumfälten baserat på uppgiftstyp enligt användarinstruktioner
      if (isGanttTask) {
        // För Gantt-uppgifter, använd endDate som slutdatum (enligt krav)
        deadlineDate = normalizeDate(item.data.endDate) || 
                       normalizeDate(item.data.dueDate) || 
                       normalizeDate(item.data.scheduledDate) || 
                       normalizeDate(item.data.startDate) || 
                       normalizeDate(item.data.createdAt) ||
                       new Date().toISOString();
        
        console.log(`Gantt-uppgift (${item.data.title}) använder slutdatum (endDate): ${deadlineDate}`);
      } else {
        // För Kanban och andra uppgifter, använd dueDate som slutdatum (enligt krav)
        deadlineDate = normalizeDate(item.data.dueDate) || 
                       normalizeDate(item.data.endDate) || 
                       normalizeDate(item.data.scheduledDate) || 
                       normalizeDate(item.data.startDate) || 
                       normalizeDate(item.data.createdAt) ||
                       new Date().toISOString();
                             
        console.log(`Kanban-uppgift (${item.data.title}) använder slutdatum (dueDate): ${deadlineDate}`);
      }
      
      return deadlineDate;
    } else if (item.type === "pdf_annotation") {
      // För PDF-annotationer, använd deadline som slutdatum (enligt krav)
      if (item.data.deadline) {
        const deadlineDate = normalizeDate(item.data.deadline) || item.data.deadline;
        console.log(`PDF-kommentar (${item.data.id}) använder deadline: ${deadlineDate}`);
        return deadlineDate;
      }
      
      // Fallback: om ingen deadline finns, använd standarddeadline 14 dagar från skapandedatum
      const createdDate = parseISO(item.data.createdAt);
      const deadlineDate = addDays(createdDate, 14);
      return deadlineDate.toISOString();
    }
    
    // Fallback om något oväntat inträffar
    return new Date().toISOString();
  };

  // Logga uppgifternas datum för att debugga
  (tasks || []).forEach((task: FieldTask, index: number) => {
    console.log(`DeadlinesWidget Task ${index}:`, {
      id: task.id,
      title: task.title,
      startDate: task.startDate,
      endDate: task.endDate,
      dueDate: task.dueDate,
      scheduledDate: task.scheduledDate
    });
  });

  // Kombinera uppgifter och PDF-kommentarer till deadline-items
  const combinedItems: DeadlineItem[] = [
    ...(tasks || [])
      .map((task: FieldTask) => ({
        type: "task" as const,
        data: task
      })),
    ...(pdfAnnotations || [])
      .map((annotation: PdfAnnotation) => ({
        type: "pdf_annotation" as const,
        data: annotation
      }))
  ];
  
  console.log("DeadlinesWidget - Antal kombinerade deadline items:", combinedItems.length);
  console.log("DeadlinesWidget - Antal tasks:", (tasks || []).length);
  console.log("DeadlinesWidget - Antal PDF-annotationer:", (pdfAnnotations || []).length);

  // Sortera deadlines efter slutdatum (tidiga deadlines först) och begränsa till 'limit' poster
  const deadlines = combinedItems
    .sort((a, b) => {
      try {
        const dateStrA = getDeadlineDate(a);
        const dateStrB = getDeadlineDate(b);
        
        // För att säkerställa att datumet hanteras korrekt, använd parseISO från date-fns
        const dateA = parseISO(dateStrA);
        const dateB = parseISO(dateStrB);
        
        const timeA = dateA.getTime();
        const timeB = dateB.getTime();
        
        console.log(`Jämför deadlines: ${getItemTitle(a)} (${format(dateA, 'yyyy-MM-dd')}) vs ${getItemTitle(b)} (${format(dateB, 'yyyy-MM-dd')})`);
        
        // Använd format() för att kontrollera att datumen tolkas rätt
        console.log(`  Datum A: ${format(dateA, 'yyyy-MM-dd HH:mm:ss')}, Datum B: ${format(dateB, 'yyyy-MM-dd HH:mm:ss')}`);
        
        return timeA - timeB; // Sortera stigande (tidiga deadlines först)
      } catch (error) {
        console.error("Fel vid sortering av deadlines:", error);
        return 0; // Behåll ordningen oförändrad om fel uppstår
      }
    })
    .slice(0, limit);

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
  const handleItemClick = async (item: DeadlineItem) => {
    // Task ID 28, 30-32 är Kanban uppgifter från Test2 projekt (ID 6)
    // Vi vet att projektID 6 existerar från webview-loggarna
    const knownProjectId = 6;
    
    if (item.type === "pdf_annotation") {
      // Använd PDF-dialog istället för navigation
      console.log(`Öppnar PDF-dialog för version ${item.data.pdfVersionId}, annotation ${item.data.id}`);
      const { showPDFDialog } = usePDFDialog();
      showPDFDialog({
        versionId: Number(item.data.pdfVersionId),
        annotationId: item.data.id
      });
    } else {
      // Logga detaljerad information för felsökning
      console.log(`Klickad uppgift detaljer:`, {
        id: item.data.id,
        title: item.data.title,
        projectId: item.data.projectId,
        taskType: item.data.taskType,
        dueDate: item.data.dueDate,
        endDate: item.data.endDate,
        status: item.data.status
      });
      
      try {
        // Använd den nya API-endpointen för att avgöra uppgiftstyp
        const response = await fetch(`/api/tasks/${item.data.id}/type`);
        
        if (response.ok) {
          const taskTypeData = await response.json();
          console.log("API-svar för uppgiftstyp:", taskTypeData);
          
          // Använda projektID från uppgiften eller fallback till känt projekt
          const projectId = item.data.projectId || knownProjectId;
          
          if (taskTypeData.type === "gantt") {
            // Gå direkt till Gantt-sidan med rätt projekt och task
            console.log(`Navigerar direkt till Gantt-vy för projekt ${projectId} och uppgift ${item.data.id}`);
            setLocation(`/gantt-chart/${projectId}?taskId=${item.data.id}`);
          } else {
            // För alla andra uppgiftstyper, gå direkt till Kanban-vyn
            console.log(`Navigerar direkt till Kanban-vy för projekt ${projectId} och uppgift ${item.data.id}`);
            setLocation(`/kanban/${projectId}?taskId=${item.data.id}`);
          }
        } else {
          console.error("Kunde inte hämta uppgiftstyp från API:", response.status);
          // Fallback till befintlig logik baserad på taskType-fältet i uppgiftsobjektet
          fallbackNavigate(item);
        }
      } catch (error) {
        console.error("Fel vid hämtning av uppgiftstyp:", error);
        // Fallback till befintlig logik baserad på taskType-fältet i uppgiftsobjektet
        fallbackNavigate(item);
      }
    }
  };
  
  // Fallback-navigation baserad på taskType-fältet i uppgiftsobjektet
  const fallbackNavigate = (item: DeadlineItem) => {
    if (item.type !== "task") return;
    
    const knownProjectId = 6;
    const projectId = item.data.projectId || knownProjectId;
    
    if (item.data.taskType === "gantt") {
      // Gå direkt till Gantt-sidan
      console.log(`Fallback: Navigerar direkt till Gantt-vy: /gantt-chart/${projectId}?taskId=${item.data.id}`);
      setLocation(`/gantt-chart/${projectId}?taskId=${item.data.id}`);
    } else if (item.data.taskType === "kanban" || item.data.taskType === "Setup" || item.data.taskType === "Research") {
      // För Kanban-uppgifter, gå direkt till Kanban-sidan
      console.log(`Fallback: Navigerar direkt till Kanban-vy: /kanban/${projectId}?taskId=${item.data.id}`);
      setLocation(`/kanban/${projectId}?taskId=${item.data.id}`);
    } else if (item.data.projectId) {
      // För andra uppgiftstyper med projektID, anta att det är en Kanban-uppgift
      console.log(`Fallback: Antar Kanban-uppgift, går till Kanban-vy: /kanban/${projectId}?taskId=${item.data.id}`);
      setLocation(`/kanban/${projectId}?taskId=${item.data.id}`);
    } else {
      // För uppgifter utan projektID, gå till fallback-projektets Kanban-vy
      console.log(`Fallback: Ingen projektID eller taskType, går till fallback Kanban-vy: /kanban/${knownProjectId}?taskId=${item.data.id}`);
      setLocation(`/kanban/${knownProjectId}?taskId=${item.data.id}`);
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
  
  // Få initialer från ett namn
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

  // PDF-statusetiketter
  const pdfStatusLabels: Record<PdfAnnotation["status"], string> = {
    "new_comment": "Ny kommentar",
    "action_required": "Åtgärd krävs",
    "rejected": "Avvisad",
    "new_review": "Under granskning",
    "other_forum": "Annat forum",
    "resolved": "Löst"
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

  // Visa alla deadlines dialog
  const AllDeadlinesDialog = () => {
    // Skapa en ny kopia av listan för att inte påverka originalets sortering
    const sortedDeadlines = [...combinedItems].sort((a, b) => {
      try {
        const dateStrA = getDeadlineDate(a);
        const dateStrB = getDeadlineDate(b);
        
        // För att säkerställa att datumet hanteras korrekt, använd parseISO från date-fns
        const dateA = parseISO(dateStrA);
        const dateB = parseISO(dateStrB);
        
        const timeA = dateA.getTime();
        const timeB = dateB.getTime();
        
        console.log(`Jämför deadlines i dialog: ${getItemTitle(a)} (${format(dateA, 'yyyy-MM-dd')}) vs ${getItemTitle(b)} (${format(dateB, 'yyyy-MM-dd')})`);
        
        // Använd format() för att kontrollera att datumen tolkas rätt
        console.log(`  Datum A: ${format(dateA, 'yyyy-MM-dd HH:mm:ss')}, Datum B: ${format(dateB, 'yyyy-MM-dd HH:mm:ss')}`);
        
        return timeA - timeB; // Sortera stigande (tidiga deadlines först)
      } catch (error) {
        console.error("Fel vid sortering i dialog:", error);
        return 0;
      }
    });

    const openDialog = () => {
      console.log("Öppnar dialog med följande sorterade deadlines:", sortedDeadlines);
      console.log("Deadlines per typ:", {
        "task": sortedDeadlines.filter(item => item.type === "task").length,
        "pdf_annotation": sortedDeadlines.filter(item => item.type === "pdf_annotation").length
      });
    };

    // Visa PDF-kommentar i dialogen
    const renderPdfAnnotation = (annotation: PdfAnnotation) => {
      const status = getItemStatus({ type: "pdf_annotation", data: annotation });
      
      return (
        <div 
          className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
          onClick={() => handleItemClick({ type: "pdf_annotation", data: annotation })}
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
      );
    };

    // Visa uppgift i dialogen
    const renderTask = (task: FieldTask) => {
      return (
        <div 
          className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
          onClick={() => handleItemClick({ type: "task", data: task })}  
        >
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
      );
    };

    // Rendera item baserat på typ
    const renderItem = (item: DeadlineItem, index: number): JSX.Element => {
      console.log(`Renderar deadline ${index}:`, item);
      return (
        <div key={`all-${item.type}-${item.data.id}`} className="pt-2">
          {item.type === "pdf_annotation" 
            ? renderPdfAnnotation(item.data)
            : renderTask(item.data)
          }
        </div>
      );
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
            Visa alla
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle>Alla kommande deadlines</DialogTitle>
            <DialogDescription>
              {sortedDeadlines.length} uppgifter med deadlines som kräver din uppmärksamhet
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[50vh] pr-4 mt-2">
              <div className="space-y-2 divide-y">
                {sortedDeadlines.map((item, index) => renderItem(item, index))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Renderar PDF-annotation kompakt
  const renderCompactAnnotation = (annotation: PdfAnnotation) => {
    const status = getItemStatus({ type: "pdf_annotation", data: annotation });
    
    return (
      <div 
        className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
        onClick={() => handleItemClick({ type: "pdf_annotation", data: annotation })}
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
              <Clock className="h-3 w-3 mr-1 text-[#ffc35a]" />
              {(() => {
                try {
                  const deadlineDate = getDeadlineDate({ type: "pdf_annotation", data: annotation });
                  console.log(`Formaterar datum för PDF-kommentar: ${deadlineDate}`);
                  
                  // Använd parseISO istället för Date constructor för mer pålitlig datumparsning
                  const date = parseISO(deadlineDate);
                  
                  if (isNaN(date.getTime())) {
                    console.error(`Ogiltigt datum för PDF-kommentar: ${deadlineDate}`);
                    return "Ogiltigt datum";
                  }
                  
                  // Visa mer användarvänligt format med dag och månad
                  return format(date, "d MMM yyyy");
                } catch (e) {
                  console.error("Fel vid formatering av datum för PDF-kommentar:", e);
                  return "Ogiltigt datum";
                }
              })()}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  // Renderar Task kompakt
  const renderCompactTask = (task: FieldTask) => {
    return (
      <div 
        className="flex py-2.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer group"
        onClick={() => handleItemClick({ type: "task", data: task })}
      >
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
              <Clock className="h-3 w-3 mr-1 text-[#ffc35a]" />
              {(() => {
                try {
                  const deadlineDate = getDeadlineDate({ type: "task", data: task });
                  console.log(`Formaterar datum för uppgift "${task.title}": ${deadlineDate}`);
                  
                  // Använd parseISO istället för Date constructor för mer pålitlig datumparsning
                  const date = parseISO(deadlineDate);
                  
                  if (isNaN(date.getTime())) {
                    console.error(`Ogiltigt datum för uppgift "${task.title}": ${deadlineDate}`);
                    return "Ogiltigt datum";
                  }
                  
                  // Visa mer användarvänligt format med dag och månad
                  return format(date, "d MMM yyyy");
                } catch (e) {
                  console.error(`Fel vid formatering av datum för uppgift "${task.title}":`, e);
                  return "Ogiltigt datum";
                }
              })()}
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  // Generisk renderItem funktion som används i huvudvyn
  const renderItem = (item: DeadlineItem) => {
    if (item.type === "task") {
      return renderCompactTask(item.data);
    } else {
      return renderCompactAnnotation(item.data);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium flex items-center space-x-1.5">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span>Kommande deadlines</span>
        </div>
        
        <AllDeadlinesDialog />
      </div>
      
      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500">Laddar deadlines...</span>
          </div>
        ) : combinedItems.length > 0 ? (
          <div className="space-y-1.5 divide-y">
            {combinedItems.slice(0, Math.max(8, limit)).map(item => 
              <div key={`item-${item.type}-${item.data.id}`} className="pt-1.5">
                {renderItem(item)}
              </div>
            )}
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