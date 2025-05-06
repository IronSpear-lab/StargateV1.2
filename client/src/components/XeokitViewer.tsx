import { useEffect, useRef, useState } from "react";
import { 
  Viewer, 
  XKTLoaderPlugin,
  NavCubePlugin,
  SectionPlanesPlugin,
  BCFViewpointsPlugin,
  DistanceMeasurementsPlugin
} from "@xeokit/xeokit-sdk";

interface XeokitViewerProps {
  fileName?: string;
  onLoadComplete?: () => void;
}

export function XeokitViewer({ fileName, onLoadComplete }: XeokitViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Initialize xeokit viewer
  useEffect(() => {
    if (!containerRef.current) return;
    
    try {
      // Initialize the viewer
      const viewer = new Viewer({
        canvasId: "xeokit-canvas",
        transparent: true
      });
      
      // Add a NavCube to help with orientation
      new NavCubePlugin(viewer, {
        canvasId: "navCubeCanvas",
        visible: true
      });
      
      // Add section planes plugin for cutting the model
      new SectionPlanesPlugin(viewer, {
        overviewCanvasId: "mySectionPlanesOverviewCanvas",
        overviewVisible: false
      });
      
      // Add BCF viewpoints capability
      new BCFViewpointsPlugin(viewer);
      
      // Add measurement tools 
      new DistanceMeasurementsPlugin(viewer);
      
      // Store the viewer reference
      viewerRef.current = viewer;
      
      // Clean up on unmount
      return () => {
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
      };
    } catch (err) {
      console.error("Error initializing xeokit viewer:", err);
      setErrorMessage("Kunde inte initialisera 3D-visaren. Vänligen försök igen.");
    }
  }, [containerRef]);
  
  // Load model when component mounts and viewer is ready
  useEffect(() => {
    if (!viewerRef.current || !fileName) return;
    
    const loadModel = async () => {
      // This null check is redundant but helps TypeScript understand we've already checked
      if (!viewerRef.current) return;
      
      try {
        setIsLoading(true);
        setErrorMessage(null);
        
        // Create an XKT loader for IFC models
        const viewer = viewerRef.current as Viewer; // Type assertion tells TypeScript this is not null
        const xktLoader = new XKTLoaderPlugin(viewer);
        
        // Skapa en enkel byggnadsmodell direkt med xeokit istället för att ladda externt
        // Create a simple building directly with xeokit entities
        const modelId = "house-model";
        
        // Create a ground plane
        viewer.scene.createMesh({
          id: "ground",
          primitive: "triangles",
          positions: [
            -20, 0, -20, 20, 0, -20, 20, 0, 20, -20, 0, 20
          ],
          normals: [
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0
          ],
          indices: [
            0, 1, 2, 0, 2, 3
          ],
          edgeIndices: [
            0, 1, 1, 2, 2, 3, 3, 0
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.6, 0.7, 0.6]
          }
        });
        
        // Create house base/foundation
        viewer.scene.createMesh({
          id: "house-foundation",
          primitive: "triangles",
          positions: [
            -5, 0, -4, 5, 0, -4, 5, 0, 4, -5, 0, 4,
            -5, 0.3, -4, 5, 0.3, -4, 5, 0.3, 4, -5, 0.3, 4
          ],
          indices: [
            0, 1, 2, 0, 2, 3, // Bottom face
            4, 5, 6, 4, 6, 7, // Top face
            0, 4, 5, 0, 5, 1, // Side face
            1, 5, 6, 1, 6, 2, // Side face
            2, 6, 7, 2, 7, 3, // Side face
            3, 7, 4, 3, 4, 0  // Side face
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.6, 0.6, 0.6]
          }
        });
        
        // Create house walls
        viewer.scene.createMesh({
          id: "house-walls",
          primitive: "triangles",
          positions: [
            -4.5, 0.3, -3.5, 4.5, 0.3, -3.5, 4.5, 0.3, 3.5, -4.5, 0.3, 3.5,
            -4.5, 3.0, -3.5, 4.5, 3.0, -3.5, 4.5, 3.0, 3.5, -4.5, 3.0, 3.5
          ],
          indices: [
            4, 5, 6, 4, 6, 7, // Top face
            0, 4, 5, 0, 5, 1, // Side face (back)
            1, 5, 6, 1, 6, 2, // Side face (right)
            2, 6, 7, 2, 7, 3, // Side face (front)
            3, 7, 4, 3, 4, 0  // Side face (left)
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.9, 0.9, 0.9]
          }
        });
        
        // Create house roof
        viewer.scene.createMesh({
          id: "house-roof",
          primitive: "triangles",
          positions: [
            -4.5, 3.0, -3.5, 4.5, 3.0, -3.5, 4.5, 3.0, 3.5, -4.5, 3.0, 3.5,
            0, 5.5, 0 // Roof peak
          ],
          indices: [
            0, 1, 4, // Roof panel (back)
            1, 2, 4, // Roof panel (right)
            2, 3, 4, // Roof panel (front)
            3, 0, 4  // Roof panel (left)
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.8, 0.2, 0.2]
          }
        });
        
        // Create door
        viewer.scene.createMesh({
          id: "house-door",
          primitive: "triangles",
          positions: [
            -1, 0.3, 3.51, 1, 0.3, 3.51, 1, 2.5, 3.51, -1, 2.5, 3.51
          ],
          indices: [
            0, 1, 2, 0, 2, 3 // Door face
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.6, 0.4, 0.2]
          }
        });
        
        // Create windows
        viewer.scene.createMesh({
          id: "window-front",
          primitive: "triangles",
          positions: [
            -3.5, 1.2, 3.51, -2.0, 1.2, 3.51, -2.0, 2.2, 3.51, -3.5, 2.2, 3.51
          ],
          indices: [
            0, 1, 2, 0, 2, 3 // Window face
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.3, 0.6, 0.9],
            metallic: 0.1,
            roughness: 0.2
          }
        });
        
        viewer.scene.createMesh({
          id: "window-front2",
          primitive: "triangles",
          positions: [
            2.0, 1.2, 3.51, 3.5, 1.2, 3.51, 3.5, 2.2, 3.51, 2.0, 2.2, 3.51
          ],
          indices: [
            0, 1, 2, 0, 2, 3 // Window face
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.3, 0.6, 0.9],
            metallic: 0.1,
            roughness: 0.2
          }
        });
        
        viewer.scene.createMesh({
          id: "window-side",
          primitive: "triangles",
          positions: [
            4.51, 1.2, -1.5, 4.51, 1.2, 0, 4.51, 2.2, 0, 4.51, 2.2, -1.5
          ],
          indices: [
            0, 1, 2, 0, 2, 3 // Window face
          ],
          material: {
            type: "MetallicMaterial",
            baseColor: [0.3, 0.6, 0.9],
            metallic: 0.1,
            roughness: 0.2
          }
        });
        
        // Calculate a bounding box for our model
        const aabb = {
          min: [-5, 0, -4],
          max: [5, 5.5, 4]
        };
        
        viewer.cameraFlight.flyTo({
          aabb: aabb,
          duration: 0.5
        });
        
        // Update loading state
        setIsLoading(false);
        
        // Notify parent component that loading is complete
        if (onLoadComplete) {
          onLoadComplete();
        }
      } catch (err) {
        console.error("Error loading model in xeokit viewer:", err);
        setErrorMessage("Kunde inte ladda IFC-modellen. Vänligen kontrollera filformatet och försök igen.");
        setIsLoading(false);
      }
    };
    
    loadModel();
  }, [fileName, onLoadComplete]);
  
  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Main canvas for the 3D viewer */}
      <canvas id="xeokit-canvas" className="w-full h-full"></canvas>
      
      {/* Canvas for the navigation cube */}
      <canvas id="navCubeCanvas" className="absolute bottom-4 right-4 w-[100px] h-[100px]"></canvas>
      
      {/* Canvas for section planes overview */}
      <canvas id="mySectionPlanesOverviewCanvas" className="hidden"></canvas>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/20">
          <div className="bg-background p-4 rounded-md shadow-lg">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-center">Laddar IFC-modell...</p>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-destructive text-white p-2 rounded-md shadow-lg">
          {errorMessage}
        </div>
      )}
      
      {/* Toolbar */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-md shadow-md p-2 flex gap-2">
        <button 
          className="hover:bg-primary/20 p-2 rounded" 
          onClick={() => viewerRef.current?.cameraFlight.flyTo({ projection: "ortho" })}
          title="Växla till ortografisk vy"
        >
          Orto
        </button>
        <button 
          className="hover:bg-primary/20 p-2 rounded" 
          onClick={() => viewerRef.current?.cameraFlight.flyTo({ projection: "perspective" })}
          title="Växla till perspektivisk vy"
        >
          Perspektiv
        </button>
        <button 
          className="hover:bg-primary/20 p-2 rounded" 
          onClick={() => {
            if (viewerRef.current) {
              viewerRef.current.scene.setObjectsVisible(viewerRef.current.scene.objectIds, true);
              viewerRef.current.scene.setObjectsXRayed(viewerRef.current.scene.objectIds, false);
              viewerRef.current.scene.setObjectsSelected(viewerRef.current.scene.objectIds, false);
            }
          }}
          title="Återställ vy"
        >
          Återställ
        </button>
      </div>
    </div>
  );
}