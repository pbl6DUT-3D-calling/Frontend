import * as THREE from 'three';
import { CANVAS_CONFIG, CAMERA_CONFIG, VRM_POSITIONING, getResponsiveCanvasConfig } from './constants';

export function createScene(): THREE.Scene {
  return new THREE.Scene();
}

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    CANVAS_CONFIG.ASPECT_RATIO,
    CAMERA_CONFIG.NEAR,
    CAMERA_CONFIG.FAR
  );
  
  console.log('📷 Camera created with FOV:', CAMERA_CONFIG.FOV);
  
  return camera;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  
  const config = getResponsiveCanvasConfig();
  renderer.setSize(config.WIDTH, config.HEIGHT);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  return renderer;
}

export function setupLighting(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
  scene.add(ambientLight);

  const frontLight = new THREE.DirectionalLight(0xffffff, 1.0);
  frontLight.position.set(0, 1, 2);
  scene.add(frontLight);

  const leftLight = new THREE.DirectionalLight(0xffffff, 0.5);
  leftLight.position.set(-1, 0.5, 1);
  scene.add(leftLight);

  const rightLight = new THREE.DirectionalLight(0xffffff, 0.4);
  rightLight.position.set(1, 0.5, 1);
  scene.add(rightLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
  backLight.position.set(0, 1, -1);
  scene.add(backLight);
}

export function adjustCameraForVRM(
  camera: THREE.PerspectiveCamera,
  vrmScene: THREE.Object3D
): void {
  console.log('🎯 Adjusting camera for VRM (proportional)...');
  
  vrmScene.updateMatrixWorld(true);
  
  const box = new THREE.Box3().setFromObject(vrmScene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  // Lấy aspect ratio thực tế từ camera
  const aspect = camera.aspect;
  
  // Tính toán khoảng cách camera dựa trên cả chiều rộng và chiều cao
  const fov = camera.fov * (Math.PI / 180);
  const fovH = 2 * Math.atan(Math.tan(fov / 2) * aspect); // Horizontal FOV
  
  // Tính khoảng cách cần thiết để fit model theo cả 2 chiều
  const cameraZVertical = Math.abs(size.y / 2 / Math.tan(fov / 2));
  const cameraZHorizontal = Math.abs(size.x / 2 / Math.tan(fovH / 2));
  
  // Chọn khoảng cách lớn hơn để model vừa khung hình
  let cameraZ = Math.max(cameraZVertical, cameraZHorizontal);
  
  // Thêm padding
  cameraZ *= 0.9;
  
  // Đặt camera nhìn vào trung tâm model (đặc biệt là vùng đầu)
  const headHeight = center.y + size.y * 0.35;
  const { x: offsetX, y: offsetY, z_multiplier } = CAMERA_CONFIG.OFFSET;
  
  // Đặt camera position - chỉ dùng offset để fine-tune, không ảnh hưởng centering
  camera.position.set(
    center.x ,  
    headHeight , 
    cameraZ * z_multiplier
  );
  
  // LookAt vào center của model (vùng đầu)
  camera.lookAt(center.x + offsetX, headHeight -0.1 + offsetY , 0);
}