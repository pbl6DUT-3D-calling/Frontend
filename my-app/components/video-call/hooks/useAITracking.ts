import { useEffect, useRef, useState } from 'react';
import { VRM } from '@pixiv/three-vrm';
import { AIServerClient, AIServerResult } from '../services/aiServerClient';
import { animateVRMWithAI } from '../vrmRiggingAI';
import { useMediaPipeEyes } from '@/hooks/useEyes';

const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 120;

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
  
  // ✅ THAY ĐỔI: Thêm isProcessingRef giống Video Call Room
  const isProcessingRef = useRef(false);
  const latencyRef = useRef(0);
  const lastSendTimeRef = useRef(0);
  const frameSkipCounter = useRef(0);
  
  const mediaPipeEyeDataRef = useRef<{
    blinkLeft: number;
    blinkRight: number;
  } | null>(null);

  const faceMeshRef = useMediaPipeEyes(
    videoRef.current,
    enabled,
    (eyeData) => {
      mediaPipeEyeDataRef.current = eyeData;
    }
  );

  // Initialize AI Server connection
  useEffect(() => {
    if (!enabled) {
      if (aiClientRef.current) {
        aiClientRef.current.disconnect();
        aiClientRef.current = null;
      }
      setIsConnected(false);
      setIsReady(false);
      isProcessingRef.current = false; // ✅ RESET
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

    client.onResult((result: AIServerResult) => {
      // ✅ TÍNH LATENCY
      const receiveTime = Date.now();
      latencyRef.current = receiveTime - lastSendTimeRef.current;
      
      if (!currentVrm || !result.found) {
        isProcessingRef.current = false; // ✅ RESET để gửi tiếp
        return;
      }

      const delta = clockRef.current.getDelta();
      
      animateVRMWithAI(
        currentVrm, 
        result, 
        delta, 
        mediaPipeEyeDataRef.current,
        FRAME_WIDTH,
        FRAME_HEIGHT
      );

      // ✅ RESET isProcessing để cho phép gửi frame tiếp
      isProcessingRef.current = false;
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
      isProcessingRef.current = false;
    };
  }, [enabled, currentVrm]);

  // ✅ Send frames - LOGIC GIỐNG VIDEO CALL ROOM
  useEffect(() => {
    if (!enabled || !isReady || !videoRef.current || !aiClientRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: false, alpha: false });

    const sendFrame = () => {
      if (!enabled || !videoRef.current || !aiClientRef.current?.isConnected()) {
        return;
      }

      // ✅ NATURAL THROTTLING: Chỉ skip khi đang xử lý + latency cao
      if (isProcessingRef.current) {
        if (latencyRef.current > 200) {
          frameSkipCounter.current++;
          if (frameSkipCounter.current < 3) {
            animationFrameRef.current = requestAnimationFrame(sendFrame);
            return;
          }
          frameSkipCounter.current = 0;
        }
        animationFrameRef.current = requestAnimationFrame(sendFrame);
        return;
      }

      try {
        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
          ctx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
          
          if (faceMeshRef?.detectForVideoFrame) {
            const timestamp = performance.now();
            faceMeshRef.detectForVideoFrame(video, timestamp);
          }
          
          const base64Image = canvas.toDataURL('image/jpeg', 0.3).split(',')[1];
          
          // ✅ GHI NHẬN THỜI GIAN GỬI
          lastSendTimeRef.current = Date.now();
          aiClientRef.current.sendFrame(base64Image);
          
          // ✅ SET isProcessing = true, chờ response
          isProcessingRef.current = true;
        }
      } catch (error) {
        console.error('Error sending frame:', error);
        isProcessingRef.current = false;
      }

      animationFrameRef.current = requestAnimationFrame(sendFrame);
    };

    sendFrame();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isProcessingRef.current = false;
    };
  }, [enabled, isReady, videoRef.current]);

  return {
    aiClient: aiClientRef.current,
    isConnected,
    isReady,
  };
}