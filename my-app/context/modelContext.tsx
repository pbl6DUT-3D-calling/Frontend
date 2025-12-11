"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface ModelContextType {
  selectedModelUrl: string
  selectedModelName: string
  setSelectedModel: (url: string, name: string) => void
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

export function ModelProvider({ children }: { children: ReactNode }) {
  const [selectedModelUrl, setSelectedModelUrl] = useState<string>("7667029464206216702.vrm")
  const [selectedModelName, setSelectedModelName] = useState<string>("Default Avatar")

  const setSelectedModel = (url: string, name: string) => {
    console.log('🔄 ModelContext: Updating model to:', { url, name })
    setSelectedModelUrl(url)
    setSelectedModelName(name)
  }

  return (
    <ModelContext.Provider value={{ selectedModelUrl, selectedModelName, setSelectedModel }}>
      {children}
    </ModelContext.Provider>
  )
}

export function useModel() {
  const context = useContext(ModelContext)
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider')
  }
  return context
}
