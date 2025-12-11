'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VRMVideoPublisherProps } from './types';
import { useThreeScene } from './hooks/useThreeScene';
import { useWebcamStream } from './hooks/useWebcamStream';
import { useAITracking } from './hooks/useAITracking'; // ⬅️ THAY ĐỔI
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { CANVAS_CONFIG, getResponsiveCanvasConfig } from './utils/constants';
import { clearCanvas } from './utils/canvasHelpers';
import { useVRM } from "../../context/vrmContext";

const VRMVideoPublisherComponent = ({ enabled, webcamStream }: VRMVideoPublisherProps) => {
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const output2DCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clockRef = useRef(new THREE.Clock());
  const { currentVrm } = useVRM();

  // Setup Three.js scene
  const { scene, renderer, camera } = useThreeScene(webglCanvasRef);

  // Setup webcam
  const { isCameraReady } = useWebcamStream(videoRef, webcamStream);

  useEffect(() => {
    if (!scene || !currentVrm) return;

    if (!scene.children.includes(currentVrm.scene)) {
      currentVrm.scene.position.set(0, -1, 0);
      currentVrm.scene.rotation.y = Math.PI;
      currentVrm.scene.scale.setScalar(1);
      
      scene.add(currentVrm.scene);
      console.log('✅ Added VRM to video call scene');
    }

    return () => {
      if (scene && currentVrm) {
        scene.remove(currentVrm.scene);
      }
    };
  }, [scene, currentVrm]);

  // ⬅️ THAY ĐỔI: Dùng AI Server thay vì MediaPipe
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
    false,
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
        style={{ transform: 'scaleX(-1)' }}
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
          aiConnected={isConnected} // ⬅️ THAY ĐỔI
          aiReady={isReady} // ⬅️ THAY ĐỔI
          webcamStream={webcamStream}
          videoRef={videoRef}
        />
      )}
{/* 
      {isLoading && <LoadingOverlay />} */}
    </>
  );
};

// ⬅️ CẬP NHẬT Debug Panel
function DebugPanel({
  enabled,
  isCameraReady,
  hasVRM,
  aiConnected,
  aiReady,
  webcamStream,
  videoRef,
}: {
  enabled: boolean;
  isCameraReady: boolean;
  hasVRM: boolean; // ⬅️ THÊM hasVRM
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
        minWidth: '200px',
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
          { hasVRM ? '✓' : '✗'}
        </span>
      </div>
      <div>
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
      <div>
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


export default React.memo(VRMVideoPublisherComponent);