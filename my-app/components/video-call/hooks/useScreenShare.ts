'use client';

import React from 'react';
import { MonitorUp, MonitorOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalParticipant } from '@livekit/components-react';

export default function ScreenShareButton() {
  const { isScreenShareEnabled, localParticipant } = useLocalParticipant();

  const toggleScreenShare = async () => {
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
    } catch (error) {
      console.error('Error toggling screen share:', error);
      alert('Could not share screen. Please check permissions.');
    }
  };

  return (
    <Button
      variant={isScreenShareEnabled ? 'default' : 'outline'}
      size="icon"
      onClick={toggleScreenShare}
      className="rounded-full w-12 h-12"
    >
      {isScreenShareEnabled ? (
        <MonitorOff className="w-5 h-5" />
      ) : (
        <MonitorUp className="w-5 h-5" />
      )}
    </Button>
  );
}