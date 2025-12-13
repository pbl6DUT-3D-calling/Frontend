import { VRM } from '@pixiv/three-vrm';
import { Euler, Quaternion } from 'three';
import { AIServerResult, AIServerLandmark } from './services/aiServerClient';

declare global {
  interface Window {
    _lastBlinkLog?: number;
  }
}

// ⬅️ THÊM: MediaPipe eye data type
interface MediaPipeEyeData {
  blinkLeft: number;
  blinkRight: number;
}


// Lerp helper
const lerp = (start: number, end: number, amount: number): number => {
  return start + (end - start) * amount;
};

// Clamp helper
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// Smoothing filter
class SmoothingFilter {
  private history: number[] = [];
  private maxHistory = 5;

  smooth(value: number): number {
    this.history.push(value);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    return this.history.reduce((a, b) => a + b, 0) / this.history.length;
  }

  reset() {
    this.history = [];
  }
}

// Global smoothing filters
const pitchFilter = new SmoothingFilter();
const yawFilter = new SmoothingFilter();
const rollFilter = new SmoothingFilter();

// Convert AI Server's 98 landmarks to facial features
function extractFacialFeatures(landmarks: AIServerLandmark[]) {
  if (landmarks.length !== 98) {
    console.warn('Expected 98 landmarks, got', landmarks.length);
    return null;
  }

  const leftEye = landmarks.slice(60, 68);
  const rightEye = landmarks.slice(68, 76);
  const mouth = landmarks.slice(76, 96);

  // ⬅️ AI Server eye openness (fallback nếu không có MediaPipe)
  const leftEyeOpenness = calculateEyeOpenness(leftEye);
  const rightEyeOpenness = calculateEyeOpenness(rightEye);
  const mouthOpenness = calculateMouthOpenness(mouth);

  return {
    leftEyeOpenness,
    rightEyeOpenness,
    mouthOpenness,
  };
}

function calculateEyeOpenness(eyeLandmarks: AIServerLandmark[]): number {
  if (eyeLandmarks.length < 8) return 1;

  const d1 = Math.abs(eyeLandmarks[1].y - eyeLandmarks[7].y);
  const d2 = Math.abs(eyeLandmarks[2].y - eyeLandmarks[6].y);
  const d3 = Math.abs(eyeLandmarks[3].y - eyeLandmarks[5].y);
  
  const avgHeight = (d1 + d2 + d3) / 3;
  const width = Math.abs(eyeLandmarks[4].x - eyeLandmarks[0].x);
  const ratio = avgHeight / (width + 0.001);
  const openness = clamp((ratio - 0.05) / 0.2, 0, 1);

  return openness;
}

function calculateMouthOpenness(mouthLandmarks: AIServerLandmark[]): number {
  if (mouthLandmarks.length < 20) return 0;

  const outerTop = mouthLandmarks[2].y;
  const outerBottom = mouthLandmarks[8].y;
  const outerHeight = Math.abs(outerBottom - outerTop);

  const innerTop = mouthLandmarks[13].y;
  const innerBottom = mouthLandmarks[17].y;
  const innerHeight = Math.abs(innerBottom - innerTop);

  const avgHeight = (outerHeight + innerHeight) / 2;

  const left = mouthLandmarks[0].x;
  const right = mouthLandmarks[6].x;
  const width = Math.abs(right - left);

  const ratio = avgHeight / (width + 0.001);
  const openness = clamp((ratio - 0.05) / 0.4, 0, 1);

  return openness;
}

// ⬅️ SỬA: Thêm MediaPipe eye data parameter
export const animateVRMWithAI = (
  vrm: VRM,
  result: AIServerResult,
  delta: number = 0.016,
  mediaPipeEyeData: MediaPipeEyeData | null = null // ⬅️ THÊM parameter
) => {
  if (!vrm || !result.found) return;

  const { pitch, yaw, roll, landmarks } = result;

  const features = extractFacialFeatures(landmarks);
  if (!features) return;

  rigFaceAI(vrm, pitch, yaw, roll, features, delta, mediaPipeEyeData); // ⬅️ Pass MediaPipe data
};

interface FacialFeatures {
  leftEyeOpenness: number;
  rightEyeOpenness: number;
  mouthOpenness: number;
}

// ⬅️ SỬA: Thêm MediaPipe parameter
const rigFaceAI = (
  vrm: VRM,
  pitch: number,
  yaw: number,
  roll: number,
  features: FacialFeatures,
  delta: number,
  mediaPipeEyeData: MediaPipeEyeData | null = null // ⬅️ THÊM
) => {
  if (!vrm?.expressionManager) return;

  const expressionManager = vrm.expressionManager;
  const lerpAmount = Math.min(delta * 20, 0.5);

  const lerpExpression = (name: string, targetValue: number) => {
    const current = expressionManager.getValue(name) || 0;
    const newValue = lerp(current, targetValue, lerpAmount);
    expressionManager.setValue(name, clamp(newValue, 0, 1));
  };

  // === HEAD ROTATION ===
  const clampedPitch = clamp(pitch, -45, 45);
  const clampedYaw = clamp(yaw, -60, 60);
  const clampedRoll = clamp(roll, -30, 30);

  const smoothPitch = pitchFilter.smooth(clampedPitch);
  const smoothYaw = yawFilter.smooth(clampedYaw);
  const smoothRoll = rollFilter.smooth(clampedRoll);

  const pitchRad = (-smoothPitch * Math.PI) / 180;
  const yawRad = (smoothYaw * Math.PI) / 180;
  const rollRad = (smoothRoll * Math.PI) / 180;

  rigRotation(
    'neck',
    { x: pitchRad, y: yawRad, z: rollRad },
    0.5,
    lerpAmount * 1.2,
    vrm
  );

  // === EYES ===
  // ⬅️ PRIORITY: MediaPipe 100% điều khiển blink
  if (mediaPipeEyeData) {
    // ✅ Dùng MediaPipe (ưu tiên cao nhất)
    lerpExpression('blinkLeft', mediaPipeEyeData.blinkLeft);
    lerpExpression('blinkRight', mediaPipeEyeData.blinkRight);
    
    // Debug log
    if (!window._lastBlinkLog || Date.now() - window._lastBlinkLog > 1000) {
      console.log('👁️ [vrmRiggingAI] Using MediaPipe blink:', {
        blinkLeft: mediaPipeEyeData.blinkLeft.toFixed(3),
        blinkRight: mediaPipeEyeData.blinkRight.toFixed(3),
      });
      window._lastBlinkLog = Date.now();
    }
  } else {
    // ⬇️ Fallback: Dùng AI Server eye openness
    const blinkThreshold = 0.5;

    const leftBlink = features.leftEyeOpenness < blinkThreshold 
      ? 1 - features.leftEyeOpenness / blinkThreshold 
      : 0;
    const rightBlink = features.rightEyeOpenness < blinkThreshold 
      ? 1 - features.rightEyeOpenness / blinkThreshold 
      : 0;

    lerpExpression('blinkLeft', leftBlink);
    lerpExpression('blinkRight', rightBlink);
    
    console.warn('⚠️ Using AI Server blink (MediaPipe not available)');
  }

  // === MOUTH ===
  const mouthOpen = features.mouthOpenness;

  if (mouthOpen > 0.7) {
    lerpExpression('aa', mouthOpen);
    lerpExpression('oh', 0);
    lerpExpression('ou', 0);
  } else if (mouthOpen > 0.4) {
    lerpExpression('aa', 0);
    lerpExpression('oh', (mouthOpen - 0.4) / 0.3);
    lerpExpression('ou', 0);
  } else if (mouthOpen > 0.15) {
    lerpExpression('aa', 0);
    lerpExpression('oh', 0);
    lerpExpression('ou', (mouthOpen - 0.15) / 0.25);
  } else {
    lerpExpression('aa', 0);
    lerpExpression('oh', 0);
    lerpExpression('ou', 0);
    lerpExpression('ee', 0);
    lerpExpression('ih', 0);
  }
};

export const rigRotation = (
  name: string,
  rotation: { x: number; y: number; z: number },
  dampener = 1,
  lerpAmount = 0.3,
  vrm: VRM
) => {
  const bone = vrm.humanoid?.getNormalizedBoneNode(name as any);
  if (!bone) return;

  const targetEuler = new Euler(
    rotation.x * dampener,
    rotation.y * dampener,
    rotation.z * dampener,
    'YXZ'
  );

  const targetQuat = new Quaternion().setFromEuler(targetEuler);

  bone.quaternion.slerp(targetQuat, lerpAmount);
};