'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRM, VRMExpressionPresetName, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { animateVRMFace } from './vrmRigging';

interface VRMVideoPublisherProps {
  enabled: boolean;
  webcamStream: MediaStream | null;
}

const VRMVideoPublisherComponent = ({ enabled, webcamStream }: VRMVideoPublisherProps) => {
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const canvasStreamRef = useRef<MediaStream | null>(null);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraThreeRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const clockRef = useRef(new THREE.Clock());
  
  const faceMeshRef = useRef<any>(null);
  const faceMeshScriptLoadedRef = useRef(false);
  const faceMeshInitializingRef = useRef(false);
  
  const animationFrameRef = useRef<number>();
  const inferenceTimeoutRef = useRef<NodeJS.Timeout>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // 1. Setup Three.js Scene (only once)
  useEffect(() => {
    if (sceneRef.current) return;

    console.log('Setting up Three.js scene...');

    sceneRef.current = new THREE.Scene();
    // Nền trong suốt để có thể vẽ video bên dưới nếu cần
    // sceneRef.current.background = new THREE.Color(0x212121);
    cameraThreeRef.current = new THREE.PerspectiveCamera(30, 640 / 480, 0.1, 20); // Camera cho model 3D
    cameraThreeRef.current.position.set(0, 1.3, 1.5);

    if (!canvasRef.current) return;

    rendererRef.current = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    rendererRef.current.setSize(640, 480);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    sceneRef.current.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    console.log('Loading VRM model...');
    
    loader.load(
      '/model3d/1.vrm',
      (gltf) => {
        if (!sceneRef.current) {
          console.log('Scene disposed, skipping VRM setup');
          return;
        }

        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;
        sceneRef.current.add(vrm.scene);
        vrm.scene.position.y = -1;
        setIsLoading(false);
        console.log('VRM model loaded');
      },
      undefined,
      (error) => {
        console.error('Error loading VRM:', error);
        setIsLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up Three.js');
      
      if (vrmRef.current) {
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
      
      if (cameraThreeRef.current) {
        cameraThreeRef.current = null;
      }
    };
  }, []);

  // 2. Setup Camera (only once)
  useEffect(() => {
    let mounted = true;

    if (webcamStream && videoRef.current) {
      console.log('Attaching webcam stream to video element...');
      videoRef.current.srcObject = webcamStream;
      videoRef.current.onloadedmetadata = async () => { // Dùng onloadedmetadata để chắc chắn video đã sẵn sàng
        if (!mounted) return;
        await videoRef.current.play();
        
        console.log('Camera ready');
        setIsCameraReady(true);
      };
    } else {
      // Nếu không có stream (lúc đầu hoặc khi tắt), dừng video và reset state
      if (videoRef.current) videoRef.current.srcObject = null;
      setIsCameraReady(false);
    }

    return () => {
      console.log('Cleaning up camera effect');
      mounted = false;
      if (videoRef.current) {
        // Không stop track ở đây vì nó được quản lý bởi LiveKit
        videoRef.current.srcObject = null;
      }
    };
  }, [webcamStream]);

  // 3. Load FaceMesh Script
  useEffect(() => {
    if (!enabled) return;
    if (faceMeshScriptLoadedRef.current) return;

    let mounted = true;

    const loadFaceMeshScript = async () => {
      if ((window as any).FaceMesh) {
        console.log('FaceMesh already available');
        if (mounted) {
          faceMeshScriptLoadedRef.current = true;
        }
        return;
      }

      const existingScript = document.querySelector('script[src*="face_mesh.js"]');
      if (existingScript) {
        console.log('FaceMesh script already loading...');
        return;
      }

      console.log('Loading FaceMesh from CDN...');
      
      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
          script.crossOrigin = 'anonymous';
          script.async = true;
          
          script.onload = () => {
            console.log('FaceMesh script loaded');
            if (mounted) {
              faceMeshScriptLoadedRef.current = true;
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
  }, [enabled]);

  // 4. Initialize FaceMesh
  useEffect(() => {
    if (!enabled) {
      if (faceMeshRef.current) {
        console.log('Closing FaceMesh (disabled)');
        try {
          faceMeshRef.current.close?.();
        } catch (e) {
          console.warn('Error closing FaceMesh:', e);
        }
        faceMeshRef.current = null;
        faceMeshInitializingRef.current = false;
      }
      return;
    }

    if (faceMeshRef.current) {
      console.log('FaceMesh already initialized');
      return;
    }

    if (!faceMeshScriptLoadedRef.current) {
      console.log('Waiting for FaceMesh script...');
      return;
    }

    if (faceMeshInitializingRef.current) {
      console.log('FaceMesh already initializing...');
      return;
    }

    let mounted = true;

    const initFaceMesh = async () => {
      faceMeshInitializingRef.current = true;
      
      await new Promise(resolve => setTimeout(resolve, 300));

      const FaceMesh = (window as any).FaceMesh;
      if (!FaceMesh) {
        console.warn('FaceMesh not available');
        faceMeshInitializingRef.current = false;
        return;
      }

      try {
        console.log('Initializing FaceMesh...');
        
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
          if (!vrmRef.current || !videoRef.current) return;
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
        console.log('FaceMesh initialized');
      } catch (error) {
        console.error('Error initializing FaceMesh:', error);
        faceMeshInitializingRef.current = false;
      }
    };

    initFaceMesh();

    return () => {
      mounted = false;
      if (faceMeshRef.current) {
        console.log('Closing FaceMesh (cleanup)');
        try {
          faceMeshRef.current.close?.();
        } catch (e) {
          console.warn('Error closing FaceMesh:', e);
        }
        faceMeshRef.current = null;
      }
      faceMeshInitializingRef.current = false;
    };
  }, [enabled, faceMeshScriptLoadedRef.current]);

  // 6. Canvas Render Loop
  useEffect(() => {
    // Vòng lặp render chỉ cần camera sẵn sàng và không loading để bắt đầu.
    // Việc vẽ hay không sẽ được quyết định bên trong vòng lặp.
    if (!canvasRef.current || !videoRef.current || !isCameraReady || isLoading) {
      return;
    }

    let isActive = true;
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      if (!isActive || !canvasRef.current || !videoRef.current) return;

      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (enabled) {
        // --- Chế độ 3D: Render scene VRM ---
        if (!isLoading && rendererRef.current && sceneRef.current && cameraThreeRef.current) {
          // Chỉ render 3D nếu camera cũng đang bật
          if (webcamStream) {
            if (vrmRef.current) {
              vrmRef.current.update(deltaTime);
            }
            rendererRef.current.clear();
            rendererRef.current.render(sceneRef.current, cameraThreeRef.current);
          }
        }
      } else {
        // --- Chế độ 2D: Vẽ video trực tiếp lên canvas ---
        // Chỉ vẽ video nếu camera đang bật và có đủ dữ liệu
        if (webcamStream && videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.scale(-1, 1); // Lật ngang để tạo hiệu ứng gương
            ctx.drawImage(videoRef.current, -canvasRef.current.width, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.restore();
          }
        }
      }      
      
      animationFrameRef.current = requestAnimationFrame(render);
    };

    console.log('Canvas render loop started');
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      console.log('Canvas render loop stopped');
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
    // Bỏ isCameraEnabled khỏi dependencies để vòng lặp không bị hủy và tạo lại.
    // Vòng lặp sẽ luôn chạy, chỉ có việc vẽ bên trong là có điều kiện.
  }, [enabled, isCameraReady, isLoading, webcamStream]);

  // 7. Face Tracking Loop
  useEffect(() => {
    if (!enabled || !isCameraReady || !faceMeshRef.current || !videoRef.current || !webcamStream) {
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
        await faceMeshRef.current.send({ image: videoRef.current });
      } catch (error) {
        console.error('Face tracking error:', error);
      }

      if (isActive) {
        inferenceTimeoutRef.current = setTimeout(runInference, 1000 / 30);
      }
    };

    console.log('Face tracking started');
    runInference();

    return () => {
      console.log('Face tracking stopped');
      isActive = false;
      if (inferenceTimeoutRef.current) {
        clearTimeout(inferenceTimeoutRef.current);
        inferenceTimeoutRef.current = undefined;
      }
    };
  }, [enabled, isCameraReady, webcamStream]);

  return (
    <>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
        muted
      />

      <canvas
        id="vrm-canvas" // Thêm ID để dễ dàng tìm thấy
        ref={canvasRef}
        width={640}
        height={480}
        style={{ display: 'none' }} // Canvas vẫn ẩn, chúng ta chỉ cần stream từ nó
      />

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
}

// Bọc component trong React.memo để ngăn re-render không cần thiết
const VRMVideoPublisher = React.memo(VRMVideoPublisherComponent);
export default VRMVideoPublisher;