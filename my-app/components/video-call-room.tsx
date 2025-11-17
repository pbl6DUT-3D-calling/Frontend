"use client"

import { useState, Suspense, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
} from "lucide-react"

// --- CÁC IMPORT TỪ PROJECT CŨ ---
import { Canvas } from "@react-three/fiber"
import { Loader } from "@react-three/drei"
import { Experience } from "./Experience"
import { useVideoRecognition } from "../hooks/useVideoRecognition"

export function VideoCallRoom() {
  const [isVideoOn, setIsVideoOn] = useState(false) // Camera tắt mặc định
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isInCall, setIsInCall] = useState(true)
  
  // Refs cho mediapipe
  const videoElement = useRef<HTMLVideoElement>(null)
  const drawCanvas = useRef<HTMLCanvasElement>(null)
  const cameraInstance = useRef<any>(null)
  const holisticInstance = useRef<any>(null)
  
  const setVideoElement = useVideoRecognition((state) => state.setVideoElement)

  // Initialize mediapipe when camera turns on
  useEffect(() => {
    if (!isVideoOn) {
      // Cleanup when camera is off
      setVideoElement(null)
      if (cameraInstance.current) {
        cameraInstance.current.stop()
        cameraInstance.current = null
      }
      if (holisticInstance.current) {
        holisticInstance.current.close()
        holisticInstance.current = null
      }
      return
    }

    // Load MediaPipe từ CDN (không dùng npm packages)
    const loadMediaPipeScripts = async () => {
      return new Promise<void>((resolve, reject) => {
        // Kiểm tra xem đã load chưa
        if ((window as any).Holistic) {
          console.log("✅ MediaPipe already loaded")
          resolve()
          return
        }

        console.log("📥 Loading MediaPipe scripts from CDN...")
        
        // Load Holistic script
        const holisticScript = document.createElement('script')
        holisticScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js'
        holisticScript.crossOrigin = 'anonymous'
        
        holisticScript.onload = () => {
          console.log("✅ Holistic script loaded")
          
          // Load Camera Utils
          const cameraScript = document.createElement('script')
          cameraScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
          cameraScript.crossOrigin = 'anonymous'
          
          cameraScript.onload = () => {
            console.log("✅ Camera Utils script loaded")
            
            // Load Drawing Utils
            const drawingScript = document.createElement('script')
            drawingScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
            drawingScript.crossOrigin = 'anonymous'
            
            drawingScript.onload = () => {
              console.log("✅ Drawing Utils script loaded")
              resolve()
            }
            
            drawingScript.onerror = () => reject(new Error("Failed to load Drawing Utils"))
            document.head.appendChild(drawingScript)
          }
          
          cameraScript.onerror = () => reject(new Error("Failed to load Camera Utils"))
          document.head.appendChild(cameraScript)
        }
        
        holisticScript.onerror = () => reject(new Error("Failed to load Holistic"))
        document.head.appendChild(holisticScript)
      })
    }

    // Initialize mediapipe
    const initMediapipe = async () => {
      if (!videoElement.current) {
        console.error("❌ Video element not found")
        return
      }

      if (useVideoRecognition.getState().videoElement) {
        console.log("⚠️ Video element already set")
        return
      }

      console.log("🎥 Starting mediapipe initialization...")

      try {
        // Load scripts từ CDN
        await loadMediaPipeScripts()
        
        // Lấy các constructors từ window object
        const { Holistic, POSE_CONNECTIONS, FACEMESH_TESSELATION, HAND_CONNECTIONS } = (window as any)
        const { Camera } = (window as any)
        const { drawConnectors, drawLandmarks } = (window as any)

        if (!Holistic) {
          throw new Error("Failed to load Holistic constructor from CDN")
        }

        console.log("✅ All MediaPipe modules loaded successfully")
        setVideoElement(videoElement.current)

        console.log("📦 Creating Holistic instance...")
        const holistic = new Holistic({
          locateFile: (file: string) => {
            // Dùng CDN không chỉ định version cụ thể (theo hướng dẫn fix lỗi)
            const url = `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
            console.log(`📥 Loading MediaPipe file: ${file}`)
            return url
          },
        })
        console.log("✅ Holistic instance created successfully")

        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
          refineFaceLandmarks: true,
        })

        holistic.onResults((results: any) => {
          // Draw results on canvas
          if (!drawCanvas.current || !videoElement.current) return
          
          drawCanvas.current.width = videoElement.current.videoWidth
          drawCanvas.current.height = videoElement.current.videoHeight
          const canvasCtx = drawCanvas.current.getContext("2d")
          if (!canvasCtx) return

          canvasCtx.save()
          canvasCtx.clearRect(0, 0, drawCanvas.current.width, drawCanvas.current.height)
          
          // Draw pose
          drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: "#00cff7",
            lineWidth: 4,
          })
          drawLandmarks(canvasCtx, results.poseLandmarks, {
            color: "#ff0364",
            lineWidth: 2,
          })
          
          // Draw face mesh
          drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {
            color: "#C0C0C070",
            lineWidth: 1,
          })
          
          // Draw pupils
          if (results.faceLandmarks && results.faceLandmarks.length === 478) {
            drawLandmarks(
              canvasCtx,
              [results.faceLandmarks[468], results.faceLandmarks[468 + 5]],
              {
                color: "#ffe603",
                lineWidth: 2,
              }
            )
          }
          
          // Draw hands
          drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
            color: "#eb1064",
            lineWidth: 5,
          })
          drawLandmarks(canvasCtx, results.leftHandLandmarks, {
            color: "#00cff7",
            lineWidth: 2,
          })
          drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
            color: "#22c3e3",
            lineWidth: 5,
          })
          drawLandmarks(canvasCtx, results.rightHandLandmarks, {
            color: "#ff0364",
            lineWidth: 2,
          })
          
          canvasCtx.restore()

          // Send to VRM Avatar
          useVideoRecognition.getState().resultsCallback?.(results)
        })

        holisticInstance.current = holistic

        // Add event listeners to video element TRƯỚC KHI khởi tạo camera
        if (videoElement.current) {
          videoElement.current.onloadedmetadata = () => {
            console.log("📹 Video metadata loaded:", {
              width: videoElement.current?.videoWidth,
              height: videoElement.current?.videoHeight,
              readyState: videoElement.current?.readyState
            })
          }
          
          videoElement.current.onloadeddata = () => {
            console.log("✅ Video data loaded - camera stream active!")
          }
          
          videoElement.current.onplay = () => {
            console.log("▶️ Video is playing")
          }
          
          videoElement.current.onerror = (e) => {
            console.error("❌ Video error:", e)
          }
        }

        console.log("📹 Initializing Camera with video element...")
        const camera = new Camera(videoElement.current, {
          onFrame: async () => {
            if (videoElement.current) {
              await holistic.send({ image: videoElement.current })
            }
          },
          width: 640,
          height: 480,
        })
        console.log("📹 Camera instance created")
        
        console.log("📹 Starting camera...")
        await camera.start()
        cameraInstance.current = camera
        
        console.log("✅ Camera started successfully - waiting for video stream...")
      } catch (error) {
        console.error("❌ Failed to initialize mediapipe:", error)
        alert("Không thể khởi động camera. Vui lòng cho phép quyền truy cập camera.")
      }
    }

    initMediapipe()

    return () => {
      console.log("🧹 Cleaning up mediapipe...")
      
      // Stop camera
      if (cameraInstance.current) {
        try {
          cameraInstance.current.stop()
          console.log("✅ Camera stopped")
        } catch (error) {
          console.warn("⚠️ Error stopping camera:", error)
        }
        cameraInstance.current = null
      }
      
      // Close holistic
      if (holisticInstance.current) {
        try {
          holisticInstance.current.close()
          console.log("✅ Holistic closed")
        } catch (error) {
          console.warn("⚠️ Error closing holistic (already deleted):", error)
        }
        holisticInstance.current = null
      }
      
      // Stop video stream
      if (videoElement.current && videoElement.current.srcObject) {
        try {
          const stream = videoElement.current.srcObject as MediaStream
          stream.getTracks().forEach(track => {
            track.stop()
            console.log("✅ Video track stopped")
          })
          videoElement.current.srcObject = null
        } catch (error) {
          console.warn("⚠️ Error stopping video stream:", error)
        }
      }
      
      console.log("✅ Cleanup complete")
    }
  }, [isVideoOn, setVideoElement])

  const toggleVideo = () => {
    console.log("Toggle Video - Bật/tắt camera và mediapipe")
    setIsVideoOn(!isVideoOn)
  }
  
  const toggleAudio = () => {
    console.log("Toggle Audio")
    setIsAudioOn(!isAudioOn)
  }
  
  const toggleCall = () => {
    console.log("Toggle Call")
    setIsInCall(!isInCall)
    if (isInCall) {
      // End call - turn off everything
      setIsVideoOn(false)
      setIsAudioOn(false)
    } else {
      // Start call
      setIsAudioOn(true)
    }
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Video Call Room
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {/* 3D Avatar Canvas - Always visible when in call */}
            {isInCall && (
              <Canvas shadows
                camera={{ position: [0, 0, 1.0], fov: 30 }}>
                <color attach="background" args={["#333"]} />
                <fog attach="fog" args={["#333", 10, 20]} />
                <Suspense fallback={null}>
                  <Experience />
                </Suspense>
              </Canvas>
            )}
            
            {!isInCall && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <div className="text-center">
                  <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Call ended</p>
                </div>
              </div>
            )}

            {/* Camera Feed Widget - Small preview in corner */}
            {isVideoOn && isInCall && (
              <div className="absolute bottom-4 right-4 w-[240px] h-[180px] rounded-xl overflow-hidden border-2 border-primary/50 shadow-xl z-10 bg-gray-900">
                <video
                  ref={videoElement}
                  className="absolute z-0 w-full h-full top-0 left-0 object-cover"
                  autoPlay
                  playsInline
                  muted
                  style={{ display: 'block' }}
                />
                <canvas
                  ref={drawCanvas}
                  className="absolute z-10 w-full h-full top-0 left-0 pointer-events-none"
                />
              </div>
            )}

            <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-xs text-primary-foreground">
                {isVideoOn ? "Face Tracking Active" : "3D Avatar Ready"}
              </span>
            </div>
          </div>

          {/* Các nút bấm sẽ ở trạng thái 'enabled' vì isInCall là 'true' */}
          <div className="flex justify-center space-x-4">
            <Button
              variant={isVideoOn ? "default" : "secondary"}
              size="sm"
              onClick={toggleVideo}
              disabled={!isInCall}
            >
              {isVideoOn ? (
                <Video className="w-4 h-4" />
              ) : (
                <VideoOff className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant={isAudioOn ? "default" : "secondary"}
              size="sm"
              onClick={toggleAudio}
              disabled={!isInCall}
            >
              {isAudioOn ? (
                <Mic className="w-4 h-4" />
              ) : (
                <MicOff className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant={isInCall ? "destructive" : "default"}
              size="sm"
              onClick={toggleCall}
              className="px-6"
            >
              {isInCall ? (
                <PhoneOff className="w-4 h-4 mr-2" />
              ) : (
                <Phone className="w-4 h-4 mr-2" />
              )}
              {isInCall ? "End Call" : "Start Call"}
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {isInCall
                ? "Ready to stream with 3D avatar"
                : "Start a call to begin streaming"}
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}