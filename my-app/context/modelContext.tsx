"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ModelContextType {
  selectedModelUrl: string
  selectedModelName: string
  setSelectedModel: (url: string, name: string) => void
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

// ✅ Model mặc định từ vrm-studio
const DEFAULT_MODEL_URL = "models/7667029464206216702.vrm";
const DEFAULT_MODEL_NAME = "Default Model";

// ✅ LocalStorage keys
const STORAGE_KEYS = {
  MODEL_URL: 'pbl6_selected_model_url',
  MODEL_NAME: 'pbl6_selected_model_name',
} as const;

export function ModelProvider({ children }: { children: ReactNode }) {
  // ✅ Initialize từ localStorage (nếu có), không thì dùng default
  const [selectedModelUrl, setSelectedModelUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.MODEL_URL) || DEFAULT_MODEL_URL;
    }
    return DEFAULT_MODEL_URL;
  });

  const [selectedModelName, setSelectedModelName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.MODEL_NAME) || DEFAULT_MODEL_NAME;
    }
    return DEFAULT_MODEL_NAME;
  });

  // ✅ Sync to localStorage khi state thay đổi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MODEL_URL, selectedModelUrl);
      localStorage.setItem(STORAGE_KEYS.MODEL_NAME, selectedModelName);
      console.log('💾 Model persisted to localStorage:', {
        url: selectedModelUrl,
        name: selectedModelName
      });
    }
  }, [selectedModelUrl, selectedModelName]);

  const setSelectedModel = (url: string, name: string) => {
    console.log('🔄 ModelContext: Updating model to:', { url, name });
    setSelectedModelUrl(url);
    setSelectedModelName(name);
  };

  return (
    <ModelContext.Provider value={{ selectedModelUrl, selectedModelName, setSelectedModel }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
}