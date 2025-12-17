'use client';

import { create } from 'zustand';

export type LayoutMode = 'grid' | 'speaker' | 'focus';

interface LayoutStore {
  mode: LayoutMode;
  pinnedParticipantId: string | null;
  setMode: (mode: LayoutMode) => void;
  setPinnedParticipant: (id: string | null) => void;
}

export const useLayout = create<LayoutStore>((set) => ({
  mode: 'grid',
  pinnedParticipantId: null,
  setMode: (mode) => set({ mode }),
  setPinnedParticipant: (id) => set({ pinnedParticipantId: id }),
}));