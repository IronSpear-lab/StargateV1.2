import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MeshBasicMaterial } from 'three';  // Explicitly import for type checking

import { Upload, FileText, Loader2, XCircle, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// Simple type for our file storage
type FileEntry = {
  id: string;
  name: string;
  type: string;
  data: Blob;
  date: Date;
};

// Define a minimal structure for our 3D cube viewer 
interface CubeViewer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cube: THREE.Mesh;
  animationId: number;
  dispose: () => void;
}

export function DwgIfcViewer() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CubeViewer | null>(null);
  const { toast } = useToast();

  // Load stored files on mount
  useEffect(() => {
    const loadStoredFiles = () => {
      try {
        const storedFiles = localStorage.getItem('dwg_ifc_files');
        if (storedFiles) {
          const fileInfos = JSON.parse(storedFiles);
          
          // We need to load the actual file data from separate storage
          const loadedFiles: FileEntry[] = [];
          fileInfos.forEach((fileInfo: Omit<FileEntry, 'data'>) => {
            const fileData = localStorage.getItem(`dwg_ifc_file_${fileInfo.id}`);
            if (fileData) {
              // Convert base64 back to Blob
              const byteCharacters = atob(fileData);
              const byteArrays = [];
              for (let i = 0; i < byteCharacters.length; i++) {
                byteArrays.push(byteCharacters.charCodeAt(i));
              }
              const blob = new Blob([new Uint8Array(byteArrays)], { type: fileInfo.type });
              
              loadedFiles.push({
                ...fileInfo,
                data: blob,
                date: new Date(fileInfo.date)
              });
            }
          });
          
          setFiles(loadedFiles);
        }
      } catch (err) {
        console.error('Error loading stored files:', err);
        setError('Failed to load previously stored files.');
      }
    };
    
    loadStoredFiles();
  }, []);

  // Initialize a very simple ThreeJS viewer with just a cube
  useEffect(() => {
    // Only create viewer if container exists and we don't already have a viewer
    if (viewerContainerRef.current && !viewerRef.current) {
      console.log("Initializing DwgIfcViewer 3D scene...");
      
      try {
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
        
        // Clear container and add the canvas element
        viewerContainerRef.current.innerHTML = '';
        viewerContainerRef.current.appendChild(renderer.domElement);
        
        // Add light
        const light = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(light);
        
        // Create a simple cube
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshBasicMaterial({
          color: 0x6366f1, // Indigo color
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
        
        // Handle window resize
        const handleResize = () => {
          if (!viewerContainerRef.current) return;
          
          const width = viewerContainerRef.current.clientWidth;
          const height = viewerContainerRef.current.clientHeight;
          
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Store all viewer objects for later access
        viewerRef.current = {
          scene,
          camera,
          renderer,
          cube,
          animationId,
          dispose: () => {
            console.log("Disposing 3D viewer...");
            if (animationId) {
              cancelAnimationFrame(animationId);
            }
            
            window.removeEventListener('resize', handleResize);
            
            // Dispose geometries and materials
            geometry.dispose();
            material.dispose();
            
            // Clean up renderer
            renderer.dispose();
          }
        };
        
        console.log("3D viewer initialized successfully");
        
        // Clean up function
        return () => {
          if (viewerRef.current) {
            viewerRef.current.dispose();
            viewerRef.current = null;
          }
        };
      } catch (err) {
        console.error("Failed to initialize 3D viewer:", err);
        setError("Kunde inte initiera 3D-visaren. Vänligen försök ladda om sidan.");
      }
    }
  }, []);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    const file = files[0];
    
    try {
      // Check if the file is a DWG or IFC file
      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (fileType !== 'dwg' && fileType !== 'ifc') {
        setError('Only DWG and IFC files are supported.');
        setLoading(false);
        return;
      }
      
      // Create a unique ID for the file using uuid
      const fileId = uuidv4();
      
      // Create a file entry
      const fileEntry: FileEntry = {
        id: fileId,
        name: file.name,
        type: file.type || `application/${fileType}`,
        data: file,
        date: new Date()
      };
      
      // Add the file to our state
      setFiles(prevFiles => {
        const newFiles = [...prevFiles, fileEntry];
        
        // Store file info in localStorage (without the blob data)
        const fileInfos = newFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.type,
          date: file.date
        }));
        localStorage.setItem('dwg_ifc_files', JSON.stringify(fileInfos));
        
        // Store the file data separately using base64 encoding
        const reader = new FileReader();
        reader.onload = () => {
          const base64data = reader.result as string;
          const base64Content = base64data.split(',')[1]; // Remove the data URL prefix
          localStorage.setItem(`dwg_ifc_file_${fileId}`, base64Content);
        };
        reader.readAsDataURL(file);
        
        return newFiles;
      });
      
      // Select the newly uploaded file
      setSelectedFile(fileEntry);
      
      // Apply visual changes based on file type
      const extension = fileEntry.name.split('.').pop()?.toLowerCase();
      
      if (viewerRef.current && viewerRef.current.cube) {
        if (extension === 'dwg') {
          // Change cube color for DWG files (blue)
          if (viewerRef.current.cube.material instanceof THREE.MeshBasicMaterial) {
            viewerRef.current.cube.material.color.set(0x3182ce); // Blue
          }
          
          // Force a render update
          viewerRef.current.renderer.render(
            viewerRef.current.scene, 
            viewerRef.current.camera
          );
          
          toast({
            title: "DWG-fil uppladdad",
            description: `${file.name} har laddats upp. Titta på den blå kuben.`,
          });
        } else if (extension === 'ifc') {
          // Change cube color for IFC files (green)
          if (viewerRef.current.cube.material instanceof MeshBasicMaterial) {
            viewerRef.current.cube.material.color.set(0x38a169); // Green
          }
          
          // Force a render update
          viewerRef.current.renderer.render(
            viewerRef.current.scene, 
            viewerRef.current.camera
          );
          
          toast({
            title: "IFC-fil uppladdad",
            description: `${file.name} har laddats upp. Titta på den gröna kuben.`,
          });
        } else {
          toast({
            title: "Fil uppladdad",
            description: `${file.name} har laddats upp.`,
          });
        }
      } else {
        toast({
          title: "Fil uppladdad",
          description: `${file.name} har laddats upp.`,
        });
      }
    } catch (err) {
      console.error('Error handling file upload:', err);
      setError('Kunde inte ladda upp filen. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const selectFile = (file: FileEntry) => {
    setSelectedFile(file);
    
    // In a real implementation, we would:
    // 1. Parse the file (using appropriate library for DWG or IFC)
    // 2. Load it into the viewer (XeoKit or similar)
    // 3. Setup the scene, camera, and controls
    
    // Get file extension and update cube color based on file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (viewerRef.current?.cube) {
      if (extension === 'dwg') {
        // Change cube color for DWG files (blue)
        if (viewerRef.current.cube.material instanceof MeshBasicMaterial) {
          viewerRef.current.cube.material.color.set(0x3182ce); // Blue
        }
        
        // Force a render update
        viewerRef.current.renderer.render(
          viewerRef.current.scene,
          viewerRef.current.camera
        );
        
        // Show info message
        toast({
          title: "DWG-fil vald",
          description: "Interaktiv visning av en CAD-ritning skulle visas här i en färdig implementation.",
        });
      } else if (extension === 'ifc') {
        // Change cube color for IFC files (green)
        if (viewerRef.current.cube.material instanceof MeshBasicMaterial) {
          viewerRef.current.cube.material.color.set(0x38a169); // Green
        }
        
        // Force a render update
        viewerRef.current.renderer.render(
          viewerRef.current.scene,
          viewerRef.current.camera
        );
        
        // Show info message
        toast({
          title: "IFC-fil vald",
          description: "Interaktiv visning av en BIM-modell skulle visas här i en färdig implementation.",
        });
      }
    }
  };

  // Delete a file
  const deleteFile = (fileId: string) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter(file => file.id !== fileId);
      
      // Update stored file info
      const fileInfos = newFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        date: file.date
      }));
      localStorage.setItem('dwg_ifc_files', JSON.stringify(fileInfos));
      
      // Remove file data
      localStorage.removeItem(`dwg_ifc_file_${fileId}`);
      
      return newFiles;
    });
    
    // If the deleted file was selected, clear the selection
    if (selectedFile && selectedFile.id === fileId) {
      setSelectedFile(null);
    }
    
    toast({
      title: "File deleted",
      description: "The file has been removed.",
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format file size to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper function to get file icon based on type
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'dwg') {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (extension === 'ifc') {
      return <FileText className="h-5 w-5 text-green-500" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  // Zoom controls
  const zoomIn = () => {
    if (viewerRef.current) {
      const camera = viewerRef.current.camera;
      if (camera) {
        camera.position.z *= 0.8; // Move camera closer = zoom in
      }
    }
  };

  const zoomOut = () => {
    if (viewerRef.current) {
      const camera = viewerRef.current.camera;
      if (camera) {
        camera.position.z *= 1.2; // Move camera farther = zoom out
      }
    }
  };

  const resetView = () => {
    if (viewerRef.current) {
      const camera = viewerRef.current.camera;
      if (camera) {
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">DWG & IFC Viewer</h2>
        <p className="text-muted-foreground">
          Upload and view DWG and IFC files in 3D
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {/* File List Panel */}
        <div className="md:col-span-1 p-4 border rounded-md bg-background flex flex-col h-[70vh] md:h-[80vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Files</h3>
            <div>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex items-center gap-1 bg-primary text-white px-2 py-1 rounded-md hover:bg-primary/90">
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
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
                  <p>No files uploaded yet</p>
                  <p className="text-sm">Upload DWG or IFC files to view them</p>
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

        {/* Viewer Panel */}
        <div className="md:col-span-2 border rounded-md overflow-hidden bg-background relative h-[70vh] md:h-[80vh]">
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No file selected</h3>
                <p className="text-muted-foreground">Select a file from the list to view it</p>
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
              </div>
              <div 
                ref={viewerContainerRef} 
                className="h-full w-full relative"
              >
                {/* Canvas is auto-created by Three.js renderer */}
                <div className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm p-2 rounded border">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <div className="flex items-center mt-1">
                    <p className="text-xs text-muted-foreground mr-2">
                      {selectedFile.name.toLowerCase().endsWith('.dwg') ? 'CAD Drawing' : 'BIM Model'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      • Size: {formatBytes(selectedFile.data.size)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}