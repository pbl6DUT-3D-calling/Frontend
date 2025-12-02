import { VRM } from '@pixiv/three-vrm';
import * as Kalidokit from 'kalidokit';
import { Results as FaceMeshResults } from '@mediapipe/face_mesh';
import { Euler, Quaternion } from 'three';

// ===== Thêm lerp helper =====
const lerp = (start: number, end: number, amount: number): number => {
  return start + (end - start) * amount;
};

export const animateVRMFace = (
  vrm: VRM,
  results: FaceMeshResults,
  videoEl: HTMLVideoElement | null,
  delta: number = 0.016
) => {
  if (!vrm || !videoEl || !results.multiFaceLandmarks?.[0]) return;

  const faceLandmarks = results.multiFaceLandmarks[0];

  const kalidokitFaceLandmarks = faceLandmarks.map((landmark) => ({
    x: landmark.x,
    y: landmark.y,
    z: landmark.z || 0,
  }));

  try {
    const riggedFace = Kalidokit.Face.solve(kalidokitFaceLandmarks, {
      runtime: 'mediapipe',
      video: videoEl,
    });

    rigFace(riggedFace, vrm, delta);
  } catch (error) {
    console.warn('Face rigging error:', error);
  }
};

const rigFace = (riggedFace: any, vrm: VRM, delta: number) => {
  if (!vrm?.expressionManager) return;

  const expressionManager = vrm.expressionManager;
  
  // ===== Tăng lerpAmount để smooth hơn =====
  const lerpAmount = delta * 15; // Tăng từ 12 lên 15

  const lerpExpression = (name: string, targetValue: number) => {
    const current = expressionManager.getValue(name) || 0;
    const newValue = lerp(current, targetValue, lerpAmount);
    expressionManager.setValue(name, Math.max(0, Math.min(1, newValue)));
  };

  // Head rotation với damping mạnh hơn
  rigRotation(
    'neck',
    {
      x: riggedFace.head.x,
      y: riggedFace.head.y,
      z: riggedFace.head.z,
    },
    0.5, // Giảm dampener từ 0.7 xuống 0.5
    lerpAmount,
    vrm
  );

  // Eyes
  lerpExpression('blinkLeft', 1 - riggedFace.eye.l);
  lerpExpression('blinkRight', 1 - riggedFace.eye.r);

  // Mouth
  lerpExpression('aa', riggedFace.mouth.shape.A || 0);
  lerpExpression('ee', riggedFace.mouth.shape.E || 0);
  lerpExpression('ih', riggedFace.mouth.shape.I || 0);
  lerpExpression('oh', riggedFace.mouth.shape.O || 0);
  lerpExpression('ou', riggedFace.mouth.shape.U || 0);

  // Pupil
  if (riggedFace.pupil) {
    lerpExpression('lookLeft', Math.max(0, -riggedFace.pupil.x));
    lerpExpression('lookRight', Math.max(0, riggedFace.pupil.x));
    lerpExpression('lookUp', Math.max(0, -riggedFace.pupil.y));
    lerpExpression('lookDown', Math.max(0, riggedFace.pupil.y));
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
    rotation.z * dampener
  );

  const targetQuat = new Quaternion().setFromEuler(targetEuler);
  
  bone.quaternion.slerp(targetQuat, lerpAmount);
};