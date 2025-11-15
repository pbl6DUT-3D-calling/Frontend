'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { animateVRMFace } from './vrmRigging';

interface VRMVideoPublisherProps {
  enabled: boolean;
  webcamStream: MediaStream | null;
}

const VRMVideoPublisherComponent = ({ enabled, webcamStream }: VRMVideoPublisherProps) => {
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const output2DCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraThreeRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const clockRef = useRef(new THREE.Clock());
  
  const faceMeshRef = useRef<any>(null);
  const faceMeshInitializingRef = useRef(false);
  
  const animationFrameRef = useRef<number | undefined>(undefined);
  const inferenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  
  const sceneInitializedRef = useRef(false);
  const vrmLoadingRef = useRef(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [faceMeshScriptLoaded, setFaceMeshScriptLoaded] = useState(false);
  const [faceMeshReady, setFaceMeshReady] = useState(false);

  // Force clear khi toggle mode
  useEffect(() => {
    if (output2DCanvasRef.current) {
      const ctx = output2DCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, output2DCanvasRef.current.width, output2DCanvasRef.current.height);
      }
    }
  }, [enabled]);

  // 1. Setup Three.js Scene
  useEffect(() => {
    if (sceneInitializedRef.current || sceneRef.current || !webglCanvasRef.current) {
      return;
    }

    sceneInitializedRef.current = true;

    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0x212121);
    
    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;
    const aspect = CANVAS_WIDTH / CANVAS_HEIGHT;

    cameraThreeRef.current = new THREE.PerspectiveCamera(30, aspect, 0.1, 20);
    cameraThreeRef.current.position.set(0, 1.4, 2.5);
    cameraThreeRef.current.lookAt(0, 1.3, 0);

    rendererRef.current = new THREE.WebGLRenderer({
      canvas: webglCanvasRef.current,
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    rendererRef.current.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current.shadowMap.enabled = true;

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight1.position.set(10, 10, 5);
    sceneRef.current.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-10, 10, 5);
    sceneRef.current.add(directionalLight2);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);

    const loadVRM = async () => {
      if (vrmLoadingRef.current || vrmRef.current) {
        return;
      }

      vrmLoadingRef.current = true;

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      
      loader.load(
        '/model3d/1.vrm',
        (gltf) => {
          if (!sceneRef.current) {
            vrmLoadingRef.current = false;
            return;
          }

          if (vrmRef.current) {
            sceneRef.current.remove(vrmRef.current.scene);
            vrmRef.current = null;
          }

          const vrm = gltf.userData.vrm as VRM;
          
          VRMUtils.removeUnnecessaryVertices(gltf.scene);
          VRMUtils.combineSkeletons(gltf.scene);
          
          vrm.scene.traverse((obj) => {
            obj.frustumCulled = false;
          });
          
          vrmRef.current = vrm;
          sceneRef.current.add(vrm.scene);

          vrm.scene.rotation.y = Math.PI;
          
          const box = new THREE.Box3().setFromObject(vrm.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          
          vrm.scene.position.set(0, 0, 0);
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = cameraThreeRef.current!.fov * (Math.PI / 180);
          let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
          
          cameraZ *= 1.3;
          
          const headHeight = center.y + size.y * 0.35;
          
          if (cameraThreeRef.current) {
            const offsetX = 0.2;
            const offsetY = 0;
            cameraThreeRef.current.position.set(offsetX, headHeight + offsetY, cameraZ * 0.6);
            cameraThreeRef.current.lookAt(offsetX, headHeight - 0.1 + offsetY, 0);
          }
          
          vrmLoadingRef.current = false;
          setIsLoading(false);
        },
        undefined,
        (error) => {
          console.error('Error loading VRM:', error);
          vrmLoadingRef.current = false;
          setIsLoading(false);
        }
      );
    };

    loadVRM();

    return () => {
      sceneInitializedRef.current = false;
      vrmLoadingRef.current = false;
      
      if (vrmRef.current && sceneRef.current) {
        sceneRef.current.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      
      if (sceneRef.current) {
        sceneRef.current.clear();
        sceneRef.current = null;
      }
      
      cameraThreeRef.current = null;
    };
  }, []);

  // 2. Setup Camera
  useEffect(() => {
    let mounted = true;

    if (webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
      
      videoRef.current.onloadedmetadata = async () => {
        if (!mounted) return;
        
        try {
          await videoRef.current!.play();
          setIsCameraReady(true);
        } catch (error) {
          console.error('Error playing video:', error);
        }
      };

      if (videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA) {
        videoRef.current.play().catch(e => console.error('Error auto-playing:', e));
        setIsCameraReady(true);
      }
    } else {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraReady(false);
    }

    return () => {
      mounted = false;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [webcamStream]);

  // 3. Load FaceMesh Script
  useEffect(() => {
    if (!enabled || faceMeshScriptLoaded) return;

    let mounted = true;

    const loadFaceMeshScript = async () => {
      if ((window as any).FaceMesh) {
        if (mounted) {
          setFaceMeshScriptLoaded(true);
        }
        return;
      }

      const existingScript = document.querySelector('script[src*="face_mesh.js"]');
      if (existingScript) {
        return;
      }
      
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
          script.crossOrigin = 'anonymous';
          script.async = true;
          
          script.onload = () => {
            if (mounted) {
              setFaceMeshScriptLoaded(true);
            }
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

    loadFaceMeshScript();

    return () => {
      mounted = false;
    };
  }, [enabled, faceMeshScriptLoaded]);

  // 4. Initialize FaceMesh
  useEffect(() => {
    if (!enabled) {
      if (faceMeshRef.current) {
        try {
          faceMeshRef.current.close?.();
        } catch (e) {
          console.warn('Error closing FaceMesh:', e);
        }
        faceMeshRef.current = null;
        faceMeshInitializingRef.current = false;
        setFaceMeshReady(false);
      }
      return;
    }

    if (faceMeshRef.current || !faceMeshScriptLoaded || faceMeshInitializingRef.current) {
      return;
    }

    let mounted = true;

    const initFaceMesh = async () => {
      faceMeshInitializingRef.current = true;
      
      await new Promise(resolve => setTimeout(resolve, 300));

      const FaceMesh = (window as any).FaceMesh;
      if (!FaceMesh) {
        faceMeshInitializingRef.current = false;
        return;
      }

      try {
        const faceMesh = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        if (!mounted) {
          faceMesh.close?.();
          faceMeshInitializingRef.current = false;
          return;
        }

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
          if (!vrmRef.current || !videoRef.current || !enabled) return;
          
          const deltaTime = clockRef.current.getDelta();
          animateVRMFace(vrmRef.current, results, videoRef.current, deltaTime);
        });

        await faceMesh.initialize();
        
        if (!mounted) {
          faceMesh.close?.();
          faceMeshInitializingRef.current = false;
          return;
        }
        
        faceMeshRef.current = faceMesh;
        faceMeshInitializingRef.current = false;
        setFaceMeshReady(true);
      } catch (error) {
        console.error('Error initializing FaceMesh:', error);
        faceMeshInitializingRef.current = false;
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
      faceMeshInitializingRef.current = false;
      setFaceMeshReady(false);
    };
  }, [enabled, faceMeshScriptLoaded]);

  // 5. Canvas Render Loop
  useEffect(() => {
    if (!output2DCanvasRef.current || !videoRef.current) {
      return;
    }

    let isActive = true;

    const render = () => {
      if (!isActive || !output2DCanvasRef.current || !videoRef.current) return;

      const ctx = output2DCanvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, output2DCanvasRef.current.width, output2DCanvasRef.current.height);

      // 3D MODE
      if (enabled) {
        if (isCameraReady && webcamStream && !isLoading && vrmRef.current && 
            rendererRef.current && sceneRef.current && cameraThreeRef.current && webglCanvasRef.current) {
          
          const deltaTime = clockRef.current.getDelta();
          vrmRef.current.update(deltaTime);
          rendererRef.current.render(sceneRef.current, cameraThreeRef.current);
          
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(webglCanvasRef.current, -output2DCanvasRef.current.width, 0);
          ctx.restore();
        } else {
          ctx.fillStyle = '#212121';
          ctx.fillRect(0, 0, output2DCanvasRef.current.width, output2DCanvasRef.current.height);
          
          if (isLoading) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading 3D Model...', output2DCanvasRef.current.width / 2, output2DCanvasRef.current.height / 2);
          }
        }
      } 
      // 2D MODE
      else {
        const canDrawVideo = isCameraReady && 
                             webcamStream && 
                             videoRef.current.readyState >= videoRef.current.HAVE_CURRENT_DATA && 
                             videoRef.current.videoWidth > 0 && 
                             videoRef.current.videoHeight > 0;

        if (canDrawVideo) {
          ctx.drawImage(
            videoRef.current, 
            0, 
            0, 
            output2DCanvasRef.current.width, 
            output2DCanvasRef.current.height
          );
        } else {
          ctx.fillStyle = '#212121';
          ctx.fillRect(0, 0, output2DCanvasRef.current.width, output2DCanvasRef.current.height);
          
          let message = 'Waiting for camera...';
          if (!webcamStream) {
            message = 'No camera stream';
          } else if (!isCameraReady) {
            message = 'Camera initializing...';
          }
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(message, output2DCanvasRef.current.width / 2, output2DCanvasRef.current.height / 2);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      
      if (output2DCanvasRef.current) {
        const ctx = output2DCanvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, output2DCanvasRef.current.width, output2DCanvasRef.current.height);
        }
      }
    };
  }, [enabled, isCameraReady, webcamStream, isLoading]);

  // 6. Face Tracking Loop
  useEffect(() => {
    if (!enabled || !isCameraReady || !faceMeshReady || !videoRef.current || !webcamStream) {
      if (inferenceTimeoutRef.current) {
        clearTimeout(inferenceTimeoutRef.current);
        inferenceTimeoutRef.current = undefined;
      }
      return;
    }

    let isActive = true;

    const runInference = async () => {
      if (!isActive || !faceMeshRef.current || !videoRef.current) return;

      try {
        if (videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
          await faceMeshRef.current.send({ image: videoRef.current });
        }
      } catch (error) {
        console.error('Face tracking error:', error);
      }

      if (isActive) {
        inferenceTimeoutRef.current = setTimeout(runInference, 1000 / 30);
      }
    };

    runInference();

    return () => {
      isActive = false;
      if (inferenceTimeoutRef.current) {
        clearTimeout(inferenceTimeoutRef.current);
        inferenceTimeoutRef.current = undefined;
      }
    };
  }, [enabled, isCameraReady, webcamStream, faceMeshReady]);

  return (
    <>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
        muted
        autoPlay
      />

      <canvas
        ref={webglCanvasRef}
        width={1280}
        height={720}
        style={{ display: 'none' }}
      />

      <canvas
        id="vrm-canvas"
        ref={output2DCanvasRef}
        width={1280}
        height={720}
        style={{ display: 'none' }}
      />

      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          bottom: '100px', 
          right: '10px',
          color: 'white',
          background: 'rgba(0,0,0,0.9)',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 9999,
          minWidth: '200px',
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
            Debug Info
          </div>
          <div>3D Enabled: <span style={{ color: enabled ? '#10b981' : '#ef4444' }}>{enabled ? '✓' : '✗'}</span></div>
          <div>Camera Ready: <span style={{ color: isCameraReady ? '#10b981' : '#ef4444' }}>{isCameraReady ? '✓' : '✗'}</span></div>
          <div>VRM Loaded: <span style={{ color: !isLoading && vrmRef.current ? '#10b981' : '#ef4444' }}>{!isLoading && vrmRef.current ? '✓' : '✗'}</span></div>
          <div>FaceMesh Ready: <span style={{ color: faceMeshReady ? '#10b981' : '#ef4444' }}>{faceMeshReady ? '✓' : '✗'}</span></div>
          <div>Webcam: <span style={{ color: webcamStream ? '#10b981' : '#ef4444' }}>{webcamStream ? '✓' : '✗'}</span></div>
          <div>Video Ready: <span style={{ color: videoRef.current?.readyState === 4 ? '#10b981' : '#ef4444' }}>
            {videoRef.current?.readyState || 0}
          </span></div>
          <div>Video Size: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</div>
        </div>
      )}

      {isLoading && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: 'white',
          background: 'rgba(0,0,0,0.7)',
          padding: '10px 20px',
          borderRadius: '8px',
          zIndex: 9999,
        }}>
          Loading 3D Model...
        </div>
      )}
    </>
  );
};

export default React.memo(VRMVideoPublisherComponent);