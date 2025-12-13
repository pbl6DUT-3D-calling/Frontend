// WFLW Face Solver - Convert WFLW rig data to VRM blendshapes
// Tương thích với VRM blendshape names

import { VRMFaceRig } from './wflwToVRM'

export interface VRMBlendShapes {
  // Eye blinking
  Blink_L?: number
  Blink_R?: number
  
  // Eye direction (NOT blendshapes, but bone rotations)
  // These will be handled separately
  
  // Brows
  BrowInnerUp?: number
  BrowOuterUpLeft?: number
  BrowOuterUpRight?: number
  
  // Mouth shapes (visemes)
  A?: number // aa - mouth open
  I?: number // ih
  U?: number // ou
  E?: number // ee - smile
  O?: number // oh - round
  
  // Mouth expressions
  MouthSmile?: number
  MouthFunnel?: number // pucker/kiss
  
  // Neutral
  Neutral?: number
}

export function solveWFLWToVRMBlendShapes(rigData: VRMFaceRig, options?: { skipEyes?: boolean }): VRMBlendShapes {
  const blendShapes: VRMBlendShapes = {}
  
  // 1. BLINK - ❌ KHÔNG tính từ WFLW - MediaPipe sẽ xử lý 100%
  // Không set Blink_L/R vào blendShapes, sẽ được force set trực tiếp từ MediaPipe data
  // trong VRMAvatar.jsx (bypass solver hoàn toàn)
  
  // 2. EYEBROWS - Map từ brow height với threshold
  // Positive brow value = raised brows
  // Threshold: Chỉ active khi brow > 0.3 (nhướn mày rõ ràng)
  const BROW_THRESHOLD = 0.3
  if (rigData.brow > BROW_THRESHOLD) {
    const normalizedBrow = (rigData.brow - BROW_THRESHOLD) / (1 - BROW_THRESHOLD)
    blendShapes.BrowInnerUp = Math.min(1, normalizedBrow * 1.5)
    blendShapes.BrowOuterUpLeft = Math.min(1, normalizedBrow * 1.2)
    blendShapes.BrowOuterUpRight = Math.min(1, normalizedBrow * 1.2)
  } else {
    blendShapes.BrowInnerUp = 0
    blendShapes.BrowOuterUpLeft = 0
    blendShapes.BrowOuterUpRight = 0
  }
  
  // 3. MOUTH SHAPES (Visemes) - Chỉ kích hoạt shape mạnh nhất để tránh cộng dồn
  // ✅ TRUYỀN TRỰC TIẾP - Không normalize, không threshold
  // Để VRMAvatar lerp/decay tự xử lý, tránh reset đột ngột

  const rawA = Math.max(0, Math.min(1, rigData.mouth.shape.A))
  const rawE = Math.max(0, Math.min(1, rigData.mouth.shape.E))
  const rawI = Math.max(0, Math.min(1, rigData.mouth.shape.I))
  const rawO = Math.max(0, Math.min(1, rigData.mouth.shape.O))
  const rawU = Math.max(0, Math.min(1, rigData.mouth.shape.U))

  blendShapes.A = rawA
  blendShapes.E = rawE
  blendShapes.I = rawI
  blendShapes.O = rawO
  blendShapes.U = rawU
  
  // 4. SMILE - Chỉ derive nếu E đủ mạnh, giảm coefficient
  blendShapes.MouthSmile = rawE > 0.3 ? rawE * 0.5 : 0
  
  // 5. FUNNEL - Chỉ derive nếu O đủ mạnh
  blendShapes.MouthFunnel = rawO > 0.4 ? rawO * 0.3 : 0
  
  // 6. NEUTRAL - Inverse của tất cả expressions
  const totalExpression = 
    (blendShapes.A || 0) + 
    (blendShapes.E || 0) + 
    (blendShapes.I || 0) + 
    (blendShapes.O || 0) + 
    (blendShapes.U || 0)
  
  blendShapes.Neutral = Math.max(0, 1 - totalExpression)
  
  return blendShapes
}

// Helper: Apply blendshapes to VRM model
export function applyBlendShapesToVRM(
  vrm: any,
  blendShapes: VRMBlendShapes
): void {
  if (!vrm?.expressionManager) {
    console.warn('⚠️ VRM expressionManager not found')
    return
  }
  
  const expressionManager = vrm.expressionManager
  
  // Map tên blendshape đúng chuẩn VRM
  const VRM_BLENDSHAPE_MAP: Record<string, string> = {
    'Blink_L': 'blinkLeft',
    'Blink_R': 'blinkRight',
    'BrowInnerUp': 'browInnerUp',
    'BrowOuterUpLeft': 'browOuterUpLeft',
    'BrowOuterUpRight': 'browOuterUpRight',
    'A': 'aa',           // FIX: 'a' -> 'aa'
    'E': 'ee',           // FIX: 'e' -> 'ee'
    'I': 'ih',           // FIX: 'i' -> 'ih'
    'O': 'oh',           // FIX: 'o' -> 'oh'
    'U': 'ou',           // FIX: 'u' -> 'ou'
    'MouthSmile': 'mouthSmile',
    'MouthFunnel': 'mouthFunnel',
    'Neutral': 'neutral'
  }
  
  // ✅ CHỈ APPLY CÁC BLENDSHAPES CÓ TRONG DATA - KHÔNG RESET!
  // Giữ nguyên giá trị cũ của các blendshapes không có trong data mới
  
  // 🔍 DEBUG: Log blink values trước khi apply (tạm thời)
  let blinkDebug: any = {};
  
  Object.entries(blendShapes).forEach(([name, value]) => {
    if (value !== undefined) {
      const vrmName = VRM_BLENDSHAPE_MAP[name] || name.toLowerCase();
      
      // Collect blink debug info
      if (name === 'Blink_L' || name === 'Blink_R') {
        blinkDebug[name] = { value, vrmName };
      }
      
      try {
        // VRM 1.0 uses expressionManager
        expressionManager.setValue(vrmName, value);
        
        // Log successful set for blink
        if (name === 'Blink_L' || name === 'Blink_R') {
          const readBack = expressionManager.getValue(vrmName);
          blinkDebug[name].readBack = readBack;
        }
      } catch (error) {
        // Fallback for VRM 0.x (uses blendShapeProxy)
        try {
          vrm.blendShapeProxy?.setValue(vrmName, value);
        } catch (e) {
          // Silently ignore if blendshape doesn't exist
        }
      }
    }
  })
  
  // Log blink debug mỗi 1s
  if (Object.keys(blinkDebug).length > 0) {
    if (!window._lastBlinkApplyLog || Date.now() - window._lastBlinkApplyLog > 1000) {
      console.log('🟡 [STAGE 3] applyBlendShapesToVRM:', blinkDebug);
      window._lastBlinkApplyLog = Date.now();
    }
  }
}

// Debug helper - Log sau khi apply threshold (TẮT để tăng performance)
let lastThresholdLogTime = 0;
export function logBlendShapesAfterThreshold(blendShapes: VRMBlendShapes): void {
  // DISABLED - Uncomment để bật lại khi debug
  // const now = Date.now();
  // if (now - lastThresholdLogTime < 10000) return;
  // lastThresholdLogTime = now;
  // console.log('🔧 VALUES sau threshold:', blendShapes);
}

// Debug helper - Log giá trị đang active
let lastActiveLogTime = 0;
export function logBlendShapes(blendShapes: VRMBlendShapes): void {
  const now = Date.now();
  if (now - lastActiveLogTime < 10000) return; // Log mỗi 10s
  lastActiveLogTime = now;
  
  const active = Object.entries(blendShapes)
    .filter(([_, value]) => value && value > 0.05) // Chỉ log > 5%
    .map(([name, value]) => `${name}:${value?.toFixed(2)}`)
  
  if (active.length > 0) {
    console.log('🎭 Active:', active.join(', '));
  }
}

// Debug helper - Log blendshape blink
let lastBlendShapeBlinkLogTime = 0;
export function logBlendShapeBlink(blendShapes: VRMBlendShapes): void {
  const now = Date.now();
  if (now - lastBlendShapeBlinkLogTime < 10000) return; // Log mỗi 10s
  lastBlendShapeBlinkLogTime = now;
  
  console.log('\n🎭 === STAGE 2: BLENDSHAPE AFTER SOLVER ===');
  console.log(`Blink_L: ${(blendShapes.Blink_L || 0).toFixed(3)}`);
  console.log(`Blink_R: ${(blendShapes.Blink_R || 0).toFixed(3)}`);
  console.log(`Logic: 0.0=MỞ, 1.0=NHẮM`);
  
  if ((blendShapes.Blink_L || 0) > 0.3 || (blendShapes.Blink_R || 0) > 0.3) {
    console.warn('⚠️ BlendShape Blink > 0.3 - Model sẽ nhắm mắt!');
    console.log('   → Kiểm tra: Stage 1 có đúng không?');
  }
}

// Debug helper - Log giá trị thực tế được apply lên VRM (TẮT để tăng performance)
let lastAppliedLogTime = 0;
export function logAppliedValues(vrm: any): void {
  // DISABLED - Uncomment để bật lại khi debug
  // const now = Date.now();
  // if (now - lastAppliedLogTime < 10000) return;
  // lastAppliedLogTime = now;
  // if (!vrm?.expressionManager) return;
  // console.log('✅ VRM values applied');
}
