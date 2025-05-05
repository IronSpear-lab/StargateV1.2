import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * A very simple 3D viewer component with a rotating cube
 * This is a standalone component that can be used to debug ThreeJS issues
 */
export default function SimpleViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("Initializing simple viewer");
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    
    // Clear container and add canvas
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    
    // Add light
    const light = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(light);
    
    // Create a cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true
    });
    
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // Animation
    let animationId = 0;
    
    const animate = () => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      
      renderer.render(scene, camera);
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      console.log("Disposing simple viewer");
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    />
  );
}