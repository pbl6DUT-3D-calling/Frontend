'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VRMVideoPublisherProps } from './types';
import { useThreeScene } from './hooks/useThreeScene';
import { useVRMLoader } from './hooks/useVRMLoader';
import { useWebcamStream } from './hooks/useWebcamStream';
import { useAITracking } from './hooks/useAITracking'; // ⬅️ THAY ĐỔI
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { CANVAS_CONFIG, getResponsiveCanvasConfig } from './utils/constants';
import { clearCanvas } from './utils/canvasHelpers';

const VRMVideoPublisherComponent = ({ enabled, webcamStream }: VRMVideoPublisherProps) => {
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const output2DCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clockRef = useRef(new THREE.Clock());

  // Setup Three.js scene
  const { scene, renderer, camera } = useThreeScene(webglCanvasRef);

  // Load VRM model
  const { vrm, isLoading } = useVRMLoader(scene, camera);

  // Setup webcam
  const { isCameraReady } = useWebcamStream(videoRef, webcamStream);

  // ⬅️ THAY ĐỔI: Dùng AI Server thay vì MediaPipe
  const { aiClient, isConnected, isReady } = useAITracking(
    enabled,
    videoRef,
    vrm,
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
    isLoading,
    vrm,
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
          isLoading={isLoading}
          hasVRM={!!vrm}
          aiConnected={isConnected} // ⬅️ THAY ĐỔI
          aiReady={isReady} // ⬅️ THAY ĐỔI
          webcamStream={webcamStream}
          videoRef={videoRef}
        />
      )}

      {isLoading && <LoadingOverlay />}
    </>
  );
};

// ⬅️ CẬP NHẬT Debug Panel
function DebugPanel({
  enabled,
  isCameraReady,
  isLoading,
  hasVRM,
  aiConnected,
  aiReady,
  webcamStream,
  videoRef,
}: any) {
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
        <span style={{ color: !isLoading && hasVRM ? '#10b981' : '#ef4444' }}>
          {!isLoading && hasVRM ? '✓' : '✗'}
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

function LoadingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'white',
        background: 'rgba(0,0,0,0.7)',
        padding: '10px 20px',
        borderRadius: '8px',
        zIndex: 9999,
      }}
    >
      Loading 3D Model...
    </div>
  );
}

export default React.memo(VRMVideoPublisherComponent);