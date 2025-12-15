'use client';

import React from 'react';
import { useLocalParticipant } from '@livekit/components-react';
import type { ChatMessage as ChatMessageType } from '../hooks/useChat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { localParticipant } = useLocalParticipant();
  const isOwnMessage = message.participantId === localParticipant.sid;

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[70%] rounded-lg px-3 py-2
          ${isOwnMessage 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-100'
          }
        `}
      >
        {!isOwnMessage && (
          <p className="text-xs font-semibold mb-1 text-gray-300">
            {message.participantName}
          </p>
        )}
        <p className="text-sm break-words">{message.message}</p>
        <p 
          className={`text-xs mt-1 ${
            isOwnMessage ? 'text-blue-200' : 'text-gray-400'
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}