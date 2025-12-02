import { useEffect, useRef } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * Hook để track mắt bằng MediaPipe FaceLandmarker
 * Dùng @mediapipe/tasks-vision API mới, ổn định hơn
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
        } else {
          // Không phát hiện mặt - log mỗi 5 giây
          if (!window._lastNoFaceLog || Date.now() - window._lastNoFaceLog > 5000) {
            console.warn('⚠️ MediaPipe: NO FACE DETECTED (check lighting, camera angle, distance)');
            window._lastNoFaceLog = Date.now();
          }
          return;
        }
        
        {
          const landmarks = results.faceLandmarks[0];
          
          // Tính EAR cho mắt trái và phải
          const leftEyeEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
          const rightEyeEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
          
          // Map EAR sang blink value (0=mở, 1=nhắm)
          // Điều chỉnh ngưỡng dựa trên giá trị thực tế:
          // - Mở hoàn toàn: EAR ~ 0.35-0.45
          // - Nhắm hoàn toàn: EAR ~ 0.10-0.15
          const EAR_THRESHOLD_OPEN = 0.35;    // Trên ngưỡng này = mắt MỞ (blink = 0)
          const EAR_THRESHOLD_CLOSED = 0.15;  // Dưới ngưỡng này = mắt NHẮM (blink = 1)
          
          // Linear interpolation giữa 2 ngưỡng để có chuyển động mượt
          const leftBlink = leftEyeEAR > EAR_THRESHOLD_OPEN ? 0 
            : leftEyeEAR < EAR_THRESHOLD_CLOSED ? 1 
            : (EAR_THRESHOLD_OPEN - leftEyeEAR) / (EAR_THRESHOLD_OPEN - EAR_THRESHOLD_CLOSED);
          
          const rightBlink = rightEyeEAR > EAR_THRESHOLD_OPEN ? 0 
            : rightEyeEAR < EAR_THRESHOLD_CLOSED ? 1 
            : (EAR_THRESHOLD_OPEN - rightEyeEAR) / (EAR_THRESHOLD_OPEN - EAR_THRESHOLD_CLOSED);
          
          // Debug log mỗi 3 giây
          if (!window._lastMediaPipeLog || Date.now() - window._lastMediaPipeLog > 3000) {
            console.log('👁️ MediaPipe Eyes:', { 
              leftEyeEAR: leftEyeEAR.toFixed(3), 
              rightEyeEAR: rightEyeEAR.toFixed(3),
              leftBlink: leftBlink.toFixed(3),
              rightBlink: rightBlink.toFixed(3)
            });
            window._lastMediaPipeLog = Date.now();
          }
          
          // Callback với kết quả - dùng ref để tránh re-init
          if (onResultsRef.current) {
            onResultsRef.current({
              blinkLeft: leftBlink,
              blinkRight: rightBlink,
              leftEyeEAR,
              rightEyeEAR
            });
          } else {
            if (!window._noCallbackWarningShown) {
              console.warn('⚠️ MediaPipe: onResultsRef.current is null!');
              window._noCallbackWarningShown = true;
            }
          }
        }
      } catch (error) {
        console.error('MediaPipe detect error:', error);
      }
    }
  };
}

// MediaPipe FaceLandmarker eye landmark indices (468 landmarks)
const LEFT_EYE_INDICES = [
  362, 385, 387, 263, // Upper eyelid
  373, 380, 374, 263  // Lower eyelid
];

const RIGHT_EYE_INDICES = [
  33, 160, 158, 133,  // Upper eyelid
  144, 153, 145, 133  // Lower eyelid
];

/**
 * Tính Eye Aspect Ratio (EAR)
 * EAR cao = mắt mở, EAR thấp = mắt nhắm
 */
function calculateEAR(landmarks, eyeIndices) {
  // Vertical distances
  const v1 = distance(landmarks[eyeIndices[1]], landmarks[eyeIndices[5]]);
  const v2 = distance(landmarks[eyeIndices[2]], landmarks[eyeIndices[6]]);
  
  // Horizontal distance
  const h = distance(landmarks[eyeIndices[0]], landmarks[eyeIndices[3]]);
  
  // EAR formula
  const ear = (v1 + v2) / (2.0 * h);
  return ear;
}

function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
