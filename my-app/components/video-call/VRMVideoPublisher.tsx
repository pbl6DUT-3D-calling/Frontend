'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { VRMVideoPublisherProps } from './types';
import { useThreeScene } from './hooks/useThreeScene';
import { useWebcamStream } from './hooks/useWebcamStream';
import { useAITracking } from './hooks/useAITracking';
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { CANVAS_CONFIG, getResponsiveCanvasConfig } from './utils/constants';
import { clearCanvas } from './utils/canvasHelpers';
import { useVRM } from "../../context/vrmContext";
import { useModel } from "../../context/modelContext"; // ⬅️ THÊM
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { adjustCameraForVRM } from './utils/threeSetup';


const getVideoCallModelPath = (url: string): string => {
  // Nếu là URL đầy đủ (http/https/blob) → giữ nguyên
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  
  // Loại bỏ / đầu nếu có
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  
  // Nếu đã có "models/" → giữ nguyên
  if (cleanPath.startsWith('models/')) {
    return `/${cleanPath}`;
  }
  
  // Nếu chưa có "models/" → thêm vào
  return `/models/${cleanPath}`;
};


const VRMVideoPublisherComponent = ({ enabled, webcamStream }: VRMVideoPublisherProps) => {
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const output2DCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clockRef = useRef(new THREE.Clock());
  
  const { currentVrm, setCurrentVrm } = useVRM();
  const { selectedModelUrl } = useModel(); // ⬅️ THÊM: Lấy URL từ context
  
  const [isLoadingVRM, setIsLoadingVRM] = useState(false); // ⬅️ THÊM

  // Setup Three.js scene
  const { scene, renderer, camera } = useThreeScene(webglCanvasRef);

  // Setup webcam
  const { isCameraReady } = useWebcamStream(videoRef, webcamStream);

  // ⬅️ THÊM: Load VRM từ selectedModelUrl
  useEffect(() => {
    if (!scene || !camera || !selectedModelUrl) {
      return;
    }

    const videoCallPath = getVideoCallModelPath(selectedModelUrl);
    setIsLoadingVRM(true);

    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      videoCallPath,
      (gltf) => {
        if (!scene || !camera) {
          setIsLoadingVRM(false);
          return;
        }

        if (currentVrm) {
          scene.remove(currentVrm.scene);
        }

        const vrm = gltf.userData.vrm as VRM;

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);

        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        vrm.scene.rotation.y = Math.PI;
        
        if (vrm.humanoid) {
          try {
            const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
            const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
            const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
            const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
            
            if (leftUpperArm) leftUpperArm.rotation.z = 1;
            if (rightUpperArm) rightUpperArm.rotation.z = -1;
            if (leftLowerArm) leftLowerArm.rotation.z = -0.2;
            if (rightLowerArm) rightLowerArm.rotation.z = 0.2;
          } catch (error) {
            console.warn('Could not set pose:', error);
          }
        }

        vrm.scene.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(vrm.scene);
        const center = box.getCenter(new THREE.Vector3());
        
        const offsetX = -center.x;
        const offsetZ = -center.z;
        
        vrm.scene.position.set(offsetX, 0, offsetZ);

        scene.add(vrm.scene);
        setCurrentVrm(vrm);

        setTimeout(() => {
          adjustCameraForVRM(camera, vrm.scene);
          setIsLoadingVRM(false);
        }, 100);
      },
      undefined,
      (error) => {
        console.error('Error loading VRM:', error);
        setIsLoadingVRM(false);
      }
    );

    return () => {
      if (currentVrm && scene) {
        scene.remove(currentVrm.scene);
      }
    };
  }, [scene, camera, selectedModelUrl]);

  // AI Tracking
  const { aiClient, isConnected, isReady } = useAITracking(
    enabled,
    videoRef,
    currentVrm,
    clockRef
  );

  // Canvas rendering
  useCanvasRenderer(
    output2DCanvasRef,
    webglCanvasRef,
    videoRef,
    enabled,
    isCameraReady,
    webcamStream,
    isLoadingVRM, // ⬅️ THAY ĐỔI: Dùng isLoadingVRM thay vì false
    currentVrm,
    renderer,
    scene,
    camera,
    clockRef
  );

  // Clear canvas on mode toggle
  useEffect(() => {
    if (output2DCanvasRef.current) {
      clearCanvas(output2DCanvasRef.current);
    }
  }, [enabled]);

  useEffect(() => {
    const updateCanvasSize = () => {
      const config = getResponsiveCanvasConfig();

      if (webglCanvasRef.current) {
        webglCanvasRef.current.width = config.WIDTH;
        webglCanvasRef.current.height = config.HEIGHT;
      }

      if (output2DCanvasRef.current) {
        output2DCanvasRef.current.width = config.WIDTH;
        output2DCanvasRef.current.height = config.HEIGHT;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  return (
    <>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted autoPlay />

      <canvas
        ref={webglCanvasRef}
        width={CANVAS_CONFIG.WIDTH}
        height={CANVAS_CONFIG.HEIGHT}
       style={{ 
        transform: 'scaleX(-1)',
        width: '100%', // ⬅️ THÊM: Responsive
        height: 'auto', // ⬅️ THÊM: Giữ aspect ratio
        maxWidth: `${CANVAS_CONFIG.WIDTH}px`,
        maxHeight: `${CANVAS_CONFIG.HEIGHT}px`,
        objectFit: 'contain' // ⬅️ THÊM
      }}
      />

      <canvas
        id="vrm-canvas"
        ref={output2DCanvasRef}
        width={CANVAS_CONFIG.WIDTH}
        height={CANVAS_CONFIG.HEIGHT}
        style={{ display: 'none' }}
      />

      {process.env.NODE_ENV === 'development' && (
        <DebugPanel
          enabled={enabled}
          isCameraReady={isCameraReady}
          hasVRM={!!currentVrm}
          isLoadingVRM={isLoadingVRM} // ⬅️ THÊM
          selectedModelUrl={selectedModelUrl} // ⬅️ THÊM
          aiConnected={isConnected}
          aiReady={isReady}
          webcamStream={webcamStream}
          videoRef={videoRef}
        />
      )}

      {isLoadingVRM && <LoadingOverlay />} {/* ⬅️ THÊM */}
    </>
  );
};

// ⬅️ CẬP NHẬT Debug Panel
function DebugPanel({
  enabled,
  isCameraReady,
  hasVRM,
  isLoadingVRM,
  selectedModelUrl,
  aiConnected,
  aiReady,
  webcamStream,
  videoRef,
}: {
  enabled: boolean;
  isCameraReady: boolean;
  hasVRM: boolean;
  isLoadingVRM: boolean; // ⬅️ THÊM
  selectedModelUrl: string | null; // ⬅️ THÊM
  aiConnected: boolean;
  aiReady: boolean;
  webcamStream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
}) {
  return (
    <div
      style={{
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
        minWidth: '220px',
        maxWidth: '300px',
      }}
    >
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>
        Debug Info
      </div>
      <div>
        3D Enabled:{' '}
        <span style={{ color: enabled ? '#10b981' : '#ef4444' }}>
          {enabled ? '✓' : '✗'}
        </span>
      </div>
      <div>
        Camera Ready:{' '}
        <span style={{ color: isCameraReady ? '#10b981' : '#ef4444' }}>
          {isCameraReady ? '✓' : '✗'}
        </span>
      </div>
      <div>
        VRM Loaded:{' '}
        <span style={{ color: hasVRM ? '#10b981' : '#ef4444' }}>
          {hasVRM ? '✓' : '✗'}
        </span>
      </div>
      <div>
        VRM Loading:{' '}
        <span style={{ color: isLoadingVRM ? '#f59e0b' : '#6b7280' }}>
          {isLoadingVRM ? '⏳' : '✗'}
        </span>
      </div>
      <div style={{ 
        marginTop: '8px', 
        fontSize: '10px', 
        color: '#9ca3af',
        wordBreak: 'break-all' 
      }}>
        Model: {selectedModelUrl ? selectedModelUrl.substring(0, 50) + '...' : 'None'}
      </div>
      <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '8px' }}>
        AI Connected:{' '}
        <span style={{ color: aiConnected ? '#10b981' : '#ef4444' }}>
          {aiConnected ? '✓' : '✗'}
        </span>
      </div>
      <div>
        AI Ready:{' '}
        <span style={{ color: aiReady ? '#10b981' : '#ef4444' }}>
          {aiReady ? '✓' : '✗'}
        </span>
      </div>
      <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '8px' }}>
        Webcam:{' '}
        <span style={{ color: webcamStream ? '#10b981' : '#ef4444' }}>
          {webcamStream ? '✓' : '✗'}
        </span>
      </div>
      <div>
        Video Ready:{' '}
        <span style={{ color: videoRef.current?.readyState === 4 ? '#10b981' : '#ef4444' }}>
          {videoRef.current?.readyState || 0}
        </span>
      </div>
      <div>
        Video Size: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}
      </div>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      color: 'white',
      background: 'rgba(0,0,0,0.8)',
      padding: '20px 30px',
      borderRadius: '12px',
      zIndex: 10000,
      textAlign: 'center',
    }}>
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p>Loading 3D Model...</p>
    </div>
  );
}

export default React.memo(VRMVideoPublisherComponent);