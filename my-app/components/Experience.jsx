import { CameraControls, Environment } from "@react-three/drei";
import { Bloom, EffectComposer, HueSaturation, BrightnessContrast } from "@react-three/postprocessing";
import { useRef, useMemo } from "react";
import { VRMAvatar } from "./VRMAvatar";

export const Experience = ({ modelUrl, sceneBackground = "#333", filter = "none" }) => {
  const controls = useRef();

  // ✅ STABLE KEY: Chỉ extract base URL (bỏ query params)
  const stableModelKey = useMemo(() => {
    if (!modelUrl) return 'default';
    try {
      const url = new URL(modelUrl);
      return url.pathname; // Chỉ lấy path, bỏ query params
    } catch {
      return modelUrl; // Fallback nếu không phải URL
    }
  }, [modelUrl]);

  console.log('🎬 Experience render:', {
    modelUrl: modelUrl?.substring(0, 50) + '...',
    stableKey: stableModelKey
  });

  return (
    <>
      {/* Scene background - only apply if not transparent */}
      {sceneBackground !== "transparent" && (
        <color attach="background" args={[sceneBackground]} />
      )}
      
      <CameraControls
        ref={controls}
        enabledRotate={false}
        enabledPan={false}
        minDistance={1}
        maxDistance={1.2}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
      />
      <Environment preset="sunset" />
      <directionalLight intensity={2} position={[10, 10, 5]} />
      <directionalLight intensity={1} position={[-10, 10, 5]} />
      <group position-y={-1.25}>
        {/* ✅ KEY STABLE: Chỉ thay đổi khi URL path thay đổi */}
        <VRMAvatar 
          key={`videocall-${stableModelKey}`}
          avatar={modelUrl} 
          autoPlayIdle={true}
          instanceContext="videocall"
        />
      </group>

      {/* Post-processing Effects - Always render to ensure buffer clear */}
      <EffectComposer>
        {filter === "bloom" && (
          <Bloom 
            intensity={1.5} 
            luminanceThreshold={0.3} 
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        )}
        {filter === "vintage" && (
          <>
            <HueSaturation saturation={-0.3} />
            <BrightnessContrast brightness={0.05} contrast={0.1} />
          </>
        )}
        {filter === "bw" && (
          <HueSaturation saturation={-1} />
        )}
        {filter === "sepia" && (
          <>
            <HueSaturation hue={0.1} saturation={-0.5} />
            <BrightnessContrast brightness={0.1} contrast={0.05} />
          </>
        )}
        {/* filter === "none": Empty EffectComposer still clears buffer properly */}
      </EffectComposer>
    </>
  );
};