'use client';

import React, { useState } from 'react';
import { Video, Monitor, Users, Square, Circle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useRecording } from '../hooks/useRecording';

export default function RecordingButton() {
  const {
    isRecording,
    recordingType,
    startScreenRecording,
    startParticipantRecording,
    startFullRoomRecording,
    stopRecording,
    participants,
  } = useRecording();

  const [showStopConfirm, setShowStopConfirm] = useState(false);

  const handleStopRecording = () => {
    if (showStopConfirm) {
      stopRecording();
      setShowStopConfirm(false);
    } else {
      setShowStopConfirm(true);
      // Auto hide confirmation after 3 seconds
      setTimeout(() => setShowStopConfirm(false), 3000);
    }
  };

  // Nếu đang recording, hiện nút Stop
  if (isRecording) {
    return (
      <div className="relative">
        <Button
          variant="destructive"
          size="icon"
          onClick={handleStopRecording}
          className="rounded-full w-12 h-12 animate-pulse"
          title="Stop Recording"
        >
          <Square className="w-5 h-5 fill-current" />
        </Button>
        
        {/* Confirmation tooltip */}
        {showStopConfirm && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
            Click again to stop
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-800" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Nếu chưa recording, hiện menu chọn
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-12 h-12"
          title="Start Recording"
        >
          <Circle className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="center" className="w-64 mb-2">
        <DropdownMenuLabel>Start Recording</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Ghi màn hình */}
        <DropdownMenuItem onClick={startScreenRecording} className="gap-2 cursor-pointer">
          <Monitor className="w-4 h-4" />
          <div className="flex flex-col">
            <span className="font-medium">Record Screen</span>
            <span className="text-xs text-muted-foreground">
              Record your screen share
            </span>
          </div>
        </DropdownMenuItem>

        {/* Ghi toàn phòng */}
        <DropdownMenuItem onClick={startFullRoomRecording} className="gap-2 cursor-pointer">
          <Users className="w-4 h-4" />
          <div className="flex flex-col">
            <span className="font-medium">Record Full Room</span>
            <span className="text-xs text-muted-foreground">
              Record all participants
            </span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Ghi participant cụ thể */}
        {participants.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2">
              <Video className="w-4 h-4" />
              Record Participant
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48">
              {participants.map((participant) => (
                <DropdownMenuItem
                  key={participant.sid}
                  onClick={() => startParticipantRecording(participant.sid)}
                  className="gap-2 cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="truncate">
                    {participant.name || participant.identity}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}