import { useState, useEffect, useRef } from 'react';
import { VRM } from '@pixiv/three-vrm';
import { animateVRMFace } from '../vrmRigging';
import { FACEMESH_CONFIG } from '../utils/constants';

export function useFaceMesh(
  enabled: boolean,
  videoRef: React.RefObject<HTMLVideoElement>,
  vrm: VRM | null,
  clock: React.MutableRefObject<THREE.Clock>
) {
  const [faceMeshScriptLoaded, setFaceMeshScriptLoaded] = useState(false);
  const [faceMeshReady, setFaceMeshReady] = useState(false);
  const faceMeshRef = useRef<any>(null);
  const initializingRef = useRef(false);

  // Load script
  useEffect(() => {
    if (!enabled || faceMeshScriptLoaded) return;

    let mounted = true;

    const loadScript = async () => {
      if ((window as any).FaceMesh) {
        if (mounted) setFaceMeshScriptLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src*="face_mesh.js"]');
      if (existingScript) return;

      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = FACEMESH_CONFIG.SCRIPT_URL;
          script.crossOrigin = 'anonymous';
          script.async = true;

          script.onload = () => {
            if (mounted) setFaceMeshScriptLoaded(true);
            resolve();
          };

          script.onerror = () => {
            console.error('Failed to load FaceMesh script');
            reject(new Error('Script load failed'));
          };

          document.head.appendChild(script);
        });
      } catch (error) {
        console.error('Error loading FaceMesh:', error);
      }
    };

    loadScript();

    return () => {
      mounted = false;
    };
  }, [enabled, faceMeshScriptLoaded]);

  // Initialize FaceMesh
  useEffect(() => {
    if (!enabled) {
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close?.();
        } catch (e) {
          console.warn('Error closing FaceMesh:', e);
        }
        faceMeshRef.current = null;
        initializingRef.current = false;
        setFaceMeshReady(false);
      }
      return;
    }

    if (faceMeshRef.current || !faceMeshScriptLoaded || initializingRef.current) {
      return;
    }

    let mounted = true;

    const initFaceMesh = async () => {
      initializingRef.current = true;

      await new Promise((resolve) => setTimeout(resolve, 300));

      const FaceMesh = (window as any).FaceMesh;
      if (!FaceMesh) {
        initializingRef.current = false;
        return;
      }

      try {
        const faceMesh = new FaceMesh({
          locateFile: (file: string) => `${FACEMESH_CONFIG.CDN_URL}/${file}`,
        });

        if (!mounted) {
          faceMesh.close?.();
          initializingRef.current = false;
          return;
        }

        faceMesh.setOptions(FACEMESH_CONFIG.OPTIONS);

        faceMesh.onResults((results: any) => {
          if (!vrm || !videoRef.current || !enabled) return;

          const deltaTime = clock.current.getDelta();
          animateVRMFace(vrm, results, videoRef.current, deltaTime);
        });

        await faceMesh.initialize();

        if (!mounted) {
          faceMesh.close?.();
          initializingRef.current = false;
          return;
        }

        faceMeshRef.current = faceMesh;
        initializingRef.current = false;
        setFaceMeshReady(true);
      } catch (error) {
        console.error('Error initializing FaceMesh:', error);
        initializingRef.current = false;
      }
    };

    initFaceMesh();

    return () => {
      mounted = false;
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close?.();
        } catch (e) {
          console.warn('Error closing FaceMesh:', e);
        }
        faceMeshRef.current = null;
      }
      initializingRef.current = false;
      setFaceMeshReady(false);
    };
  }, [enabled, faceMeshScriptLoaded, vrm, videoRef, clock]);

  return {
    faceMesh: faceMeshRef.current,
    faceMeshReady,
  };
}