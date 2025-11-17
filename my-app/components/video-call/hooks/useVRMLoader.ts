import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { adjustCameraForVRM } from '../utils/threeSetup';
import { VRM_MODEL_PATH } from '../utils/constants';

export function useVRMLoader(
  scene: THREE.Scene | null,
  camera: THREE.PerspectiveCamera | null
) {
  const [isLoading, setIsLoading] = useState(true);
  const vrmRef = useRef<VRM | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!scene || !camera || loadingRef.current || vrmRef.current) {
      return;
    }

    loadingRef.current = true;

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      VRM_MODEL_PATH,
      (gltf) => {
        if (!scene) {
          loadingRef.current = false;
          return;
        }

        if (vrmRef.current) {
          scene.remove(vrmRef.current.scene);
          vrmRef.current = null;
        }

        const vrm = gltf.userData.vrm as VRM;

        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);

        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        vrm.scene.rotation.y = Math.PI;
        vrm.scene.position.set(0, 0, 0);

        vrmRef.current = vrm;
        scene.add(vrm.scene);

        adjustCameraForVRM(camera, vrm.scene);

        loadingRef.current = false;
        setIsLoading(false);
      },
      undefined,
      (error) => {
        console.error('Error loading VRM:', error);
        loadingRef.current = false;
        setIsLoading(false);
      }
    );

    return () => {
      if (vrmRef.current && scene) {
        scene.remove(vrmRef.current.scene);
        vrmRef.current = null;
      }
      loadingRef.current = false;
    };
  }, [scene, camera]);

  return {
    vrm: vrmRef.current,
    isLoading,
  };
}