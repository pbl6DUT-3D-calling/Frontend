"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Float } from "@react-three/drei"
import { Suspense, useEffect, useState, useRef } from "react"
// import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm" // Sửa: Đã xóa import tĩnh
import * as THREE from "three"

// VRM Model Component - Optimized
function VRMModel({ url }: { url: string }) {
  const [vrm, setVrm] = useState<any | null>(null)
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!url) return;
    
    let isMounted = true;
    let currentVrm: any = null;

    const loadVRM = async () => {
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
        const { VRMLoaderPlugin } = await import('@pixiv/three-vrm')

        const loader = new GLTFLoader()
        loader.register((parser: any) => new VRMLoaderPlugin(parser))
        
        // Add crossOrigin for Firebase Storage
        loader.setCrossOrigin('anonymous');
        
        loader.load(
          url,
          (gltf: any) => {
            if (!isMounted) return;
            
            const newVrm = gltf.userData.vrm
            if (newVrm) {
              // Scale và position
              newVrm.scene.scale.setScalar(1.5)
              newVrm.scene.position.set(0, -1.5, 0)
              
              // Xoay model quay mặt về phía camera (180 độ)
              newVrm.scene.rotation.y = Math.PI
              
              // Set pose thả lỏng (không T-pose)
              if (newVrm.humanoid) {
                // Hạ tay xuống tự nhiên
                const leftUpperArm = newVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
                const rightUpperArm = newVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
                const leftLowerArm = newVrm.humanoid.getNormalizedBoneNode('leftLowerArm');
                const rightLowerArm = newVrm.humanoid.getNormalizedBoneNode('rightLowerArm');
                
                if (leftUpperArm) leftUpperArm.rotation.z = 0.3; // Hạ tay trái
                if (rightUpperArm) rightUpperArm.rotation.z = -0.3; // Hạ tay phải
                if (leftLowerArm) leftLowerArm.rotation.z = -0.2; // Cong khuỷu trái
                if (rightLowerArm) rightLowerArm.rotation.z = 0.2; // Cong khuỷu phải
              }
              
              currentVrm = newVrm;
              setVrm(newVrm)
            }
          },
          (progress: any) => {
            console.log('Loading progress:', Math.round((progress.loaded / progress.total) * 100) + '%');
          },
          (error: any) => {
            if (isMounted) {
              console.error('Error loading VRM from:', url);
              console.error('Error details:', error);
              alert('Không thể load model. URL: ' + url);
            }
          }
        )
      } catch (error) {
        if (isMounted) {
          console.error('Error importing VRM loader:', error)
        }
      }
    }

    loadVRM();

    return () => {
      isMounted = false;
      
      // Cleanup
      if (currentVrm) {
        currentVrm.scene.traverse((obj: any) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat: any) => mat?.dispose());
            } else {
              obj.material?.dispose();
            }
          }
        });
      }
      setVrm(null);
    }
  }, [url])

  useFrame((state, delta) => {
    if (vrm) {
      vrm.update(delta)
    }
  })

  return vrm ? <primitive object={vrm.scene} ref={ref} /> : null
}

// Scene Component
function Scene({ vrmUrl }: { vrmUrl: string }) {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <directionalLight position={[0, 5, 5]} intensity={0.5} />
      <Suspense fallback={null}>
        <VRMModel url={vrmUrl} />
      </Suspense>
      {/* OrbitControls với target nhìn vào đầu nhân vật */}
      <OrbitControls 
        enableZoom={true} 
        enablePan={true} 
        target={[0, 0, 0]}
        minDistance={1.5}
        maxDistance={5}
      />
    </>
  )
}

// === COMPONENT CHÍNH ĐÃ ĐƯỢC REFACTOR ===
// Nó chỉ nhận props và hiển thị, không còn state nội bộ
export function Model3D({ 
  vrmUrl,
  height = "h-64",
  showLoading = false 
}: { 
  vrmUrl: string | null,
  height?: string,
  showLoading?: boolean
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Component loading khi isMounted là false (SSR)
  if (!isMounted) {
    return (
      <div className={`w-full ${height} rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 border border-border flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading 3D Scene...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`w-full ${height} rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 border border-border relative`}>
      {/* Lớp phủ loading (khi đang tải file mới) */}
      {showLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Đang tải VRM model...</p>
          </div>
        </div>
      )}
      
      {/* Kiểm tra vrmUrl:
        - Nếu không có vrmUrl, hiển thị thông báo chào mừng.
        - Nếu có vrmUrl, hiển thị Canvas.
      */}
      {!vrmUrl ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to VTuber Studio!</h2>
            <p className="text-muted-foreground">Tải lên VRM Model để bắt đầu</p>
          </div>
        </div>
      ) : (
        <Canvas
          camera={{ position: [0, 0, 2.5], fov: 50 }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          }}
          gl={{ 
            preserveDrawingBuffer: true,
            antialias: true,
            powerPreference: "high-performance"
          }}
          dpr={[1, 2]} // Limit pixel ratio
          shadows
        >
          <Scene vrmUrl={vrmUrl} />
        </Canvas>
      )}
    </div>
  )
}