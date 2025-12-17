export type LayoutMode = 'grid' | 'focus' | 'speaker';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
}

export interface PinnedParticipant {
  identity: string;
  isPinned: boolean;
}

export interface LayoutState {
  mode: LayoutMode;
  pinnedParticipants: PinnedParticipant[];
  focusedParticipant: string | null;
}