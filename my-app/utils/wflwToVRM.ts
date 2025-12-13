// WFLW to VRM Adapter
// Converts 98 WFLW landmarks to VRM-compatible face rig data

export interface WFLWLandmark {
  x: number;
  y: number;
}

export interface WFLWData {
  landmarks: WFLWLandmark[]; // 98 landmarks
  pitch: number;
  yaw: number;
  roll: number;
}

export interface VRMFaceRig {
  eye: {
    l: number; // Left pupil x (-1 to 1)
    r: number; // Right pupil x
  };
  pupil: {
    x: number; // Combined x
    y: number; // Combined y
  };
  blink: {
    l: number; // 0 = open, 1 = closed
    r: number;
  };
  brow: number; // Eyebrow height (-1 to 1)
  mouth: {
    x: number;
    y: number;
    shape: {
      A: number; // aa (open mouth)
      E: number; // ee (smile)
      I: number; // ih
      O: number; // oh (round)
      U: number; // ou
    };
  };
  head: {
    x: number; // Pitch (nod)
    y: number; // Yaw (shake)
    z: number; // Roll (tilt)
    width: number;
    height: number;
    position: { x: number; y: number; z: number };
  };
}

/**
 * Convert WFLW 98 landmarks to VRM-compatible face rig
 * WFLW Landmark indices:
 * - Face contour: 0-32
 * - Left eyebrow: 33-41
 * - Right eyebrow: 42-50
 * - Nose: 51-59
 * - Left eye: 60-67 (96 = pupil)
 * - Right eye: 68-75 (97 = pupil)
 * - Mouth: 76-95
 */
export function wflwToVRMRig(
  data: WFLWData,
  imageWidth: number = 160,
  imageHeight: number = 120
): VRMFaceRig {
  const { landmarks, pitch, yaw, roll } = data;

  // Normalize coordinates to [-1, 1] range
  const normalize = (point: WFLWLandmark) => ({
    x: (point.x / imageWidth) * 2 - 1,
    y: -((point.y / imageHeight) * 2 - 1), // Flip Y axis
  });

  // === 1. EYE TRACKING ===
  const leftPupil = normalize(landmarks[96]);
  const rightPupil = normalize(landmarks[97]);

  // Left eye bounds
  const leftEyeLeft = normalize(landmarks[60]); // Outer corner
  const leftEyeRight = normalize(landmarks[64]); // Inner corner
  const leftEyeTop = normalize(landmarks[61]);
  const leftEyeBottom = normalize(landmarks[65]);

  // Right eye bounds
  const rightEyeLeft = normalize(landmarks[68]); // Inner corner
  const rightEyeRight = normalize(landmarks[72]); // Outer corner
  const rightEyeTop = normalize(landmarks[69]);
  const rightEyeBottom = normalize(landmarks[73]);

  // Calculate pupil position relative to eye bounds (-1 to 1)
  const leftEyeWidth = leftEyeRight.x - leftEyeLeft.x;
  const rightEyeWidth = rightEyeRight.x - rightEyeLeft.x;

  const leftPupilX =
    leftEyeWidth > 0
      ? ((leftPupil.x - leftEyeLeft.x) / leftEyeWidth) * 2 - 1
      : 0;
  const rightPupilX =
    rightEyeWidth > 0
      ? ((rightPupil.x - rightEyeLeft.x) / rightEyeWidth) * 2 - 1
      : 0;

  const leftEyeHeight = Math.abs(leftEyeBottom.y - leftEyeTop.y);
  const rightEyeHeight = Math.abs(rightEyeBottom.y - rightEyeTop.y);
  const avgEyeHeight = (leftEyeHeight + rightEyeHeight) / 2;

  const pupilY =
    avgEyeHeight > 0
      ? (((leftPupil.y + rightPupil.y) / 2 -
          (leftEyeTop.y + rightEyeTop.y) / 2) /
          avgEyeHeight) *
          2 -
        1
      : 0;

  // === 2. BLINK DETECTION ===
  const leftEyeWidthPx = Math.abs(landmarks[64].x - landmarks[60].x);
  const rightEyeWidthPx = Math.abs(landmarks[72].x - landmarks[68].x);
  const leftEyeHeightPx = Math.abs(landmarks[65].y - landmarks[61].y);
  const rightEyeHeightPx = Math.abs(landmarks[73].y - landmarks[69].y);

  // Eye Aspect Ratio (EAR) - when eyes close, height decreases
  const leftEAR = leftEyeWidthPx > 0 ? leftEyeHeightPx / leftEyeWidthPx : 0.3;
  const rightEAR = rightEyeWidthPx > 0 ? rightEyeHeightPx / rightEyeWidthPx : 0.3;

  // Threshold phù hợp với ảnh 240x180
  // EAR mắt mở tự nhiên: 0.18-0.25
  // EAR mắt nhắm hẳn: 0.05-0.10
  const EAR_OPEN = 0.20;    // Ngưỡng mắt mở bình thường
  const EAR_CLOSED = 0.10;  // Ngưỡng mắt nhắm hẳn
  
  // VRM chuẩn: 0=mở, 1=nhắm
  const blinkLeft = leftEAR > EAR_OPEN 
    ? 0  // Mắt mở - Blink = 0
    : leftEAR < EAR_CLOSED
      ? 1  // Mắt nhắm - Blink = 1
      : (EAR_OPEN - leftEAR) / (EAR_OPEN - EAR_CLOSED); // Interpolate
  
  const blinkRight = rightEAR > EAR_OPEN
    ? 0
    : rightEAR < EAR_CLOSED
      ? 1
      : (EAR_OPEN - rightEAR) / (EAR_OPEN - EAR_CLOSED);

  // 👁️ LOG BLINK DEBUG (mỗi 10s)
  logBlinkDebug(
    leftEAR,
    rightEAR,
    blinkLeft,
    blinkRight,
    leftEyeHeightPx,
    rightEyeHeightPx,
    leftEyeWidthPx,
    rightEyeWidthPx
  );

  // === 3. EYEBROW HEIGHT ===
  // Compare eyebrow top landmarks with eye top
  const leftBrowY = normalize(landmarks[35]).y; // Center of left brow
  const rightBrowY = normalize(landmarks[44]).y; // Center of right brow
  const avgBrowY = (leftBrowY + rightBrowY) / 2;
  const avgEyeTopY = (leftEyeTop.y + rightEyeTop.y) / 2;

  // Positive = raised brows, negative = furrowed
  const browHeight = avgBrowY - avgEyeTopY;
  const browValue = Math.max(-1, Math.min(1, browHeight * 8));

  // === 4. MOUTH SHAPE ===
  const mouthTop = normalize(landmarks[79]);
  const mouthBottom = normalize(landmarks[85]);
  const mouthLeft = normalize(landmarks[76]);
  const mouthRight = normalize(landmarks[82]);

  const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
  const mouthHeight = Math.abs(mouthBottom.y - mouthTop.y);

  // Mouth center
  const mouthX = (mouthLeft.x + mouthRight.x) / 2;
  const mouthY = (mouthTop.y + mouthBottom.y) / 2;

  // BASELINE VALUES phù hợp với ảnh 240x180
  const BASELINE_MOUTH_WIDTH = 0.25;   // Width môi tự nhiên
  const BASELINE_MOUTH_HEIGHT = 0.05;  // Height môi chạm nhau nhẹ (tăng từ 0.02)
  const THRESHOLD_MOUTH_OPEN = 0.03;   // Cần vượt 0.03 mới coi là há miệng
  const THRESHOLD_SMILE = 0.04;        // Cần vượt 0.04 mới coi là cười
  
  // 🎯 OFFSET CORRECTION: Server có bias khi mím miệng
  const MOUTH_HEIGHT_OFFSET = 0.03;     // Trừ đi bias height (điều chỉnh giá trị này)
  const MOUTH_HEIGHT_MULTIPLIER = 0.8;  // Giảm sensitivity để không há quá rộng
  
  // Adjust mouth height với offset và multiplier
  const adjustedMouthHeight = Math.max(0, mouthHeight - MOUTH_HEIGHT_OFFSET);
  
  // Calculate aspect ratio (dùng adjusted height)
  const mouthAspect = mouthWidth > 0 ? adjustedMouthHeight / mouthWidth : 0;
  
  // A (aa) - open mouth vertically với correction
  const heightDelta = (adjustedMouthHeight - BASELINE_MOUTH_HEIGHT) * MOUTH_HEIGHT_MULTIPLIER;
  const shapeA = heightDelta > THRESHOLD_MOUTH_OPEN
    ? Math.max(0, Math.min(1, (heightDelta - THRESHOLD_MOUTH_OPEN) / 0.08))
    : 0;
  
  // E (ee) - wide smile (giữ nguyên)
  const widthDelta = mouthWidth - BASELINE_MOUTH_WIDTH;
  const shapeE = widthDelta > THRESHOLD_SMILE
    ? Math.max(0, Math.min(1, (widthDelta - THRESHOLD_SMILE) / 0.10))
    : 0;
  
  // O (oh) - round mouth (dùng heightDelta đã adjusted)
  const shapeO = mouthAspect > 0.4 && heightDelta > THRESHOLD_MOUTH_OPEN
    ? Math.max(0, Math.min(1, (mouthAspect - 0.4) * 2 * (heightDelta / 0.08)))
    : 0;
  
  // I - slight opening (dùng heightDelta đã adjusted)
  const shapeI = heightDelta > THRESHOLD_MOUTH_OPEN && heightDelta < 0.06
    ? Math.max(0, Math.min(1, (heightDelta - THRESHOLD_MOUTH_OPEN) / 0.03))
    : 0;
  
  // U - lips protruded (dùng heightDelta đã adjusted)
  const shapeU = mouthAspect > 0.5 && heightDelta > 0.02 && heightDelta < 0.07
    ? Math.max(0, Math.min(1, (mouthAspect - 0.5) * 3))
    : 0;

  // === 5. HEAD ROTATION ===
  // Convert degrees to radians (VRM uses radians)
  // 🔧 AMPLIFY: Tăng sensitivity cho Pitch và Yaw
  const PITCH_MULTIPLIER = -1.5;  // ⚠️ ĐẢO DẤU: Server pitch ngược với VRM
  const YAW_MULTIPLIER = 1.5;     // Xoay mặt nhạy hơn 1.5x
  const ROLL_MULTIPLIER = 1.0;    // Giữ nguyên (đã hoạt động tốt)
  
  // 🎯 OFFSET CORRECTION: Server có bias khi mặt thẳng
  // Điều chỉnh giá trị này nếu model vẫn cúi/ngẩng/xoay khi bạn giữ mặt thẳng
  const PITCH_OFFSET = 10;  // Trừ đi pitch bias (gật đầu)
  const YAW_OFFSET = 14;    // Trừ đi yaw bias (model xoay trái → cần offset âm)
  const ROLL_OFFSET = 0;    // Không cần offset cho roll
  
  const headX = ((pitch - PITCH_OFFSET) * PITCH_MULTIPLIER * Math.PI) / 180;
  const headY = (-(yaw - YAW_OFFSET) * YAW_MULTIPLIER * Math.PI) / 180;
  const headZ = ((roll - ROLL_OFFSET) * ROLL_MULTIPLIER * Math.PI) / 180;

  // Face dimensions for width/height
  const faceLeft = normalize(landmarks[0]); // Left jaw
  const faceRight = normalize(landmarks[32]); // Right jaw
  const faceTop = normalize(landmarks[24]); // Nose bridge area
  const faceBottom = normalize(landmarks[16]); // Chin

  const faceWidth = Math.abs(faceRight.x - faceLeft.x);
  const faceHeight = Math.abs(faceBottom.y - faceTop.y);

  // Face center for position
  const faceCenterX = (faceLeft.x + faceRight.x) / 2;
  const faceCenterY = (faceTop.y + faceBottom.y) / 2;

  const result = {
    eye: {
      l: leftPupilX,
      r: rightPupilX,
    },
    pupil: {
      x: (leftPupilX + rightPupilX) / 2,
      y: pupilY,
    },
    blink: {
      l: 0,  // ❌ WFLW KHÔNG điều khiển blink - MediaPipe sẽ xử lý 100%
      r: 0,  // ❌ WFLW KHÔNG điều khiển blink - MediaPipe sẽ xử lý 100%
    },
    brow: browValue,
    mouth: {
      x: mouthX,
      y: mouthY,
      shape: {
        A: shapeA,
        E: shapeE,
        I: shapeI,
        O: shapeO,
        U: shapeU,
      },
    },
    head: {
      x: headX,
      y: headY,
      z: headZ,
      width: faceWidth,
      height: faceHeight,
      position: { x: faceCenterX, y: faceCenterY, z: 0 },
    },
  };
  
  return result;
}

// Debug helper: Log raw mouth values từ WFLW (TẮT để tăng performance)
let lastRawLogTime = 0;
export function logRawMouthValues(rigData: VRMFaceRig): void {
  const now = Date.now();
  if (now - lastRawLogTime < 10000) return; // Log mỗi 10s
  lastRawLogTime = now;
  
  // Chỉ log khi có thay đổi đáng kể
  if (rigData.mouth.shape.A > 0.1 || rigData.mouth.shape.E > 0.1 || rigData.blink.l > 0.5) {
    console.log('📊 RAW VALUES:', 
      `Brow:${rigData.brow.toFixed(2)}`,
      `A:${rigData.mouth.shape.A.toFixed(2)}`,
      `E:${rigData.mouth.shape.E.toFixed(2)}`,
      `Blink:${rigData.blink.l.toFixed(2)}`
    );
  }
}

// Debug helper: Log blink detection từ EAR
let lastBlinkLogTime = 0;
export function logBlinkDebug(
  leftEAR: number,
  rightEAR: number,
  blinkLeft: number,
  blinkRight: number,
  leftEyeHeightPx: number,
  rightEyeHeightPx: number,
  leftEyeWidthPx: number,
  rightEyeWidthPx: number
): void {
  const now = Date.now();
  if (now - lastBlinkLogTime < 10000) return; // Log mỗi 10s
  lastBlinkLogTime = now;
  
  console.log('\n👁️ === STAGE 1: WFLW BLINK DETECTION (EAR) ===');
  console.log(`Left Eye:  EAR=${leftEAR.toFixed(3)} | Height=${leftEyeHeightPx.toFixed(1)}px | Width=${leftEyeWidthPx.toFixed(1)}px`);
  console.log(`Right Eye: EAR=${rightEAR.toFixed(3)} | Height=${rightEyeHeightPx.toFixed(1)}px | Width=${rightEyeWidthPx.toFixed(1)}px`);
  console.log(`Blink Values: Left=${blinkLeft.toFixed(3)} | Right=${blinkRight.toFixed(3)}`);
  console.log(`Thresholds: EAR_OPEN=0.20 | EAR_CLOSED=0.10 | Logic: 0.0=MỞ, 1.0=NHẮM`);
  
  if (blinkLeft > 0.3 || blinkRight > 0.3) {
    console.warn('⚠️ BLINK > 0.3 - Mắt đang nhắm hoặc EAR thấp!');
    if (leftEAR < 0.20 || rightEAR < 0.20) {
      console.error('❌ EAR < 0.20 - Nguyên nhân: Landmarks sai HOẶC mắt thật sự đang nhắm');
      console.log('   → Kiểm tra: Landmarks có đúng không? (index 60-67, 68-75)');
      console.log('   → Nếu mắt MỞ nhưng EAR < 0.20: Cần tăng EAR_OPEN lên 0.25');
    }
  }
}
