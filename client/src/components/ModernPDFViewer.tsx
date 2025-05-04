import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  XSquare,
  Search,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  History,
  Clock,
  MessageCircle
} from "lucide-react";

// Initialize pdfjs worker with local file
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
}

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Annotation interface
interface PDFAnnotation {
  id: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  comment: string;
  createdBy: string;
  createdAt: string;
  status: 'open' | 'resolved';
}

// Component props
interface ModernPDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  fileUrl?: string;
  fileData?: {
    filename: string;
    version: string;
    description: string;
    uploaded: string;
    uploadedBy: string;
    fileId?: string;
  };
}

export function ModernPDFViewer({ isOpen, onClose, file, fileUrl, fileData }: ModernPDFViewerProps) {
  const { toast } = useToast();
  
  // PDF state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(fileUrl);
  const [activeTab, setActiveTab] = useState<string>("comments");
  
  // Annotations state
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [isMarking, setIsMarking] = useState<boolean>(false);
  const [markingStart, setMarkingStart] = useState<{ x: number, y: number } | null>(null);
  const [markingEnd, setMarkingEnd] = useState<{ x: number, y: number } | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [showAnnotationForm, setShowAnnotationForm] = useState<boolean>(false);
  const [annotationFormPosition, setAnnotationFormPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  
  // Load annotations from localStorage
  useEffect(() => {
    if (isOpen && fileData) {
      loadAnnotationsFromStorage();
    }
  }, [isOpen, fileData]);
  
  // Load annotations from storage
  const loadAnnotationsFromStorage = () => {
    if (!fileData) return;
    
    try {
      // Use consistent ID based on filename
      const canonicalFileName = fileData.filename.replace(/\\s+/g, '_').toLowerCase();
      const storageKey = `pdf_annotations_${canonicalFileName}`;
      
      const savedAnnotations = localStorage.getItem(storageKey);
      if (savedAnnotations) {
        const parsedAnnotations = JSON.parse(savedAnnotations) as PDFAnnotation[];
        setAnnotations(parsedAnnotations);
        console.log(`Loaded ${parsedAnnotations.length} annotations from storage`);
      }
    } catch (error) {
      console.error("Failed to load annotations", error);
    }
  };
  
  // Save annotations to storage
  const saveAnnotationsToStorage = (newAnnotations: PDFAnnotation[]) => {
    if (!fileData) return;
    
    try {
      const canonicalFileName = fileData.filename.replace(/\\s+/g, '_').toLowerCase();
      const storageKey = `pdf_annotations_${canonicalFileName}`;
      
      localStorage.setItem(storageKey, JSON.stringify(newAnnotations));
      console.log(`Saved ${newAnnotations.length} annotations to storage`);
    } catch (error) {
      console.error("Failed to save annotations", error);
    }
  };

  // Handler for successful PDF load
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };
  
  // Handler for PDF load error
  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setIsLoading(false);
    toast({
      title: "Fel vid laddning av PDF",
      description: "Det gick inte att ladda PDF-filen. Försök igen eller använd en annan fil.",
      variant: "destructive",
    });
  };
  
  // Page navigation
  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };
  
  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  };
  
  // Zoom controls
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };
  
  // Rotation controls
  const rotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  const rotateCounterClockwise = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };
  
  // Handle PDF download
  const handleDownload = () => {
    if (file) {
      // Create download for File object
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (fileUrl) {
      // Create download for URL
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileData?.filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  // Annotation handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMarking || !pdfRef.current) return;
    
    const rect = pdfRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMarkingStart({ x, y });
    setMarkingEnd(null);
    setShowAnnotationForm(false);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMarking || !markingStart || !pdfRef.current) return;
    
    const rect = pdfRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMarkingEnd({ x, y });
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMarking || !markingStart || !markingEnd || !pdfRef.current) return;
    
    // Calculate positon for annotation form
    const rect = pdfRef.current.getBoundingClientRect();
    const formLeft = Math.max(markingEnd.x + rect.left, 0);
    const formTop = Math.max(markingEnd.y + rect.top, 0);
    
    setAnnotationFormPosition({
      left: formLeft,
      top: formTop
    });
    
    setShowAnnotationForm(true);
  };
  
  const handleAddAnnotation = () => {
    if (!markingStart || !markingEnd || !newComment.trim()) return;
    
    // Create annotation
    const minX = Math.min(markingStart.x, markingEnd.x);
    const minY = Math.min(markingStart.y, markingEnd.y);
    const width = Math.abs(markingEnd.x - markingStart.x);
    const height = Math.abs(markingEnd.y - markingStart.y);
    
    const newAnnotation: PDFAnnotation = {
      id: `ann_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      rect: {
        x: minX,
        y: minY,
        width,
        height,
        pageNumber
      },
      comment: newComment,
      createdBy: "Du",
      createdAt: new Date().toISOString(),
      status: 'open'
    };
    
    const updatedAnnotations = [...annotations, newAnnotation];
    setAnnotations(updatedAnnotations);
    saveAnnotationsToStorage(updatedAnnotations);
    
    // Reset marking state
    setMarkingStart(null);
    setMarkingEnd(null);
    setNewComment('');
    setShowAnnotationForm(false);
    setIsMarking(false);
    
    toast({
      title: "Kommentar tillagd",
      description: "Din kommentar har sparats.",
    });
  };
  
  const resolveAnnotation = (id: string) => {
    const updatedAnnotations = annotations.map(ann => 
      ann.id === id ? { ...ann, status: 'resolved' as const } : ann
    );
    
    setAnnotations(updatedAnnotations);
    saveAnnotationsToStorage(updatedAnnotations);
    
    toast({
      title: "Kommentar markerad som löst",
      description: "Kommentaren har markerats som löst.",
    });
  };
  
  // Get current page annotations
  const currentPageAnnotations = annotations.filter(
    ann => ann.rect.pageNumber === pageNumber
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 bg-white">
        <div className="flex flex-col h-full">
          {/* Modern header */}
          <DialogHeader className="px-4 py-2 flex justify-between items-center flex-row border-b">
            <div className="flex items-center">
              <DialogTitle className="text-lg font-semibold">
                {fileData?.filename || (file?.name || "PDF Dokument")}
              </DialogTitle>
              <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                v{fileData?.version || "1"}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 h-8">
                <History className="h-4 w-4 text-gray-500" />
                <span>Historik</span>
              </Button>
              
              <Button variant="ghost" size="sm" className="text-xs flex items-center gap-1 h-8"
                onClick={handleDownload}>
                <Download className="h-4 w-4 text-gray-500" />
                <span>Ladda ner</span>
              </Button>
              
              <Tabs defaultValue="comments" value={activeTab} onValueChange={setActiveTab} 
                className="border rounded-md">
                <TabsList className="bg-transparent border-0">
                  <TabsTrigger value="info" className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none px-4">
                    Filinfo
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-700 data-[state=active]:bg-transparent data-[state=active]:text-blue-500 data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none px-4">
                    Kommentarer
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <XSquare className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {/* Main content */}
          <div className="flex flex-1 overflow-hidden">
            {/* PDF Viewer area */}
            <div className="flex-1 relative overflow-auto" ref={containerRef}>
              {/* PDF controls */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 z-10 bg-white rounded-md p-1 shadow-md border">
                <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={pageNumber <= 1}
                  className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="px-2 text-sm">
                  {pageNumber} / {numPages || '?'}
                </div>
                
                <Button variant="ghost" size="icon" onClick={goToNextPage} 
                  disabled={!numPages || pageNumber >= numPages}
                  className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <div className="h-4 w-px bg-gray-300 mx-1" />
                
                <Button variant="ghost" size="icon" onClick={zoomOut} className="h-8 w-8">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                
                <div className="px-2 text-sm">
                  {Math.round(scale * 100)}%
                </div>
                
                <Button variant="ghost" size="icon" onClick={zoomIn} className="h-8 w-8">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                
                <div className="h-4 w-px bg-gray-300 mx-1" />
                
                <Button variant="ghost" size="icon" onClick={rotateCounterClockwise} className="h-8 w-8">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                
                <Button variant="ghost" size="icon" onClick={rotateClockwise} className="h-8 w-8">
                  <RotateCw className="h-4 w-4" />
                </Button>
                
                <div className="h-4 w-px bg-gray-300 mx-1" />
                
                <Button variant="ghost" size="icon" 
                  onClick={() => setIsMarking(!isMarking)}
                  className={`h-8 w-8 ${isMarking ? 'bg-blue-100 text-blue-700' : ''}`}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
              
              {/* PDF Document - Simplified iframe version */}
              <div 
                className="min-h-full flex justify-center py-4 px-2 bg-gray-100"
                ref={pdfRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Use iframe for reliable PDF rendering */}
                {file && (
                  <iframe 
                    src={URL.createObjectURL(file)}
                    className="w-full h-full border shadow-lg"
                    style={{ minHeight: '700px' }}
                    title={file.name || "PDF Document"}
                  />
                )}
                
                {fileUrl && !file && (
                  <iframe 
                    src={fileUrl}
                    className="w-full h-full border shadow-lg"
                    style={{ minHeight: '700px' }}
                    title={fileData?.filename || "PDF Document"}
                  />
                )}
                
                {/* Fallback message if no file or URL */}
                {!file && !fileUrl && (
                  <div className="p-4 text-red-500">
                    Det gick inte att visa PDF-filen. Ingen giltig fil hittades.
                  </div>
                )}
                
                {/* Render current annotations as overlay */}
                <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                  {currentPageAnnotations.map(annotation => (
                    <div
                      key={annotation.id}
                      id={`annotation-${annotation.id}`}
                      className={`absolute border-2 ${
                        annotation.status === 'resolved' 
                          ? 'border-green-500 bg-green-200/30' 
                          : 'border-blue-500 bg-blue-200/30'
                      } annotation-pulse`}
                      style={{
                        left: `${annotation.rect.x}px`,
                        top: `${annotation.rect.y}px`,
                        width: `${annotation.rect.width}px`,
                        height: `${annotation.rect.height}px`,
                      }}
                    />
                  ))}
                  
                  {/* Active marking box */}
                  {isMarking && markingStart && markingEnd && (
                    <div
                      className="absolute border-2 border-dashed border-blue-500 bg-blue-100/30"
                      style={{
                        left: `${Math.min(markingStart.x, markingEnd.x)}px`,
                        top: `${Math.min(markingStart.y, markingEnd.y)}px`,
                        width: `${Math.abs(markingEnd.x - markingStart.x)}px`,
                        height: `${Math.abs(markingEnd.y - markingStart.y)}px`,
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Annotation form */}
              {showAnnotationForm && (
                <div
                  className="absolute bg-white p-3 shadow-lg border rounded-md w-64"
                  style={{
                    left: `${annotationFormPosition.left}px`,
                    top: `${annotationFormPosition.top}px`,
                    transform: 'translate(20px, 20px)',
                    zIndex: 50
                  }}
                >
                  <h3 className="font-medium text-sm mb-2">Lägg till kommentar</h3>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm mb-2"
                    rows={3}
                    placeholder="Skriv din kommentar..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setShowAnnotationForm(false);
                      setMarkingStart(null);
                      setMarkingEnd(null);
                    }}>
                      Avbryt
                    </Button>
                    <Button size="sm" onClick={handleAddAnnotation}>
                      Spara
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right sidebar: Comments or Info */}
            <div className="w-80 border-l">
              <Tabs value={activeTab} className="h-full flex flex-col">
                <TabsContent value="info" className="flex-1 p-4 space-y-4 m-0 data-[state=inactive]:hidden">
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Filnamn</h3>
                    <p className="text-sm text-gray-700">{fileData?.filename}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Version</h3>
                    <p className="text-sm text-gray-700">{fileData?.version || "1"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Beskrivning</h3>
                    <p className="text-sm text-gray-700">{fileData?.description || "Ingen beskrivning"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Uppladdad</h3>
                    <p className="text-sm text-gray-700">{fileData?.uploaded || "Okänt datum"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Uppladdad av</h3>
                    <p className="text-sm text-gray-700">{fileData?.uploadedBy || "Okänd användare"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Antal sidor</h3>
                    <p className="text-sm text-gray-700">{numPages || "Laddar..."}</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="comments" className="flex-1 m-0 data-[state=inactive]:hidden flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-medium">Kommentarer ({annotations.length})</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsMarking(!isMarking)}
                      className={isMarking ? 'bg-blue-100 text-blue-700' : ''}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Ny kommentar
                    </Button>
                  </div>
                  
                  {annotations.length > 0 ? (
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                        {annotations.map((annotation) => (
                          <div key={annotation.id} className="border rounded-md p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {annotation.createdBy.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-sm font-medium">{annotation.createdBy}</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(annotation.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                annotation.status === 'resolved' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {annotation.status === 'resolved' ? 'Löst' : 'Öppen'}
                              </span>
                            </div>
                            <p className="text-sm">{annotation.comment}</p>
                            <div className="flex justify-between items-center mt-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  setPageNumber(annotation.rect.pageNumber);
                                }}
                                className="text-xs"
                              >
                                Visa på sida {annotation.rect.pageNumber}
                              </Button>
                              {annotation.status !== 'resolved' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => resolveAnnotation(annotation.id)}
                                  className="text-xs"
                                >
                                  Markera som löst
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
                      <MessageCircle className="h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm">Inga kommentarer än</p>
                      <p className="text-xs">Klicka på "Ny kommentar" för att lägga till en kommentar</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}