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
  
  const isPendingRef = useRef(false);
  const lastResultRef = useRef<AIServerResult | null>(null);

  // Initialize AI Client
  useEffect(() => {
    if (!enabled) {
      if (aiClientRef.current) {
        aiClientRef.current.disconnect();
        aiClientRef.current = null;
      }
      setIsConnected(false);
      setIsReady(false);
      isPendingRef.current = false;
      lastResultRef.current = null;
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_AI_WS_URL || 'ws://localhost:8000/ws/face-tracking';
    console.log('🔌 Connecting to AI Server:', wsUrl);

    const aiClient = new AIServerClient(
      wsUrl,
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

    // ⬅️ FIX: Handle results ĐÚNG CÁCH
    aiClient.onResult((result: AIServerResult) => {
      // Reset pending NGAY KHI NHẬN ĐƯỢC RESULT
      isPendingRef.current = false;

      if (!result.found) {
        console.log('⚠️ No face detected');
        return;
      }

      // Lưu result mới nhất
      lastResultRef.current = result;

      // ⬅️ QUAN TRỌNG: Animate NGAY tại đây (không đợi requestAnimationFrame)
      if (vrm && enabled) {
        const deltaTime = clock.current.getDelta();
        animateVRMWithAI(vrm, result, deltaTime);
      }
    });

    aiClient.connect().catch((error) => {
      console.error('Failed to connect to AI Server:', error);
    });

    // Canvas nhỏ hơn cho faster processing
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    canvasRef.current = canvas;

    return () => {
      if (aiClientRef.current) {
        aiClientRef.current.disconnect();
        aiClientRef.current = null;
      }
      setIsConnected(false);
      setIsReady(false);
      isPendingRef.current = false;
      lastResultRef.current = null;
    };
  }, [enabled, vrm, clock]);

  // ⬅️ XÓA animation loop này đi (CONFLICT với onResult callback)
  // useEffect(() => {
  //   if (!enabled || !vrm || !lastResultRef.current) return;
  //   ...animation loop...
  // }, [enabled, vrm, clock]);

  // Send frames to AI Server
  useEffect(() => {
    if (!enabled || !isConnected || !videoRef.current || !canvasRef.current) {
      return;
    }

    let isActive = true;
    let frameInterval: NodeJS.Timeout;
    let frameCount = 0;

    const sendFrame = () => {
      if (!isActive || !aiClientRef.current?.isConnected()) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
        return;
      }

      // ⬅️ FIX: Skip logic ĐÚNG
      if (isPendingRef.current) {
        // KHÔNG log mỗi frame skip (spam console)
        return;
      }

      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob || !isActive) return;

            const reader = new FileReader();
            reader.onloadend = () => {
              if (!isActive || isPendingRef.current) return;

              const base64 = (reader.result as string).split(',')[1];
              
              // Set pending TRƯỚC KHI gửi
              isPendingRef.current = true;
              aiClientRef.current?.sendFrame(base64);

              frameCount++;
              if (frameCount % 30 === 0) {
                console.log(`📤 Sent ${frameCount} frames to AI Server`);
              }
            };
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          0.7
        );
      } catch (error) {
        console.error('Error sending frame:', error);
        isPendingRef.current = false; // Reset on error
      }
    };

    // ⬅️ FIX: 25 FPS (balance giữa smooth và performance)
    frameInterval = setInterval(sendFrame, 40); // 40ms = 25 FPS

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