import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/**
 * Generate thumbnail from VRM model by rendering head/face area
 * @param {string} vrmUrl - URL to VRM file (local or remote)
 * @param {Object} options - Configuration options
 * @param {number} options.size - Output image size (default: 512px square)
 * @param {number} options.padding - Camera distance multiplier (default: 1.2)
 * @returns {Promise<string>} - Base64 data URL of PNG image
 */
export async function generateVrmThumbnail(vrmUrl, options = {}) {
  const size = options.size || 512;
  const padding = options.padding || 1.2;

  // Create hidden canvas for rendering
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.style.position = "absolute";
  canvas.style.top = "-9999px";
  canvas.style.left = "-9999px";
  document.body.appendChild(canvas);

  let renderer, scene, camera, loader;

  try {
    // Setup renderer
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(size, size);
    renderer.setClearColor(0xffffff, 1); // White background

    // Setup scene
    scene = new THREE.Scene();
    
    // Lighting setup for better face visibility
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
    frontLight.position.set(0, 1, 3);
    scene.add(frontLight);
    
    const sideLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
    sideLight1.position.set(2, 1, 2);
    scene.add(sideLight1);
    
    const sideLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    sideLight2.position.set(-2, 1, 2);
    scene.add(sideLight2);

    // Setup camera
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    
    // Load VRM model
    loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("VRM loading timeout"));
      }, 30000); // 30s timeout

      loader.load(
        vrmUrl,
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (progress) => {
          console.log(`Loading VRM: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });

    const vrm = gltf.userData.vrm;
    
    if (!vrm) {
      throw new Error("Invalid VRM file - no VRM data found");
    }

    // Optimize model
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    
    scene.add(gltf.scene);

    // Calculate head position
    let headPosition = new THREE.Vector3();
    let neckPosition = new THREE.Vector3();
    let hasHeadBone = false;

    try {
      // Try to get head bone position
      const headNode = vrm.humanoid?.getNormalizedBoneNode?.("head");
      const neckNode = vrm.humanoid?.getNormalizedBoneNode?.("neck");
      
      if (headNode) {
        headNode.getWorldPosition(headPosition);
        hasHeadBone = true;
        
        if (neckNode) {
          neckNode.getWorldPosition(neckPosition);
        }
      }
    } catch (e) {
      console.warn("Could not get head bone:", e);
    }

    // Fallback: use bounding box
    if (!hasHeadBone) {
      const bbox = new THREE.Box3().setFromObject(gltf.scene);
      bbox.getCenter(headPosition);
      // Adjust to upper portion (head area)
      headPosition.y = bbox.max.y * 0.85;
    }

    // Set VRM to Idle pose (neutral standing pose)
    if (vrm.expressionManager) {
      // Reset all expressions to neutral
      vrm.expressionManager.setValue('happy', 0);
      vrm.expressionManager.setValue('sad', 0);
      vrm.expressionManager.setValue('angry', 0);
      vrm.expressionManager.setValue('relaxed', 0);
    }

    // Rotate model to face camera (VRM models often face -Z by default)
    gltf.scene.rotation.y = Math.PI; // 180 degrees - model faces camera

    // Calculate camera position for close-up face shot
    const bbox = new THREE.Box3().setFromObject(gltf.scene);
    const sizeVec = new THREE.Vector3();
    bbox.getSize(sizeVec);
    
    // 🎯 ĐIỀU CHỈNH KHOẢNG CÁCH CAMERA Ở ĐÂY:
    // - headSize: Ước tính kích thước đầu (0.2-0.4 = gần hơn, 0.3 = vừa phải)
    // - distanceMultiplier: Hệ số nhân khoảng cách (1.2-1.8 = cận cảnh, 2.5+ = xa)
    const headSize = Math.max(sizeVec.x, sizeVec.y) * 0.25; // ⬅️ Giảm từ 0.3 → 0.25 (gần hơn)
    const distanceMultiplier = 1.4; // ⬅️ Giảm từ 2.5 → 1.4 (cận mặt)
    const distance = headSize * padding * distanceMultiplier;
    
    // Position camera slightly above and in front (Z-axis positive = trước mặt model)
    camera.position.set(
      headPosition.x,
      headPosition.y + headSize * 0.15, // Slightly above eye level
      headPosition.z + distance // ⬅️ +Z = phía trước mặt (model đã quay 180°)
    );
    
    // Look at point at eye level (for direct face angle)
    const lookAtPoint = new THREE.Vector3(
      headPosition.x,
      headPosition.y, // Eye level
      headPosition.z
    );
    camera.lookAt(lookAtPoint);

    // Render multiple frames to ensure everything is loaded
    await new Promise(resolve => requestAnimationFrame(resolve));
    renderer.render(scene, camera);
    await new Promise(resolve => requestAnimationFrame(resolve));
    renderer.render(scene, camera);
    await new Promise(resolve => requestAnimationFrame(resolve));
    renderer.render(scene, camera);

    // Get image data
    const dataURL = canvas.toDataURL("image/png", 0.95);

    console.log("✅ Thumbnail generated successfully");
    return dataURL;

  } catch (error) {
    console.error("❌ Failed to generate VRM thumbnail:", error);
    throw error;
  } finally {
    // Cleanup
    if (renderer) {
      renderer.dispose();
    }
    
    if (scene) {
      scene.traverse((obj) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
        }
      });
    }
    
    if (canvas && canvas.parentNode) {
      canvas.remove();
    }
  }
}

/**
 * Convert base64 data URL to File object
 * @param {string} dataUrl - Base64 data URL
 * @param {string} filename - Output filename
 * @returns {Promise<File>} - File object ready for upload
 */
export async function dataUrlToFile(dataUrl, filename = "thumbnail.png") {
  const blob = await fetch(dataUrl).then(r => r.blob());
  return new File([blob], filename, { type: "image/png" });
}
