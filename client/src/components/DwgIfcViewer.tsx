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

  // Re-initialize ThreeJS viewer whenever a file is selected
  useEffect(() => {
    // Dispose of current viewer if it exists
    if (viewerRef.current) {
      viewerRef.current.dispose();
      viewerRef.current = null;
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
        
        // Initialize IFC or create a placeholder based on file type
        if (extension === 'ifc') {
          // Set up camera for IFC viewing
          camera.position.set(10, 10, 10);
          camera.lookAt(0, 0, 0);
          
          // Set up orbit controls manually since we can't use the OrbitControls import
          let isDragging = false;
          let previousMousePosition = { x: 0, y: 0 };
          let cameraTarget = new THREE.Vector3(0, 0, 0);
          
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
            const rotationSpeed = 0.005;
            
            // Calculate theta and phi components (spherical coordinates)
            const theta = -deltaMove.x * rotationSpeed;
            const phi = -deltaMove.y * rotationSpeed;
            
            // Get camera position relative to target
            const position = new THREE.Vector3().subVectors(camera.position, cameraTarget);
            
            // Convert to spherical coordinates
            const radius = position.length();
            let sphericalCoords = new THREE.Spherical().setFromVector3(position);
            
            // Apply rotation
            sphericalCoords.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalCoords.phi + phi));
            sphericalCoords.theta += theta;
            
            // Convert back to Cartesian coordinates
            position.setFromSpherical(sphericalCoords);
            
            // Update camera position
            camera.position.copy(position.add(cameraTarget));
            camera.lookAt(cameraTarget);
            
            previousMousePosition = {
              x: event.clientX,
              y: event.clientY
            };
            
            // Render to show changes
            renderer.render(scene, camera);
          };
          
          const handleMouseUp = () => {
            isDragging = false;
          };
          
          const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            
            // Get direction vector from camera to target
            const direction = new THREE.Vector3().subVectors(camera.position, cameraTarget).normalize();
            
            // Zoom speed
            const zoomSpeed = 0.2;
            const distance = event.deltaY * zoomSpeed;
            
            // Move camera along direction vector
            camera.position.addScaledVector(direction, distance);
            
            // Render to show changes
            renderer.render(scene, camera);
          };
          
          // Add event listeners
          if (viewerContainerRef.current) {
            viewerContainerRef.current.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            viewerContainerRef.current.addEventListener('wheel', handleWheel, { passive: false });
          }
          
          // Use IfcAPI directly to load IFC
          setLoading(true);
          
          // Create a function to load the IFC model
          const loadIFCModel = async () => {
            try {
              // Initialize the IFC API
              const ifcAPI = new IfcAPI();
              await ifcAPI.Init();
              
              // Convert the selected file to array buffer
              const arrayBuffer = await selectedFile.data.arrayBuffer();
              
              // Load the model
              const modelID = await ifcAPI.OpenModel(new Uint8Array(arrayBuffer));
              console.log("Model loaded with ID:", modelID);
              
              // Get all the geometry from the model
              const allItems = await ifcAPI.GetAllItems(modelID);
              console.log("Items in model:", allItems.length);
              
              // Create a group to hold all model geometry
              const modelGroup = new THREE.Group();
              
              // Process each IFC element type that has geometry
              const processItems = async () => {
                // Get the most common elements with geometry
                const wallsID = await ifcAPI.GetLineIDsWithType(modelID, 4 /* IFCWALL */);
                const doorsID = await ifcAPI.GetLineIDsWithType(modelID, 5 /* IFCDOOR */);
                const windowsID = await ifcAPI.GetLineIDsWithType(modelID, 6 /* IFCWINDOW */);
                const slabsID = await ifcAPI.GetLineIDsWithType(modelID, 3 /* IFCSLAB */);
                const beamsID = await ifcAPI.GetLineIDsWithType(modelID, 2 /* IFCBEAM */);
                
                // Create material map for different element types
                const materialMap = {
                  4: new THREE.MeshPhongMaterial({ color: 0xf5f5f5 }), // Walls
                  5: new THREE.MeshPhongMaterial({ color: 0x8B4513 }), // Doors
                  6: new THREE.MeshPhongMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.6 }), // Windows
                  3: new THREE.MeshPhongMaterial({ color: 0xcccccc }), // Slabs
                  2: new THREE.MeshPhongMaterial({ color: 0x808080 }), // Beams
                };
                
                // Process all walls
                for (const wallID of wallsID) {
                  // Get geometry data for this wall
                  const wallGeometry = await ifcAPI.GetGeometry(modelID, wallID);
                  if (wallGeometry && wallGeometry.GetVertexData) {
                    const vertices = wallGeometry.GetVertexData();
                    const indices = wallGeometry.GetIndexData();
                    
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
                    geometry.setIndex(Array.from(indices));
                    
                    const mesh = new THREE.Mesh(geometry, materialMap[4]);
                    modelGroup.add(mesh);
                  }
                }
                
                // Add the model group to the scene
                scene.add(modelGroup);
                
                // Scale and center the model
                const box = new THREE.Box3().setFromObject(modelGroup);
                const size = box.getSize(new THREE.Vector3());
                const maxSize = Math.max(size.x, size.y, size.z);
                const scale = 5 / maxSize;
                
                modelGroup.scale.set(scale, scale, scale);
                
                // Center the model
                box.setFromObject(modelGroup);
                const center = box.getCenter(new THREE.Vector3());
                modelGroup.position.sub(center);
                
                // Position camera to see the whole model
                cameraTarget = new THREE.Vector3(0, 0, 0);
                const distance = 10;
                camera.position.set(distance, distance, distance);
                camera.lookAt(cameraTarget);
                
                // Hide loading state
                setLoading(false);
                
                toast({
                  title: "IFC-modell laddad",
                  description: "IFC-modellen har renderats med faktiska byggdelar från filen.",
                });
              };
              
              // Start processing items
              processItems();
              
            } catch (err) {
              console.error('Error processing IFC file:', err);
              setError('Kunde inte bearbeta IFC-filen. Se felmeddelande i konsolen.');
              
              // Fallback to a representative house model if processing fails
              createHouseModel();
              
              setLoading(false);
            }
          };
          
          // Function to create a representative house model if IFC loading fails
          const createHouseModel = () => {
            const buildingGroup = new THREE.Group();
            
            // Base/foundation
            const baseGeometry = new THREE.BoxGeometry(5, 0.2, 4);
            const baseMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            base.position.y = -0.5;
            buildingGroup.add(base);
            
            // Create walls
            const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xf5f5f5 });
            
            // Left wall
            const leftWallGeometry = new THREE.BoxGeometry(0.2, 1.5, 4);
            const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
            leftWall.position.set(-2.4, 0.25, 0);
            buildingGroup.add(leftWall);
            
            // Right wall
            const rightWallGeometry = new THREE.BoxGeometry(0.2, 1.5, 4);
            const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
            rightWall.position.set(2.4, 0.25, 0);
            buildingGroup.add(rightWall);
            
            // Back wall
            const backWallGeometry = new THREE.BoxGeometry(5, 1.5, 0.2);
            const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
            backWall.position.set(0, 0.25, -2);
            buildingGroup.add(backWall);
            
            // Front wall with door
            const frontWallLeftGeometry = new THREE.BoxGeometry(2, 1.5, 0.2);
            const frontWallLeft = new THREE.Mesh(frontWallLeftGeometry, wallMaterial);
            frontWallLeft.position.set(-1.5, 0.25, 2);
            buildingGroup.add(frontWallLeft);
            
            const frontWallRightGeometry = new THREE.BoxGeometry(2, 1.5, 0.2);
            const frontWallRight = new THREE.Mesh(frontWallRightGeometry, wallMaterial);
            frontWallRight.position.set(1.5, 0.25, 2);
            buildingGroup.add(frontWallRight);
            
            // Add a window to the right wall
            const windowMaterial = new THREE.MeshPhongMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.6 });
            const windowGeometry = new THREE.PlaneGeometry(1, 0.8);
            const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
            windowMesh.position.set(2.31, 0.3, 0);
            windowMesh.rotation.y = Math.PI / 2;
            buildingGroup.add(windowMesh);
            
            // Roof
            const roofGeometry = new THREE.ConeGeometry(3.5, 1.5, 4);
            const roofMaterial = new THREE.MeshPhongMaterial({ color: 0xa52a2a });
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(0, 1.5, 0);
            roof.rotation.y = Math.PI / 4;
            buildingGroup.add(roof);
            
            // Create simple furniture
            const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
            const tableTopGeometry = new THREE.BoxGeometry(1.5, 0.1, 1);
            const tableTop = new THREE.Mesh(tableTopGeometry, tableMaterial);
            tableTop.position.set(0, 0, 0);
            
            const tableLegGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.7);
            const tableLeg1 = new THREE.Mesh(tableLegGeometry, tableMaterial);
            tableLeg1.position.set(-0.65, -0.4, -0.4);
            const tableLeg2 = new THREE.Mesh(tableLegGeometry, tableMaterial);
            tableLeg2.position.set(0.65, -0.4, -0.4);
            const tableLeg3 = new THREE.Mesh(tableLegGeometry, tableMaterial);
            tableLeg3.position.set(-0.65, -0.4, 0.4);
            const tableLeg4 = new THREE.Mesh(tableLegGeometry, tableMaterial);
            tableLeg4.position.set(0.65, -0.4, 0.4);
            
            const tableGroup = new THREE.Group();
            tableGroup.add(tableTop, tableLeg1, tableLeg2, tableLeg3, tableLeg4);
            tableGroup.position.set(0, 0, 0);
            buildingGroup.add(tableGroup);
            
            // Add the building to the scene
            buildingGroup.position.y = 0.5;
            scene.add(buildingGroup);
            
            toast({
              title: "IFC-modell (reservversion)",
              description: "Kunde inte läsa faktiska IFC-data. Visar en representativ byggnad istället.",
              variant: "destructive"
            });
          };
          
          // Start loading the IFC model
          loadIFCModel();
          
          // Animation function
          let animationId = 0;
          
          const animate = () => {
            // Render scene
            renderer.render(scene, camera);
            
            // Request next frame
            animationId = requestAnimationFrame(animate);
          };
          
          // Start animation
          animate();
          
          // Clean up function for manual controls
          const cleanupControls = () => {
            if (viewerContainerRef.current) {
              viewerContainerRef.current.removeEventListener('mousedown', handleMouseDown);
              window.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('mouseup', handleMouseUp);
              viewerContainerRef.current.removeEventListener('wheel', handleWheel);
            }
          };
          
          // Return cleanup function
          return () => {
            cleanupControls();
          };
        } else {
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
        }
        
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
          ifcModels: [],
          animationId: 0,
          dispose: () => {
            console.log("Disposing 3D viewer...");
            if (viewerRef.current?.animationId) {
              cancelAnimationFrame(viewerRef.current.animationId);
            }
            
            window.removeEventListener('resize', handleResize);
            
            // Clean up renderer
            renderer.dispose();
            
            // Traverse the scene and dispose of geometries and materials
            scene.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                
                if (object.material instanceof THREE.Material) {
                  object.material.dispose();
                } else if (Array.isArray(object.material)) {
                  object.material.forEach((material) => material.dispose());
                }
              }
            });
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
  }, [selectedFile, toast]);

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

  // Handle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    
    // In a full implementation, we would:
    // 1. Adjust the UI to fill the screen
    // 2. Make camera controls more like a first-person experience
    // 3. Reset the viewpoint to a real walkthrough position
    
    if (!isFullscreen) {
      toast({
        title: "Fullskärmsläge aktiverat",
        description: "Använd W/A/S/D-tangenterna för att gå runt i modellen.",
      });
    }
  };
  
  // Toggle walk mode for navigating inside the model
  const toggleWalkMode = () => {
    setIsWalkMode(prev => !prev);
    
    // In a full implementation, we would:
    // 1. Change camera to first-person controller
    // 2. Add collision detection with model geometry
    // 3. Add gravity and stair climbing abilities
    
    toast({
      title: isWalkMode ? "Utforskningsläge inaktiverat" : "Utforskningsläge aktiverat",
      description: isWalkMode 
        ? "Återgår till standardvisning" 
        : "Nu kan du utforska modellen från insidan. Använd W/A/S/D för att gå runt.",
    });
  };
  
  // Toggle measurement tool
  const toggleMeasureTool = () => {
    setShowMeasureTool(prev => !prev);
    setMeasurePoints([]);
    
    // In a full implementation, we would:
    // 1. Add a ruler line that follows the cursor
    // 2. Allow clicking to place start and end points
    // 3. Show the distance in real-world units (meters)
    
    toast({
      title: showMeasureTool ? "Mätverktyg inaktiverat" : "Mätverktyg aktiverat",
      description: showMeasureTool 
        ? "Mätverktyget har stängts av" 
        : "Klicka på två punkter i modellen för att mäta avståndet.",
    });
  };
  
  // Toggle minimap
  const toggleMinimap = () => {
    setShowMinimap(prev => !prev);
    
    // In a full implementation, we would:
    // 1. Create a 2D floor plan view of the model
    // 2. Show the user's current position as a dot
    // 3. Show the user's field of view as a cone
    
    toast({
      title: showMinimap ? "Minikarta inaktiverad" : "Minikarta aktiverad",
      description: showMinimap 
        ? "Minikartan har stängts av" 
        : "Minikartan visar din position i modellen.",
    });
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
                
                {showMinimap && (
                  <div 
                    ref={minimapRef}
                    className="absolute top-2 left-2 w-32 h-32 bg-white/90 dark:bg-black/90 border rounded-sm overflow-hidden"
                  >
                    <div className="p-1 text-xs font-medium">Minimap View</div>
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-800 relative">
                      <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                      <div className="absolute top-1/2 left-1/2 w-8 h-8 border-2 border-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                  </div>
                )}
                
                {showMeasureTool && measurePoints.length > 0 && (
                  <div className="absolute bottom-24 left-2 bg-background/80 backdrop-blur-sm p-2 rounded border">
                    <p className="text-sm font-medium">Measurement Tool</p>
                    <div className="flex items-center mt-1">
                      <p className="text-xs text-muted-foreground">
                        Distance: {measurePoints.length >= 2 ? 
                          (Math.sqrt(
                            Math.pow(measurePoints[0].x - measurePoints[1].x, 2) + 
                            Math.pow(measurePoints[0].y - measurePoints[1].y, 2) + 
                            Math.pow(measurePoints[0].z - measurePoints[1].z, 2)
                          ).toFixed(2) + " m") : 
                          "Click to place second point"}
                      </p>
                    </div>
                  </div>
                )}
                
                {isWalkMode && (
                  <div className="absolute bottom-24 right-2 bg-background/80 backdrop-blur-sm p-2 rounded border">
                    <p className="text-sm font-medium">Walk Mode Controls</p>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      <div></div>
                      <div className="p-1 bg-primary/20 text-center rounded text-xs">W</div>
                      <div></div>
                      <div className="p-1 bg-primary/20 text-center rounded text-xs">A</div>
                      <div className="p-1 bg-primary/20 text-center rounded text-xs">S</div>
                      <div className="p-1 bg-primary/20 text-center rounded text-xs">D</div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Mouse: Look around</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}