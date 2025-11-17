import { CameraControls, Environment, Gltf } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useControls } from "leva";
import { useRef } from "react";
import { VRMAvatar } from "./VRMAvatar";

export const Experience = () => {
  const controls = useRef();

  const { avatar } = useControls("VRM", {
    avatar: {
      value: "7667029464206216702.vrm",
      options: [
        "262410318834873893.vrm",
        "3859814441197244330.vrm",
        "3636451243928341470.vrm",
        "8087383217573817818.vrm",
        "7667029464206216702.vrm",
        "1460281130622983526.vrm"
      ],
    },
  });

  return (
    <>
      <CameraControls
        ref={controls}
        enabledRotate={false}
        enabledPan={false}

        minDistance={1}
        maxDistance={1.2}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        // minDistance={1}
        // maxDistance={10}
      />
      <Environment preset="sunset" />
      <directionalLight intensity={2} position={[10, 10, 5]} />
      <directionalLight intensity={1} position={[-10, 10, 5]} />
      <group position-y={-1.25}>
        <VRMAvatar avatar={avatar} />
        {/* <Gltf
          src="models/sound-stage-final.glb"
          position-z={-1.4}
          position-x={-0.5}
          scale={0.65}
        /> */}
      </group>
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.7} />
      </EffectComposer>
    </>
  );
};
