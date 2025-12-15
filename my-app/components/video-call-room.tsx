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
  Circle,
  Square,
} from "lucide-react"

import { Canvas, useThree } from "@react-three/fiber"
import { Loader } from "@react-three/drei"
import { Experience } from "./Experience"
import { useVideoRecognition } from "../hooks/useVideoRecognition"
import { wflwToVRMRig, type WFLWData } from "@/utils/wflwToVRM"
import { useMediaPipeEyes } from "../hooks/useEyes"
import { useModel } from "@/context/modelContext"
import { BackgroundSelector, BACKGROUNDS, type BackgroundOption } from "./background-selector"
import { FilterSelector, type FilterType } from "./filter-selector"

// ✅ Recording Controller Component - Lives inside Canvas
function RecordingController({ 
  onCanvasReady 
}: { 
  onCanvasReady: (canvas: HTMLCanvasElement) => void 
}) {
  const { gl } = useThree();
  
  useEffect(() => {
    if (gl.domElement) {
      console.log('✅ Canvas ready:', {
        width: gl.domElement.width,
        height: gl.domElement.height,
        type: gl.domElement.constructor.name
      });
      onCanvasReady(gl.domElement);
    }
  }, [gl, onCanvasReady]);
  
  return null;
}

export function VideoCallRoom() {
  const { selectedModelUrl } = useModel()
  
  useEffect(() => {
    console.log('🎥 Video Call Room Model URL:', selectedModelUrl);
  }, [selectedModelUrl]);
  
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isInCall, setIsInCall] = useState(true)
  const [fpsDisplay, setFpsDisplay] = useState(0)

  // Recording states
  const [isRecording, setIsRecording] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null) // ✅ Store canvas ref
  
  // 🎨 Background and Filter states
  const [background, setBackground] = useState<BackgroundOption>(BACKGROUNDS[0])
  const [filter, setFilter] = useState<FilterType>("none")
  
  // Refs cho WebSocket face tracking (WFLW - head + mouth)
  const videoElement = useRef<HTMLVideoElement>(null)
  const drawCanvas = useRef<HTMLCanvasElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isProcessingRef = useRef(false)
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })
  const lastSendTimeRef = useRef(0)
  const latencyRef = useRef(0)
  const shouldStopRef = useRef(false)
  const lastRigUpdateRef = useRef(0)

  const noFaceFramesRef = useRef(0)
  const IDLE_THRESHOLD = 60
  
  const mediaPipeEyeDataRef = useRef<{
    blinkLeft: number;
    blinkRight: number;
  } | null>(null)
  
  const setVideoElement = useVideoRecognition((state) => state.setVideoElement)
  const setRiggedFace = useVideoRecognition((state) => state.setRiggedFace)
  
  const faceMeshRef = useMediaPipeEyes(
    videoElement.current,
    isVideoOn,
    (eyeData) => {
      mediaPipeEyeDataRef.current = eyeData;
      
      if (!window._lastCallbackLog || Date.now() - window._lastCallbackLog > 3000) {
        console.log('✅ MediaPipe callback received:', {
          blinkLeft: eyeData.blinkLeft.toFixed(3),
          blinkRight: eyeData.blinkRight.toFixed(3),
        });
        window._lastCallbackLog = Date.now();
      }
    }
  )

  // ✅ Canvas ready callback
  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
    console.log('📦 Canvas stored in ref');
  }, []);

  // Recording functions
  const downloadRecording = (blob: Blob, baseName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${baseName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log(`💾 Recording saved: ${a.download}`);
  };

  const startRecording = async () => {
    try {
      if (!canvasRef.current) {
        alert('Canvas not ready. Please wait a moment and try again.');
        return;
      }

      const canvasElement = canvasRef.current;

      console.log('🎬 Starting recording:', {
        canvas: canvasElement.constructor.name,
        size: `${canvasElement.width}x${canvasElement.height}`,
        hasCaptureStream: typeof canvasElement.captureStream === 'function'
      });

      // Check if captureStream is available
      if (typeof canvasElement.captureStream !== 'function') {
        alert('Canvas recording is not supported in your browser.');
        return;
      }

      const canvasStream = canvasElement.captureStream(30);

      // Check if stream has video tracks
      const videoTracks = canvasStream.getVideoTracks();
      console.log('📹 Video tracks:', videoTracks.length);
      
      if (videoTracks.length === 0) {
        alert('Canvas stream has no video tracks!');
        return;
      }

      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log(`📦 Chunk recorded: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log(`💾 Total size: ${blob.size} bytes`);
        downloadRecording(blob, '3d-avatar-recording');
      };

      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      alert('Failed to start recording: ' + (error as Error).message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setShowStopConfirm(false);
      console.log('⏹️ Recording stopped');
    }
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      if (showStopConfirm) {
        stopRecording();
      } else {
        setShowStopConfirm(true);
        setTimeout(() => setShowStopConfirm(false), 3000);
      }
    } else {
      startRecording();
    }
  };

  const clearLandmarks = useCallback(() => {
    if (!drawCanvas.current) return
    const ctx = drawCanvas.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, drawCanvas.current.width, drawCanvas.current.height)
  }, [])

  const drawWFLWLandmarks = useCallback((landmarks: WFLWData['landmarks']) => {
    if (!drawCanvas.current || !landmarks || landmarks.length !== 98) {
      clearLandmarks()
      return
    }

    const ctx = drawCanvas.current.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, drawCanvas.current.width, drawCanvas.current.height)

    ctx.fillStyle = '#00ff00'
    landmarks.forEach((point) => {
      if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') return
      ctx.beginPath()
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
      ctx.fill()
    })

    const drawPath = (indices: number[], close = false) => {
      if (indices.length < 2) return
      
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

    drawPath(Array.from({ length: 33 }, (_, i) => i))
    drawPath(Array.from({ length: 9 }, (_, i) => i + 33))
    drawPath(Array.from({ length: 9 }, (_, i) => i + 42))
    drawPath(Array.from({ length: 9 }, (_, i) => i + 51))
    drawPath(Array.from({ length: 8 }, (_, i) => i + 60), true)
    drawPath(Array.from({ length: 8 }, (_, i) => i + 68), true)
    drawPath(Array.from({ length: 12 }, (_, i) => i + 76), true)
    drawPath(Array.from({ length: 8 }, (_, i) => i + 88), true)

    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(landmarks[96].x, landmarks[96].y, 4, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(landmarks[97].x, landmarks[97].y, 4, 0, 2 * Math.PI)
    ctx.fill()
  }, [clearLandmarks])

  useEffect(() => {
    if (!isVideoOn) {
      console.log("🧹 Camera OFF - Cleaning up...")
      setVideoElement(null)
      setRiggedFace(null)
      
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      noFaceFramesRef.current = 0
      isProcessingRef.current = false
      console.log("✅ Cleanup complete")
      return
    }

    const initFaceTracking = async () => {
      if (!videoElement.current) {
        console.error("❌ Video element not found")
        return
      }

      console.log("🎥 Starting face tracking...")

      try {
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
        
        console.log("✅ Camera active")
        setVideoElement(videoElement.current)
        
        shouldStopRef.current = false
        isProcessingRef.current = false
        noFaceFramesRef.current = 0

        if (drawCanvas.current) {
          drawCanvas.current.width = 160
          drawCanvas.current.height = 120
        }

        console.log("🔌 Connecting to WebSocket...")
        const ws = new WebSocket(process.env.NEXT_PUBLIC_AI_WS_URL || "wss://emile-nonorthodox-loan.ngrok-free.dev/ws/face-tracking");
        wsRef.current = ws

        ws.onopen = () => {
          console.log("✅ WebSocket connected")
          ws.send(JSON.stringify({ type: "ping" }))
          setTimeout(() => sendFrame(), 100)
        }

        ws.onmessage = (event) => {
          try {
            const receiveTime = Date.now()
            const data: WFLWData = JSON.parse(event.data)
            
            const hasFace = data.landmarks && Array.isArray(data.landmarks) && data.landmarks.length === 98
            
            if (!hasFace) {
              clearLandmarks()
              noFaceFramesRef.current++
              
              if (noFaceFramesRef.current === IDLE_THRESHOLD) {
                console.log('😴 No face for 1s → Idle mode')
                setRiggedFace(null)
              }
              
              isProcessingRef.current = false
              return
            }
            
            if (noFaceFramesRef.current > 0) {
              noFaceFramesRef.current = 0
              console.log('👤 Face detected - Resuming tracking')
            }
            
            latencyRef.current = receiveTime - lastSendTimeRef.current
            
            fpsCounterRef.current.frames++
            const now = Date.now()
            if (now - fpsCounterRef.current.lastTime >= 1000) {
              setFpsDisplay(fpsCounterRef.current.frames)
              console.log(`⏱️ FPS: ${fpsCounterRef.current.frames} | Latency: ${latencyRef.current}ms`)
              fpsCounterRef.current.frames = 0
              fpsCounterRef.current.lastTime = now
            }

            drawWFLWLandmarks(data.landmarks)

            const vrmRig = wflwToVRMRig(data, 160, 120)
            
            if (mediaPipeEyeDataRef.current) {
              vrmRig.blink.l = mediaPipeEyeDataRef.current.blinkLeft
              vrmRig.blink.r = mediaPipeEyeDataRef.current.blinkRight
              
              if (!window._lastMergeLog || Date.now() - window._lastMergeLog > 1000) {
                console.log('🔵 MediaPipe → vrmRig.blink:', {
                  'mediaPipe.blinkLeft': mediaPipeEyeDataRef.current.blinkLeft.toFixed(3),
                  'mediaPipe.blinkRight': mediaPipeEyeDataRef.current.blinkRight.toFixed(3),
                  '→ vrmRig.blink.l': vrmRig.blink.l.toFixed(3),
                  '→ vrmRig.blink.r': vrmRig.blink.r.toFixed(3)
                });
                window._lastMergeLog = Date.now();
              }
            } else {
              vrmRig.blink.l = 0
              vrmRig.blink.r = 0
            }
            
            if (!lastRigUpdateRef.current || now - lastRigUpdateRef.current > 16) {
              setRiggedFace(vrmRig)
              lastRigUpdateRef.current = now
            }

            isProcessingRef.current = false

          } catch (error) {
            console.error("❌ Error processing message:", error)
            isProcessingRef.current = false
          }
        }

        ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error)
        }

        ws.onclose = () => {
          console.log("🔌 WebSocket disconnected")
        }

        const resizeCanvas = document.createElement('canvas')
        resizeCanvas.width = 160
        resizeCanvas.height = 120
        const resizeCtx = resizeCanvas.getContext('2d', { 
          willReadFrequently: false,
          alpha: false
        })
        
        let frameSkipCounter = 0
        
        const sendFrame = () => {
          if (!isVideoOn || !videoElement.current || !ws || ws.readyState !== WebSocket.OPEN) {
            return
          }

          if (isProcessingRef.current) {
            if (latencyRef.current > 200) {
              frameSkipCounter++
              if (frameSkipCounter < 3) {
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
              resizeCtx.drawImage(videoElement.current, 0, 0, 160, 120)
              
              if (faceMeshRef?.detectForVideoFrame) {
                const timestamp = performance.now()
                faceMeshRef.detectForVideoFrame(videoElement.current, timestamp)
              }
              
              const base64Image = resizeCanvas.toDataURL('image/jpeg', 0.2).split(',')[1]
              
              lastSendTimeRef.current = Date.now()
              ws.send(base64Image)
              isProcessingRef.current = true
            }
          } catch (error) {
            console.error("❌ Error sending frame:", error)
            isProcessingRef.current = false
          }

          if (!shouldStopRef.current) {
            animationFrameRef.current = requestAnimationFrame(sendFrame)
          }
        }

      } catch (error) {
        console.error("❌ Failed to initialize:", error)
        alert("Không thể khởi động camera. Vui lòng cho phép quyền truy cập camera.")
      }
    }

    initFaceTracking()

    return () => {
      console.log("🧹 Cleanup...")
      
      shouldStopRef.current = true
      isProcessingRef.current = false
      noFaceFramesRef.current = 0
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "Camera stopped")
          console.log("✅ WebSocket closed")
        } catch (error) {
          console.warn("⚠️ Error closing WebSocket:", error)
        }
        wsRef.current = null
      }
      
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => {
            track.stop()
            console.log("✅ Camera stopped")
          })
        } catch (error) {
          console.warn("⚠️ Error stopping camera:", error)
        }
        streamRef.current = null
      }
      
      if (videoElement.current && videoElement.current.srcObject) {
        videoElement.current.srcObject = null
      }
      
      shouldStopRef.current = false
      latencyRef.current = 0
      
      isProcessingRef.current = false
      console.log("✅ Cleanup complete")
    }
  }, [isVideoOn, setVideoElement, setRiggedFace, drawWFLWLandmarks])

  const toggleVideo = () => {
    console.log("Toggle Video")
    const newState = !isVideoOn
    
    if (!newState) {
      console.log("📹 Camera OFF → Reset to idle")
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
      setIsVideoOn(false)
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }
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
            {isInCall && (
              <Canvas 
                shadows 
                camera={{ position: [0, 0, 1.0], fov: 30 }}
                gl={{ preserveDrawingBuffer: true }}
              >
                <color attach="background" args={["#333"]} />
                <fog attach="fog" args={["#333", 10, 20]} />
                <Suspense fallback={null}>
                  <Experience 
                    key={`videocall-${selectedModelUrl}`}
                    modelUrl={selectedModelUrl}
                    sceneBackground="transparent"
                    filter={filter}
                  />
                </Suspense>
                {/* ✅ Recording Controller */}
                <RecordingController onCanvasReady={handleCanvasReady} />
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

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-red-500/90 backdrop-blur-sm border border-red-400 rounded-full px-4 py-2 shadow-lg animate-pulse">
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 fill-current animate-pulse" />
                    <span className="text-white text-sm font-semibold">
                      Recording 3D Avatar
                    </span>
                  </div>
                </div>
              </div>
            )}

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
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-20">
                  {fpsDisplay} FPS
                </div>
                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs z-20 ${
                  noFaceFramesRef.current === 0
                    ? 'bg-green-500/80 text-white' 
                    : noFaceFramesRef.current < IDLE_THRESHOLD
                    ? 'bg-yellow-500/80 text-white'
                    : 'bg-red-500/80 text-white'
                }`}>
                  {noFaceFramesRef.current === 0 ? '👤' : noFaceFramesRef.current < IDLE_THRESHOLD ? '⚠️' : '😴'}
                </div>
              </div>
            )}

            <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-xs text-primary-foreground">
                {isVideoOn ? "WFLW Tracking Active" : "3D Avatar Ready"}
              </span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isVideoOn ? "default" : "outline"}
              size="icon"
              onClick={toggleVideo}
              disabled={!isInCall}
              title={isVideoOn ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </Button>

            {/* Recording Button - Simple Toggle */}
            <div className="relative">
              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                onClick={handleRecordingToggle}
                disabled={!isInCall}
                className={isRecording ? "animate-pulse" : ""}
                title={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </Button>
              
              {showStopConfirm && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                  Click again to stop
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              )}
            </div>
            
            {/* 🎨 Background Selector */}
            <BackgroundSelector
              currentBackground={background}
              onBackgroundChange={setBackground}
            />
            
            {/* ✨ Filter Selector */}
            <FilterSelector
              currentFilter={filter}
              onFilterChange={setFilter}
            />
            
            <Button
              variant={isInCall ? "destructive" : "default"}
              size="icon"
              onClick={toggleCall}
              title={isInCall ? "End call" : "Start call"}
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
              <div className="flex items-center gap-2">
                {isVideoOn && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Camera On
                  </span>
                )}
                {isRecording && (
                  <span className="text-xs text-red-500 flex items-center gap-1">
                    <Circle className="w-2 h-2 fill-current animate-pulse" />
                    Recording
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}