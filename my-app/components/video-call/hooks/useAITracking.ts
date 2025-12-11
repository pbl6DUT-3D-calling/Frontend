import { useState, useEffect, useRef } from 'react';
import { VRM } from '@pixiv/three-vrm';
import { AIServerClient, AIServerResult } from '../services/aiServerClient';
import { animateVRMWithAI } from '../vrmRiggingAI';

export function useAITracking(
  enabled: boolean,
  videoRef: React.RefObject<HTMLVideoElement>,
  vrm: VRM | null,
  clock: React.MutableRefObject<THREE.Clock>
) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const aiClientRef = useRef<AIServerClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize AI Client
  useEffect(() => {
    if (!enabled) {
      if (aiClientRef.current) {
        aiClientRef.current.disconnect();
        aiClientRef.current = null;
      }
      setIsConnected(false);
      setIsReady(false);
      return;
    }

    const aiClient = new AIServerClient(
      process.env.NEXT_PUBLIC_AI_WS_URL || 'ws://localhost:8000/ws/face-tracking',
      () => {
        setIsConnected(true);
        setIsReady(true);
        console.log('✅ AI Tracking Ready');
      },
      () => {
        setIsConnected(false);
        setIsReady(false);
        console.log('🔌 AI Tracking Disconnected');
      },
      (error) => {
        console.error('❌ AI Tracking Error:', error);
        setIsReady(false);
      }
    );

    aiClientRef.current = aiClient;

    // Handle AI results
    aiClient.onResult((result: AIServerResult) => {
      if (!vrm || !enabled) return;

      const deltaTime = clock.current.getDelta();
      animateVRMWithAI(vrm, result, deltaTime);
    });

    // Connect to server
    aiClient.connect().catch((error) => {
      console.error('Failed to connect to AI Server:', error);
    });

    // Create hidden canvas for image processing
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 180;
    canvasRef.current = canvas;

    return () => {
      if (aiClientRef.current) {
        aiClientRef.current.disconnect();
        aiClientRef.current = null;
      }
      setIsConnected(false);
      setIsReady(false);
    };
  }, [enabled, vrm, clock]);

  // Send frames to AI Server
  useEffect(() => {
    if (!enabled || !isConnected || !videoRef.current || !canvasRef.current) {
      return;
    }

    let isActive = true;
    let frameInterval: NodeJS.Timeout;

    const sendFrame = () => {
      if (!isActive || !aiClientRef.current?.isConnected()) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
        return;
      }

      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize và vẽ video lên canvas (240x180 như server mong đợi)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 (không có prefix)
        canvas.toBlob((blob) => {
          if (!blob || !isActive) return;

          const reader = new FileReader();
          reader.onloadend = () => {
            if (!isActive) return;

            const base64 = (reader.result as string).split(',')[1]; // Bỏ prefix
            aiClientRef.current?.sendFrame(base64);
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      } catch (error) {
        console.error('Error sending frame to AI Server:', error);
      }
    };

    // Send frame every 33ms (30 FPS)
    frameInterval = setInterval(sendFrame, 33);

    return () => {
      isActive = false;
      if (frameInterval) {
        clearInterval(frameInterval);
      }
    };
  }, [enabled, isConnected, videoRef]);

  return {
    aiClient: aiClientRef.current,
    isConnected,
    isReady,
  };
}