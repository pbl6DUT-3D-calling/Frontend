import { CameraControls, Environment } from "@react-three/drei";
import { Bloom, EffectComposer, HueSaturation, BrightnessContrast } from "@react-three/postprocessing";
import { useRef } from "react";
import { VRMAvatar } from "./VRMAvatar";

export const Experience = ({ modelUrl, sceneBackground = "#333", filter = "none" }) => {
  const controls = useRef();

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
        <VRMAvatar 
          key={`videocall-${modelUrl}-${Date.now()}`}
          avatar={modelUrl} 
          autoPlayIdle={true}
          instanceContext="videocall"
        />
      </group>

      {/* Post-processing Effects */}
      {filter !== "none" && (
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
        </EffectComposer>
      )}
    </>
  );
};
