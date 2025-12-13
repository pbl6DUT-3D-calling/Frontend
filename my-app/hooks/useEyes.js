import { useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Face } from 'kalidokit'; // ✅ KALIDOKIT for professional EAR calculation

/**
 * Hook để track mắt bằng MediaPipe FaceLandmarker + Kalidokit
 * - MediaPipe: Cung cấp 468 face landmarks
 * - Kalidokit: Tính toán EAR, normalize, smoothing
 */
export function useMediaPipeEyes(videoElement, isActive, onResults) {
  const faceLandmarkerRef = useRef(null);
  const onResultsRef = useRef(onResults);

  // Update callback ref without re-initializing
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    if (!videoElement || !isActive) {
      // Cleanup khi tắt
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current = null;
      }
      return;
    }

    // Nếu đã init rồi thì skip
    if (faceLandmarkerRef.current) {
      return;
    }

    let mounted = true;

    // Init MediaPipe FaceLandmarker - CHỈ 1 LẦN
    const initMediaPipe = async () => {
      try {
        console.log('⏳ Initializing MediaPipe FaceLandmarker...');

        // Load WASM files
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        if (!mounted) return;

        // Create FaceLandmarker
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        });

        if (!mounted) return;

        faceLandmarkerRef.current = faceLandmarker;
        console.log('✅ MediaPipe FaceLandmarker initialized successfully!');
        console.log('   - Running mode: VIDEO');
        console.log('   - Num faces: 1');
        console.log('   - Detection confidence: 0.5');

      } catch (error) {
        console.error('❌ Failed to initialize MediaPipe:', error);
      }
    };

    initMediaPipe();

    return () => {
      mounted = false;
    };
  }, [videoElement, isActive]);

  // Return object với detectForVideoFrame function
  return {
    detectForVideoFrame: (videoElement, timestamp) => {
      if (!faceLandmarkerRef.current || !videoElement) return;
      
      // Check if detectForVideo method exists
      if (typeof faceLandmarkerRef.current.detectForVideo !== 'function') {
        console.error('❌ detectForVideo is not a function. FaceLandmarker may not be fully initialized.');
        return;
      }

      try {
        // Timestamp phải là milliseconds (performance.now() đã đúng format)
        const results = faceLandmarkerRef.current.detectForVideo(videoElement, Math.floor(timestamp));
        
        // 🐛 DEBUG: Log results every 3s
        if (!window._lastMediaPipeResultLog || Date.now() - window._lastMediaPipeResultLog > 3000) {
          console.log('🔍 MediaPipe Results:', {
            hasFaceLandmarks: !!results.faceLandmarks,
            numFaces: results.faceLandmarks?.length || 0,
            firstFaceExists: !!results.faceLandmarks?.[0]
          });
          window._lastMediaPipeResultLog = Date.now();
        }
        
        if (results.faceLandmarks && results.faceLandmarks[0]) {
          const landmarks = results.faceLandmarks[0];
          
          // ✅ KALIDOKIT: Professional eye tracking với EAR calculation
          const riggedFace = Face.solve(landmarks, {
            runtime: 'mediapipe',      // MediaPipe 468 landmarks format
            video: videoElement,
            imageSize: { 
              width: videoElement.videoWidth || 640, 
              height: videoElement.videoHeight || 480
            },
            smoothBlink: false,        // ✅ FALSE = 2 mắt độc lập
            blinkSettings: [0.25, 0.3]  // ✅ [threshold, smoothing] - Giảm smoothing 0.75→0.3
          });
          
          // 🔍 DEBUG: Check if Kalidokit returns valid data
          if (!riggedFace || !riggedFace.eye) {
            console.error('❌ Kalidokit Face.solve() failed - no eye data');
            return;
          }
          
          // Kalidokit output: eye.l, eye.r (1=open, 0=closed)
          // VRM format cần: blink (0=open, 1=closed) → Invert
          let blinkLeftRaw = 1 - (riggedFace.eye.l || 0);
          let blinkRightRaw = 1 - (riggedFace.eye.r || 0);
          
          // ✅ ASYMMETRIC SMOOTHING: Nhắm nhanh, mở nhanh hơn
          if (!window._prevBlinkCustom) {
            window._prevBlinkCustom = { l: 0, r: 0 };
          }
          
          // Tính smoothing factor động
          const prevLeft = window._prevBlinkCustom.l;
          const prevRight = window._prevBlinkCustom.r;
          
          // Nếu đang NHẮM (raw > prev): smoothing thấp (responsive)
          // Nếu đang MỞ (raw < prev): smoothing CỰC THẤP (mở nhanh hơn)
          const SMOOTH_CLOSE = 0.2;   // Nhắm: 80% raw, 20% prev (nhanh)
          const SMOOTH_OPEN = 0.05;   // Mở: 95% raw, 5% prev (CỰC NHANH)
          
          const smoothFactorL = blinkLeftRaw > prevLeft ? SMOOTH_CLOSE : SMOOTH_OPEN;
          const smoothFactorR = blinkRightRaw > prevRight ? SMOOTH_CLOSE : SMOOTH_OPEN;
          
          const blinkLeft = smoothFactorL * prevLeft + (1 - smoothFactorL) * blinkLeftRaw;
          const blinkRight = smoothFactorR * prevRight + (1 - smoothFactorR) * blinkRightRaw;
          
          window._prevBlinkCustom = { l: blinkLeft, r: blinkRight };
          
          // Debug log mỗi 1 giây
          if (!window._lastMediaPipeLog || Date.now() - window._lastMediaPipeLog > 1000) {
            console.log('👁️ Kalidokit Eyes (Asymmetric Smooth):', { 
              'Video Size': `${videoElement.videoWidth}x${videoElement.videoHeight}`,
              'LEFT raw→smooth': `${blinkLeftRaw.toFixed(3)}→${blinkLeft.toFixed(3)}`,
              'RIGHT raw→smooth': `${blinkRightRaw.toFixed(3)}→${blinkRight.toFixed(3)}`,
              'Smooth factors': `Close=${SMOOTH_CLOSE}, Open=${SMOOTH_OPEN}`,
              'Diff (L-R)': Math.abs(blinkLeft - blinkRight).toFixed(3)
            });
            window._lastMediaPipeLog = Date.now();
          }
          
          // ✅ NO SWAP: Camera mirrored + Model mirrored = Same perspective
          if (onResultsRef.current) {
            onResultsRef.current({
              blinkLeft: blinkLeft,     // Kalidokit → VRM format
              blinkRight: blinkRight,
              rawEyeL: riggedFace.eye.l,  // Debug: raw Kalidokit value
              rawEyeR: riggedFace.eye.r
            });
          } else {
            if (!window._noCallbackWarningShown) {
              console.warn('⚠️ MediaPipe: onResultsRef.current is null!');
              window._noCallbackWarningShown = true;
            }
          }
        } else {
          // Không phát hiện mặt - log mỗi 5 giây
          if (!window._lastNoFaceLog || Date.now() - window._lastNoFaceLog > 5000) {
            console.warn('⚠️ MediaPipe: NO FACE DETECTED (check lighting, camera angle, distance)');
            window._lastNoFaceLog = Date.now();
          }
        }
      } catch (error) {
        console.error('MediaPipe + Kalidokit error:', error);
      }
    }
  };
}

// ❌ REMOVED: Manual EAR calculation - Kalidokit handles this professionally
// Old code used custom calculateEAR() with eye indices - no longer needed
