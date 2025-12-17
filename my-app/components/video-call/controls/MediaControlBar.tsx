'use client';

import React, { useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, MonitorUp, MonitorX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import MoreActionsMenu from './MoreActionsMenu';
import RecordingButton from './RecordingButton';

interface MediaControlBarProps {
  isChatOpen: boolean;
  onChatToggle: () => void;
}

export default function MediaControlBar({ isChatOpen, onChatToggle }: MediaControlBarProps) {
  const { isCameraEnabled, isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  const toggleMicrophone = () => {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      alert('Failed to share screen. Please check permissions.');
    }
  };

  const handleEndCall = async () => {
    if (confirm('Are you sure you want to end the call?')) {
      try {
        await room.disconnect();
        console.log('Disconnected from room');
        
        setTimeout(() => {
          window.location.href = '/room';
        }, 100);
      } catch (error) {
        console.error('Error disconnecting:', error);
        window.location.href = '/room';
      }
    }
  };

  return (
    <div className="w-full bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 flex-shrink-0" style={{ height: '88px' }}>
      <div className="w-full h-full max-w-screen-xl mx-auto px-6 flex items-center">
        <div className="flex items-center justify-between w-full">
          
          {/* Left: Room Info */}
          <div className="flex-1">
            <p className="text-sm text-gray-400">
              {room.name}
            </p>
          </div>

          {/* Center: Main Controls */}
          <div className="flex items-center gap-3">
            {/* Microphone */}
            <Button
              variant={isMicrophoneEnabled ? 'default' : 'destructive'}
              size="icon"
              onClick={toggleMicrophone}
              className="rounded-full w-12 h-12"
              title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
            >
              {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            {/* Camera */}
            <Button
              variant={isCameraEnabled ? 'default' : 'destructive'}
              size="icon"
              onClick={toggleCamera}
              className="rounded-full w-12 h-12"
              title={isCameraEnabled ? 'Stop Video' : 'Start Video'}
            >
              {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            {/* Screen Share */}
            <Button
              variant={isScreenSharing ? 'destructive' : 'default'}
              size="icon"
              onClick={toggleScreenShare}
              className="rounded-full w-12 h-12"
              title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            >
              {isScreenSharing ? <MonitorX className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            </Button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-700 mx-2" />

            {/* Recording Button - MỚI */}
            <RecordingButton />

            {/* Divider */}
            <div className="w-px h-8 bg-gray-700 mx-2" />

            {/* End Call */}
            <Button
              variant="destructive"
              size="icon"
              onClick={handleEndCall}
              className="rounded-full w-12 h-12"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>

          {/* Right: Chat & More */}
          <div className="flex-1 flex items-center justify-end gap-3">
            {/* Chat */}
            <Button
              variant={isChatOpen ? 'destructive' : 'default'}
              size="icon"
              onClick={onChatToggle}
              className="rounded-full w-10 h-10"
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            {/* More Actions */}
            <MoreActionsMenu />
          </div>

        </div>
      </div>
    </div>
  );
}