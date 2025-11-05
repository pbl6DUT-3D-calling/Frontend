"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment, Float } from "@react-three/drei"
import { Suspense, useEffect, useState, useRef } from "react"
// import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm" // Sửa: Đã xóa import tĩnh
import * as THREE from "three"

// VRM Model Component
// Component này không thay đổi
function VRMModel({ url }: { url: string }) {
  const [vrm, setVrm] = useState<any | null>(null) // Sửa: Đổi 'VRM' thành 'any'
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    // Đảm bảo dọn dẹp vrm cũ khi url thay đổi
    let loader: any; // Khai báo loader ở đây để có thể truy cập trong cleanup

    const loadVRM = async () => {
      try {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
        
        // Sửa: Tải động VRMLoaderPlugin từ CDN
        const { VRMLoaderPlugin } = await import('@pixiv/three-vrm')

        loader = new GLTFLoader()
        loader.register((parser: any) => new VRMLoaderPlugin(parser))
        
        loader.load(
          url,
          (gltf: any) => {
            const vrm = gltf.userData.vrm // Sửa: Xóa 'as VRM'
            if (vrm) {
              vrm.scene.scale.setScalar(1.5) // Tăng scale một chút cho dễ nhìn
              vrm.scene.position.set(0, -1.5, 0) // Điều chỉnh vị trí y
              setVrm(vrm)
            }
          },
          (progress: any) => console.log('Loading progress:', progress),
          (error: any) => console.error('Error loading VRM:', error)
        )
      } catch (error) {
        console.error('Error importing GLTFLoader:', error)
      }
    }

    loadVRM()

    return () => {
      // Dọn dẹp model cũ khi component unmount hoặc url thay đổi
      if (vrm) {
        vrm.scene.traverse((obj: { geometry: { dispose: () => void }; material: { forEach: (arg0: (mat: any) => any) => void; dispose: () => void } }) => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        setVrm(null);
      }
      // Bạn cũng có thể muốn hủy tiến trình load nếu nó đang diễn ra
      // loader.abort(); // (cần check API của GLTFLoader)
    }
  }, [url]) // Chạy lại effect khi `url` thay đổi

  useFrame((state, delta) => {
    if (vrm) {
      vrm.update(delta)
    }
  })

  return vrm ? <primitive object={vrm.scene} ref={ref} /> : null
}

// Scene Component
// Component này không thay đổi, nhưng thêm fallback cho suspense
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
      <OrbitControls enableZoom={true} enablePan={true} target-y={-0.5} />
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
          shadows
        >
          <Scene vrmUrl={vrmUrl} />
        </Canvas>
      )}
    </div>
  )
}