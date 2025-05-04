import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Maximize, 
  Minimize, 
  ZoomIn, 
  ZoomOut, 
  Rotate3D, 
  MessageSquare, 
  Check, 
  AlertCircle 
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

// Konfigurera worker för react-pdf - använder CDN för att undvika byggproblem
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Typer för markeringar och kommentarer
export interface PDFAnnotation {
  id: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    pageNumber: number;
  };
  color: string;
  comment: string;
  status: 'open' | 'resolved' | 'action_required' | 'reviewing';
  createdBy: string;
  createdAt: string;
}

// Typ för filversioner
export interface FileVersion {
  id: string;
  versionNumber: number;
  filename: string;
  fileUrl: string;
  description: string;
  uploaded: string;
  uploadedBy: string;
  commentCount?: number;
}

// Färgkodning baserat på status
const statusColors = {
  open: '#727cf5',        // Blå
  resolved: '#0acf97',    // Grön
  action_required: '#fa5c7c',  // Röd
  reviewing: '#ffbc00'    // Gul
};

interface PDFViewerProps {
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

export function PDFViewer({ isOpen, onClose, file, fileUrl, fileData }: PDFViewerProps) {
  const { user } = useAuth();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(fileUrl);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Markerings- och kommentarsfunktionalitet
  const [isMarking, setIsMarking] = useState(false);
  const [markingStart, setMarkingStart] = useState<{ x: number; y: number } | null>(null);
  const [markingEnd, setMarkingEnd] = useState<{ x: number; y: number } | null>(null);
  const [annotations, setAnnotations] = useState<PDFAnnotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<PDFAnnotation | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [tempAnnotation, setTempAnnotation] = useState<Partial<PDFAnnotation> | null>(null);
  
  // Versionshantering
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | undefined>(undefined);
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Om en File-objekt skickas in, skapa en URL för den
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [file, fileUrl]);
  
  // I en verklig implementation skulle vi hämta annotationer från API baserat på fil-ID
  useEffect(() => {
    // Här skulle vi hämta annotationer från API
    // Exempel: fetchAnnotations(fileId)
    
    // För nu börjar vi med en tom lista - användaren får lägga till egna annotationer
    setAnnotations([]);
    
    // Rensa också eventuella tidigare aktiva annotationer när en ny fil öppnas
    setActiveAnnotation(null);
  }, [fileUrl, file]);
  
  // Hämta tillgängliga versioner när en fil öppnas
  useEffect(() => {
    if (!fileData?.fileId) return;
    
    // Här skulle vi göra ett API-anrop för att hämta alla versioner av denna fil
    // Exempel: fetchFileVersions(fileData.fileId)
    
    // Simulera versionshämtning för demo
    const dummyVersions: FileVersion[] = [
      {
        id: 'version1',
        versionNumber: 1,
        filename: fileData.filename,
        fileUrl: fileUrl || '',
        description: 'Ursprunglig version',
        uploaded: '2025-03-15',
        uploadedBy: 'Johan Andersson',
        commentCount: 2
      },
      {
        id: 'version2',
        versionNumber: 2,
        filename: fileData.filename,
        fileUrl: fileUrl || '',
        description: 'Uppdaterade mått på kök och badrum',
        uploaded: '2025-04-02',
        uploadedBy: 'Anna Svensson',
        commentCount: 5
      },
      {
        id: 'version3',
        versionNumber: 3,
        filename: fileData.filename,
        fileUrl: fileUrl || '',
        description: 'Justerad planlösning med utökad veranda',
        uploaded: fileData.uploaded,
        uploadedBy: fileData.uploadedBy,
        commentCount: 0
      }
    ];
    
    setFileVersions(dummyVersions);
    
    // Sätt aktuell version till den senaste
    const latestVersion = dummyVersions[dummyVersions.length - 1];
    setActiveVersionId(latestVersion.id);
    
  }, [fileData?.fileId, fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber >= 1 && numPages && newPageNumber <= numPages) {
        return newPageNumber;
      }
      return prevPageNumber;
    });
  };

  const previousPage = () => changePage(-1);
  const nextPage = () => changePage(1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  const rotate = () => setRotation(prev => (prev + 90) % 360);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Hanterar start av markering
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMarking) return;
    
    // Hämta position relativt till PDF-sidan
    if (pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMarkingStart({ x, y });
      setMarkingEnd({ x, y }); // Initialisera slutposition också
    }
  };
  
  // Uppdaterar markeringens storlek när musen flyttas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMarking || !markingStart) return;
    
    if (pageRef.current) {
      const rect = pageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMarkingEnd({ x, y });
    }
  };
  
  // Avslutar markeringen och visar dialogrutan för att lägga till kommentar
  const handleMouseUp = () => {
    if (!isMarking || !markingStart || !markingEnd) return;
    
    // Om markeringen är för liten, ignorera den
    const width = Math.abs(markingEnd.x - markingStart.x);
    const height = Math.abs(markingEnd.y - markingStart.y);
    
    if (width < 10 || height < 10) {
      setMarkingStart(null);
      setMarkingEnd(null);
      return;
    }
    
    // Beräkna rektangeln för markering
    const rect = {
      x: Math.min(markingStart.x, markingEnd.x),
      y: Math.min(markingStart.y, markingEnd.y),
      width: width,
      height: height,
      pageNumber: pageNumber
    };
    
    // Skapa en temporär annotation som vi sedan kan spara
    setTempAnnotation({
      rect,
      color: statusColors.open,
      status: 'open'
    });
    
    setIsAddingComment(true);
    setIsMarking(false);
    setMarkingStart(null);
    setMarkingEnd(null);
  };
  
  // Spara en ny kommentar/markering
  const saveComment = () => {
    if (!tempAnnotation || !user) return;
    
    const newAnnotation: PDFAnnotation = {
      id: `annotation_${Date.now()}`,
      rect: tempAnnotation.rect as PDFAnnotation['rect'],
      color: tempAnnotation.color || statusColors.open,
      comment: newComment,
      status: tempAnnotation.status as PDFAnnotation['status'],
      createdBy: user.username || 'Anonymous',
      createdAt: new Date().toISOString()
    };
    
    setAnnotations([...annotations, newAnnotation]);
    setIsAddingComment(false);
    setTempAnnotation(null);
    setNewComment('');
  };
  
  // Avbryt markering eller kommentarsskapande
  const cancelMarkingOrComment = () => {
    setIsMarking(false);
    setIsAddingComment(false);
    setMarkingStart(null);
    setMarkingEnd(null);
    setTempAnnotation(null);
    setNewComment('');
  };
  
  // Zooma in till en specifik annotation
  const zoomToAnnotation = (annotation: PDFAnnotation) => {
    if (annotation.rect.pageNumber !== pageNumber) {
      setPageNumber(annotation.rect.pageNumber);
    }
    
    setActiveAnnotation(annotation);
    
    // Sätt en större skala för bättre zoom
    setScale(1.5);
    
    // Skulle även behöva scroll till positionen, men detta kräver ytterligare implementation
  };
  
  // Uppdatera status för en kommentar
  const updateAnnotationStatus = (annotationId: string, newStatus: PDFAnnotation['status']) => {
    const updatedAnnotations = annotations.map(ann => 
      ann.id === annotationId 
        ? { ...ann, status: newStatus, color: statusColors[newStatus] } 
        : ann
    );
    
    setAnnotations(updatedAnnotations);
    
    // Här skulle vi göra ett API-anrop för att uppdatera i databasen
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileData?.filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleToggleMarkingMode = () => {
    setIsMarking(prev => !prev);
    if (activeAnnotation) setActiveAnnotation(null);
  };

  if (!isOpen) return null;

  // Beräkna rektangel för temporär markering (under pågående markering)
  const getMarkingRectStyles = () => {
    if (!markingStart || !markingEnd) return {};
    
    const left = Math.min(markingStart.x, markingEnd.x);
    const top = Math.min(markingStart.y, markingEnd.y);
    const width = Math.abs(markingEnd.x - markingStart.x);
    const height = Math.abs(markingEnd.y - markingStart.y);
    
    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      background: 'rgba(114, 124, 245, 0.3)',
      border: '2px dashed #727cf5',
      pointerEvents: 'none' as const
    };
  };

  // Hantera byte av version
  const handleChangeVersion = (versionId: string) => {
    const selectedVersion = fileVersions.find(v => v.id === versionId);
    if (!selectedVersion) return;
    
    // Normalt skulle vi hämta ny file URL för denna version
    // För demo använder vi samma URL
    setPdfUrl(selectedVersion.fileUrl);
    setActiveVersionId(versionId);
    
    // Återställ eventuell zoomning/aktiv markering
    setActiveAnnotation(null);
    setScale(1);
    
    // Stäng versionspanelen
    setShowVersionsPanel(false);
  };
  
  // Växla versionssidan när användaren trycker på knapparna i överkanten
  const toggleVersionPanel = () => {
    setShowVersionsPanel(prev => !prev);
  };
  
  // Hitta aktiv version baserat på id
  const activeVersion = fileVersions.find(v => v.id === activeVersionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-70" 
        onClick={isMarking || isAddingComment || showVersionsPanel ? cancelMarkingOrComment : onClose}
      />
      
      <div 
        className={`relative bg-white rounded-lg shadow-2xl flex ${isFullscreen ? 'w-full h-full rounded-none' : 'w-[90%] max-w-6xl h-[90%]'}`}
      >
        {/* Vänster sida - PDF-visare */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col border-b bg-gray-50">
            {/* Övre delen med filinfo och knappar */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold mr-4">{fileData?.filename || "PDF Document"}</h2>
                {activeVersion && (
                  <div className="text-sm text-gray-500">
                    Version: {activeVersion.versionNumber} | Uppladdad: {activeVersion.uploaded} | Av: {activeVersion.uploadedBy}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={zoomOut}
                  className="h-8 w-8"
                >
                  <ZoomOut size={16} />
                </Button>
                <div className="w-12 text-center text-sm">
                  {Math.round(scale * 100)}%
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={zoomIn}
                  className="h-8 w-8"
                >
                  <ZoomIn size={16} />
                </Button>
                <Button 
                  variant={isMarking ? "default" : "outline"}
                  size="icon"
                  onClick={handleToggleMarkingMode}
                  className="h-8 w-8"
                  title={isMarking ? "Avsluta markering" : "Skapa markering"}
                >
                  <MessageSquare size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={rotate}
                  className="h-8 w-8"
                >
                  <Rotate3D size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleDownload}
                  className="h-8 w-8"
                >
                  <Download size={16} />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={toggleFullscreen}
                  className="h-8 w-8"
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
            
            {/* Versionsknappar */}
            {fileVersions.length > 1 && (
              <div className="flex items-center justify-between px-4 pb-2">
                <div className="flex space-x-2">
                  <Button
                    variant={activeVersionId === fileVersions[fileVersions.length - 1]?.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleChangeVersion(fileVersions[fileVersions.length - 1]?.id)}
                    className="rounded-md py-1 h-8"
                  >
                    Nuvarande version
                  </Button>
                  <Button
                    variant={activeVersionId === fileVersions[0]?.id ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleChangeVersion(fileVersions[0]?.id)}
                    className="rounded-md py-1 h-8"
                  >
                    Ursprunglig version
                  </Button>
                </div>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={toggleVersionPanel}
                  className="rounded-md py-1 h-8"
                >
                  Visa versionshistorik
                </Button>
              </div>
            )}
          </div>
          
          <div 
            ref={pdfContainerRef}
            className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center relative"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ cursor: isMarking ? 'crosshair' : 'default' }}
          >
            {pdfUrl ? (
              <div className="relative" ref={pageRef}>
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary-600 mb-4" />
                      <p className="text-gray-600">Laddar dokument...</p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center">
                      <p className="text-red-500 mb-2">Kunde inte ladda dokumentet</p>
                      <p className="text-gray-600 text-sm">Kontrollera att det är en giltig PDF-fil</p>
                    </div>
                  }
                  className="pdfDocument"
                >
                  <Page
                    pageNumber={pageNumber}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    scale={scale}
                    rotate={rotation}
                    loading={
                      <div className="h-[500px] w-[400px] bg-gray-100 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                      </div>
                    }
                    className="pdfPage shadow-lg relative"
                  />
                  
                  {/* Visa befintliga markeringar */}
                  {annotations
                    .filter(ann => ann.rect.pageNumber === pageNumber)
                    .map(annotation => (
                      <div
                        key={annotation.id}
                        className={`absolute border-2 transition-all duration-200 ${activeAnnotation?.id === annotation.id ? 'z-10 ring-2 ring-blue-400' : 'z-0'}`}
                        style={{
                          left: `${annotation.rect.x}px`,
                          top: `${annotation.rect.y}px`,
                          width: `${annotation.rect.width}px`,
                          height: `${annotation.rect.height}px`,
                          backgroundColor: `${annotation.color}33`,
                          borderColor: annotation.color,
                          boxShadow: activeAnnotation?.id === annotation.id ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none'
                        }}
                        onClick={() => setActiveAnnotation(annotation)}
                      />
                    ))}
                  
                  {/* Visa temporär markering under pågående markering */}
                  {markingStart && markingEnd && (
                    <div style={getMarkingRectStyles()} />
                  )}
                </Document>
              </div>
            ) : (
              <div className="text-gray-500">Ingen PDF vald</div>
            )}
          </div>
          
          {numPages && numPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="h-8"
              >
                <ChevronLeft size={16} className="mr-1" />
                Föregående
              </Button>
              
              <div className="text-sm text-gray-600">
                Sida {pageNumber} av {numPages}
              </div>
              
              <Button
                variant="outline"
                onClick={nextPage}
                disabled={Boolean(numPages && pageNumber >= numPages)}
                className="h-8"
              >
                Nästa
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Höger sida - innehåller antingen kommentarpanelen eller versionspanelen */}
        <div className="w-80 border-l overflow-hidden flex flex-col h-full">
          {showVersionsPanel ? (
            <>
              {/* Versionspanel */}
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-medium text-lg">Versionshistorik</h3>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={toggleVersionPanel}
                  className="text-gray-500"
                >
                  <X size={16} className="mr-1" />
                  Stäng
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {fileVersions.map((version, index) => {
                    const isLatest = index === fileVersions.length - 1;
                    const isFirst = index === 0;
                    
                    return (
                      <div 
                        key={version.id}
                        className={`border rounded-lg p-4 transition-all ${
                          version.id === activeVersionId 
                            ? 'bg-blue-50 border-blue-300 shadow-sm' 
                            : 'bg-white hover:border-blue-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col">
                            <h4 className="font-medium flex items-center">
                              Version {version.versionNumber}
                              {isLatest && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Senaste</span>}
                              {isFirst && <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">Första</span>}
                            </h4>
                            <span className="text-xs text-gray-500 mt-1">
                              {version.uploadedBy}, {version.uploaded}
                            </span>
                          </div>
                          
                          <div>
                            {version.id !== activeVersionId ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleChangeVersion(version.id)}
                                className="text-xs h-7"
                              >
                                Visa version
                              </Button>
                            ) : (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Aktiv
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-2">
                          {version.description}
                        </p>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="flex items-center">
                            <MessageSquare size={12} className="mr-1" />
                            {version.commentCount || 0} kommentarer
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Kommentarspanel */}
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-medium text-lg">Kommentarer</h3>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleMarkingMode}
                  className={isMarking ? "text-primary-600" : ""}
                >
                  <MessageSquare size={16} className="mr-1" />
                  {!isMarking ? "Ny kommentar" : "Avbryt"}
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {annotations.length === 0 ? (
                  <div className="p-8 text-gray-500 text-center flex flex-col items-center justify-center h-full">
                    <MessageSquare size={30} className="text-gray-400 mb-3" />
                    <p className="font-medium">Inga kommentarer ännu</p>
                    <p className="text-sm mt-2 max-w-[220px]">
                      Lägg till kommentarer direkt på ritningen genom att klicka på 
                      <span className="font-medium"> Ny kommentar</span> ovan
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={handleToggleMarkingMode}
                      className="mt-4"
                    >
                      <MessageSquare size={14} className="mr-1" />
                      Lägg till första kommentaren
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 p-4">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <p className="text-sm text-gray-500">
                        {annotations.length} {annotations.length === 1 ? 'kommentar' : 'kommentarer'}
                      </p>
                      {/* Här skulle vi kunna lägga till en sortering eller filtrering */}
                    </div>
                    
                    {annotations.map(annotation => (
                      <div 
                        key={annotation.id} 
                        className={`bg-white border rounded-lg p-3 shadow-sm transition-all duration-200 ${activeAnnotation?.id === annotation.id ? 'ring-2 ring-blue-400' : 'hover:border-blue-200'}`}
                        onClick={() => zoomToAnnotation(annotation)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: annotation.color }} 
                            />
                            <span className="text-sm font-medium">
                              {annotation.rect.pageNumber !== pageNumber && `Sida ${annotation.rect.pageNumber}: `}
                              {annotation.status === 'open' && 'Öppen'}
                              {annotation.status === 'resolved' && 'Löst'}
                              {annotation.status === 'action_required' && 'Kräver åtgärd'}
                              {annotation.status === 'reviewing' && 'Under granskning'}
                            </span>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateAnnotationStatus(annotation.id, 'resolved');
                              }}
                              title="Markera som löst"
                            >
                              <Check size={14} className="text-green-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={(e) => {
                                e.stopPropagation();
                                updateAnnotationStatus(annotation.id, 'action_required');
                              }}
                              title="Markera som kräver åtgärd"
                            >
                              <AlertCircle size={14} className="text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{annotation.comment}</p>
                        <div className="flex justify-between mt-2 text-xs text-gray-500 border-t pt-2">
                          <span>{annotation.createdBy}</span>
                          <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Dialog för att lägga till ny kommentar */}
      {isAddingComment && tempAnnotation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={cancelMarkingOrComment} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Lägg till kommentar</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelMarkingOrComment}
                className="h-7 w-7"
              >
                <X size={16} />
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Du markerar ett område på sida {tempAnnotation.rect?.pageNumber}. Lägg till din kommentar nedan.
            </p>
            
            <div className="space-y-5 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <div 
                      key={status}
                      className={`flex flex-col items-center border rounded p-2 cursor-pointer transition-all hover:border-blue-300 ${
                        tempAnnotation.status === status ? 'ring-2 ring-primary-500 border-primary-400' : ''
                      }`}
                      onClick={() => {
                        setTempAnnotation({
                          ...tempAnnotation,
                          status: status as PDFAnnotation['status'],
                          color
                        });
                      }}
                    >
                      <div 
                        className="w-5 h-5 rounded-full mb-1"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-center">
                        {status === 'open' && 'Öppen'}
                        {status === 'resolved' && 'Löst'}
                        {status === 'action_required' && 'Åtgärd'}
                        {status === 'reviewing' && 'Granskas'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Kommentar</label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Beskriv problemet eller lämna en kommentar..."
                  rows={4}
                  className="resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kommentaren kommer att vara synlig för alla som har tillgång till denna fil
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2 border-t">
              <Button
                variant="outline"
                onClick={cancelMarkingOrComment}
              >
                Avbryt
              </Button>
              <Button
                onClick={saveComment}
                disabled={!newComment.trim()}
              >
                <MessageSquare size={16} className="mr-2" />
                Spara kommentar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}