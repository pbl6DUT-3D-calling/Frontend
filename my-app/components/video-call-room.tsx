"use client"

import { useState, Suspense, useEffect, useRef, useCallback } from "react"
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
import { wflwToVRMRig, type WFLWData } from "@/utils/wflwToVRM"
import { useMediaPipeEyes } from "../hooks/useEyes"
import { useModel } from "@/context/modelContext"

export function VideoCallRoom() {
  const { selectedModelUrl } = useModel() // 🔄 Get selected model from context
  
  // 🔍 DEBUG: Log model URL changes
  useEffect(() => {
    console.log('🎥 ========== VIDEO CALL ROOM MODEL UPDATE ==========');
    console.log('🎯 Video Call Room Model URL:', selectedModelUrl);
    console.log('===================================================');
  }, [selectedModelUrl]);
  
  const [isVideoOn, setIsVideoOn] = useState(false) // Camera tắt mặc định
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isInCall, setIsInCall] = useState(true)
  const [fpsDisplay, setFpsDisplay] = useState(0)
  
  // Refs cho WebSocket face tracking (WFLW - head + mouth)
  const videoElement = useRef<HTMLVideoElement>(null)
  const drawCanvas = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isProcessingRef = useRef(false) // Ping-Pong mechanism
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })
  const lastSendTimeRef = useRef(0)
  const latencyRef = useRef(0)
  const shouldStopRef = useRef(false)  // Flag để dừng loop
  const lastRigUpdateRef = useRef(0)  // Throttle setRiggedFace
  
  // MediaPipe eye data (để merge với WFLW)
  const mediaPipeEyeDataRef = useRef<{
    blinkLeft: number;
    blinkRight: number;
  } | null>(null)
  
  const setVideoElement = useVideoRecognition((state) => state.setVideoElement)
  const setRiggedFace = useVideoRecognition((state) => state.setRiggedFace)
  
  // 👁️ MediaPipe cho mắt (passive mode - không tạo camera riêng)
  const faceMeshRef = useMediaPipeEyes(
    videoElement.current,
    isVideoOn,
    (eyeData) => {
      mediaPipeEyeDataRef.current = eyeData;
      
      // Debug log mỗi 3 giây
      if (!window._lastCallbackLog || Date.now() - window._lastCallbackLog > 3000) {
        console.log('✅ MediaPipe callback received:', {
          blinkLeft: eyeData.blinkLeft.toFixed(3),
          blinkRight: eyeData.blinkRight.toFixed(3),
          leftEAR: eyeData.leftEyeEAR.toFixed(3),
          rightEAR: eyeData.rightEyeEAR.toFixed(3)
        });
        window._lastCallbackLog = Date.now();
      }
    }
  )

  // Clear canvas (when no face detected)
  const clearLandmarks = useCallback(() => {
    if (!drawCanvas.current) return
    const ctx = drawCanvas.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, drawCanvas.current.width, drawCanvas.current.height)
  }, [])

  // Draw WFLW landmarks on canvas
  const drawWFLWLandmarks = useCallback((landmarks: WFLWData['landmarks']) => {
    if (!drawCanvas.current || !landmarks || landmarks.length !== 98) {
      clearLandmarks()
      return
    }

    const ctx = drawCanvas.current.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, drawCanvas.current.width, drawCanvas.current.height)

    // Draw all points
    ctx.fillStyle = '#00ff00'
    landmarks.forEach((point) => {
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return
      ctx.beginPath()
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Helper to draw path
    const drawPath = (indices: number[], close = false) => {
      if (indices.length < 2) return
      
      // Validate all indices exist
      const validIndices = indices.filter(i => 
        landmarks[i] && 
        typeof landmarks[i].x === 'number' && 
        typeof landmarks[i].y === 'number'
      )
      
      if (validIndices.length < 2) return
      
      ctx.beginPath()
      ctx.moveTo(landmarks[validIndices[0]].x, landmarks[validIndices[0]].y)
      for (let i = 1; i < validIndices.length; i++) {
        ctx.lineTo(landmarks[validIndices[i]].x, landmarks[validIndices[i]].y)
      }
      if (close) ctx.closePath()
      ctx.stroke()
    }

    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 1

    // Face contour (0-32)
    drawPath(Array.from({ length: 33 }, (_, i) => i))

    // Left eyebrow (33-41)
    drawPath(Array.from({ length: 9 }, (_, i) => i + 33))

    // Right eyebrow (42-50)
    drawPath(Array.from({ length: 9 }, (_, i) => i + 42))

    // Nose (51-59)
    drawPath(Array.from({ length: 9 }, (_, i) => i + 51))

    // Left eye (60-67)
    drawPath(Array.from({ length: 8 }, (_, i) => i + 60), true)

    // Right eye (68-75)
    drawPath(Array.from({ length: 8 }, (_, i) => i + 68), true)

    // Outer mouth (76-87)
    drawPath(Array.from({ length: 12 }, (_, i) => i + 76), true)

    // Inner mouth (88-95)
    drawPath(Array.from({ length: 8 }, (_, i) => i + 88), true)

    // Highlight pupils (96, 97)
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(landmarks[96].x, landmarks[96].y, 4, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(landmarks[97].x, landmarks[97].y, 4, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  // Initialize WebSocket face tracking when camera turns on
  useEffect(() => {
    if (!isVideoOn) {
      // Cleanup when camera is off
      console.log("🧹 Cleaning up WebSocket and camera...")
      setVideoElement(null)
      // setRiggedFace(null) // ❌ KHÔNG reset - giữ expression cuối cùng
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      isProcessingRef.current = false
      console.log("✅ Cleanup complete")
      return
    }

    // Initialize WebSocket face tracking
    const initFaceTracking = async () => {
      if (!videoElement.current) {
        console.error("❌ Video element not found")
        return
      }

      console.log("🎥 Starting WebSocket face tracking...")

      try {
        // 1. Get camera stream
        console.log("📹 Requesting camera access...")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: false
        })
        
        streamRef.current = stream
        videoElement.current.srcObject = stream
        await videoElement.current.play()
        
        console.log("✅ Camera stream active")
        setVideoElement(videoElement.current)
        
        // Reset flags
        shouldStopRef.current = false
        isProcessingRef.current = false

        // Set canvas size - GIẢM resolution để tăng tốc độ
        if (drawCanvas.current) {
          drawCanvas.current.width = 160  // Giảm từ 240
          drawCanvas.current.height = 120  // Giảm từ 180
        }

        // 2. Connect to WebSocket
        console.log("🔌 Connecting to WebSocket server...")
        // const ws = new WebSocket("ws://localhost:8000/ws/face-tracking")
        const ws = new WebSocket(process.env.NEXT_PUBLIC_AI_WS_URL);
        wsRef.current = ws

        ws.onopen = () => {
          console.log("✅ WebSocket connected - starting frame loop...")
          
          // TEST: Send a test message first
          console.log("🧪 Sending test message to check server response...")
          ws.send(JSON.stringify({ type: "ping" }))
          
          // Start sending frames
          setTimeout(() => sendFrame(), 100) // Delay để đảm bảo video ready
        }

        ws.onmessage = (event) => {
          try {
            const receiveTime = Date.now()
            const data: WFLWData = JSON.parse(event.data)
            
            // Validate data structure
            if (!data.landmarks || !Array.isArray(data.landmarks) || data.landmarks.length !== 98) {
              // ✅ CLEAR CANVAS khi không có face detected
              clearLandmarks()
              isProcessingRef.current = false
              return
            }
            
            // Tính latency
            latencyRef.current = receiveTime - lastSendTimeRef.current
            
            // Update FPS counter và hiển thị latency
            fpsCounterRef.current.frames++
            const now = Date.now()
            if (now - fpsCounterRef.current.lastTime >= 1000) {
              setFpsDisplay(fpsCounterRef.current.frames)
              console.log(`⏱️ FPS: ${fpsCounterRef.current.frames} | Latency: ${latencyRef.current}ms`)
              fpsCounterRef.current.frames = 0
              fpsCounterRef.current.lastTime = now
            }

            // Draw landmarks
            drawWFLWLandmarks(data.landmarks)

            // Convert WFLW to VRM format - Dùng resolution mới
            const vrmRig = wflwToVRMRig(data, 160, 120)
            
            // ✅ OVERRIDE: MediaPipe 100% điều khiển blink (LUÔN LUÔN)
            // WFLW đã set blink = 0, MediaPipe override tuyệt đối
            if (mediaPipeEyeDataRef.current) {
              vrmRig.blink.l = mediaPipeEyeDataRef.current.blinkLeft
              vrmRig.blink.r = mediaPipeEyeDataRef.current.blinkRight
              
              // Debug log mỗi 1 giây (tạm thời để debug)
              if (!window._lastMergeLog || Date.now() - window._lastMergeLog > 1000) {
                console.log('🔵 [STAGE 1] MediaPipe → vrmRig.blink:', {
                  'mediaPipe.blinkLeft': mediaPipeEyeDataRef.current.blinkLeft.toFixed(3),
                  'mediaPipe.blinkRight': mediaPipeEyeDataRef.current.blinkRight.toFixed(3),
                  '→ vrmRig.blink.l': vrmRig.blink.l.toFixed(3),
                  '→ vrmRig.blink.r': vrmRig.blink.r.toFixed(3)
                });
                window._lastMergeLog = Date.now();
              }
            } else {
              // ⚠️ MediaPipe chưa có data
              console.warn('⚠️ mediaPipeEyeDataRef.current is NULL - mắt sẽ giữ mở');
              vrmRig.blink.l = 0;
              vrmRig.blink.r = 0;
            }
            
            // ⚡ OPTIMIZATION: Throttle setRiggedFace (16ms = 60fps max)
            if (!lastRigUpdateRef.current || now - lastRigUpdateRef.current > 16) {
              setRiggedFace(vrmRig);
              lastRigUpdateRef.current = now;
            }

            // Ready for next frame
            isProcessingRef.current = false

          } catch (error) {
            console.error("❌ Error processing WebSocket message:", error)
            isProcessingRef.current = false
          }
        }

        ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error)
        }

        ws.onclose = () => {
          console.log("🔌 WebSocket disconnected")
        }

        // Reuse canvas - GIẢM resolution để tăng tốc độ
        const resizeCanvas = document.createElement('canvas')
        resizeCanvas.width = 160   // Giảm từ 240
        resizeCanvas.height = 120  // Giảm từ 180
        const resizeCtx = resizeCanvas.getContext('2d', { 
          willReadFrequently: false,
          alpha: false  // Không cần alpha channel
        })
        
        let frameSkipCounter = 0
        
        // Function to send frame to server
        const sendFrame = () => {
          if (!isVideoOn || !videoElement.current || !ws || ws.readyState !== WebSocket.OPEN) {
            return
          }

          // STRICT PING-PONG: Chỉ gửi khi server đã trả về
          if (isProcessingRef.current) {
            // Nếu latency > 200ms, skip nhiều frames hơn
            if (latencyRef.current > 200) {
              frameSkipCounter++
              if (frameSkipCounter < 3) {  // Skip 2 frames
                animationFrameRef.current = requestAnimationFrame(sendFrame)
                return
              }
              frameSkipCounter = 0
            }
            animationFrameRef.current = requestAnimationFrame(sendFrame)
            return
          }

          try {
            if (resizeCtx && videoElement.current.readyState === videoElement.current.HAVE_ENOUGH_DATA) {
              // Draw resized frame
              resizeCtx.drawImage(videoElement.current, 0, 0, 160, 120)
              
              // 👁️ Gọi MediaPipe FaceLandmarker (passive - dùng chung video)
              if (faceMeshRef?.detectForVideoFrame) {
                const timestamp = performance.now();
                faceMeshRef.detectForVideoFrame(videoElement.current, timestamp);
              } else if (!window._mediaPipeWarningShown) {
                console.warn('⚠️ MediaPipe not initialized:', { faceMeshRef, hasDetectFn: !!faceMeshRef?.detectForVideoFrame });
                window._mediaPipeWarningShown = true;
              }
              
              // Convert to JPEG base64 - GIẢM quality xuống 0.2
              const base64Image = resizeCanvas.toDataURL('image/jpeg', 0.2).split(',')[1]
              
              // Send to server
              lastSendTimeRef.current = Date.now()
              ws.send(base64Image)
              isProcessingRef.current = true
              
              // XÓA TIMEOUT - Chỉ đợi response thật sự từ server
              // Không force reset sau 300ms nữa
            }
          } catch (error) {
            console.error("❌ Error sending frame:", error)
            isProcessingRef.current = false  // Reset nếu lỗi
          }

          // Continue loop - CHỈ KHI chưa dừng
          if (!shouldStopRef.current) {
            animationFrameRef.current = requestAnimationFrame(sendFrame)
          }
        }

      } catch (error) {
        console.error("❌ Failed to initialize face tracking:", error)
        alert("Không thể khởi động camera. Vui lòng cho phép quyền truy cập camera.")
      }
    }

    initFaceTracking()

    return () => {
      console.log("🧹 Cleaning up face tracking...")
      
      // DỪNG LOOP NGAY LẬP TỨC
      shouldStopRef.current = true
      isProcessingRef.current = false
      
      // ❌ RESET TẮT - Không reset riggedFace
      // setRiggedFace(null)
      // console.log("✅ Reset riggedFace to null - VRM will return to idle")
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      // Close WebSocket NGAY
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Camera stopped")  // Code 1000 = normal closure
          console.log("✅ WebSocket closed")
        } catch (error) {
          console.warn("⚠️ Error closing WebSocket:", error)
        }
        wsRef.current = null
      }
      
      // Stop camera stream
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => {
            track.stop()
            console.log("✅ Camera track stopped")
          })
        } catch (error) {
          console.warn("⚠️ Error stopping camera:", error)
        }
        streamRef.current = null
      }
      
      // Stop video element
      if (videoElement.current && videoElement.current.srcObject) {
        videoElement.current.srcObject = null
      }
      
      // Reset refs
      shouldStopRef.current = false
      latencyRef.current = 0
      
      // Cancel animation frame (double check)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      isProcessingRef.current = false
      console.log("✅ Cleanup complete")
    }
  }, [isVideoOn, setVideoElement, setRiggedFace, drawWFLWLandmarks])

  const toggleVideo = () => {
    console.log("Toggle Video - Bật/tắt camera")
    const newState = !isVideoOn
    
    // Nếu tắt camera, reset riggedFace về null để trở về idle
    if (!newState) {
      console.log("📹 Camera turning OFF - Resetting to idle pose")
      setRiggedFace(null)
    }
    
    setIsVideoOn(newState)
  }
  
  const toggleAudio = () => {
    console.log("Toggle Audio")
    setIsAudioOn(!isAudioOn)
  }
  
  const toggleCall = () => {
    console.log("Toggle Call")
    setIsInCall(!isInCall)
    if (isInCall) {
      // End call - turn off camera
      setIsVideoOn(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
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
                  <Experience key={`videocall-${selectedModelUrl}`} modelUrl={selectedModelUrl} />
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
                {/* FPS Counter */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-20">
                  {fpsDisplay} FPS
                </div>
              </div>
            )}

            <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-xs text-primary-foreground">
                {isVideoOn ? "WFLW Tracking Active" : "3D Avatar Ready"}
              </span>
            </div>
          </div>

          {/* Các nút bấm */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isVideoOn ? "default" : "outline"}
              size="icon"
              onClick={toggleVideo}
              disabled={!isInCall}
            >
              {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={isAudioOn ? "default" : "outline"}
              size="icon"
              onClick={toggleAudio}
              disabled={!isInCall}
            >
              {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>
            
            <Button
              variant={isInCall ? "destructive" : "default"}
              size="icon"
              onClick={toggleCall}
            >
              {isInCall ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-foreground">You</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">You</p>
                <p className="text-xs text-muted-foreground">Host</p>
              </div>
              {isVideoOn && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Camera On
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
