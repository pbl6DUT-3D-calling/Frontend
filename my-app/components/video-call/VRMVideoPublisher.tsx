'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { VRMVideoPublisherProps } from './types';
import { useThreeScene } from './hooks/useThreeScene';
import { useVRMLoader } from './hooks/useVRMLoader';
import { useWebcamStream } from './hooks/useWebcamStream';
import { useFaceMesh } from './hooks/useFaceMesh';
import { useCanvasRenderer } from './hooks/useCanvasRenderer';
import { useFaceTracking } from './hooks/useFaceTracking';
import { CANVAS_CONFIG } from './utils/constants';
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

  // Setup FaceMesh
  const { faceMesh, faceMeshReady } = useFaceMesh(enabled, videoRef, vrm, clockRef);

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

  // Face tracking
  useFaceTracking(
    enabled,
    isCameraReady,
    faceMeshReady,
    videoRef,
    webcamStream,
    faceMesh
  );

  // Clear canvas on mode toggle
  useEffect(() => {
    if (output2DCanvasRef.current) {
      clearCanvas(output2DCanvasRef.current);
    }
  }, [enabled]);

  return (
    <>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted autoPlay />

      <canvas
        ref={webglCanvasRef}
        width={CANVAS_CONFIG.WIDTH}
        height={CANVAS_CONFIG.HEIGHT}
        style={{ display: 'none' }}
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
          faceMeshReady={faceMeshReady}
          webcamStream={webcamStream}
          videoRef={videoRef}
        />
      )}

      {isLoading && <LoadingOverlay />}
    </>
  );
};

// Debug panel component
function DebugPanel({ enabled, isCameraReady, isLoading, hasVRM, faceMeshReady, webcamStream, videoRef }: any) {
  return (
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
      <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '14px' }}>Debug Info</div>
      <div>3D Enabled: <span style={{ color: enabled ? '#10b981' : '#ef4444' }}>{enabled ? '✓' : '✗'}</span></div>
      <div>Camera Ready: <span style={{ color: isCameraReady ? '#10b981' : '#ef4444' }}>{isCameraReady ? '✓' : '✗'}</span></div>
      <div>VRM Loaded: <span style={{ color: !isLoading && hasVRM ? '#10b981' : '#ef4444' }}>{!isLoading && hasVRM ? '✓' : '✗'}</span></div>
      <div>FaceMesh Ready: <span style={{ color: faceMeshReady ? '#10b981' : '#ef4444' }}>{faceMeshReady ? '✓' : '✗'}</span></div>
      <div>Webcam: <span style={{ color: webcamStream ? '#10b981' : '#ef4444' }}>{webcamStream ? '✓' : '✗'}</span></div>
      <div>Video Ready: <span style={{ color: videoRef.current?.readyState === 4 ? '#10b981' : '#ef4444' }}>
        {videoRef.current?.readyState || 0}
      </span></div>
      <div>Video Size: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</div>
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
      background: 'rgba(0,0,0,0.7)',
      padding: '10px 20px',
      borderRadius: '8px',
      zIndex: 9999,
    }}>
      Loading 3D Model...
    </div>
  );
}

export default React.memo(VRMVideoPublisherComponent);