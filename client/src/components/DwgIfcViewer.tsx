import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MeshBasicMaterial } from 'three';  // Explicitly import for type checking
import { IfcAPI } from 'web-ifc';

import { Upload, FileText, Loader2, XCircle, ZoomIn, ZoomOut, RotateCw, Expand, Ruler, Map, Navigation, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { XeokitViewer } from './XeokitViewer';

// Simple type for our file storage
type FileEntry = {
  id: string;
  name: string;
  type: string;
  data: Blob;
  date: Date;
};

// Define a minimal structure for our 3D cube viewer 
interface Viewer3D {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cube?: THREE.Mesh;
  ifcModels?: THREE.Group[];
  animationId: number;
  dispose: () => void;
}

export function DwgIfcViewer() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMeasureTool, setShowMeasureTool] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(false);
  const [isWalkMode, setIsWalkMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer3D | null>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load stored file info on mount, but don't attempt to load file data
  useEffect(() => {
    const loadStoredFiles = () => {
      try {
        const storedFiles = localStorage.getItem('dwg_ifc_files');
        if (storedFiles) {
          const fileInfos = JSON.parse(storedFiles);
          console.log("Found file info records in localStorage:", fileInfos.length);
          
          // Since we're not storing actual file data in localStorage anymore (due to quota issues),
          // we'll just display the stored file info without content
          // In a real implementation, files would be stored on the server or in IndexedDB
          setFiles([]);
        }
      } catch (err) {
        console.error('Error loading stored files:', err);
        setError('Failed to load previously stored files.');
      }
    };
    
    loadStoredFiles();
  }, []);

  // Re-initialize ThreeJS viewer whenever a file is selected
  useEffect(() => {
    // Dispose of current viewer if it exists
    if (viewerRef.current) {
      viewerRef.current.dispose();
      viewerRef.current = null;
    }
    
    // Skip initialization if the viewer isn't needed (for IFC files we use XeokitViewer)
    if (selectedFile?.name.toLowerCase().endsWith('.ifc')) {
      return;
    }
    
    // Initialize viewer if container exists and we have a selected file
    if (viewerContainerRef.current && selectedFile) {
      console.log("Initializing DwgIfcViewer 3D scene with file:", selectedFile.name);
      
      try {
        // Force clean any previous viewer elements
        if (viewerContainerRef.current.childNodes.length > 0) {
          viewerContainerRef.current.innerHTML = '';
        }
        // Create scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0); // Light gray background
        
        // Create camera
        const camera = new THREE.PerspectiveCamera(
          75,  // Field of view
          viewerContainerRef.current.clientWidth / viewerContainerRef.current.clientHeight, // Aspect ratio
          0.1,  // Near clipping plane
          1000  // Far clipping plane
        );
        camera.position.z = 5; // Position camera
        
        // Create WebGL renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(
          viewerContainerRef.current.clientWidth,
          viewerContainerRef.current.clientHeight
        );
        
        // Clear container and add the canvas element - safely
        if (viewerContainerRef.current.childNodes.length > 0) {
          viewerContainerRef.current.textContent = ''; // Safer than innerHTML=''
        }
        
        viewerContainerRef.current.appendChild(renderer.domElement);
        
        // Add light
        const light = new THREE.AmbientLight(0xffffff, 0.8);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 10, 5);
        scene.add(light);
        scene.add(directionalLight);
        
        // Add helper grid for orientation
        const gridHelper = new THREE.GridHelper(10, 10);
        scene.add(gridHelper);
        
        // Get file extension
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();
          
        // Create a simple cube for DWG or as fallback
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({
          color: extension === 'dwg' ? 0x3182ce : 0x6366f1, // Blue for DWG, indigo for others
          wireframe: true
        });
        
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Animation function
        let animationId = 0;
        
        const animate = () => {
          // Rotate cube
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
          
          // Render scene
          renderer.render(scene, camera);
          
          // Request next frame
          animationId = requestAnimationFrame(animate);
        };
        
        // Start animation
        animate();
        
        // Set up orbit controls manually since we can't use the OrbitControls import
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        
        // Manual camera rotation
        const handleMouseDown = (event: MouseEvent) => {
          isDragging = true;
          previousMousePosition = {
            x: event.clientX,
            y: event.clientY
          };
        };
        
        const handleMouseMove = (event: MouseEvent) => {
          if (!isDragging) return;
          
          const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
          };
          
          // Adjust the rotation speed
          const rotationSpeed = 0.01;
          
          // Rotate the cube
          cube.rotation.y += deltaMove.x * rotationSpeed;
          cube.rotation.x += deltaMove.y * rotationSpeed;
          
          previousMousePosition = {
            x: event.clientX,
            y: event.clientY
          };
        };
        
        const handleMouseUp = () => {
          isDragging = false;
        };
        
        // Add event listeners
        if (viewerContainerRef.current) {
          viewerContainerRef.current.addEventListener('mousedown', handleMouseDown);
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        }
        
        // Store viewer refs for cleanup
        viewerRef.current = {
          scene,
          camera,
          renderer,
          cube,
          animationId,
          dispose: () => {
            cancelAnimationFrame(animationId);
            
            // Remove event listeners
            if (viewerContainerRef.current) {
              viewerContainerRef.current.removeEventListener('mousedown', handleMouseDown);
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            
            // Dispose of renderer and geometries
            renderer.dispose();
            geometry.dispose();
            material.dispose();
          }
        };
        
        // Notify when finished loading
        setLoading(false);
        
      } catch (err) {
        console.error('Error initializing viewer:', err);
        setError('Något gick fel vid initiering av 3D-visaren.');
        setLoading(false);
      }
    }
    
    // Clean up function
    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, [selectedFile]);
  
  // Function to handle file uploads
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;
    if (!fileInput.files || fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !['dwg', 'ifc'].includes(extension)) {
      toast({
        title: "Fel vid filuppladdning",
        description: "Endast DWG och IFC filer stöds.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    // Read the file as an ArrayBuffer
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target || !e.target.result) {
        setError('Kunde inte läsa filen.');
        setLoading(false);
        return;
      }
      
      const fileEntry: FileEntry = {
        id: uuidv4(),
        name: file.name,
        type: file.type,
        data: new Blob([e.target.result]),
        date: new Date()
      };
      
      // Add to files array
      const updatedFiles = [...files, fileEntry];
      setFiles(updatedFiles);
      setSelectedFile(fileEntry);
      
      // Store file meta in localStorage (not file data to save space)
      try {
        // Store only metadata to avoid hitting storage limits
        const metadataForStorage = updatedFiles.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          date: f.date
        }));
        localStorage.setItem('dwg_ifc_files', JSON.stringify(metadataForStorage));
      } catch (err) {
        console.error('Error storing file metadata:', err);
        // Not critical, so just log
      }
      
      toast({
        title: "Fil uppladdad",
        description: `${file.name} har laddats upp och valts.`,
        variant: "default"
      });
    };
    
    reader.onerror = () => {
      setError('Fel vid läsning av fil.');
      setLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Select a file from the list
  const selectFile = (file: FileEntry) => {
    setSelectedFile(file);
  };
  
  // Delete a file
  const deleteFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id);
    setFiles(updatedFiles);
    
    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }
    
    // Update localStorage
    try {
      const metadataForStorage = updatedFiles.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        date: f.date
      }));
      localStorage.setItem('dwg_ifc_files', JSON.stringify(metadataForStorage));
    } catch (err) {
      console.error('Error updating file metadata:', err);
    }
    
    toast({
      title: "Fil borttagen",
      description: "Filen har tagits bort från listan.",
      variant: "default"
    });
  };
  
  // Get appropriate icon for file type
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'ifc') {
      return <FileText className="h-5 w-5 text-emerald-500" />;
    } else if (extension === 'dwg') {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else {
      return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('sv-SE', {
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Toggle measurement tool
  const toggleMeasureTool = () => {
    setShowMeasureTool(!showMeasureTool);
    // Clear measurement points when turning off
    if (showMeasureTool) {
      setMeasurePoints([]);
    }
  };
  
  // Toggle minimap
  const toggleMinimap = () => {
    setShowMinimap(!showMinimap);
  };
  
  // Toggle walk mode
  const toggleWalkMode = () => {
    setIsWalkMode(!isWalkMode);
  };
  
  // Reset view
  const resetView = () => {
    if (viewerRef.current) {
      // Reset camera position
      viewerRef.current.camera.position.set(0, 0, 5);
      viewerRef.current.camera.lookAt(0, 0, 0);
    }
  };
  
  // Zoom in
  const zoomIn = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.position.z -= 0.5;
    }
  };
  
  // Zoom out
  const zoomOut = () => {
    if (viewerRef.current) {
      viewerRef.current.camera.position.z += 0.5;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h2 className="text-2xl font-bold mb-6">DWG & IFC Visare</h2>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className={cn(
        "grid h-full transition-all duration-300",
        isFullscreen 
          ? "absolute inset-0 z-50 bg-background grid-cols-1" 
          : "grid-cols-1 md:grid-cols-3 gap-6"
      )}>
        {/* File List Panel */}
        {!isFullscreen && (
          <div className="md:col-span-1 p-4 border rounded-md bg-background flex flex-col h-[70vh] md:h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Filer</h3>
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    <span>Ladda upp</span>
                  </div>
                  <Input 
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept=".dwg,.ifc"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </Label>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-y-auto flex-grow">
                {files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Inga filer uppladdade ännu</p>
                    <p className="text-sm">Ladda upp DWG eller IFC filer för att visa dem</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {files.map(file => (
                      <li 
                        key={file.id}
                        className={cn(
                          "border rounded-md p-3 flex items-center justify-between cursor-pointer hover:bg-muted transition-colors",
                          selectedFile?.id === file.id && "bg-primary/10 border-primary/30"
                        )}
                        onClick={() => selectFile(file)}
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.name)}
                          <div className="overflow-hidden">
                            <p className="font-medium truncate max-w-[150px]">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(file.date)}</p>
                          </div>
                        </div>
                        <div 
                          className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFile(file.id);
                          }}
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Viewer Panel */}
        <div className={cn(
          "border rounded-md overflow-hidden bg-background relative",
          isFullscreen 
            ? "col-span-full h-screen" 
            : "md:col-span-2 h-[70vh] md:h-[80vh]"
        )}>
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Ingen fil vald</h3>
                <p className="text-muted-foreground">Välj en fil från listan för att visa den</p>
              </div>
            </div>
          ) : (
            <>
              <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
                <div className="rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </div>
                <div className="rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </div>
                <div className="rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={resetView}>
                  <RotateCw className="h-4 w-4" />
                </div>
                <div className="rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" 
                     onClick={toggleFullscreen}>
                  <Expand className="h-4 w-4" />
                </div>
                <div className={cn(
                  "rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700", 
                  showMeasureTool && "bg-slate-200 dark:bg-slate-700"
                )}
                     onClick={toggleMeasureTool}>
                  <Ruler className="h-4 w-4" />
                </div>
                <div className={cn(
                  "rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700",
                  showMinimap && "bg-slate-200 dark:bg-slate-700"
                )}
                     onClick={toggleMinimap}>
                  <Map className="h-4 w-4" />
                </div>
                <div className={cn(
                  "rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700",
                  isWalkMode && "bg-slate-200 dark:bg-slate-700"
                )}
                     onClick={toggleWalkMode}>
                  <Navigation className="h-4 w-4" />
                </div>
                <div className="rounded p-1 border bg-background cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                     onClick={resetView}>
                  <Home className="h-4 w-4" />
                </div>
              </div>
              
              {/* Choose the appropriate viewer based on file type */}
              {selectedFile.name.toLowerCase().endsWith('.ifc') ? (
                // Use Xeokit Viewer for IFC files
                <XeokitViewer 
                  fileName={selectedFile.name}
                  onLoadComplete={() => setLoading(false)}
                />
              ) : (
                // Use ThreeJS viewer for DWG and other files
                <div ref={viewerContainerRef} className="w-full h-full"></div>
              )}
              
              {/* Minimap (if enabled) */}
              {showMinimap && (
                <div 
                  ref={minimapRef} 
                  className="absolute top-4 left-4 w-48 h-48 border rounded-md bg-black/80 shadow-lg pointer-events-none"
                >
                  <div className="text-center text-xs text-white p-1">Minimap</div>
                </div>
              )}
              
              {/* Measurement info */}
              {showMeasureTool && (
                <div className="absolute bottom-4 left-4 p-2 bg-black/80 text-white rounded-md text-sm">
                  <p>Klicka för att placera mätpunkter</p>
                  <p>Avstånd: {measurePoints.length === 2 ? measurePoints[0].distanceTo(measurePoints[1]).toFixed(2) + ' enheter' : '...'}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}