import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createScene, createCamera, createRenderer, setupLighting } from '../utils/threeSetup';

export function useThreeScene(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !canvasRef.current) {
      return;
    }

    initializedRef.current = true;

    sceneRef.current = createScene();
    cameraRef.current = createCamera();
    rendererRef.current = createRenderer(canvasRef.current);
    setupLighting(sceneRef.current);

    return () => {
      initializedRef.current = false;
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      
      cameraRef.current = null;
    };
  }, [canvasRef]);

  return {
    scene: sceneRef.current,
    renderer: rendererRef.current,
    camera: cameraRef.current,
  };
}