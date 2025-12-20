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

        // Quay 180° để model face camera
        vrm.scene.rotation.y = Math.PI;
        
        // Set pose thả lỏng
        if (vrm.humanoid) {
          try {
            const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
            const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
            const leftLowerArm = vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
            const rightLowerArm = vrm.humanoid.getNormalizedBoneNode('rightLowerArm');
            
            if (leftUpperArm) leftUpperArm.rotation.z = 1;
            if (rightUpperArm) rightUpperArm.rotation.z = -1;
            if (leftLowerArm) leftLowerArm.rotation.z = -0.2;
            if (rightLowerArm) rightLowerArm.rotation.z = 0.2;

            console.log('💪 Pose set to relaxed');
          } catch (error) {
            console.warn('Could not set relaxed pose:', error);
          }
        }
        
        // Force update transform sau rotation và pose
        vrm.scene.updateMatrixWorld(true);
        
        // Tính bounding box SAU rotation
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
      
        //  AUTO CENTER + MANUAL OFFSET
        const offsetX = -center.x ; 
        const offsetY = 0 ;          
        const offsetZ = -center.z ;  
        
        vrm.scene.position.set(offsetX, offsetY, offsetZ);
        
        console.log('📍 Model positioned:', {
          rotation: `${(vrm.scene.rotation.y * 180 / Math.PI).toFixed(0)}°`,
          boundingBox: {
            size: { x: size.x.toFixed(3), y: size.y.toFixed(3), z: size.z.toFixed(3) },
            center: { x: center.x.toFixed(3), y: center.y.toFixed(3), z: center.z.toFixed(3) }
          },
          autoOffset: {
            x: (-center.x).toFixed(3),
            y: '0.000',
            z: (-center.z).toFixed(3)
          },
          manualOffset: { //  THÊM log
            x: MANUAL_POSITION_OFFSET.x.toFixed(3),
            y: MANUAL_POSITION_OFFSET.y.toFixed(3),
            z: MANUAL_POSITION_OFFSET.z.toFixed(3)
          },
          finalPosition: {
            x: vrm.scene.position.x.toFixed(3),
            y: vrm.scene.position.y.toFixed(3),
            z: vrm.scene.position.z.toFixed(3)
          }
        });

        vrmRef.current = vrm;
        scene.add(vrm.scene);

        setTimeout(() => {
          adjustCameraForVRM(camera, vrm.scene);
          setIsLoading(false);
        }, 100);

        loadingRef.current = false;
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