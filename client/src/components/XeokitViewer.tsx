import { useEffect, useRef, useState } from "react";
import {
  Viewer,
  NavCubePlugin,
  BCFViewpointsPlugin,
  DistanceMeasurementsPlugin,
  buildBoxGeometry,
  buildPlaneGeometry,
  buildCylinderGeometry,
  ReadableGeometry
} from "@xeokit/xeokit-sdk";

interface XeokitViewerProps {
  fileName?: string;
  onLoadComplete?: () => void;
}

export function XeokitViewer({ fileName, onLoadComplete }: XeokitViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navCubeCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Initialize xeokit viewer
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Initialize the viewer with canvas element
      const viewer = new Viewer({
        canvasElement: canvasRef.current,
        transparent: true
      });
      
      // Add a NavCube to help with orientation
      if (navCubeCanvasRef.current) {
        new NavCubePlugin(viewer, {
          canvasElement: navCubeCanvasRef.current,
          visible: true
        });
      }
      
      // Add measurement tools
      new DistanceMeasurementsPlugin(viewer);
      
      // Add BCF viewpoints capability
      new BCFViewpointsPlugin(viewer);
      
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
  }, []);
  
  // Create building model when viewer is ready
  useEffect(() => {
    if (!viewerRef.current) return;
    
    const createHouseModel = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        
        const viewer = viewerRef.current;
        
        // Create the ground plane
        viewer.scene.createEntity({
          id: "ground",
          geometry: buildPlaneGeometry({
            xSize: 40, 
            zSize: 40
          }),
          position: [0, 0, 0],
          scale: [1, 1, 1],
          rotation: [0, 0, 0],
          material: 'Default',
          metallic: 0.3,
          roughness: 0.8,
          diffuse: [0.6, 0.85, 0.5]
        });
        
        // Create house foundation - a flattened box
        viewer.scene.createEntity({
          id: "foundation",
          geometry: buildBoxGeometry({
            xSize: 10,
            ySize: 0.3,
            zSize: 8
          }),
          position: [0, 0.15, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.6, 0.6, 0.6] // Gray
        });
        
        // Create house walls - a box
        viewer.scene.createEntity({
          id: "walls",
          geometry: buildBoxGeometry({
            xSize: 9,
            ySize: 2.7, 
            zSize: 7
          }),
          position: [0, 1.65, 0], // Center y = 0.3 (foundation) + 3/2 = 1.65
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.9, 0.9, 0.9] // White
        });
        
        // Create house roof - use boxes for simplicity
        viewer.scene.createEntity({
          id: "roof-center",
          geometry: buildBoxGeometry({
            xSize: 9.5,
            ySize: 0.2,
            zSize: 7.5
          }),
          position: [0, 3.1, 0], // top of walls + half roof height
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.8, 0.2, 0.2] // Red
        });
        
        // Roof peak 
        viewer.scene.createEntity({
          id: "roof-peak",
          geometry: buildBoxGeometry({
            xSize: 9.5,
            ySize: 1,
            zSize: 0.5
          }),
          position: [0, 3.7, 0], // top of flat roof + half peak height
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.8, 0.2, 0.2] // Red
        });
        
        // Door
        viewer.scene.createEntity({
          id: "door",
          geometry: buildBoxGeometry({
            xSize: 1.5,
            ySize: 2,
            zSize: 0.1
          }),
          position: [0, 1.3, 3.55], // Centered on front of house
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.6, 0.4, 0.2] // Brown
        });
        
        // Windows
        viewer.scene.createEntity({
          id: "window-left",
          geometry: buildBoxGeometry({
            xSize: 1.5,
            ySize: 1,
            zSize: 0.1
          }),
          position: [-3, 2, 3.55], // Left side, front of house
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.3, 0.6, 0.9] // Blue
        });
        
        viewer.scene.createEntity({
          id: "window-right",
          geometry: buildBoxGeometry({
            xSize: 1.5,
            ySize: 1,
            zSize: 0.1
          }),
          position: [3, 2, 3.55], // Right side, front of house
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.3, 0.6, 0.9] // Blue
        });
        
        viewer.scene.createEntity({
          id: "window-side",
          geometry: buildBoxGeometry({
            xSize: 0.1,
            ySize: 1,
            zSize: 1.5
          }),
          position: [4.55, 2, 0], // Right side of house
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          material: 'Default',
          diffuse: [0.3, 0.6, 0.9] // Blue
        });
        
        // Position camera to view the model
        viewer.cameraFlight.flyTo({
          eye: [15, 15, 15],
          look: [0, 1.5, 0],
          up: [0, 1, 0],
          duration: 1
        });
        
        setIsLoading(false);
        
        // Notify parent component that loading is complete
        if (onLoadComplete) {
          onLoadComplete();
        }
      } catch (err) {
        console.error("Error creating house model:", err);
        setErrorMessage("Ett fel uppstod när husmodellen skulle skapas.");
        setIsLoading(false);
      }
    };
    
    createHouseModel();
  }, [onLoadComplete]);
  
  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Main canvas for the 3D viewer */}
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
      
      {/* Canvas for the navigation cube */}
      <canvas ref={navCubeCanvasRef} className="absolute bottom-4 right-4 w-[100px] h-[100px]"></canvas>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/20">
          <div className="bg-background p-4 rounded-md shadow-lg">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-center">Laddar husmodell...</p>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-destructive text-white p-2 rounded-md shadow-lg">
          {errorMessage}
        </div>
      )}
      
      {/* Warning message for IFC file */}
      {fileName?.toLowerCase().endsWith('.ifc') && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white p-2 rounded-md shadow-lg">
          Kunde inte ladda IFC-modellen. Visar exempelmodell istället.
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
              
              // Reset camera to default position
              viewerRef.current.cameraFlight.flyTo({
                eye: [15, 15, 15],
                look: [0, 1.5, 0],
                up: [0, 1, 0],
                duration: 1
              });
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