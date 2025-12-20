'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDataChannel, useRoomContext } from '@livekit/components-react';
import type { ReceivedDataMessage } from '@livekit/components-core';

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

  // Nhận tin nhắn từ DataChannel
  const onMessage = useCallback((msg: ReceivedDataMessage) => {
    try {
      const decoder = new TextDecoder();
      let message: string;

      const payload = msg.payload;
      const participant = msg.from;

      // Kiểm tra kiểu dữ liệu và convert
      if (ArrayBuffer.isView(payload)) {
        // TypedArray (Uint8Array, etc.)
        message = decoder.decode(payload as Uint8Array);
      } else if (payload instanceof ArrayBuffer) {
        message = decoder.decode(new Uint8Array(payload));
      } else if (typeof payload === 'string') {
        message = payload;
      } else {
        // Fallback: cố gắng convert
        console.warn('Unknown payload type:', typeof payload, payload);
        const uint8Array = new Uint8Array(
          Array.from(Object.values(payload as any))
        );
        message = decoder.decode(uint8Array);
      }
      
      const chatMessage: ChatMessage = {
        id: `${participant?.sid || 'unknown'}-${Date.now()}`,
        participantName: participant?.name || participant?.identity || 'Unknown',
        participantId: participant?.sid || 'unknown',
        message,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, chatMessage]);
      console.log('Received message:', chatMessage);
    } catch (error) {
      console.error('Error decoding message:', error);
      console.log('Message object:', msg);
    }
  }, []);

  // Subscribe to DataChannel
  useDataChannel(CHAT_TOPIC, onMessage);

  // Gửi tin nhắn
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
        console.log(' Sent message:', text);
      } catch (error) {
        console.error(' Error sending message:', error);
      }
    },
    [room]
  );

  //  Xóa tin nhắn (tùy chọn)
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
  };
}