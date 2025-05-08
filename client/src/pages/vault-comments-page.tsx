import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronRight, 
  Search, 
  MessageSquare, 
  File, 
  FileText,
  Clock 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { sv } from 'date-fns/locale';
import { apiRequest } from "@/lib/queryClient";

// PDF Annotation interface
interface PDFAnnotation {
  id: number;
  pdfVersionId: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  color: string;
  comment: string | null;
  status: 'open' | 'resolved' | 'action_required' | 'reviewing';
  createdAt: string;
  createdById: number;
  createdBy: string;
  fileName?: string;
  filePath?: string;
  versionNumber?: number;
}

// Status color mapping
const statusColors: Record<string, string> = {
  'open': 'bg-blue-500',
  'resolved': 'bg-green-500',
  'action_required': 'bg-red-500',
  'reviewing': 'bg-yellow-500'
};

// Status label mapping
const statusLabels: Record<string, string> = {
  'open': 'Öppen',
  'resolved': 'Löst',
  'action_required': 'Åtgärd krävs',
  'reviewing': 'Under granskning'
};

export default function VaultCommentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const { toast } = useToast();

  // Fetch all PDF annotations
  const { data: annotations, isLoading: isLoadingAnnotations } = useQuery<PDFAnnotation[]>({
    queryKey: ["/api/pdf/annotations"],
    retry: 1,
    staleTime: 30000,
  });

  // Filter annotations based on search query and active tab
  const filteredAnnotations = annotations?.filter(annotation => {
    // Only include annotations with comments
    if (!annotation.comment) return false;
    
    // Filter by status if a specific tab is selected
    if (activeTab !== "all" && annotation.status !== activeTab) return false;
    
    // Filter by search query
    if (searchQuery && searchQuery.trim() !== "") {
      const lowerCaseQuery = searchQuery.toLowerCase();
      return (
        annotation.comment?.toLowerCase().includes(lowerCaseQuery) ||
        annotation.createdBy.toLowerCase().includes(lowerCaseQuery) ||
        annotation.fileName?.toLowerCase().includes(lowerCaseQuery) ||
        false
      );
    }
    
    return true;
  });

  // Function to view PDF with annotation
  const viewAnnotation = (annotation: PDFAnnotation) => {
    if (annotation.pdfVersionId) {
      window.location.href = `/ritningar?fileId=${annotation.pdfVersionId}&annotationId=${annotation.id}`;
    } else {
      toast({
        title: "Kunde inte öppna filen",
        description: "Filreferensen saknas för denna kommentar.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto py-6 md:py-8 px-4 md:px-6 lg:px-8">
          {/* Breadcrumbs and header */}
          <div className="mb-6">
            <nav className="flex mb-4" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm">
                <li className="inline-flex items-center">
                  <a href="/" className="inline-flex items-center text-gray-500 hover:text-gray-700">
                    <svg className="w-3 h-3 mr-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                      <path d="m19.707 9.293-9-9-9 9 1.414 1.414L10 3.828l6.879 6.879 1.414-1.414Z"/>
                      <path d="M10 6.012V18h2V6.012h-2Z"/>
                    </svg>
                    Hem
                  </a>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <a href="/vault" className="ml-1 text-gray-500 hover:text-gray-700 md:ml-2">Vault</a>
                  </div>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <svg className="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
                    </svg>
                    <span className="ml-1 text-primary font-medium md:ml-2">Kommentarer</span>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="text-2xl font-semibold text-foreground">Kommentarer</h1>
          </div>
          
          {/* Search and filter area */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Sök kommentarer..." 
                className="pl-9 max-w-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">Alla kommentarer</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-4 grid grid-cols-5 max-w-xl">
                  <TabsTrigger value="all">Alla</TabsTrigger>
                  <TabsTrigger value="open">Öppna</TabsTrigger>
                  <TabsTrigger value="action_required">Åtgärd krävs</TabsTrigger>
                  <TabsTrigger value="reviewing">Granskning</TabsTrigger>
                  <TabsTrigger value="resolved">Lösta</TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeTab} className="mt-0">
                  {isLoadingAnnotations ? (
                    <div className="flex items-center justify-center h-60">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      <span className="ml-3 text-muted-foreground">Laddar kommentarer...</span>
                    </div>
                  ) : filteredAnnotations && filteredAnnotations.length > 0 ? (
                    <ScrollArea className="h-[calc(100vh-340px)] pr-4">
                      <div className="space-y-1">
                        {filteredAnnotations.map((annotation) => (
                          <div 
                            key={annotation.id}
                            className="border rounded-lg p-3 mb-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                            onClick={() => viewAnnotation(annotation)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`w-3 h-3 mt-1.5 rounded-full flex-shrink-0 ${statusColors[annotation.status]}`} />
                                <div className="flex-1">
                                  <div className="font-medium line-clamp-2">
                                    {annotation.comment || "Ingen kommentartext"}
                                  </div>
                                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                                    <div className="flex items-center">
                                      <Avatar className="h-5 w-5 mr-1">
                                        <AvatarImage src={`/avatars/user.svg`} />
                                        <AvatarFallback>
                                          {annotation.createdBy?.substring(0, 1).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{annotation.createdBy}</span>
                                    </div>
                                    
                                    <div className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span>
                                        {format(
                                          parseISO(annotation.createdAt), 
                                          "d MMM yyyy, HH:mm", 
                                          { locale: sv }
                                        )}
                                      </span>
                                    </div>
                                    
                                    {annotation.fileName && (
                                      <div className="flex items-center">
                                        <FileText className="h-3 w-3 mr-1" />
                                        <span>{annotation.fileName}</span>
                                        {annotation.versionNumber && (
                                          <span className="ml-1 text-xs">(v{annotation.versionNumber})</span>
                                        )}
                                      </div>
                                    )}
                                    
                                    <Badge variant="outline" className={`px-2 py-0 h-5 border-${annotation.status}`}>
                                      {statusLabels[annotation.status]}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-60 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium">Inga kommentarer hittades</h3>
                      <p className="text-muted-foreground mt-1 max-w-md">
                        {searchQuery 
                          ? "Inga kommentarer matchar din sökning. Försök med en annan sökfras."
                          : activeTab !== "all" 
                            ? `Det finns inga kommentarer med status "${statusLabels[activeTab]}" för närvarande.`
                            : "Det finns inga sparade kommentarer i systemet för närvarande."}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}