'use client';

import React from 'react';
import { Circle } from 'lucide-react';
import { useRecording } from '../hooks/useRecording';

export default function RecordingIndicator() {
  const { isRecording, recordingType } = useRecording();

  if (!isRecording) return null;

  const getRecordingTypeLabel = () => {
    switch (recordingType) {
      case 'screen':
        return 'Recording Screen';
      case 'participant':
        return 'Recording Participant';
      case 'fullroom':
        return 'Recording Full Room';
      default:
        return 'Recording';
    }
  };

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
      <div className="bg-red-500/90 backdrop-blur-sm border border-red-400 rounded-full px-4 py-2 shadow-lg animate-pulse">
        <div className="flex items-center gap-2">
          <Circle className="w-3 h-3 fill-current animate-pulse" />
          <span className="text-white text-sm font-semibold">
            {getRecordingTypeLabel()}
          </span>
        </div>
      </div>
    </div>
  );
}