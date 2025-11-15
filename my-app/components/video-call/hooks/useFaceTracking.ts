import { useEffect, useRef } from 'react';
import { CANVAS_CONFIG } from '../utils/constants';

export function useFaceTracking(
  enabled: boolean,
  isCameraReady: boolean,
  faceMeshReady: boolean,
  videoRef: React.RefObject<HTMLVideoElement>,
  webcamStream: MediaStream | null,
  faceMesh: any
) {
  const inferenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      if (!isActive || !faceMesh || !videoRef.current) return;

      try {
        if (videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
          await faceMesh.send({ image: videoRef.current });
        }
      } catch (error) {
        console.error('Face tracking error:', error);
      }

      if (isActive) {
        inferenceTimeoutRef.current = setTimeout(runInference, 1000 / CANVAS_CONFIG.FPS);
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
  }, [enabled, isCameraReady, webcamStream, faceMeshReady, faceMesh, videoRef]);
}