import * as THREE from 'three';
import { CANVAS_CONFIG, CAMERA_CONFIG, LIGHTING_CONFIG } from './constants';

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x212121);
  return scene;
}

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    CAMERA_CONFIG.FOV,
    CANVAS_CONFIG.ASPECT_RATIO,
    CAMERA_CONFIG.NEAR,
    CAMERA_CONFIG.FAR
  );
  
  const { x, y, z } = CAMERA_CONFIG.INITIAL_POSITION;
  camera.position.set(x, y, z);
  camera.lookAt(0, 1.3, 0);
  
  return camera;
}

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  
  renderer.setSize(CANVAS_CONFIG.WIDTH, CANVAS_CONFIG.HEIGHT);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  
  return renderer;
}

export function setupLighting(scene: THREE.Scene): void {
  const { DIRECTIONAL_1, DIRECTIONAL_2, AMBIENT } = LIGHTING_CONFIG;
  
  const light1 = new THREE.DirectionalLight(DIRECTIONAL_1.color, DIRECTIONAL_1.intensity);
  light1.position.set(...DIRECTIONAL_1.position);
  scene.add(light1);
  
  const light2 = new THREE.DirectionalLight(DIRECTIONAL_2.color, DIRECTIONAL_2.intensity);
  light2.position.set(...DIRECTIONAL_2.position);
  scene.add(light2);
  
  const ambientLight = new THREE.AmbientLight(AMBIENT.color, AMBIENT.intensity);
  scene.add(ambientLight);
}

export function adjustCameraForVRM(
  camera: THREE.PerspectiveCamera,
  vrmScene: THREE.Object3D
): void {
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