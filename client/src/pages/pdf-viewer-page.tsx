import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import EnhancedPDFViewer from "@/components/EnhancedPDFViewer";
import { useQuery } from "@tanstack/react-query";
import { getPDFVersionContent } from "@/lib/pdf-utils";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function PDFViewerPage() {
  const [, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { toast } = useToast();
  
  // Hämta versionId och annotationId från URL
  const params = new URLSearchParams(window.location.search);
  const versionId = Number(window.location.pathname.split("/").pop());
  const annotationId = params.get("annotationId") ? Number(params.get("annotationId")) : undefined;
  
  // Hämta PDF-innehållet baserat på versionId
  const { data: pdfBlob, isLoading, error } = useQuery({
    queryKey: [`/api/pdf/versions/${versionId}`],
    queryFn: async () => {
      try {
        return await getPDFVersionContent(versionId);
      } catch (error) {
        console.error("Error fetching PDF version content:", error);
        return null;
      }
    },
    enabled: !!versionId && !isNaN(versionId)
  });
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Kunde inte ladda PDF-filen",
        description: "Ett fel uppstod när PDF-filen skulle laddas.",
        variant: "destructive"
      });
      
      // Navigera tillbaka till dashboard om filen inte kan laddas
      setTimeout(() => {
        setLocation("/");
      }, 3000);
    }
  }, [error, toast, setLocation]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  // Hantera "Tillbaka"-knappen - navigera tillbaka till dashboard
  const handleBack = () => {
    console.log("Navigerar tillbaka till dashboard");
    setLocation("/");
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className={isSidebarOpen ? "" : "hidden"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="PDF Viewer" onToggleSidebar={toggleSidebar} />
        
        <div className="border-b bg-white px-4 py-2 flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 mr-auto" 
            onClick={handleBack}
          >
            <ArrowLeft className="h-4 w-4" /> Tillbaka
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Versioner</span>
            <span className="text-sm font-medium ml-4">Markera område</span>
            <span className="text-sm font-medium ml-4">Ny version</span>
          </div>
        </div>
        
        <main className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Laddar PDF...</span>
            </div>
          ) : pdfBlob ? (
            <div className="w-full h-full">
              <EnhancedPDFViewer 
                pdfFile={pdfBlob}
                versionId={versionId}
                highlightAnnotationId={annotationId}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-lg text-gray-500">PDF-filen kunde inte laddas.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}