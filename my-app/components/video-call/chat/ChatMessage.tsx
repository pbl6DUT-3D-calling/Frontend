'use client';

import React from 'react';
import { ChatMessage as ChatMessageType } from '@/hooks/useLiveKitChat';
import { useRoomContext } from '@livekit/components-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const room = useRoomContext();
  const isOwnMessage = room?.localParticipant.sid === message.participantId;

  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
      {/* Name & Time */}
      <div className="flex items-center gap-2 mb-1 px-1">
        <span className="text-xs font-medium text-muted-foreground">
          {isOwnMessage ? 'You' : message.participantName}
        </span>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl ${
          isOwnMessage
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-secondary text-secondary-foreground rounded-bl-sm'
        }`}
      >
        <p className="text-sm break-words">{message.message}</p>
      </div>
    </div>
  );
}