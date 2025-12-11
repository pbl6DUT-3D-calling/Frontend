import { VRM } from '@pixiv/three-vrm';
import { Euler, Quaternion } from 'three';
import { AIServerResult, AIServerLandmark } from './services/aiServerClient';

// Lerp helper
const lerp = (start: number, end: number, amount: number): number => {
  return start + (end - start) * amount;
};

// Clamp helper
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// Convert AI Server's 98 landmarks to facial features
function extractFacialFeatures(landmarks: AIServerLandmark[]) {
  if (landmarks.length !== 98) {
    console.warn('Expected 98 landmarks, got', landmarks.length);
    return null;
  }

  // WFLW 98 landmarks mapping
  // Eyes: 60-67 (left), 68-75 (right)
  const leftEye = landmarks.slice(60, 68);
  const rightEye = landmarks.slice(68, 76);

  // Mouth: 76-95
  const mouth = landmarks.slice(76, 96);

  // Eye openness (distance between upper and lower eyelid)
  const leftEyeOpenness = calculateEyeOpenness(leftEye);
  const rightEyeOpenness = calculateEyeOpenness(rightEye);

  // Mouth openness
  const mouthOpenness = calculateMouthOpenness(mouth);

  return {
    leftEyeOpenness,
    rightEyeOpenness,
    mouthOpenness,
  };
}

function calculateEyeOpenness(eyeLandmarks: AIServerLandmark[]): number {
  if (eyeLandmarks.length < 8) return 1;

  // Vertical distance between upper and lower eyelid
  const upper = eyeLandmarks[1].y;
  const lower = eyeLandmarks[5].y;
  const height = Math.abs(lower - upper);

  // Horizontal distance (eye width)
  const left = eyeLandmarks[0].x;
  const right = eyeLandmarks[3].x;
  const width = Math.abs(right - left);

  // Eye aspect ratio
  const ratio = height / (width + 0.001);

  // Normalize (typical ratio ~0.2-0.3 when open, <0.15 when closed)
  const openness = clamp(ratio / 0.25, 0, 1);

  return openness;
}

function calculateMouthOpenness(mouthLandmarks: AIServerLandmark[]): number {
  if (mouthLandmarks.length < 20) return 0;

  // Vertical distance between upper and lower lip
  const upper = mouthLandmarks[2].y;
  const lower = mouthLandmarks[8].y;
  const height = Math.abs(lower - upper);

  // Horizontal distance (mouth width)
  const left = mouthLandmarks[0].x;
  const right = mouthLandmarks[6].x;
  const width = Math.abs(right - left);

  // Mouth aspect ratio
  const ratio = height / (width + 0.001);

  // Normalize (typical ratio ~0.4 when open)
  const openness = clamp(ratio / 0.4, 0, 1);

  return openness;
}

export const animateVRMWithAI = (
  vrm: VRM,
  result: AIServerResult,
  delta: number = 0.016
) => {
  if (!vrm || !result.found) return;

  const { pitch, yaw, roll, landmarks } = result;

  // Extract facial features from 98 landmarks
  const features = extractFacialFeatures(landmarks);
  if (!features) return;

  // Apply rigging
  rigFaceAI(vrm, pitch, yaw, roll, features, delta);
};

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
  delta: number
) => {
  if (!vrm?.expressionManager) return;

  const expressionManager = vrm.expressionManager;

  // Lerp amount cho smooth animation
  const lerpAmount = delta * 15;

  const lerpExpression = (name: string, targetValue: number) => {
    const current = expressionManager.getValue(name) || 0;
    const newValue = lerp(current, targetValue, lerpAmount);
    expressionManager.setValue(name, clamp(newValue, 0, 1));
  };

  // === HEAD ROTATION ===
  // Convert degrees to radians và đảo ngược để match VRM
  const pitchRad = (-pitch * Math.PI) / 180;
  const yawRad = (-yaw * Math.PI) / 180;
  const rollRad = (-roll * Math.PI) / 180;

  rigRotation(
    'neck',
    {
      x: pitchRad,
      y: yawRad,
      z: rollRad,
    },
    0.5, // dampener
    lerpAmount,
    vrm
  );

  // === EYES ===
  // Blink (1 - openness vì blinkLeft/Right là mức độ nhắm mắt)
  lerpExpression('blinkLeft', 1 - features.leftEyeOpenness);
  lerpExpression('blinkRight', 1 - features.rightEyeOpenness);

  // === MOUTH ===
  // Map mouth openness to vowel shapes
  const mouthOpen = features.mouthOpenness;

  if (mouthOpen > 0.6) {
    // Wide open = "A" sound
    lerpExpression('aa', mouthOpen);
    lerpExpression('oh', 0);
    lerpExpression('ou', 0);
  } else if (mouthOpen > 0.3) {
    // Medium open = "O" sound
    lerpExpression('aa', 0);
    lerpExpression('oh', mouthOpen * 1.5);
    lerpExpression('ou', 0);
  } else if (mouthOpen > 0.1) {
    // Small open = "U" sound
    lerpExpression('aa', 0);
    lerpExpression('oh', 0);
    lerpExpression('ou', mouthOpen * 2);
  } else {
    // Closed
    lerpExpression('aa', 0);
    lerpExpression('oh', 0);
    lerpExpression('ou', 0);
  }

  // Default neutral for other shapes
  lerpExpression('ee', 0);
  lerpExpression('ih', 0);
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
    rotation.z * dampener
  );

  const targetQuat = new Quaternion().setFromEuler(targetEuler);

  bone.quaternion.slerp(targetQuat, lerpAmount);
};