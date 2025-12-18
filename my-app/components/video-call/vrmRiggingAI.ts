import { VRM } from '@pixiv/three-vrm';
import { Euler, Quaternion } from 'three';
import { AIServerResult, AIServerLandmark } from './services/aiServerClient';

declare global {
  interface Window {
    _lastBlinkLog?: number;
    _prevMouthValues?: {
      aa: number;
      oh: number;
      ou: number;
    };
    _prevHeadRotation?: {
      pitch: number;
      yaw: number;
      roll: number;
    };
    _prevEyeBlink?: {
      left: number;
      right: number;
    };
  }
}

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

// Decay helper
const decay = (current: number, rate: number = 0.95): number => {
  return current * rate;
};

// ✅ THÊM: Exponential Moving Average (EMA) - Smooth hơn simple average
class EMAFilter {
  private value: number | null = null;
  private alpha: number;

  constructor(alpha: number = 0.3) {
    this.alpha = alpha; // Lower = smoother (0.1-0.5)
  }

  smooth(newValue: number): number {
    if (this.value === null) {
      this.value = newValue;
      return newValue;
    }
    
    this.value = this.alpha * newValue + (1 - this.alpha) * this.value;
    return this.value;
  }

  reset() {
    this.value = null;
  }
}

// Smoothing filter (Original)
class SmoothingFilter {
  private history: number[] = [];
  private maxHistory = 3; // ✅ GIẢM: 7 → 3 (faster response)

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

// ✅ XÓA EMA filters (quá chậm) - Chỉ dùng SmoothingFilter
const pitchFilter = new SmoothingFilter();
const yawFilter = new SmoothingFilter();
const rollFilter = new SmoothingFilter();

const mouthAaFilter = new SmoothingFilter();
const mouthOhFilter = new SmoothingFilter();
const mouthOuFilter = new SmoothingFilter();

const blinkLeftFilter = new SmoothingFilter();
const blinkRightFilter = new SmoothingFilter();

export const animateVRMWithAI = (
  vrm: VRM,
  result: AIServerResult,
  delta: number = 0.016,
  mediaPipeEyeData: MediaPipeEyeData | null = null,
  imageWidth: number = 160,   // ⬅️ THÊM: default 160
  imageHeight: number = 120   // ⬅️ THÊM: default 120
) => {
  if (!vrm || !result.found) return;

  const { pitch, yaw, roll, landmarks } = result;

  // ⬅️ LOG: Debug resolution mismatch
  if (!window._lastResolutionLog || Date.now() - window._lastResolutionLog > 5000) {
    console.log('📐 [vrmRiggingAI] Image resolution:', {
      width: imageWidth,
      height: imageHeight,
      landmarksSample: landmarks.slice(0, 3).map(l => `(${l.x.toFixed(1)}, ${l.y.toFixed(1)})`)
    });
    window._lastResolutionLog = Date.now();
  }

  // ⬅️ FIX: Pass width/height vào extractFacialFeatures
  const features = extractFacialFeatures(landmarks, imageWidth, imageHeight);
  if (!features) return;

  rigFaceAI(vrm, pitch, yaw, roll, features, delta, mediaPipeEyeData);
};

// ⬅️ CẬP NHẬT: extractFacialFeatures nhận width/height
function extractFacialFeatures(
  landmarks: AIServerLandmark[], 
  imageWidth: number = 160,   // ⬅️ THÊM
  imageHeight: number = 120   // ⬅️ THÊM
) {
  if (landmarks.length !== 98) {
    return null;
  }

  const leftEye = landmarks.slice(60, 68);
  const rightEye = landmarks.slice(68, 76);
  const mouth = landmarks.slice(76, 96);

  // ⬅️ Pass width/height vào các hàm tính toán
  const leftEyeOpenness = calculateEyeOpenness(leftEye, imageWidth, imageHeight);
  const rightEyeOpenness = calculateEyeOpenness(rightEye, imageWidth, imageHeight);
  const mouthOpenness = calculateMouthOpenness(mouth, imageWidth, imageHeight);

  return {
    leftEyeOpenness,
    rightEyeOpenness,
    mouthOpenness,
  };
}

// ⬅️ CẬP NHẬT: Các hàm tính toán nhận width/height
function calculateEyeOpenness(
  eyeLandmarks: AIServerLandmark[], 
  imageWidth: number, 
  imageHeight: number
): number {
  if (eyeLandmarks.length < 8) return 1;

  const d1 = Math.abs(eyeLandmarks[1].y - eyeLandmarks[7].y);
  const d2 = Math.abs(eyeLandmarks[2].y - eyeLandmarks[6].y);
  const d3 = Math.abs(eyeLandmarks[3].y - eyeLandmarks[5].y);
  
  const avgHeight = (d1 + d2 + d3) / 3;
  const width = Math.abs(eyeLandmarks[4].x - eyeLandmarks[0].x);
  const ratio = avgHeight / (width + 0.001);
  
  // ⬅️ SCALE THEO RESOLUTION: Thresholds phụ thuộc vào kích thước ảnh
  // 160x120 có EAR khác 240x180!
  const resolutionFactor = Math.sqrt((imageWidth * imageHeight) / (160 * 120));
  const adjustedRatio = ratio / resolutionFactor;
  
  const openness = clamp((adjustedRatio - 0.05) / 0.2, 0, 1);

  return openness;
}

function calculateMouthOpenness(
  mouthLandmarks: AIServerLandmark[], 
  imageWidth: number, 
  imageHeight: number
): number {
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
  
  // ✅ XÓA resolution factor (không cần thiết khi dùng 160x120 cố định)
  // ✅ TĂNG RANGE: Cho phép openness lên tới 1.0
  const openness = clamp(ratio / 0.4, 0, 1); // ✅ THAY ĐỔI: Normalize to 0-1

  return openness;
}

interface FacialFeatures {
  leftEyeOpenness: number;
  rightEyeOpenness: number;
  mouthOpenness: number;
}

const rigFaceAI = (
  vrm: VRM,
  pitch: number,
  yaw: number,
  roll: number,
  features: FacialFeatures,
  delta: number,
  mediaPipeEyeData: MediaPipeEyeData | null = null
) => {
  if (!vrm?.expressionManager) return;

  const expressionManager = vrm.expressionManager;
  
  // ✅ TĂNG lerp amount: 0.2 → 0.4 (FASTER RESPONSE)
  const lerpAmount = Math.min(delta * 20, 0.4);

  const lerpExpression = (name: string, targetValue: number) => {
    const current = expressionManager.getValue(name) || 0;
    const newValue = lerp(current, targetValue, lerpAmount);
    expressionManager.setValue(name, clamp(newValue, 0, 1));
  };

  // === HEAD ROTATION - ✅ XÓA EMA, CHỈ GIỮ 1 LAYER SMOOTHING ===
  if (!window._prevHeadRotation) {
    window._prevHeadRotation = { pitch, yaw, roll };
  }

  const clampedPitch = clamp(pitch, -45, 45);
  const clampedYaw = clamp(yaw, -60, 60);
  const clampedRoll = clamp(roll, -30, 30);

  // ✅ CHỈ 1 LAYER: Moving average
  const smoothPitch = pitchFilter.smooth(clampedPitch);
  const smoothYaw = yawFilter.smooth(clampedYaw);
  const smoothRoll = rollFilter.smooth(clampedRoll);

  const pitchRad = (-smoothPitch * Math.PI) / 180;
  const yawRad = (smoothYaw * Math.PI) / 180;
  const rollRad = (-smoothRoll * Math.PI) / 180;

  rigRotation(
    'neck',
    { x: pitchRad, y: yawRad, z: rollRad },
    0.5,
    lerpAmount * 1.5, // ✅ TĂNG: 1.0 → 1.5
    vrm
  );

  // === EYES - ✅ ĐƠN GIẢN HÓA ===
  if (!window._prevEyeBlink) {
    window._prevEyeBlink = { left: 0, right: 0 };
  }

  if (mediaPipeEyeData) {
    const smoothBlinkLeft = blinkLeftFilter.smooth(mediaPipeEyeData.blinkLeft);
    const smoothBlinkRight = blinkRightFilter.smooth(mediaPipeEyeData.blinkRight);
    
    lerpExpression('blinkLeft', smoothBlinkLeft);
    lerpExpression('blinkRight', smoothBlinkRight);
  } else {
    const blinkThreshold = 0.5;

    const leftBlink = features.leftEyeOpenness < blinkThreshold 
      ? 1 - features.leftEyeOpenness / blinkThreshold 
      : 0;
    const rightBlink = features.rightEyeOpenness < blinkThreshold 
      ? 1 - features.rightEyeOpenness / blinkThreshold 
      : 0;

    const smoothBlinkLeft = blinkLeftFilter.smooth(leftBlink);
    const smoothBlinkRight = blinkRightFilter.smooth(rightBlink);

    lerpExpression('blinkLeft', smoothBlinkLeft);
    lerpExpression('blinkRight', smoothBlinkRight);
  }

  // === MOUTH - ✅ FIX THRESHOLDS ===
  const mouthOpen = features.mouthOpenness; // ✅ BÂY GIỜ: 0.0 - 1.0
  
  if (!window._prevMouthValues) {
    window._prevMouthValues = { aa: 0, oh: 0, ou: 0 };
  }
  
  let targetAa = 0;
  let targetOh = 0;
  let targetOu = 0;

  // ✅ FIX: Thresholds phù hợp với range 0-1
  if (mouthOpen > 0.5) {
    // Há miệng lớn (> 50%)
    targetAa = (mouthOpen - 0.5) / 0.5; // Map 0.5-1.0 → 0-1
  } else if (mouthOpen > 0.3) {
    // Há miệng vừa (30-50%)
    targetOh = (mouthOpen - 0.3) / 0.2; // Map 0.3-0.5 → 0-1
  } else if (mouthOpen > 0.1) {
    // Há miệng nhẹ (10-30%)
    targetOu = (mouthOpen - 0.1) / 0.2; // Map 0.1-0.3 → 0-1
  } else {
    // ✅ DECAY nhanh hơn: 0.97 → 0.90
    targetAa = decay(window._prevMouthValues.aa, 0.90);
    targetOh = decay(window._prevMouthValues.oh, 0.90);
    targetOu = decay(window._prevMouthValues.ou, 0.90);
  }
  
  // ✅ CHỈ 1 LAYER smoothing
  const smoothAa = mouthAaFilter.smooth(targetAa);
  const smoothOh = mouthOhFilter.smooth(targetOh);
  const smoothOu = mouthOuFilter.smooth(targetOu);
  
  window._prevMouthValues.aa = smoothAa;
  window._prevMouthValues.oh = smoothOh;
  window._prevMouthValues.ou = smoothOu;
  
  // ✅ APPLY trực tiếp (không lerp thêm)
  lerpExpression('aa', smoothAa);
  lerpExpression('oh', smoothOh);
  lerpExpression('ou', smoothOu);
  lerpExpression('ee', 0);
  lerpExpression('ih', 0);
  
  // ✅ DEBUG LOG
  if (!window._lastMouthLog || Date.now() - window._lastMouthLog > 2000) {
    console.log('👄 Mouth:', {
      openness: mouthOpen.toFixed(3),
      aa: smoothAa.toFixed(3),
      oh: smoothOh.toFixed(3),
      ou: smoothOu.toFixed(3)
    });
    window._lastMouthLog = Date.now();
  }
};

export const rigRotation = (
  name: string,
  rotation: { x: number; y: number; z: number },
  dampener = 1,
  lerpAmount = 0.3, // ✅ TĂNG: 0.2 → 0.3
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