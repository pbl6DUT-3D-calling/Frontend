export const CANVAS_CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  ASPECT_RATIO: 1280 / 720,
  FPS: 30,
} as const;

export const CAMERA_CONFIG = {
  FOV: 30,
  NEAR: 0.1,
  FAR: 20,
  INITIAL_POSITION: { x: 0, y: 1.4, z: 2.5 },
  OFFSET: { x: 0.2, y: 0, z_multiplier: 0.6 },
} as const;

export const LIGHTING_CONFIG = {
  DIRECTIONAL_1: { color: 0xffffff, intensity: 2, position: [10, 10, 5] },
  DIRECTIONAL_2: { color: 0xffffff, intensity: 1, position: [-10, 10, 5] },
  AMBIENT: { color: 0xffffff, intensity: 0.5 },
} as const;

export const FACEMESH_CONFIG = {
  CDN_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
  SCRIPT_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
  OPTIONS: {
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },
} as const;

export const VRM_MODEL_PATH = '/model3d/1.vrm';