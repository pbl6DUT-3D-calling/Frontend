'use client';

import React from 'react';
import { Grid3x3, User, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayout } from '@/components/video-call/hooks/useLayout';

export default function LayoutSwitcher() {
  const { mode, setMode } = useLayout();

  return (
    <div className="flex items-center gap-2 bg-gray-900/90 backdrop-blur-lg border border-gray-800 rounded-lg p-2 shadow-lg">
      <Button
        variant={mode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('grid')}
        title="Grid View"
        className="text-white hover:bg-gray-800"
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>
      <Button
        variant={mode === 'speaker' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('speaker')}
        title="Speaker View"
        className="text-white hover:bg-gray-800"
      >
        <User className="w-4 h-4" />
      </Button>
      <Button
        variant={mode === 'focus' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('focus')}
        title="Focus View"
        className="text-white hover:bg-gray-800"
      >
        <Focus className="w-4 h-4" />
      </Button>
    </div>
  );
}