"use client"

import { useState, Suspense } from "react"
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
// import { UI } from "./UI" // Tạm thời tắt
// import { CameraWidget } from "./CameraWidget" // Tạm thời tắt
import { CameraWidget } from "./CameraWidget";
import { Experience } from "./Experience" // (Điều chỉnh đường dẫn nếu cần)

export function VideoCallRoom() {
  // --- THAY ĐỔI 1: Đặt state mặc định là true để hiển thị ngay ---
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isAudioOn, setIsAudioOn] = useState(true)
  const [isInCall, setIsInCall] = useState(true)

  // --- THAY ĐỔI 2: Các hàm toggle chưa cần chức năng ---
  const toggleVideo = () => {
    console.log("Nút Toggle Video (chưa có chức năng)")
    // Tạm thời cho phép tắt/bật
    setIsVideoOn(!isVideoOn)
  }
  const toggleAudio = () => {
    console.log("Nút Toggle Audio (chưa có chức năng)")
    setIsAudioOn(!isAudioOn)
  }
  const toggleCall = () => {
    console.log("Nút Toggle Call (chưa có chức năng)")
    // Tạm thời cho phép tắt/bật
    setIsInCall(!isInCall)
    setIsVideoOn(!isInCall) // Khi tắt call thì tắt video
    setIsAudioOn(!isInCall) // Khi tắt call thì tắt audio
  }

  return (
    <>
      {/* <Loader /> */}
      {/* --- THAY ĐỔI 3: Tạm thời tắt CameraWidget và UI --- */}
      {/* {isInCall && (
        <>
          <CameraWidget isAudioEnabled={isAudioOn} />
          <UI />
        </>
      )} 
      */}

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Video Call Room
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
            {/* Vì isVideoOn là 'true', <Canvas> sẽ được render */}
            {isVideoOn ? (
              <Canvas shadows
                // camera={{ position: [0.25, 0.25, 2], fov: 30 }}>
                camera={{ position: [0, 0, 1.0], fov: 30 }}>
                <color attach="background" args={["#333"]} />
                <fog attach="fog" args={["#333", 10, 20]} />
                <Suspense fallback={null}>
                  <Experience />
                </Suspense>
              </Canvas>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <div className="text-center">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Camera is off</p>
                </div>
              </div>
            )}

            <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-sm rounded-lg px-3 py-1">
              <span className="text-xs text-primary-foreground">
                3D Avatar Ready
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