"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, Users } from "lucide-react"

export function VideoCallRoom() {
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [isAudioOn, setIsAudioOn] = useState(false)
  const [isInCall, setIsInCall] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const startVideo = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setIsVideoOn(true)
      setIsAudioOn(true)
    } catch (error) {
      console.error("Error accessing media devices:", error)
    }
  }

  const stopVideo = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    setIsVideoOn(false)
    setIsAudioOn(false)
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
      }
    }
  }

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioOn(audioTrack.enabled)
      }
    }
  }

  const toggleCall = () => {
    if (isInCall) {
      stopVideo()
      setIsInCall(false)
    } else {
      startVideo()
      setIsInCall(true)
    }
  }

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [stream])

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Video Call Room
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
          {isVideoOn ? (
            <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
              <div className="text-center">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Camera is off</p>
              </div>
            </div>
          )}

          {/* 3D Avatar Overlay Placeholder */}
          <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-sm rounded-lg px-3 py-1">
            <span className="text-xs text-primary-foreground">3D Avatar Ready</span>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button variant={isVideoOn ? "default" : "secondary"} size="sm" onClick={toggleVideo} disabled={!isInCall}>
            {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>

          <Button variant={isAudioOn ? "default" : "secondary"} size="sm" onClick={toggleAudio} disabled={!isInCall}>
            {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          <Button variant={isInCall ? "destructive" : "default"} size="sm" onClick={toggleCall} className="px-6">
            {isInCall ? <PhoneOff className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
            {isInCall ? "End Call" : "Start Call"}
          </Button>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {isInCall ? "Ready to stream with 3D avatar" : "Start a call to begin streaming"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
