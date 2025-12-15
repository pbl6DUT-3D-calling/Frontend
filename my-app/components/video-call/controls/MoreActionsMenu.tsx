'use client';

import React, { useState } from 'react';
import { MoreVertical, Video as VideoIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MoreActionsMenu() {
  const [isRecording, setIsRecording] = useState(false);

  const handleStartRecording = () => {
    // TODO: Implement screen recording with MediaRecorder API
    console.log('Start recording');
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    console.log('Stop recording');
    setIsRecording(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full w-12 h-12">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className="cursor-pointer"
        >
          <VideoIcon className="w-4 h-4 mr-2" />
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}