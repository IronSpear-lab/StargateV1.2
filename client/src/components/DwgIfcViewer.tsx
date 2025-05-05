import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

import { Upload, FileText, Loader2, XCircle, ZoomIn, ZoomOut, RotateCw, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// We're using Three.js for our 3D viewing needs
// In a real implementation, we would use a specialized IFC/DWG library

// Simple types for our file storage
type FileEntry = {
  id: string;
  name: string;
  type: string;
  data: Blob;
  date: Date;
};

export function DwgIfcViewer() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
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

  // Initialize the viewer when the component mounts
  useEffect(() => {
    if (viewerContainerRef.current && !viewerRef.current) {
      try {
        // Initialize our Three.js viewer
        
        // For now, we'll use Three.js as a fallback/placeholder
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 1000);
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(viewerContainerRef.current.clientWidth, viewerContainerRef.current.clientHeight);
        
        // Clear any existing canvas
        if (viewerContainerRef.current.firstChild) {
          viewerContainerRef.current.removeChild(viewerContainerRef.current.firstChild);
        }
        
        viewerContainerRef.current.appendChild(renderer.domElement);
        
        // Create a more complex "building-like" structure instead of just a cube
        const buildingGroup = new THREE.Group();
        
        // Base/foundation
        const baseGeometry = new THREE.BoxGeometry(4, 0.2, 4);
        const baseMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -0.8;
        buildingGroup.add(base);
        
        // Main building
        const buildingGeometry = new THREE.BoxGeometry(3, 1.5, 3);
        const buildingMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x727cf5,
          wireframe: true,
          transparent: true,
          opacity: 0.7
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = 0;
        buildingGroup.add(building);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(2.2, 1, 4);
        const roofMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xfa5c7c,
          wireframe: true
        });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 1.25;
        roof.rotation.y = Math.PI / 4; // 45 degrees
        buildingGroup.add(roof);
        
        // Interior walls
        const wallGeometry = new THREE.BoxGeometry(1.4, 1.3, 0.05);
        const wallMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x0acf97,
          wireframe: true
        });
        
        // Horizontal wall
        const wallH = new THREE.Mesh(wallGeometry, wallMaterial);
        wallH.position.set(0, -0.1, 0);
        buildingGroup.add(wallH);
        
        // Vertical wall
        const wallV = new THREE.Mesh(wallGeometry, wallMaterial);
        wallV.position.set(0, -0.1, 0);
        wallV.rotation.y = Math.PI / 2; // 90 degrees
        buildingGroup.add(wallV);
        
        scene.add(buildingGroup);
        
        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          
          buildingGroup.rotation.y += 0.005;
          
          renderer.render(scene, camera);
        };
        
        animate();
        
        // Handle window resize
        const handleResize = () => {
          if (viewerContainerRef.current) {
            camera.aspect = viewerContainerRef.current.clientWidth / viewerContainerRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(viewerContainerRef.current.clientWidth, viewerContainerRef.current.clientHeight);
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        // Store references
        viewerRef.current = {
          scene,
          camera,
          renderer,
          buildingGroup,
          isXeokit: false, // Flag indicating we're using the fallback
          dispose: () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
          }
        };
        
        // Clean up on unmount
        return () => {
          if (viewerRef.current) {
            viewerRef.current.dispose();
            viewerRef.current = null;
          }
          window.removeEventListener('resize', handleResize);
        };
      } catch (err) {
        console.error('Failed to initialize viewer:', err);
        setError('Failed to initialize the 3D viewer. Please try refreshing the page.');
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
      
      toast({
        title: "File uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (err) {
      console.error('Error handling file upload:', err);
      setError('Failed to upload the file. Please try again.');
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
    
    // For now, we'll just show different colors and styles based on file type
    if (viewerRef.current && viewerRef.current.buildingGroup) {
      // Get file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'dwg') {
        // Update the building materials for DWG files (blue theme)
        const buildingMaterial = viewerRef.current.buildingGroup.children[1].material;
        if (buildingMaterial) {
          buildingMaterial.color.set(0x3182ce); // Blue
        }
        
        // Update wall colors
        const walls = [viewerRef.current.buildingGroup.children[3], viewerRef.current.buildingGroup.children[4]];
        walls.forEach(wall => {
          if (wall && wall.material) {
            wall.material.color.set(0x4299e1); // Lighter blue
          }
        });
        
        // Add informational message about DWG files
        toast({
          title: "DWG File Selected",
          description: "In a fully implemented viewer, this would show an interactive CAD drawing.",
        });
      } else if (extension === 'ifc') {
        // Update the building materials for IFC files (green theme)
        const buildingMaterial = viewerRef.current.buildingGroup.children[1].material;
        if (buildingMaterial) {
          buildingMaterial.color.set(0x38a169); // Green
        }
        
        // Update wall colors
        const walls = [viewerRef.current.buildingGroup.children[3], viewerRef.current.buildingGroup.children[4]];
        walls.forEach(wall => {
          if (wall && wall.material) {
            wall.material.color.set(0x48bb78); // Lighter green
          }
        });
        
        // Add informational message about IFC files
        toast({
          title: "IFC File Selected",
          description: "In a fully implemented viewer, this would show an interactive BIM model.",
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFile(file.id);
                        }}
                      >
                        <XCircle className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
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
                <Button variant="outline" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={resetView}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
              <div 
                ref={viewerContainerRef} 
                className="h-full w-full relative"
              >
                <canvas id="dwg-ifc-canvas" className="w-full h-full"></canvas>
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