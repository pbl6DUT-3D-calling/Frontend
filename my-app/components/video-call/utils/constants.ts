export const getResponsiveCanvasConfig = () => {
  const maxWidth = 1280;
  const maxHeight = 720;
  const targetAspect = 16 / 9;
  
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : maxWidth;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : maxHeight;
  
  let width = Math.min(viewportWidth, maxWidth);
  let height = Math.min(viewportHeight, maxHeight);
  
  const currentAspect = width / height;
  if (currentAspect > targetAspect) {
    width = height * targetAspect;
  } else {
    height = width / targetAspect;
  }
  
  return {
    WIDTH: width,
    HEIGHT: height,
    ASPECT_RATIO: width / height,
    FPS: 30,
  };
};

export const CANVAS_CONFIG = getResponsiveCanvasConfig();

export const CAMERA_CONFIG = {
  FOV: 22,
  NEAR: 0.1,
  FAR: 20,
  INITIAL_POSITION: { x: 0, y: 1.3, z: 1.8 },
  OFFSET: { x: 0, y: 0, z_multiplier: 1.0 },
} as const;

export const VRM_POSITIONING = {
  VISIBLE_FROM_HEIGHT: 0.6,  // Từ ngực (52%)
  VISIBLE_TO_HEIGHT: 1.3,    // Đến đầu (108%)
  VERTICAL_PADDING: 0.05,     // 5% padding trên/dưới
  HORIZONTAL_PADDING: 0.05,   // 5% padding trái/phải
  LOOK_AT_OFFSET_Y: 0.75,     // Nhìn vào 75% chiều cao
  
  // ⬅️ THÊM: Horizontal centering adjustment (nếu model vẫn lệch)
  // Giá trị âm = dịch sang trái, dương = dịch sang phải
  // Đơn vị là % của chiều rộng model
  HORIZONTAL_OFFSET_PERCENT: 0.1,  // 0% = center hoàn toàn
} as const;

export const VRM_MODEL_PATH = '/models/firefly.vrm';

export const FACEMESH_CONFIG = {
  SCRIPT_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js',
  CDN_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
  OPTIONS: {
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },
} as const;

export const VRM_MODEL_PATH = '/models/7667029464206216702.vrm';
export const LIGHTING_CONFIG = {
  AMBIENT_COLOR: 0xffffff,
  AMBIENT_INTENSITY: 0.8,
  DIRECTIONAL_COLOR: 0xffffff,
  DIRECTIONAL_INTENSITY: 0.6,
  DIRECTIONAL_POSITION: { x: 1, y: 1, z: 1 },
} as const;