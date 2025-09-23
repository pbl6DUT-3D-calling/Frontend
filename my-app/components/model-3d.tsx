"use client"

import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OrbitControls, Environment, Float } from "@react-three/drei"
import { Suspense, useEffect, useState, useRef } from "react"
import { VRM, VRMLoaderPlugin } from "@pixiv/three-vrm"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import * as THREE from "three"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

// VRM Model Component
function VRMModel({ url }: { url: string }) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.register((parser: any) => new VRMLoaderPlugin(parser))
    
    loader.load(
      url,
      (gltf: any) => {
        const vrm = gltf.userData.vrm as VRM
        if (vrm) {
          // Scale and position the model
          vrm.scene.scale.setScalar(1)
          vrm.scene.position.set(0, -1, 0)
          setVrm(vrm)
        }
      },
      (progress: any) => console.log('Loading progress:', progress),
      (error: any) => console.error('Error loading VRM:', error)
    )

    return () => {
      if (vrm) {
        // Clean up VRM resources
        vrm.scene.clear()
      }
    }
  }, [url])

  useFrame((state, delta) => {
    if (vrm) {
      vrm.update(delta)
    }
  })

  return vrm ? <primitive object={vrm.scene} ref={ref} /> : null
}

function Scene({ vrmUrl }: { vrmUrl: string | null }) {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <directionalLight position={[0, 5, 5]} intensity={0.5} />

      {vrmUrl ? (
        <VRMModel url={vrmUrl} />
      ) : (
        // Default shapes when no VRM is loaded
        <>
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh position={[-2, 0, 0]}>
              <boxGeometry args={[3, 0.5, 0.1]} />
              <meshStandardMaterial color="#8b5cf6" />
            </mesh>
          </Float>

          <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
            <mesh position={[2, 0, 0]}>
              <sphereGeometry args={[0.5, 32, 32]} />
              <meshStandardMaterial color="#06b6d4" wireframe />
            </mesh>
          </Float>

          <Float speed={1.8} rotationIntensity={0.4} floatIntensity={0.4}>
            <mesh position={[0, 1.5, 0]}>
              <torusGeometry args={[0.3, 0.1, 16, 100]} />
              <meshStandardMaterial color="#f59e0b" />
            </mesh>
          </Float>
        </>
      )}

      <OrbitControls enableZoom={true} enablePan={true} />
    </>
  )
}

export function Model3D({ height = "h-[50vh]" }: { height?: string }) {
  const [isMounted, setIsMounted] = useState(false)
  const [vrmUrl, setVrmUrl] = useState<string | null>("/model3d/1.vrm") // Load default VRM
  const [isLoading, setIsLoading] = useState(false)
  const [isUsingDefaultModel, setIsUsingDefaultModel] = useState(true)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.vrm')) {
      setIsLoading(true)
      const url = URL.createObjectURL(file)
      setVrmUrl(url)
      setIsUsingDefaultModel(false)
      setIsLoading(false)
    } else {
      alert('Vui lòng chọn file .vrm')
    }
  }

  const handleRemoveModel = () => {
    if (vrmUrl && !isUsingDefaultModel) {
      URL.revokeObjectURL(vrmUrl)
    }
    setVrmUrl(null)
    setIsUsingDefaultModel(false)
  }

  const handleLoadDefaultModel = () => {
    if (vrmUrl && !isUsingDefaultModel) {
      URL.revokeObjectURL(vrmUrl)
    }
    setVrmUrl("/model3d/1.vrm")
    setIsUsingDefaultModel(true)
  }

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
    <div className="w-full space-y-4">
      {/* File Upload Controls */}
      <div className="flex items-center gap-2 justify-center">
        <label htmlFor="vrm-upload" className="cursor-pointer">
          <Button asChild variant="outline" size="sm">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Tải lên VRM khác
            </div>
          </Button>
        </label>
        <input
          id="vrm-upload"
          type="file"
          accept=".vrm"
          onChange={handleFileUpload}
          className="hidden"
        />
        {!isUsingDefaultModel && (
          <Button onClick={handleLoadDefaultModel} variant="outline" size="sm">
            Model mặc định
          </Button>
        )}
        {vrmUrl && (
          <Button onClick={handleRemoveModel} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 3D Scene */}
      <div className={`w-full ${height} rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 border border-border relative`}>
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Đang tải VRM model...</p>
            </div>
          </div>
        )}
        <Canvas
          camera={{ position: [0, 1, 3], fov: 50 }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          }}
        >
          <Suspense fallback={null}>
            <Scene vrmUrl={vrmUrl} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}
