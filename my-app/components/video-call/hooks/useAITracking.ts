import { useEffect, useRef, useState } from 'react';
import { VRM } from '@pixiv/three-vrm';
import { AIServerClient, AIServerResult } from '../services/aiServerClient';
import { animateVRMWithAI } from '../vrmRiggingAI';
import { useMediaPipeEyes } from '@/hooks/useEyes'; // ⬅️ THÊM

export function useAITracking(
  enabled: boolean,
  videoRef: React.RefObject<HTMLVideoElement>,
  currentVrm: VRM | null,
  clockRef: React.MutableRefObject<THREE.Clock>
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const aiClientRef = useRef<AIServerClient | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  
  // ⬅️ THÊM: MediaPipe eye data ref
  const mediaPipeEyeDataRef = useRef<{
    blinkLeft: number;
    blinkRight: number;
  } | null>(null);

  // ⬅️ THÊM: Initialize MediaPipe for eyes
  const faceMeshRef = useMediaPipeEyes(
    videoRef.current,
    enabled,
    (eyeData) => {
      mediaPipeEyeDataRef.current = eyeData;
      
      // Debug log every 3 seconds
      if (!window._lastAITrackingEyeLog || Date.now() - window._lastAITrackingEyeLog > 3000) {
        console.log('👁️ [AI Tracking] MediaPipe Eyes:', {
          blinkLeft: eyeData.blinkLeft.toFixed(3),
          blinkRight: eyeData.blinkRight.toFixed(3),
        });
        window._lastAITrackingEyeLog = Date.now();
      }
    }
  );

  // Initialize AI Server connection
  useEffect(() => {
    if (!enabled) {
      // Cleanup
      if (aiClientRef.current) {
        aiClientRef.current.disconnect();
        aiClientRef.current = null;
      }
      setIsConnected(false);
      setIsReady(false);
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_AI_WS_URL || 'ws://localhost:8000/ws/face-tracking';
    console.log('🔌 Connecting to AI Server:', wsUrl);

    const client = new AIServerClient(
      wsUrl,
      () => {
        console.log('✅ AI Server connected');
        setIsConnected(true);
        setIsReady(true);
      },
      () => {
        console.log('🔌 AI Server disconnected');
        setIsConnected(false);
        setIsReady(false);
      },
      (error) => {
        console.error('❌ AI Tracking Error:', error);
        setIsReady(false);
      }
    );

    // ⬅️ THÊM: Override eye blink với MediaPipe data
    client.onResult((result: AIServerResult) => {
      if (!currentVrm || !result.found) return;

      // ⬅️ MERGE: MediaPipe eyes + AI Server (head + mouth)
      const mergedResult = { ...result };
      
      // Override eye blink với MediaPipe
      if (mediaPipeEyeDataRef.current) {
        // Note: AI Server vẫn cung cấp landmarks, nhưng blink sẽ dùng MediaPipe
        console.log('🔵 [useAITracking] Overriding eye blink with MediaPipe');
      }

      const delta = clockRef.current.getDelta();
      
      // ⬅️ Pass MediaPipe eye data vào animateVRMWithAI
      animateVRMWithAI(currentVrm, mergedResult, delta, mediaPipeEyeDataRef.current);
    });

    aiClientRef.current = client;

    client.connect().catch((error) => {
      console.error('Failed to connect to AI Server:', error);
      setIsReady(false);
    });

    return () => {
      if (aiClientRef.current) {
        aiClientRef.current.disconnect();
        aiClientRef.current = null;
      }
    };
  }, [enabled, currentVrm]);

  // Send frames to AI Server
  useEffect(() => {
    if (!enabled || !isReady || !videoRef.current || !aiClientRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 160; // Low resolution for speed
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false });

    const sendFrame = () => {
      if (!enabled || !videoRef.current || !aiClientRef.current?.isConnected()) {
        return;
      }

      const now = performance.now();
      if (now - lastFrameTimeRef.current < 33) { // ~30 FPS
        animationFrameRef.current = requestAnimationFrame(sendFrame);
        return;
      }

      try {
        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          // Draw resized frame
          ctx.drawImage(video, 0, 0, 160, 120);
          
          // ⬅️ THÊM: Call MediaPipe detection (passive - dùng chung video)
          if (faceMeshRef?.detectForVideoFrame) {
            const timestamp = performance.now();
            faceMeshRef.detectForVideoFrame(video, timestamp);
          }
          
          // Convert to base64
          const base64Image = canvas.toDataURL('image/jpeg', 0.3).split(',')[1];
          
          // Send to AI Server
          aiClientRef.current.sendFrame(base64Image);
          lastFrameTimeRef.current = now;
        }
      } catch (error) {
        console.error('Error sending frame:', error);
      }

      animationFrameRef.current = requestAnimationFrame(sendFrame);
    };

    sendFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, isReady, videoRef.current]);

  return {
    aiClient: aiClientRef.current,
    isConnected,
    isReady,
  };
}