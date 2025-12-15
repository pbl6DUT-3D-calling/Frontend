'use client';

import React, { useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalParticipant } from '@livekit/components-react';
// import ScreenShareButton from './ScreenShareButton';
import MoreActionsMenu from './MoreActionsMenu';
import ChatPanel from '../chat/ChatPanel';

export default function MediaControlBar() {
  const { isCameraEnabled, isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleCamera = () => {
    localParticipant.setCameraEnabled(!isCameraEnabled);
  };

  const toggleMicrophone = () => {
    localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const handleEndCall = () => {
    if (confirm('End call?')) {
      window.location.href = '/';
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-3 bg-card/95 backdrop-blur-lg border border-border rounded-2xl px-6 py-4 shadow-2xl">
          {/* Camera Toggle */}
          <Button
            variant={isCameraEnabled ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleCamera}
            className="rounded-full w-12 h-12"
          >
            {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Microphone Toggle */}
          <Button
            variant={isMicrophoneEnabled ? 'default' : 'destructive'}
            size="icon"
            onClick={toggleMicrophone}
            className="rounded-full w-12 h-12"
          >
            {isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          {/* <ScreenShareButton /> */}

          {/* Chat Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              setUnreadCount(0);
            }}
            className="rounded-full w-12 h-12 relative"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* More Actions */}
          <MoreActionsMenu />

          {/* Divider */}
          <div className="w-px h-8 bg-border mx-2" />

          {/* End Call */}
          <Button
            variant="destructive"
            size="icon"
            onClick={handleEndCall}
            className="rounded-full w-12 h-12"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Chat Panel */}
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}