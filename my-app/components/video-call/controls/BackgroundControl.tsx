'use client';

import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface BackgroundOption {
  id: string;
  name: string;
  type: 'color' | 'gradient' | 'image';
  value: string;
}

export const BACKGROUNDS: BackgroundOption[] = [
  { 
    id: 'default', 
    name: 'Default (Dark Gray)', 
    type: 'color', 
    value: '#1f2937' 
  },
  { 
    id: 'black', 
    name: 'Black', 
    type: 'color', 
    value: '#000000' 
  },
  { 
    id: 'white', 
    name: 'White', 
    type: 'color', 
    value: '#ffffff' 
  },
  { 
    id: 'blue', 
    name: 'Blue', 
    type: 'color', 
    value: '#1e40af' 
  },
  { 
    id: 'purple', 
    name: 'Purple', 
    type: 'color', 
    value: '#7c3aed' 
  },
  { 
    id: 'green', 
    name: 'Green', 
    type: 'color', 
    value: '#059669' 
  },
  { 
    id: 'office', 
    name: 'Office', 
    type: 'image', 
    value: '/backgrounds/bg1.jpg' 
  },
  { 
    id: 'nature', 
    name: 'Nature', 
    type: 'image', 
    value: '/backgrounds/nature.jpg' 
  },
  { 
    id: "bg2", 
    name: "Hình 2", 
    type: "image", 
    value: "/backgrounds/bg2.jpg" 
  },
  { 
    id: "bg3", 
    name: "Hình 3", 
    type: "image", 
    value: "/backgrounds/bg3.jpg" 
  },
];

interface BackgroundControlProps {
  currentBackground: BackgroundOption;
  onBackgroundChange: (bg: BackgroundOption) => void;
  disabled?: boolean; 
}

export default function BackgroundControl({
  currentBackground,
  onBackgroundChange,
  disabled = false,
}: BackgroundControlProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-12 h-12"
          title="Change Background"
          disabled={disabled}
        >
          <ImageIcon className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="center" 
        className="w-auto p-4 mb-2"
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Select Background
          </p>
          <div className="grid grid-cols-4 gap-2 max-w-[320px]">
            {BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => onBackgroundChange(bg)}
                className={`
                  w-16 h-16 rounded-lg border-2 transition-all hover:scale-105
                  ${currentBackground.id === bg.id 
                    ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }
                `}
                style={{
                  ...(bg.type === 'image' 
                    ? {
                        backgroundImage: `url(${bg.value})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundColor: '#333'
                      }
                    : {
                        background: bg.value
                      }
                  )
                }}
                title={bg.name}
              >
                {/* Checkmark when selected */}
                {currentBackground.id === bg.id && (
                  <div className="w-full h-full flex items-center justify-center bg-black/30 rounded-lg">
                    <svg 
                      className="w-6 h-6 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={3} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}