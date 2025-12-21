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
  
  vrmScene.updateMatrixWorld(true);
  
  const box = new THREE.Box3().setFromObject(vrmScene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  console.log('📦 Model bounding box:', {
    min: { x: box.min.x.toFixed(2), y: box.min.y.toFixed(2), z: box.min.z.toFixed(2) },
    max: { x: box.max.x.toFixed(2), y: box.max.y.toFixed(2), z: box.max.z.toFixed(2) },
    size: { x: size.x.toFixed(2), y: size.y.toFixed(2), z: size.z.toFixed(2) },
    center: { x: center.x.toFixed(2), y: center.y.toFixed(2), z: center.z.toFixed(2) }
  });
  
  // Tính vùng visible theo TỈ LỆ %
  const fromHeight = VRM_POSITIONING.VISIBLE_FROM_HEIGHT;
  const toHeight = VRM_POSITIONING.VISIBLE_TO_HEIGHT;
  
  const bottomY = box.min.y + (size.y * fromHeight);
  const topY = box.min.y + (size.y * toHeight);
  const visibleHeight = topY - bottomY;
  const visibleCenterY = (bottomY + topY) / 2;
  
  console.log('📏 Visible region (proportional):', {
    fromPercent: `${(fromHeight * 100).toFixed(0)}%`,
    toPercent: `${(toHeight * 100).toFixed(0)}%`,
    bottomY: bottomY.toFixed(2),
    topY: topY.toFixed(2),
    visibleHeight: visibleHeight.toFixed(2),
    centerY: visibleCenterY.toFixed(2)
  });
  
  // Tính khoảng cách camera theo TỈ LỆ
  const fovRad = (camera.fov * Math.PI) / 180;
  const paddingFactor = 1 + VRM_POSITIONING.VERTICAL_PADDING;
  
  let distance = (visibleHeight * paddingFactor) / (2 * Math.tan(fovRad / 2));
  
  // Zoom in factor
  distance = distance * 0.75;
  
  //  Tính horizontal offset theo TỈ LỆ % (nếu model lệch)
  const horizontalOffset = size.x * VRM_POSITIONING.HORIZONTAL_OFFSET_PERCENT + 0.1;
  
  console.log('📐 Camera calculation (proportional):', {
    fov: camera.fov,
    visibleHeight: visibleHeight.toFixed(2),
    verticalPadding: `${(VRM_POSITIONING.VERTICAL_PADDING * 100).toFixed(0)}%`,
    baseDistance: (distance / 0.75).toFixed(2),
    zoomFactor: '0.75',
    finalDistance: distance.toFixed(2),
    horizontalOffsetPercent: `${(VRM_POSITIONING.HORIZONTAL_OFFSET_PERCENT * 100).toFixed(0)}%`,
    horizontalOffsetValue: horizontalOffset.toFixed(3)
  });
  
  camera.position.set(
    horizontalOffset,  // X offset theo tỉ lệ %
    visibleCenterY,    // Y = center vùng visible
    distance           // Z = khoảng cách tính toán
  );
  
  camera.lookAt(horizontalOffset, visibleCenterY, 0);
  
  console.log('📷 Final camera (proportional):', {
    position: {
      x: camera.position.x.toFixed(2),
      y: camera.position.y.toFixed(2),
      z: camera.position.z.toFixed(2)
    },
    lookAt: {
      x: horizontalOffset.toFixed(2),
      y: visibleCenterY.toFixed(2),
      z: 0
    },
    fov: camera.fov
  });
}

export function handleCameraResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  canvas: HTMLCanvasElement
): void {
  const config = getResponsiveCanvasConfig();
  
  camera.aspect = config.ASPECT_RATIO;
  camera.updateProjectionMatrix();
  
  renderer.setSize(config.WIDTH, config.HEIGHT);
  canvas.width = config.WIDTH;
  canvas.height = config.HEIGHT;
}