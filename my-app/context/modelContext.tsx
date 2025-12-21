"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react'
import { DEFAULT_MODEL } from '@/utils/defaultModel'

interface ModelStateType {
  selectedModelUrl: string
  selectedModelName: string
}

interface ModelActionsType {
  setSelectedModel: (url: string, name: string) => void
}

// ✅ Split into 2 contexts: State (for reading) and Actions (for writing)
const ModelStateContext = createContext<ModelStateType | undefined>(undefined)
const ModelActionsContext = createContext<ModelActionsType | undefined>(undefined)

// ✅ LocalStorage keys
const STORAGE_KEYS = {
  MODEL_URL: 'pbl6_selected_model_url',
  MODEL_NAME: 'pbl6_selected_model_name',
} as const;

export function ModelProvider({ children }: { children: ReactNode }) {
  // ✅ Initialize từ localStorage (nếu có), không thì dùng DEFAULT_MODEL constant
  const [selectedModelUrl, setSelectedModelUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.MODEL_URL) || DEFAULT_MODEL.vrmUrl;
    }
    return DEFAULT_MODEL.vrmUrl;
  });

  const [selectedModelName, setSelectedModelName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.MODEL_NAME) || DEFAULT_MODEL.name;
    }
    return DEFAULT_MODEL.name;
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
      console.log('🔔 ModelContext state CHANGED - consumers should re-render now!');
    }
  }, [selectedModelUrl, selectedModelName]);

  const setSelectedModel = useCallback((url: string, name: string) => {
    console.log('🔄 ModelContext: Updating model to:', { url, name });
    setSelectedModelUrl(url);
    setSelectedModelName(name);
  }, []);

  // ✅ Memoize state và actions RIÊNG BIỆT
  const stateValue = useMemo(() => ({
    selectedModelUrl,
    selectedModelName
  }), [selectedModelUrl, selectedModelName]);

  const actionsValue = useMemo(() => ({
    setSelectedModel
  }), [setSelectedModel]);

  return (
    <ModelActionsContext.Provider value={actionsValue}>
      <ModelStateContext.Provider value={stateValue}>
        {children}
      </ModelStateContext.Provider>
    </ModelActionsContext.Provider>
  );
}

// ✅ Hook để READ state (components cần hiển thị model)
export function useModelState() {
  const context = useContext(ModelStateContext);
  if (context === undefined) {
    throw new Error('useModelState must be used within a ModelProvider');
  }
  return context;
}

// ✅ Hook để WRITE actions (components chỉ cần set model)
export function useModelActions() {
  const context = useContext(ModelActionsContext);
  if (context === undefined) {
    throw new Error('useModelActions must be used within a ModelProvider');
  }
  return context;
}

// ✅ Backward compatibility - hook cũ vẫn hoạt động
export function useModel() {
  const state = useModelState();
  const actions = useModelActions();
  return { ...state, ...actions };
}