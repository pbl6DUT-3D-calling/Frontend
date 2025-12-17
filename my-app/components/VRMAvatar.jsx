import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Face, Hand, Pose } from "kalidokit";
import { useControls } from "leva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Euler, Object3D, Quaternion, Vector3, LoopRepeat } from "three";
import { lerp } from "three/src/math/MathUtils.js";
import { useVideoRecognition } from "../hooks/useVideoRecognition";
import { remapMixamoAnimationToVrm } from "../utils/remapMixamoAnimationToVrm";
//import { predictFaceFromVideo, convert15ToMediapipeLandmarks } from './C:\Users\Hoang\Desktop\PBL\r3f_final\r3f-vrm-final\src\hooks\convert_h5_to_json.js';
const tmpVec3 = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();

export const VRMAvatar = ({ 
  avatar, 
  autoPlayIdle = false, 
  externalAnimation = null,
  externalExpressions = {},
  hideControls = false,
  disableFaceTracking = false,
  ...props 
}) => {;
  
  // Support both local path and full URL
  // Check if path already starts with 'models/' or is a full URL
  const modelPath = avatar?.startsWith('http') 
    ? avatar 
    : avatar?.startsWith('models/') 
      ? avatar 
      : `models/${avatar}`;
  
  const { scene, userData } = useGLTF(
    modelPath,
    undefined,
    undefined,
    (loader) => {
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
      });
    }
  );

  const assetA = useFBX("models/animations/Swing Dancing.fbx");
  const assetB = useFBX("models/animations/Thriller Part 2.fbx");
  const assetC = useFBX("models/animations/Breathing Idle.fbx");

  const currentVrm = userData.vrm;

  const animationClipA = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetA);
    clip.name = "Swing Dancing";
    return clip;
  }, [assetA, currentVrm]);

  const animationClipB = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetB);
    clip.name = "Thriller Part 2";
    return clip;
  }, [assetB, currentVrm]);

  // Helper function: Remove neck/head tracks from animation clip
  const removeHeadTracksFromClip = (clip) => {
    if (!clip) return clip;
    
    // 🔍 DEBUG: Log TẤT CẢ track names để tìm neck/head
    // console.log(`\n🔍 === ANALYZING ANIMATION "${clip.name}" ===`);
    // console.log('All track names:');
    clip.tracks.forEach((track, i) => {
      const fullName = track.name;
      const boneName = fullName.split('.')[0];
      const property = fullName.split('.')[1];
      //console.log(`  [${i}] ${boneName}.${property}`);
    });
    
    const filteredTracks = clip.tracks.filter(track => {
      const fullName = track.name;
      const boneName = fullName.split('.')[0].toLowerCase(); // Case-insensitive
      
      // ✅ EXPANDED FILTER: Kiểm tra nhiều patterns hơn
      const shouldRemove = 
        boneName.includes('neck') || 
        boneName.includes('head') ||
        boneName.includes('cervical') ||     // Anatomical term
        boneName.includes('cranium') ||      // Anatomical term  
        boneName === 'mixamoneck' ||         // Mixamo-specific
        boneName === 'mixamohead' ||         // Mixamo-specific
        boneName === 'mixamorigneck' ||      // Mixamo rig naming
        boneName === 'mixamorighead' ||      // Mixamo rig naming
        boneName.endsWith('_neck') ||        // Underscore variants
        boneName.endsWith('_head') ||
        boneName.startsWith('neck_') ||
        boneName.startsWith('head_');
      
      if (shouldRemove) {
        //console.log(`  ❌ REMOVING: ${fullName}`);
      }
      
      return !shouldRemove;
    });
    
    // Create new clip with filtered tracks
    const newClip = clip.clone();
    newClip.tracks = filteredTracks;
    
    console.log(`\n🎬 Filtered animation "${clip.name}":`, {
      originalTracks: clip.tracks.length,
      filteredTracks: filteredTracks.length,
      removedTracks: clip.tracks.length - filteredTracks.length
    });
    
    // ⚠️ WARNING if removed < 2 tracks
    // if (clip.tracks.length - filteredTracks.length < 2) {
    //   console.warn('⚠️ WARNING: Expected to remove at least 2 tracks (neck + head)!');
    //   console.warn('   → Check track names above. Neck/Head might use different naming.');
    // }
    
    return newClip;
  };

  const animationClipC = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetC);
    clip.name = "Idle";
    
    // ✅ Remove neck/head tracks để face tracking hoàn toàn kiểm soát
    return removeHeadTracksFromClip(clip);
  }, [assetC, currentVrm]);

  const { actions, mixer } = useAnimations(
    [animationClipA, animationClipB, animationClipC],
    currentVrm.scene
  );
  const initialLocalQuats = useRef({});

  useEffect(() => {
    const vrm = userData.vrm;
    // console.log("VRM loaded:", vrm);
    // console.log("VRM humanoid:", userData.vrm.expressionManager);
    // calling these functions greatly improves the performance
    VRMUtils.removeUnnecessaryVertices(scene);
    VRMUtils.combineSkeletons(scene);
    VRMUtils.combineMorphs(vrm);
    
    // 🔍 DEBUG: List ALL available blink-related expression names
    if (vrm.expressionManager) {
      console.log('\n🔍 === VRM MODEL EXPRESSION DEBUG ===');
      const allExpressions = Object.keys(vrm.expressionManager._expressionMap || {});
      console.log('Total expressions:', allExpressions.length);
      
      // Filter blink-related
      const blinkExpressions = allExpressions.filter(name => 
        name.toLowerCase().includes('blink') || 
        name.toLowerCase().includes('eye')
      );
      console.log('👁️ Blink/Eye expressions:', blinkExpressions);
      
      // Try to get current values
      blinkExpressions.forEach(name => {
        try {
          const value = vrm.expressionManager.getValue(name);
          console.log(`  ${name} = ${value}`);
        } catch (e) {
          console.log(`  ${name} = ERROR`);
        }
      });
      console.log('=====================================\n');
    }
    
    const handBoneNames = [
      "leftShoulder", "leftUpperArm", "leftLowerArm", "leftHand",
      "leftThumbProximal", "leftThumbIntermediate", "leftThumbDistal",
      "leftIndexProximal", "leftIndexIntermediate", "leftIndexDistal",
      "leftMiddleProximal", "leftMiddleIntermediate", "leftMiddleDistal",
      "leftRingProximal", "leftRingIntermediate", "leftRingDistal",
      "leftLittleProximal", "leftLittleIntermediate", "leftLittleDistal",

      "rightShoulder", "rightUpperArm", "rightLowerArm", "rightHand",
      "rightThumbProximal", "rightThumbIntermediate", "rightThumbDistal",
      "rightIndexProximal", "rightIndexIntermediate", "rightIndexDistal",
      "rightMiddleProximal", "rightMiddleIntermediate", "rightMiddleDistal",
      "rightRingProximal", "rightRingIntermediate", "rightRingDistal",
      "rightLittleProximal", "rightLittleIntermediate", "rightLittleDistal",

      // thêm bone pose tổng thể
      "neck", "head", "spine", "chest", "upperChest", "hips"
    ];


    handBoneNames.forEach((name) => {
      const bone = vrm.humanoid.getNormalizedBoneNode(name);
      if (bone) initialLocalQuats.current[name] = bone.quaternion.clone();
    });
    // Disable frustum culling
    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });
  }, [scene]);

  const setResultsCallback = useVideoRecognition(
    (state) => state.setResultsCallback
  );
  const videoElement = useVideoRecognition((state) => state.videoElement);
  const isCameraActive = !!videoElement; // Track camera state
  const riggedFace = useRef();
  const riggedPose = useRef();
  const riggedLeftHand = useRef();
  const riggedRightHand = useRef();

  const resultsCallback = useCallback(
    (results) => {
      if (!videoElement || !currentVrm) {
        return;
      }
      // WFLW face tracking - chỉ sử dụng face data
      if (results.faceLandmarks) {
        riggedFace.current = Face.solve(results.faceLandmarks, {
          runtime: "mediapipe", // `mediapipe` or `tfjs`
          video: videoElement,
          imageSize: { width: 640, height: 480 },
          smoothBlink: false, // smooth left and right eye blink delays
          blinkSettings: [0.25, 0.75], // adjust upper and lower bound blink sensitivity
        });
      }
      
      // ❌ DISABLED: Body pose tracking (không cần cho WFLW)
      // if (results.za && results.poseLandmarks) {
      //   riggedPose.current = Pose.solve(results.za, results.poseLandmarks, {
      //     runtime: "mediapipe",
      //     video: videoElement,
      //   });
      // }

      // ❌ DISABLED: Hand tracking (không cần cho WFLW)
      // if (results.leftHandLandmarks) {
      //   riggedRightHand.current = Hand.solve(
      //     results.leftHandLandmarks,
      //     "Right"
      //   );
      // }
      // if (results.rightHandLandmarks) {
      //   riggedLeftHand.current = Hand.solve(results.rightHandLandmarks, "Left");
      // }
    },
    [videoElement, currentVrm]
  );


//   const resultsCallback = useCallback(async () => {
//   if (!videoElement || !currentVrm || !faceModel) return;

//   // 1) predict with TF model
//   const pred = await predictFaceFromVideo(faceModel, videoElement); // Float32Array(30)

//   // 2) convert to mediapipe-like landmarks (normalized)
//   const landmarks = convert15ToMediapipeLandmarks(pred, videoElement.videoWidth, videoElement.videoHeight);

//   // 3) solve with Kalidokit
//   riggedFace.current = Face.solve(landmarks, {
//     runtime: 'tfjs',
//     video: videoElement,
//     imageSize: { width: videoElement.videoWidth, height: videoElement.videoHeight },
//     smoothBlink: false
//   });

//   // 4) apply to VRM (cái này tuỳ project của bạn)
//   // applyRig(currentVrm, riggedFace.current, riggedPose.current, ...)

// }, [videoElement, currentVrm, faceModel]);

  useEffect(() => {
    setResultsCallback(resultsCallback);
  }, [resultsCallback]);

  // Nhận riggedFace trực tiếp từ context (WFLW data)
  // Disable face tracking trong preview mode
  const riggedFaceFromContext = useVideoRecognition((state) => 
    disableFaceTracking ? null : state.riggedFace
  );
  
  // Import WFLW face solver
  const [wflwSolver, setWflwSolver] = useState(null);
  useEffect(() => {
    import('../utils/wflwFaceSolver').then((module) => {
      setWflwSolver(() => module);
    });
  }, []);
  
  // Cache wflwToVRM module để tránh import lại
  const [wflwToVRMModule, setWflwToVRMModule] = useState(null);
  useEffect(() => {
    import('../utils/wflwToVRM').then((module) => {
      setWflwToVRMModule(() => module);
    });
  }, []);
  
  // === LINEAR INTERPOLATION (LERP) ===
  // Biến lưu giá trị "đích" từ server
  const targetBlendShapes = useRef({});
  
  // Biến lưu giá trị "hiện tại" đang được lerp
  const currentBlendShapes = useRef({});
  
  // ✅ KHÔNG DÙNG useEffect - Sẽ update trong animation loop để tránh re-render
  // Chỉ cập nhật riggedFace.current khi có data mới
  useEffect(() => {
    if (riggedFaceFromContext) {
      riggedFace.current = riggedFaceFromContext;
    }
  }, [riggedFaceFromContext]);

  const levaControls = useControls(
    "VRM", 
    {
      aa: { value: 0, min: 0, max: 1 },
      ih: { value: 0, min: 0, max: 1 },
      ee: { value: 0, min: 0, max: 1 },
      oh: { value: 0, min: 0, max: 1 },
      ou: { value: 0, min: 0, max: 1 },
      blinkLeft: { value: 0, min: 0, max: 1 },
      blinkRight: { value: 0, min: 0, max: 1 },
      angry: { value: 0, min: 0, max: 1 },
      sad: { value: 0, min: 0, max: 1 },
      happy: { value: 0, min: 0, max: 1 },
      relaxed: { value: 0, min: 0, max: 1 },
      lookDown: { value: 0, min: 0, max: 1 },
      animation: {
        options: ["None", "Idle", "Swing Dancing", "Thriller Part 2"],
        value: "Idle",
      },
    },
    { hidden: hideControls }
  );

  // Use external controls if provided, otherwise use Leva
  const aa = externalExpressions.aa ?? levaControls.aa;
  const ih = externalExpressions.ih ?? levaControls.ih;
  const ee = externalExpressions.ee ?? levaControls.ee;
  const oh = externalExpressions.oh ?? levaControls.oh;
  const ou = externalExpressions.ou ?? levaControls.ou;
  const blinkLeft = externalExpressions.blinkLeft ?? levaControls.blinkLeft;
  const blinkRight = externalExpressions.blinkRight ?? levaControls.blinkRight;
  const angry = externalExpressions.angry ?? levaControls.angry;
  const sad = externalExpressions.sad ?? levaControls.sad;
  const happy = externalExpressions.happy ?? levaControls.happy;
  const relaxed = externalExpressions.relaxed ?? levaControls.relaxed;
  const lookDown = externalExpressions.lookDown ?? levaControls.lookDown;
  const animation = externalAnimation ?? levaControls.animation;

  useEffect(() => {
    if (animation === "None") {
      return;
    }
    // ✅ CHO PHÉP animation chạy song song với face tracking
    actions[animation]?.play();
    return () => {
      actions[animation]?.stop();
    };
  }, [actions, animation]);

  // Auto play Idle animation if autoPlayIdle prop is true
  useEffect(() => {
    // console.log("AutoPlayIdle effect - autoPlayIdle:", autoPlayIdle);
    // console.log("AutoPlayIdle effect - actions:", actions);
    // console.log("AutoPlayIdle effect - actions['Idle']:", actions["Idle"]);
    
    if (autoPlayIdle && actions["Idle"]) {
      // Delay để đảm bảo animation đã sẵn sàng
      const timer = setTimeout(() => {
        // console.log("Auto-playing Idle animation");
        const idleAction = actions["Idle"];
        // console.log("Idle action object:", idleAction);
        // console.log("Idle action isRunning:", idleAction?.isRunning());
        // console.log("Idle action time:", idleAction?.time);
        // console.log("Idle action timeScale:", idleAction?.timeScale);
        
        if (idleAction) {
          idleAction.reset();
          idleAction.setLoop(LoopRepeat, Infinity);
          idleAction.play();
          // console.log("After play - isRunning:", idleAction.isRunning());
          // console.log("After play - enabled:", idleAction.enabled);
          // console.log("After play - paused:", idleAction.paused);
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        actions["Idle"]?.stop();
      };
    } else {
      // console.log("AutoPlayIdle effect - NOT playing (autoPlayIdle or action missing)");
    }
  }, [autoPlayIdle, actions]);

  const lerpExpression = (name, value, lerpFactor) => {
    userData.vrm.expressionManager.setValue(
      name,
      lerp(userData.vrm.expressionManager.getValue(name), value, lerpFactor)
    );
  };

  function clampEuler(euler, maxDeg = 90) {
    const max = (maxDeg * Math.PI) / 180;
    euler.x = Math.max(-max, Math.min(max, euler.x));
    euler.y = Math.max(-max, Math.min(max, euler.y));
    euler.z = Math.max(-max, Math.min(max, euler.z));
    return euler;
  }

  // Hàm apply rotation tương đối với bind pose
  const rotateBone = (
    boneName,
    value,          // object {x, y, z} từ Kalidokit
    slerpFactor,
    flip = { x: 1, y: 1, z: 1 },
    clampDeg = 90   // clamp mặc định ±90°
  ) => {
    const bone = userData.vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!bone) return;

    // Tính Euler target (có flip)
    tmpEuler.set(value.x * flip.x, value.y * flip.y, value.z * flip.z);

    // Clamp để tránh xoắn
    clampEuler(tmpEuler, clampDeg);

    // Tạo quaternion từ Euler
    tmpQuat.setFromEuler(tmpEuler);

    // Lấy quaternion gốc (bind pose)
    const base = initialLocalQuats.current[boneName];
    if (!base) {
      // Nếu chưa có bind pose, slerp trực tiếp
      bone.quaternion.slerp(tmpQuat, slerpFactor);
      return;
    }

    // target = base * deltaRotation
    const target = base.clone().multiply(tmpQuat);

    // Smooth update
    bone.quaternion.slerp(target, slerpFactor);
  };

  // const rotateBone = (
  //   boneName,
  //   value,
  //   slerpFactor,
  //   flip = {
  //     x: 1,
  //     y: 1,
  //     z: 1,
  //   }
  // ) => {
  //   const bone = userData.vrm.humanoid.getNormalizedBoneNode(boneName);
  //   if (!bone) {
  //     console.warn(
  //       `Bone ${boneName} not found in VRM humanoid. Check the bone name.`
  //     );
  //     console.log("userData.vrm.humanoid.bones", userData.vrm.humanoid);
  //     return;
  //   }

  //   tmpEuler.set(value.x * flip.x, value.y * flip.y, value.z * flip.z);
  //   tmpQuat.setFromEuler(tmpEuler);
  //   bone.quaternion.slerp(tmpQuat, slerpFactor);
  // };

  useFrame((_, delta) => {
    if (!userData.vrm) {
      return;
      if (mixer) {
    if (isCameraActive) {
      // ❌ Camera ON → KHÔNG update mixer (pause idle)
      // Để face tracking hoặc frozen pose
    } else {
      // ✅ Camera OFF → Update mixer (idle animation chạy)
      mixer.update(delta);
    }
  }

  // === FACE TRACKING (nếu có data) ===
  if (riggedFaceFromContext?.head) {
    const neckBone = userData.vrm.humanoid.getNormalizedBoneNode("neck");
    if (neckBone) {
      tmpEuler.set(
        riggedFaceFromContext.head.x * 1.0,
        riggedFaceFromContext.head.y * 0.7, 
        riggedFaceFromContext.head.z * 0.7
      );
      tmpQuat.setFromEuler(tmpEuler);
      
      const base = initialLocalQuats.current["neck"];
      if (base) {
        const target = base.clone().multiply(tmpQuat);
        neckBone.quaternion.slerp(target, delta * 10);
      } else {
        neckBone.quaternion.slerp(tmpQuat, delta * 10);
      }
    }
  }
    }

    if (!window._debugRiggedFace) {
    window._debugRiggedFace = { lastLog: 0 };
  }
  
  const now = Date.now();
  if (now - window._debugRiggedFace.lastLog > 3000) {
    console.log('🔍 === FACE TRACKING STATE ===');
    console.log('riggedFaceFromContext:', riggedFaceFromContext);
    console.log('hasFaceTracking:', !!(riggedFaceFromContext?.head));
    console.log('head data:', riggedFaceFromContext?.head);
    console.log('isCameraActive:', isCameraActive);
    console.log('mixer running:', !!mixer);
    console.log('==============================');
    window._debugRiggedFace.lastLog = now;
  };


    // 🐛 DEBUG: Track 4 nguyên nhân gây giật
    if (!window._debugJitter) {
      window._debugJitter = {
        lastHasFaceTracking: null,
        lastNeckQuat: null,
        frameCount: 0,
        jitterDetected: []
      };
    }
    
    const debug = window._debugJitter;
    debug.frameCount++;

    // 🎯 DISABLE NECK trong animation khi có face tracking
    // Check riggedFaceFromContext (fresh từ context) thay vì riggedFace.current (có thể stale)
    const hasFaceTracking = !!(riggedFaceFromContext?.head); // Boolean, không phải object reference!
    
    // NGUYÊN NHÂN 1: hasFaceTracking toggle (true ↔ false)
    if (debug.lastHasFaceTracking !== null && debug.lastHasFaceTracking !== hasFaceTracking) {
      debug.jitterDetected.push({
        frame: debug.frameCount,
        reason: 'FACE_TRACKING_TOGGLE',
        from: debug.lastHasFaceTracking,
        to: hasFaceTracking
      });
      //console.warn('⚠️ JITTER CAUSE 1: Face tracking toggled (bool)', debug.lastHasFaceTracking, '→', hasFaceTracking);
    }
    debug.lastHasFaceTracking = hasFaceTracking;
    
    if (mixer && userData.vrm.humanoid) {
      const neckBone = userData.vrm.humanoid.getNormalizedBoneNode("neck");
      
      if (hasFaceTracking) {
        // ✅ FIX: TẮT MIXER khi có face tracking để tránh conflict
        // mixer.update(delta);  // ❌ COMMENT OUT - Animation idle sẽ PAUSE
        
        // ✅ Apply head rotation từ face tracking (KHÔNG bị animation override)
        if (riggedFaceFromContext?.head && neckBone) {
          tmpEuler.set(
            riggedFaceFromContext.head.x * 1.0,
            riggedFaceFromContext.head.y * 0.7, 
            riggedFaceFromContext.head.z * 0.7
          );
          tmpQuat.setFromEuler(tmpEuler);
          
          const base = initialLocalQuats.current["neck"];
          if (base) {
            const target = base.clone().multiply(tmpQuat);
            neckBone.quaternion.slerp(target, delta * 10);
          } else {
            neckBone.quaternion.slerp(tmpQuat, delta * 10);
          }
          
          debug.lastNeckQuat = neckBone.quaternion.clone();
        }
      } else {
        // Không có face tracking - animation điều khiển tất cả
        // ✅ RESET expressions và head rotation về idle state
        if (targetBlendShapes.current && Object.keys(targetBlendShapes.current).length > 0) {
          console.log('🔄 No face tracking - Clearing expressions and resetting head rotation');
          targetBlendShapes.current = {};
          currentBlendShapes.current = {};
          
          // Reset tất cả expressions về 0
          if (userData.vrm && wflwSolver) {
            wflwSolver.applyBlendShapesToVRM(userData.vrm, {});
          }
          
          // Reset neck/head rotation về initial pose
          const neckBone = userData.vrm.humanoid?.getNormalizedBoneNode('neck');
          const headBone = userData.vrm.humanoid?.getNormalizedBoneNode('head');
          
          if (neckBone && initialLocalQuats.current["neck"]) {
            neckBone.quaternion.slerp(initialLocalQuats.current["neck"], delta * 5);
          }
          if (headBone && initialLocalQuats.current["head"]) {
            headBone.quaternion.slerp(initialLocalQuats.current["head"], delta * 5);
          }
        }
        
        // ✅ LOGIC: CHỈ chạy idle animation khi:
        // - Camera TẮT (isCameraActive = false) HOẶC
        // - autoPlayIdle = true (force idle luôn chạy)
        // 
        // ❌ KHÔNG chạy animation khi:
        // - Camera BẬT (isCameraActive = true) NHƯNG không detect mặt
        //   → Model đứng yên hoàn toàn (freezed idle pose)
        if (!isCameraActive || autoPlayIdle) {
          mixer.update(delta);
        }
        // else: Camera BẬT nhưng không có mặt → không update mixer → model đứng yên
        
        debug.lastNeckQuat = null;
      }
    } else if (mixer) {
      mixer.update(delta);
    }
    
    // Manual trigger: Gõ window.logJitter() trong console khi thấy giật
    if (!window.logJitter) {
      window.logJitter = () => {
        console.log('🎯 MANUAL JITTER CHECK at frame', debug.frameCount);
        console.log('  hasFaceTracking:', hasFaceTracking);
        console.log('  riggedFaceFromContext:', riggedFaceFromContext);
        console.log('  targetBlendShapes keys:', Object.keys(targetBlendShapes.current || {}).length);
        console.log('  mixer running:', !!mixer);
        if (neckBone) {
          console.log('  neck quaternion:', neckBone.quaternion);
          console.log('  neck position:', neckBone.position);
        }
        console.log('  Last 10 jitter events:', debug.jitterDetected.slice(-10));
      };
      console.log('💡 Tip: Gõ window.logJitter() trong console khi thấy giật!');
    }
    
    // Log jitter summary mỗi 5 giây
    if (debug.frameCount % 300 === 0) {
      if (debug.jitterDetected.length > 0) {
        console.log('📊 JITTER SUMMARY (last 300 frames):', debug.jitterDetected);
        debug.jitterDetected = [];
      } else {
        console.log('✅ NO JITTER detected in last 300 frames');
      }
    }

    // === CONVERT WFLW RIG → BLENDSHAPES (trong animation loop) ===
    if (wflwSolver && riggedFace.current) {
      // 1. Log raw values (mỗi 10s)
      if (wflwToVRMModule && (!window._lastRawLog || Date.now() - window._lastRawLog > 10000)) {
        wflwToVRMModule.logRawMouthValues(riggedFace.current);
        window._lastRawLog = Date.now();
      }
      
      // 2. Convert WFLW rig → VRM blendshapes (KHÔNG có blink - solver bỏ qua)
      const blendShapes = wflwSolver.solveWFLWToVRMBlendShapes(riggedFace.current, { skipEyes: true });
      
      // ✅ FORCE SET: Blink 100% từ MediaPipe (bypass solver hoàn toàn)
      // Solver không tính Blink_L/R, chúng ta set trực tiếp từ riggedFace.blink
      if (riggedFace.current?.blink) {
        blendShapes.Blink_L = Math.max(0, Math.min(1, riggedFace.current.blink.l));
        blendShapes.Blink_R = Math.max(0, Math.min(1, riggedFace.current.blink.r));
        
        // 🎯 DEBUG: Log mỗi 1s (tạm thời để debug)
        if (!window._lastEyeOverrideLog || Date.now() - window._lastEyeOverrideLog > 1000) {
          console.log('🟢 [STAGE 2] riggedFace → blendShapes:', {
            'riggedFace.blink.l': riggedFace.current.blink.l.toFixed(3),
            'riggedFace.blink.r': riggedFace.current.blink.r.toFixed(3),
            '→ blendShapes.Blink_L': blendShapes.Blink_L.toFixed(3),
            '→ blendShapes.Blink_R': blendShapes.Blink_R.toFixed(3)
          });
          window._lastEyeOverrideLog = Date.now();
        }
      }
      
      // 🚨 DEBUG: Log blendshapes với giá trị 0 (có thể là nguyên nhân reset)
      const zeroValues = Object.entries(blendShapes).filter(([_, v]) => v === 0 && targetBlendShapes.current[_] > 0.3);
      if (zeroValues.length > 0) {
        console.error('🚨🚨🚨 SOLVER RETURNED 0:', zeroValues.map(([k, _]) => k).join(', '));
        // console.log('   WFLW mouth.shape:', riggedFace.current?.mouth?.shape);
        // console.log('   Solver mouth shapes:', {
        //   A: blendShapes.A,
        //   E: blendShapes.E,
        //   I: blendShapes.I,
        //   O: blendShapes.O,
        //   U: blendShapes.U,
        //   Neutral: blendShapes.Neutral
        // });
        // console.log('   Target before:', Object.entries(targetBlendShapes.current)
        //   .filter(([k, v]) => zeroValues.some(([zk]) => zk === k))
        //   .map(([k, v]) => `${k}=${v.toFixed(3)}`).join(', '));
      }
      
      // 3. Merge vào targetBlendShapes (không replace)
      if (!targetBlendShapes.current) {
        targetBlendShapes.current = {};
      }
      
      // 🚨 DETECT RESET: Check if targetBlendShapes suddenly cleared
      const hadBlendshapes = Object.keys(targetBlendShapes.current).length > 0;
      
      Object.keys(blendShapes).forEach(key => {
        targetBlendShapes.current[key] = blendShapes[key];
      });
      
      // 🚨 LOG if targetBlendShapes was cleared
      if (hadBlendshapes && Object.keys(blendShapes).length === 0) {
        console.error('🚨🚨🚨 RESET DETECTED: targetBlendShapes cleared! (solveWFLWToVRMBlendShapes returned empty)');
      }
      
      // 4. Log (mỗi 10s)
      if (!window._lastBlendShapeLog || Date.now() - window._lastBlendShapeLog > 10000) {
        wflwSolver.logBlendShapes(blendShapes);
        window._lastBlendShapeLog = Date.now();
      }
    }
    
    // === LERP BLENDSHAPES TỪ TARGET ===
    // Áp dụng Linear Interpolation để làm mượt
    if (wflwSolver) {
      const lerpFactor = 0.3; // Tốc độ lerp khi CÓ target
      const decayFactor = 0.02; // Giảm decay (fade chậm)
      const minHoldTime = 100; // Giữ giá trị ít nhất 100ms
      const confidenceThreshold = 0.15; // ✅ TĂNG từ 0.05 → 0.15 (reject nhiều noise hơn)
      
      // Track last update time + consecutive reject count
      if (!window._blendShapeLastUpdate) {
        window._blendShapeLastUpdate = {};
      }
      if (!window._blendShapeRejectCount) {
        window._blendShapeRejectCount = {};
      }
      
      const now = Date.now();
      
      // 1. Merge tất cả keys từ target vào current (preserve state)
      Object.keys(targetBlendShapes.current).forEach(name => {
        if (!(name in currentBlendShapes.current)) {
          currentBlendShapes.current[name] = 0;
        }
      });
      
      // 2. Lerp TẤT CẢ blendshapes (kể cả không có trong target)
      Object.keys(currentBlendShapes.current).forEach(name => {
        const targetValue = targetBlendShapes.current[name];
        const currentValue = currentBlendShapes.current[name] || 0;
        const lastUpdate = window._blendShapeLastUpdate[name] || 0;
        const timeSinceUpdate = now - lastUpdate;
        const rejectCount = window._blendShapeRejectCount[name] || 0;
        
        let newValue;
        
        if (targetValue !== undefined) {
          // ✅ TIERED CONFIDENCE CHECK:
          // - Nếu current nhỏ (<0.2): Chấp nhận mọi target
          // - Nếu current trung bình (0.2-0.5): Reject target < 0.15
          // - Nếu current lớn (>0.5): Reject target < 0.25 (strict hơn)
          let threshold = confidenceThreshold;
          if (currentValue > 0.5) {
            threshold = 0.25; // Strict threshold for high values
          } else if (currentValue > 0.3) {
            threshold = 0.20; // Medium threshold
          }
          
          const isSuddenDrop = currentValue > 0.2 && targetValue < threshold;
          
          // ✅ FORCED ACCEPT: Sau 60 frames reject liên tiếp, chấp nhận target (tránh stuck)
          const forceAccept = rejectCount > 60;
          
          if (isSuddenDrop && !forceAccept) {
            // 🚨 REJECT: Giữ giá trị cũ, decay rất chậm
            newValue = currentValue * (1 - decayFactor * 0.3); // Decay siêu chậm (70% tốc độ bình thường)
            window._blendShapeRejectCount[name] = rejectCount + 1;
            
            // Chỉ log mỗi 30 frames để tránh spam
            if (rejectCount % 30 === 0) {
              console.warn(`⚠️ REJECT RESET (${rejectCount}x): ${name} target=${targetValue.toFixed(3)} < threshold=${threshold.toFixed(3)}, keeping current=${currentValue.toFixed(3)}`);
              if (rejectCount >= 60) {
                console.warn(`   → Will FORCE ACCEPT on next frame (stuck for too long)`);
              }
            }
          } else {
            // ✅ ACCEPT: Lerp tới target
            if (forceAccept) {
              console.log(`✅ FORCE ACCEPT: ${name} after ${rejectCount} rejects, target=${targetValue.toFixed(3)}`);
            }
            
            // ✅ ADAPTIVE LERP: Lerp chậm hơn nếu gap lớn (tránh jump)
            const gap = Math.abs(targetValue - currentValue);
            let adaptiveLerpFactor = lerpFactor;
            if (gap > 0.5) {
              adaptiveLerpFactor = lerpFactor * 0.3; // Lerp chậm 3x khi gap lớn
            } else if (gap > 0.3) {
              adaptiveLerpFactor = lerpFactor * 0.5; // Lerp chậm 2x
            }
            
            newValue = currentValue + (targetValue - currentValue) * adaptiveLerpFactor;
            window._blendShapeLastUpdate[name] = now;
            window._blendShapeRejectCount[name] = 0; // Reset reject count
          }
        } else if (timeSinceUpdate < minHoldTime) {
          // ✅ KHÔNG CÓ target NHƯNG mới update → GIỮ NGUYÊN
          newValue = currentValue;
        } else {
          // ✅ KHÔNG CÓ target VÀ đã lâu → decay về 0 (chậm)
          newValue = currentValue * (1 - decayFactor);
          if (Math.abs(newValue) < 0.001) newValue = 0;
        }
        
        // Cập nhật giá trị hiện tại
        currentBlendShapes.current[name] = newValue;
      });
      
      // Apply lên VRM model
      if (userData.vrm) {
        wflwSolver.applyBlendShapesToVRM(userData.vrm, currentBlendShapes.current);
        
        // 🎯 LOG STAGE 3: Giá trị thực tế được apply vào VRM (mỗi 10s)
        if (!window.lastVRMBlinkLogTime || Date.now() - window.lastVRMBlinkLogTime > 10000) {
          window.lastVRMBlinkLogTime = Date.now();
          
          // Đọc giá trị thực tế từ VRM expressionManager
          const actualBlinkLeft = userData.vrm.expressionManager.getValue('blinkLeft') || 0;
          const actualBlinkRight = userData.vrm.expressionManager.getValue('blinkRight') || 0;
          
          // console.log('\n🎯 === STAGE 3: VRM APPLIED VALUES (READ FROM MODEL) ===');
          // console.log(`Target → Current → Applied:`);
          // console.log(`  blinkLeft:  ${(targetBlendShapes.current.Blink_L || 0).toFixed(3)} → ${(currentBlendShapes.current.Blink_L || 0).toFixed(3)} → ${actualBlinkLeft.toFixed(3)}`);
          // console.log(`  blinkRight: ${(targetBlendShapes.current.Blink_R || 0).toFixed(3)} → ${(currentBlendShapes.current.Blink_R || 0).toFixed(3)} → ${actualBlinkRight.toFixed(3)}`);
          // console.log(`Logic: 0.0=MỞ, 1.0=NHẮM`);
          
          // Debug: Liệt kê TẤT CẢ expressions có giá trị
          const allExpressions = {};
          ['blinkLeft', 'blinkRight', 'blink', 'blinkL', 'blinkR', 'Blink', 'Blink_L', 'Blink_R'].forEach(name => {
            try {
              const val = userData.vrm.expressionManager.getValue(name);
              if (val !== undefined && val !== 0) allExpressions[name] = val;
            } catch (e) {}
          });
          if (Object.keys(allExpressions).length > 0) {
            console.log(`All blink expressions:`, allExpressions);
          }
          
          if (actualBlinkLeft > 0.3 || actualBlinkRight > 0.3) {
            console.error('❌ VRM MODEL HAS CLOSED EYES! (value > 0.3)');
            console.log('   → Check above logs to find where the issue starts:');
            console.log('     1. Stage 1: WFLW EAR calculation');
            console.log('     2. Stage 2: BlendShape solver');
            console.log('     3. Stage 3: VRM apply (current)');
          } else {
            console.log('✅ VRM eyes are open (value < 0.3)');
          }
        }
      }
    }

    lerpExpression("angry", angry, delta * 12);
    lerpExpression("sad", sad, delta * 12);
    lerpExpression("happy", happy, delta * 12);
    lerpExpression("relaxed", relaxed, delta * 12);
    lerpExpression("lookDown", lookDown, delta * 12);
    // userData.vrm.expressionManager.setValue("angry", angry);
    // userData.vrm.expressionManager.setValue("sad", sad);
    // userData.vrm.expressionManager.setValue("happy", happy);
    // userData.vrm.expressionManager.setValue("relaxed", relaxed);
    // userData.vrm.expressionManager.setValue("lookDown", lookDown);
    // ✅ HEAD ROTATION đã được apply NGAY SAU mixer restore ở trên
    // Không cần apply lại ở đây để tránh duplicate
    // NGUYÊN NHÂN 3: Track head rotation jump
    if (riggedFaceFromContext?.head) {
      const debug = window._debugJitter;
      if (debug.lastHeadRotation) {
        const dx = Math.abs(riggedFaceFromContext.head.x - debug.lastHeadRotation.x);
        const dy = Math.abs(riggedFaceFromContext.head.y - debug.lastHeadRotation.y);
        const dz = Math.abs(riggedFaceFromContext.head.z - debug.lastHeadRotation.z);
        const maxDelta = Math.max(dx, dy, dz);
        
        if (maxDelta > 0.5) { // > 28 degrees jump
          debug.jitterDetected.push({
            frame: debug.frameCount,
            reason: 'HEAD_ROTATION_JUMP',
            delta: { dx, dy, dz },
            maxDelta
          });
          console.warn('⚠️ JITTER CAUSE 3: Head rotation jumped', maxDelta.toFixed(3), 'rad');
        }
      }
      debug.lastHeadRotation = { ...riggedFaceFromContext.head };
    } else if (window._debugJitter) {
      window._debugJitter.lastHeadRotation = null;
    }
    // CHÚ Ý: KHÔNG reset neck, để idle animation tự nhiên điều khiển khi không có face tracking
    if (riggedPose.current) {
      rotateBone("chest", riggedPose.current.Spine, delta * 5, {
        x: 0.3,
        y: 0.3,
        z: 0.3,
      });
      rotateBone("spine", riggedPose.current.Spine, delta * 5, {
        x: 0.3,
        y: 0.3,
        z: 0.3,
      });
      rotateBone("hips", riggedPose.current.Hips.rotation, delta * 5, {
        x: 0.7,
        y: 0.7,
        z: 0.7,
      });

      // LEFT ARM
      rotateBone("leftUpperArm", riggedPose.current.LeftUpperArm, delta * 5);
      rotateBone("leftLowerArm", riggedPose.current.LeftLowerArm, delta * 5);
      // RIGHT ARM
      rotateBone("rightUpperArm", riggedPose.current.RightUpperArm, delta * 5);
      rotateBone("rightLowerArm", riggedPose.current.RightLowerArm, delta * 5);

      if (riggedLeftHand.current) {
        rotateBone(
          "leftHand",
          {
            z: riggedPose.current.LeftHand.z,
            y: riggedLeftHand.current.LeftWrist.y,
            x: riggedLeftHand.current.LeftWrist.x,
          },
          delta * 12
        );
        rotateBone(
          "leftRingProximal",
          riggedLeftHand.current.LeftRingProximal,
          delta * 12
        );
        rotateBone(
          "leftRingIntermediate",
          riggedLeftHand.current.LeftRingIntermediate,
          delta * 12
        );
        rotateBone(
          "leftRingDistal",
          riggedLeftHand.current.LeftRingDistal,
          delta * 12
        );
        rotateBone(
          "leftIndexProximal",
          riggedLeftHand.current.LeftIndexProximal,
          delta * 12
        );
        rotateBone(
          "leftIndexIntermediate",
          riggedLeftHand.current.LeftIndexIntermediate,
          delta * 12
        );
        rotateBone(
          "leftIndexDistal",
          riggedLeftHand.current.LeftIndexDistal,
          delta * 12
        );
        rotateBone(
          "leftMiddleProximal",
          riggedLeftHand.current.LeftMiddleProximal,
          delta * 12
        );
        rotateBone(
          "leftMiddleIntermediate",
          riggedLeftHand.current.LeftMiddleIntermediate,
          delta * 12
        );
        rotateBone(
          "leftMiddleDistal",
          riggedLeftHand.current.LeftMiddleDistal,
          delta * 12
        );
        rotateBone(
          "leftThumbProximal",
          riggedLeftHand.current.LeftThumbProximal,
          delta * 12
        );
        rotateBone(
          "leftThumbMetacarpal",
          riggedLeftHand.current.LeftThumbIntermediate,
          delta * 12
        );
        rotateBone(
          "leftThumbDistal",
          riggedLeftHand.current.LeftThumbDistal,
          delta * 12
        );
        rotateBone(
          "leftLittleProximal",
          riggedLeftHand.current.LeftLittleProximal,
          delta * 12
        );
        rotateBone(
          "leftLittleIntermediate",
          riggedLeftHand.current.LeftLittleIntermediate,
          delta * 12
        );
        rotateBone(
          "leftLittleDistal",
          riggedLeftHand.current.LeftLittleDistal,
          delta * 12
        );
      }

      if (riggedRightHand.current) {
        rotateBone(
          "rightHand",
          {
            z: riggedPose.current.RightHand.z,
            y: riggedRightHand.current.RightWrist.y,
            x: riggedRightHand.current.RightWrist.x,
          },
          delta * 12
        );
        rotateBone(
          "rightRingProximal",
          riggedRightHand.current.RightRingProximal,
          delta * 12
        );
        rotateBone(
          "rightRingIntermediate",
          riggedRightHand.current.RightRingIntermediate,
          delta * 12
        );
        rotateBone(
          "rightRingDistal",
          riggedRightHand.current.RightRingDistal,
          delta * 12
        );
        rotateBone(
          "rightIndexProximal",
          riggedRightHand.current.RightIndexProximal,
          delta * 12
        );
        rotateBone(
          "rightIndexIntermediate",
          riggedRightHand.current.RightIndexIntermediate,
          delta * 12
        );
        rotateBone(
          "rightIndexDistal",
          riggedRightHand.current.RightIndexDistal,
          delta * 12
        );
        rotateBone(
          "rightMiddleProximal",
          riggedRightHand.current.RightMiddleProximal,
          delta * 12
        );
        rotateBone(
          "rightMiddleIntermediate",
          riggedRightHand.current.RightMiddleIntermediate,
          delta * 12
        );
        rotateBone(
          "rightMiddleDistal",
          riggedRightHand.current.RightMiddleDistal,
          delta * 12
        );
        rotateBone(
          "rightThumbProximal",
          riggedRightHand.current.RightThumbProximal,
          delta * 12
        );
        rotateBone(
          "rightThumbMetacarpal",
          riggedRightHand.current.RightThumbIntermediate,
          delta * 12
        );
        rotateBone(
          "rightThumbDistal",
          riggedRightHand.current.RightThumbDistal,
          delta * 12
        );
        rotateBone(
          "rightLittleProximal",
          riggedRightHand.current.RightLittleProximal,
          delta * 12
        );
        rotateBone(
          "rightLittleIntermediate",
          riggedRightHand.current.RightLittleIntermediate,
          delta * 12
        );
        rotateBone(
          "rightLittleDistal",
          riggedRightHand.current.RightLittleDistal,
          delta * 12
        );
      }
    }

    userData.vrm.update(delta);
  });

  const lookAtDestination = useRef(new Vector3(0, 0, 0));
  const camera = useThree((state) => state.camera);
  const lookAtTarget = useRef();
  useEffect(() => {
    lookAtTarget.current = new Object3D();
    camera.add(lookAtTarget.current);
  }, [camera]);

  return (
    <group {...props}>
      <primitive
        object={scene}
        rotation-y={avatar !== "3636451243928341470.vrm" ? Math.PI : 0}
      />
    </group>
  );
};
