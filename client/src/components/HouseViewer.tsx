import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface HouseViewerProps {
  fileName?: string;
  onLoadComplete?: () => void;
}

export function HouseViewer({ fileName, onLoadComplete }: HouseViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'perspective' | 'ortho'>('perspective');
  
  // Create and manage house model
  useEffect(() => {
    if (!containerRef.current) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    
    // Create cameras
    const perspectiveCamera = new THREE.PerspectiveCamera(
      60, 
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    perspectiveCamera.position.set(15, 15, 15);
    perspectiveCamera.lookAt(0, 0, 0);
    
    const orthoCamera = new THREE.OrthographicCamera(
      -10, 10, 10, -10, 0.1, 1000
    );
    orthoCamera.position.set(15, 15, 15);
    orthoCamera.lookAt(0, 0, 0);
    
    let activeCamera = perspectiveCamera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    
    // Clear container and add canvas
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x7ec850,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    scene.add(ground);
    
    // Add foundation
    const foundationGeometry = new THREE.BoxGeometry(10, 0.3, 8);
    const foundationMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x999999,
      roughness: 0.7
    });
    const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
    foundation.position.y = 0.15; // Half height above ground
    scene.add(foundation);
    
    // Add walls
    const wallsGeometry = new THREE.BoxGeometry(9, 2.7, 7);
    const wallsMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xf5f5f5,
      roughness: 0.9
    });
    const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
    walls.position.y = 1.65; // Foundation height (0.3) + half wall height (1.35)
    scene.add(walls);
    
    // Add roof (flat part)
    const roofBaseGeometry = new THREE.BoxGeometry(9.5, 0.2, 7.5);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xc62828,
      roughness: 0.8
    });
    const roofBase = new THREE.Mesh(roofBaseGeometry, roofMaterial);
    roofBase.position.y = 3.15; // Top of walls (0.3+2.7) + half roof height (0.1)
    scene.add(roofBase);
    
    // Add roof peak
    const roofPeakGeometry = new THREE.BoxGeometry(9.5, 1, 0.5);
    const roofPeak = new THREE.Mesh(roofPeakGeometry, roofMaterial);
    roofPeak.position.y = 3.75; // Top of flat roof + half peak height
    scene.add(roofPeak);
    
    // Add door
    const doorGeometry = new THREE.BoxGeometry(1.5, 2, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8d6e63,
      roughness: 0.6
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.3, 3.55); // Center on front of house
    scene.add(door);
    
    // Add windows
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x64b5f6,
      roughness: 0.3,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7
    });
    
    // Front windows
    const windowGeometry = new THREE.BoxGeometry(1.5, 1, 0.1);
    
    const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    leftWindow.position.set(-3, 1.8, 3.55);
    scene.add(leftWindow);
    
    const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    rightWindow.position.set(3, 1.8, 3.55);
    scene.add(rightWindow);
    
    // Side window
    const sideWindowGeometry = new THREE.BoxGeometry(0.1, 1, 1.5);
    const sideWindow = new THREE.Mesh(sideWindowGeometry, windowMaterial);
    sideWindow.position.set(4.55, 1.8, 0);
    scene.add(sideWindow);
    
    // Helper grid
    const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x888888);
    scene.add(gridHelper);
    
    // Simple animation
    let animationId = 0;
    
    const animate = () => {
      renderer.render(scene, activeCamera);
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Add resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      perspectiveCamera.aspect = width / height;
      perspectiveCamera.updateProjectionMatrix();
      
      orthoCamera.left = -width / 80;
      orthoCamera.right = width / 80;
      orthoCamera.top = height / 80;
      orthoCamera.bottom = -height / 80;
      orthoCamera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Create methods for camera control
    const setOrthographicView = () => {
      activeCamera = orthoCamera;
      setViewMode('ortho');
    };
    
    const setPerspectiveView = () => {
      activeCamera = perspectiveCamera;
      setViewMode('perspective');
    };
    
    const resetView = () => {
      perspectiveCamera.position.set(15, 15, 15);
      perspectiveCamera.lookAt(0, 1.5, 0);
      
      orthoCamera.position.set(15, 15, 15);
      orthoCamera.lookAt(0, 1.5, 0);
    };
    
    // Add view change methods to window to access from UI
    (window as any).__houseViewerControls = {
      setOrthographicView,
      setPerspectiveView,
      resetView
    };
    
    setIsLoading(false);
    if (onLoadComplete) onLoadComplete();
    
    // Cleanup
    return () => {
      // Remove methods from window
      delete (window as any).__houseViewerControls;
      
      // Cancel animation
      cancelAnimationFrame(animationId);
      
      // Remove event listeners
      window.removeEventListener('resize', handleResize);
      
      // Dispose of resources
      renderer.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      foundationGeometry.dispose();
      foundationMaterial.dispose();
      wallsGeometry.dispose();
      wallsMaterial.dispose();
      roofBaseGeometry.dispose();
      roofMaterial.dispose();
      roofPeakGeometry.dispose();
      doorGeometry.dispose();
      doorMaterial.dispose();
      windowGeometry.dispose();
      windowMaterial.dispose();
      sideWindowGeometry.dispose();
    };
  }, [onLoadComplete]);
  
  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      
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
          Visar exempelmodell istället för IFC-filen.
        </div>
      )}
      
      {/* Toolbar */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-md shadow-md p-2 flex gap-2">
        <button 
          className={`p-2 rounded ${viewMode === 'ortho' ? 'bg-primary/20' : 'hover:bg-primary/10'}`} 
          onClick={() => (window as any).__houseViewerControls?.setOrthographicView()}
          title="Växla till ortografisk vy"
        >
          Orto
        </button>
        <button 
          className={`p-2 rounded ${viewMode === 'perspective' ? 'bg-primary/20' : 'hover:bg-primary/10'}`}
          onClick={() => (window as any).__houseViewerControls?.setPerspectiveView()}
          title="Växla till perspektivisk vy"
        >
          Perspektiv
        </button>
        <button 
          className="hover:bg-primary/10 p-2 rounded" 
          onClick={() => (window as any).__houseViewerControls?.resetView()}
          title="Återställ vy"
        >
          Återställ
        </button>
      </div>
    </div>
  );
}