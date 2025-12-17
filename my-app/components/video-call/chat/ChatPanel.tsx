'use client';

import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/components/video-call/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { messages, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div 
      className={`
        fixed right-0 w-80 
        bg-gray-900 border-l border-gray-800 
        flex flex-col shadow-2xl
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{ 
        zIndex: 20,
        top: 0,
        height: 'calc(100vh - 88px)' // Trừ đi chiều cao footer
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h3 className="font-semibold text-lg text-white">Chat</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-gray-800 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <ChatInput onSend={sendMessage} />
      </div>
    </div>
  );
}