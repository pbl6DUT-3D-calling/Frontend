import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

export interface VRMVideoPublisherProps {
  enabled: boolean;
  webcamStream: MediaStream | null;
}

export interface ThreeSceneRefs {
  scene: THREE.Scene | null;
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.PerspectiveCamera | null;
  vrm: VRM | null;
  clock: THREE.Clock;
}

export interface CanvasRefs {
  webglCanvas: HTMLCanvasElement | null;
  outputCanvas: HTMLCanvasElement | null;
  video: HTMLVideoElement | null;
}

export interface VRMLoadOptions {
  modelPath: string;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

export interface FaceMeshConfig {
  maxNumFaces: number;
  refineLandmarks: boolean;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
}