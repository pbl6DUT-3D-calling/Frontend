import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import {
  clearCanvas,
  drawPlaceholder,
  drawVideoNormal,
  copyCanvasMirrored,
  canDrawVideo,
} from '../utils/canvasHelpers';

export function useCanvasRenderer(
  outputCanvasRef: React.RefObject<HTMLCanvasElement>,
  webglCanvasRef: React.RefObject<HTMLCanvasElement>,
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean,
  isCameraReady: boolean,
  webcamStream: MediaStream | null,
  isLoading: boolean,
  vrm: VRM | null,
  renderer: THREE.WebGLRenderer | null,
  scene: THREE.Scene | null,
  camera: THREE.PerspectiveCamera | null,
  clock: React.MutableRefObject<THREE.Clock>
) {
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!outputCanvasRef.current || !videoRef.current) {
      return;
    }

    let isActive = true;

    const render = () => {
      if (!isActive || !outputCanvasRef.current || !videoRef.current) return;

      const ctx = outputCanvasRef.current.getContext('2d');
      if (!ctx) return;

      clearCanvas(outputCanvasRef.current);

      // 3D MODE
      if (enabled) {
        if (
          isCameraReady &&
          webcamStream &&
          !isLoading &&
          vrm &&
          renderer &&
          scene &&
          camera &&
          webglCanvasRef.current
        ) {
          const deltaTime = clock.current.getDelta();
          vrm.update(deltaTime);
          renderer.render(scene, camera);

          copyCanvasMirrored(ctx, webglCanvasRef.current, outputCanvasRef.current.width);
        } else if (isLoading) {
          drawPlaceholder(outputCanvasRef.current, 'Loading 3D Model...');
        } else {
          ctx.fillStyle = '#212121';
          ctx.fillRect(0, 0, outputCanvasRef.current.width, outputCanvasRef.current.height);
        }
      }
      // 2D MODE
      else {
        if (canDrawVideo(videoRef.current, isCameraReady, webcamStream)) {
          drawVideoNormal(
            ctx,
            videoRef.current,
            outputCanvasRef.current.width,
            outputCanvasRef.current.height
          );
        } else {
          let message = 'Waiting for camera...';
          if (!webcamStream) {
            message = 'No camera stream';
          } else if (!isCameraReady) {
            message = 'Camera initializing...';
          }
          drawPlaceholder(outputCanvasRef.current, message);
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

      if (outputCanvasRef.current) {
        clearCanvas(outputCanvasRef.current);
      }
    };
  }, [
    enabled,
    isCameraReady,
    webcamStream,
    isLoading,
    vrm,
    renderer,
    scene,
    camera,
    outputCanvasRef,
    webglCanvasRef,
    videoRef,
    clock,
  ]);
}