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
  
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
  
  cameraZ *= 1.3;
  
  const headHeight = center.y + size.y * 0.35;
  const { x: offsetX, y: offsetY, z_multiplier } = CAMERA_CONFIG.OFFSET;
  
  camera.position.set(offsetX, headHeight + offsetY, cameraZ * z_multiplier);
  camera.lookAt(offsetX, headHeight - 0.1 + offsetY, 0);
}