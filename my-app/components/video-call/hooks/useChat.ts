'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDataChannel, useRoomContext } from '@livekit/components-react';
import { DataPacket_Kind } from 'livekit-client';

export interface ChatMessage {
  id: string;
  participantName: string;
  participantId: string;
  message: string;
  timestamp: number;
}

const CHAT_TOPIC = 'lk-chat-topic';

export function useChat() {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 📥 Nhận tin nhắn từ DataChannel
  const onMessage = useCallback((payload: Uint8Array, participant: any) => {
    const decoder = new TextDecoder();
    const message = decoder.decode(payload);
    
    const chatMessage: ChatMessage = {
      id: `${participant.sid}-${Date.now()}`,
      participantName: participant.name || participant.identity,
      participantId: participant.sid,
      message,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, chatMessage]);
    console.log('💬 Received message:', chatMessage);
  }, []);

  // 🔌 Subscribe to DataChannel
  useDataChannel(CHAT_TOPIC, onMessage);

  // 📤 Gửi tin nhắn
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !room) return;

      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        // Gửi tin nhắn qua DataChannel
        await room.localParticipant.publishData(
          data,
          {
            reliable: true,
            topic: CHAT_TOPIC,
          }
        );

        // Thêm tin nhắn của bản thân vào list
        const selfMessage: ChatMessage = {
          id: `${room.localParticipant.sid}-${Date.now()}`,
          participantName: room.localParticipant.name || room.localParticipant.identity,
          participantId: room.localParticipant.sid,
          message: text,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, selfMessage]);
        console.log('📤 Sent message:', text);
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    },
    [room]
  );

  // 🗑️ Xóa tin nhắn (tùy chọn)
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
  };
}