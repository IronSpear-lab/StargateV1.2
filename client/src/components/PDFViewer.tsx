import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Share, 
  MoreVertical, 
  ArrowLeft, 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  Pen, 
  Highlighter, 
  MessageSquare
} from "lucide-react";
import { CommentList } from "./CommentList";
import { Separator } from "@/components/ui/separator";

interface PDFViewerProps {
  fileName: string;
  totalPages?: number;
}

export function PDFViewer({ fileName, totalPages = 12 }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);

  const increasePage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const decreasePage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const increaseZoom = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const decreaseZoom = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  return (
    <Card className="shadow-none border border-neutral-200">
      <CardHeader className="border-b border-neutral-200 p-3 flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">{fileName}</CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4 text-neutral-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share className="h-4 w-4 text-neutral-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      </CardHeader>
      
      <div className="p-2 flex space-x-2 border-b border-neutral-200 bg-neutral-50">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={decreasePage} disabled={currentPage === 1}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={increasePage} disabled={currentPage === totalPages}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <span className="text-sm flex items-center">Page {currentPage} of {totalPages}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={increaseZoom}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={decreaseZoom}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Maximize className="h-4 w-4" />
        </Button>
        <div className="flex-1"></div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pen className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Highlighter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 bg-neutral-100 h-96 flex items-center justify-center overflow-auto">
        <div 
          className="bg-white shadow-md w-full max-w-2xl h-full flex flex-col items-center justify-center p-8 relative"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
        >
          <div className="w-full mb-6">
            <h2 className="text-xl font-bold mb-3 text-center">Project Requirements Document</h2>
            <Separator className="my-4" />
            <p className="text-sm mb-2">
              <strong>Project Overview:</strong> ValvXlstart is a comprehensive project management platform designed to streamline collaboration and document workflows.
            </p>
            <p className="text-sm mb-2">
              <strong>Objectives:</strong> Create an intuitive interface that integrates file management, task tracking, and team collaboration in a single platform.
            </p>
            <p className="text-sm text-neutral-500 italic">
              [PDF content would display here]
            </p>
          </div>
          
          <div className="absolute bottom-20 right-20 bg-yellow-100 p-3 rounded-md shadow-md" style={{ width: "200px" }}>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700 text-sm font-medium">
                AS
              </div>
              <div>
                <p className="text-sm font-medium">Alex Smith</p>
                <p className="text-xs text-neutral-600">Please review the technical requirements section</p>
                <p className="text-xs text-neutral-500 mt-1">Yesterday at 3:45 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <CardContent className="p-0">
        <CommentList />
      </CardContent>
    </Card>
  );
}
