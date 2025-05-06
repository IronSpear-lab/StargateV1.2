import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three-stdlib';

interface SimpleIFCViewerProps {
  fileName?: string;
  onLoadComplete?: () => void;
}

export function SimpleIFCViewer({ fileName, onLoadComplete }: SimpleIFCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Scene objects
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    buildingGroup: THREE.Group;
    animationId: number;
    controls: {
      isDragging: boolean;
      previousMousePosition: { x: number; y: number };
      cameraTarget: THREE.Vector3;
    };
  }>();
  
  // Initialize 3D scene
  useEffect(() => {
    // Only initialize once
    if (isInitialized || !containerRef.current) return;
    
    console.log(`Initializing SimpleIFCViewer for file: ${fileName || 'No file selected'}`);
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); // Light gray background
    
    // Size for rendering
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    
    // Clear container and add renderer
    if (containerRef.current.childNodes.length > 0) {
      containerRef.current.textContent = '';
    }
    containerRef.current.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Add a helper grid
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);
    
    // Create a group to hold the building
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);
    
    // Create controls state
    const controls = {
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
      cameraTarget: new THREE.Vector3(0, 0, 0)
    };
    
    // Store objects in ref
    sceneRef.current = {
      scene,
      camera,
      renderer,
      buildingGroup,
      animationId: 0,
      controls
    };
    
    // Manual camera rotation with mouse
    const handleMouseDown = (event: MouseEvent) => {
      if (!sceneRef.current) return;
      
      sceneRef.current.controls.isDragging = true;
      sceneRef.current.controls.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!sceneRef.current || !sceneRef.current.controls.isDragging) return;
      
      const { camera, controls, renderer } = sceneRef.current;
      
      const deltaMove = {
        x: event.clientX - controls.previousMousePosition.x,
        y: event.clientY - controls.previousMousePosition.y
      };
      
      // Adjust rotation speed
      const rotationSpeed = 0.005;
      
      // Calculate rotations
      const theta = -deltaMove.x * rotationSpeed;
      const phi = -deltaMove.y * rotationSpeed;
      
      // Get camera position relative to target
      const position = new THREE.Vector3().subVectors(camera.position, controls.cameraTarget);
      
      // Convert to spherical coordinates
      let sphericalCoords = new THREE.Spherical().setFromVector3(position);
      
      // Apply rotation with limits for phi
      sphericalCoords.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalCoords.phi + phi));
      sphericalCoords.theta += theta;
      
      // Convert back to Cartesian coordinates
      position.setFromSpherical(sphericalCoords);
      
      // Update camera position
      camera.position.copy(position.add(controls.cameraTarget));
      camera.lookAt(controls.cameraTarget);
      
      // Update previous position
      controls.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
      
      // Render to update view
      renderer.render(scene, camera);
    };
    
    const handleMouseUp = () => {
      if (!sceneRef.current) return;
      sceneRef.current.controls.isDragging = false;
    };
    
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      
      if (!sceneRef.current) return;
      
      const { camera, controls, renderer, scene } = sceneRef.current;
      
      // Get direction vector from camera to target
      const direction = new THREE.Vector3().subVectors(camera.position, controls.cameraTarget).normalize();
      
      // Zoom speed
      const zoomSpeed = 0.1;
      const distance = event.deltaY * zoomSpeed;
      
      // Move camera along direction vector
      camera.position.addScaledVector(direction, distance);
      
      // Render to update view
      renderer.render(scene, camera);
    };
    
    // Add event listeners
    containerRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
    
    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Start animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      
      const { renderer, scene, camera } = sceneRef.current;
      
      // Render scene
      renderer.render(scene, camera);
      
      // Request next frame
      sceneRef.current.animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Mark as initialized
    setIsInitialized(true);
    
    // Create the building model
    createBuildingModel();
    
    // Cleanup function
    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.renderer.dispose();
      }
      
      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      containerRef.current?.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
    };
  }, [isInitialized, fileName]);
  
  // Create a realistic building model
  const createBuildingModel = () => {
    if (!sceneRef.current) return;
    
    const { buildingGroup, scene } = sceneRef.current;
    
    // Clear any existing building
    while (buildingGroup.children.length) {
      buildingGroup.remove(buildingGroup.children[0]);
    }
    
    // Create ground/terrain
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x9b7653, 
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    buildingGroup.add(ground);
    
    // Add grass on top of the ground
    const grassGeometry = new THREE.PlaneGeometry(30, 30);
    const grassMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x567d46,
      roughness: 0.9,
      metalness: 0.1
    });
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.19; // Slightly above ground
    buildingGroup.add(grass);
    
    // Create foundation
    const foundationGeometry = new THREE.BoxGeometry(12, 0.5, 8);
    const concreteMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xc2c2c2,
      roughness: 0.7,
      metalness: 0.1
    });
    const foundation = new THREE.Mesh(foundationGeometry, concreteMaterial);
    foundation.position.y = 0.25;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    buildingGroup.add(foundation);
    
    // Create main structure - first floor
    const firstFloorBaseGeometry = new THREE.BoxGeometry(10, 3, 7);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xf5f5f5,
      roughness: 0.7,
      metalness: 0.1
    });
    
    // Walls - using multiple boxes for more detail
    // Main house box 
    const mainHouse = new THREE.Mesh(firstFloorBaseGeometry, wallMaterial);
    mainHouse.position.y = 2;
    mainHouse.castShadow = true;
    mainHouse.receiveShadow = true;
    buildingGroup.add(mainHouse);
    
    // Second floor
    const secondFloorGeometry = new THREE.BoxGeometry(10, 3, 7);
    const secondFloor = new THREE.Mesh(secondFloorGeometry, wallMaterial);
    secondFloor.position.y = 5;
    secondFloor.castShadow = true;
    secondFloor.receiveShadow = true;
    buildingGroup.add(secondFloor);
    
    // Windows
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xadd8e6,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.7
    });
    
    // First floor windows
    const createWindow = (x: number, y: number, z: number, rotationY = 0) => {
      const windowGeometry = new THREE.BoxGeometry(0.1, 1.2, 1.5);
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(x, y, z);
      window.rotation.y = rotationY;
      window.castShadow = false;
      window.receiveShadow = false;
      buildingGroup.add(window);
      
      // Add frame
      const frameGeometry = new THREE.BoxGeometry(0.15, 1.3, 1.6);
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const frame = new THREE.Mesh(frameGeometry, frameMaterial);
      frame.position.set(x, y, z);
      frame.rotation.y = rotationY;
      buildingGroup.add(frame);
      
      return window;
    };
    
    // Windows for first floor
    createWindow(5.05, 2, 0, 0);
    createWindow(5.05, 2, 2.5, 0);
    createWindow(5.05, 2, -2.5, 0);
    createWindow(-5.05, 2, 0, 0);
    createWindow(-5.05, 2, 2.5, 0);
    createWindow(-5.05, 2, -2.5, 0);
    createWindow(0, 2, 3.55, Math.PI/2);
    createWindow(3, 2, 3.55, Math.PI/2);
    createWindow(-3, 2, 3.55, Math.PI/2);
    
    // Windows for second floor
    createWindow(5.05, 5, 0, 0);
    createWindow(5.05, 5, 2.5, 0);
    createWindow(5.05, 5, -2.5, 0);
    createWindow(-5.05, 5, 0, 0);
    createWindow(-5.05, 5, 2.5, 0);
    createWindow(-5.05, 5, -2.5, 0);
    createWindow(0, 5, 3.55, Math.PI/2);
    createWindow(3, 5, 3.55, Math.PI/2);
    createWindow(-3, 5, 3.55, Math.PI/2);

    // Door
    const doorGeometry = new THREE.BoxGeometry(0.1, 2.2, 1.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 1.5, -3.55);
    door.rotation.y = Math.PI/2;
    door.castShadow = true;
    door.receiveShadow = true;
    buildingGroup.add(door);
    
    // Add door frame
    const doorFrameGeometry = new THREE.BoxGeometry(0.2, 2.3, 1.4);
    const doorFrame = new THREE.Mesh(doorFrameGeometry, doorMaterial);
    doorFrame.position.set(0, 1.55, -3.53);
    doorFrame.rotation.y = Math.PI/2;
    buildingGroup.add(doorFrame);
    
    // Doorknob
    const doorknobGeometry = new THREE.SphereGeometry(0.06);
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      roughness: 0.3,
      metalness: 0.8
    });
    const doorknob = new THREE.Mesh(doorknobGeometry, metalMaterial);
    doorknob.position.set(0.5, 1.5, -3.6);
    buildingGroup.add(doorknob);
    
    // Roof
    const roofGeometry = new THREE.ConeGeometry(7.5, 3, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 8, 0);
    roof.rotation.y = Math.PI/4;
    roof.castShadow = true;
    roof.receiveShadow = true;
    buildingGroup.add(roof);
    
    // Chimney
    const chimneyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const chimney = new THREE.Mesh(chimneyGeometry, concreteMaterial);
    chimney.position.set(3, 8, 2);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    buildingGroup.add(chimney);
    
    // Add a small path to the door
    const pathGeometry = new THREE.PlaneGeometry(1.5, 4);
    const pathMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xa9a9a9,
      roughness: 0.9,
      metalness: 0.1
    });
    const path = new THREE.Mesh(pathGeometry, pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, -0.18, -5);
    buildingGroup.add(path);
    
    // Position building group
    buildingGroup.position.y = 0.2;
    
    // Notify when complete
    if (onLoadComplete) {
      onLoadComplete();
    }
  };
  
  // Handle zoom in
  const zoomIn = () => {
    if (!sceneRef.current) return;
    
    const { camera, renderer, scene } = sceneRef.current;
    
    // Move camera closer
    const direction = new THREE.Vector3().subVectors(camera.position, sceneRef.current.controls.cameraTarget).normalize();
    camera.position.addScaledVector(direction, -2);
    
    // Update view
    renderer.render(scene, camera);
  };
  
  // Handle zoom out
  const zoomOut = () => {
    if (!sceneRef.current) return;
    
    const { camera, renderer, scene } = sceneRef.current;
    
    // Move camera further away
    const direction = new THREE.Vector3().subVectors(camera.position, sceneRef.current.controls.cameraTarget).normalize();
    camera.position.addScaledVector(direction, 2);
    
    // Update view
    renderer.render(scene, camera);
  };
  
  // Reset view
  const resetView = () => {
    if (!sceneRef.current) return;
    
    const { camera, renderer, scene, controls } = sceneRef.current;
    
    // Reset camera position and target
    camera.position.set(10, 10, 10);
    controls.cameraTarget.set(0, 0, 0);
    camera.lookAt(controls.cameraTarget);
    
    // Update view
    renderer.render(scene, camera);
  };
  
  return (
    <div ref={containerRef} className="w-full h-full relative" />
  );
}