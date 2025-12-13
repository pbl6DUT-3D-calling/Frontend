'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { VRM } from '@pixiv/three-vrm';

interface VRMContextType {
  currentVrmUrl: string | null;
  setCurrentVrmUrl: (url: string | null) => void;
  currentVrm: VRM | null;
  setCurrentVrm: (vrm: VRM | null) => void;
}

const VRMContext = createContext<VRMContextType | undefined>(undefined);

export function VRMProvider({ children }: { children: ReactNode }) {
  const [currentVrmUrl, setCurrentVrmUrl] = useState<string | null>(null);
  const [currentVrm, setCurrentVrm] = useState<VRM | null>(null);

  return (
    <VRMContext.Provider value={{ 
      currentVrmUrl, 
      setCurrentVrmUrl,
      currentVrm,
      setCurrentVrm
    }}>
      {children}
    </VRMContext.Provider>
  );
}

export function useVRM() {
  const context = useContext(VRMContext);
  if (context === undefined) {
    throw new Error('useVRM must be used within a VRMProvider');
  }
  return context;
}