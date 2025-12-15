'use client';

import React from 'react';
import { Grid3x3, User, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayout } from '@/components/video-call/hooks/useLayout';

export default function LayoutSwitcher() {
  const { mode, setMode } = useLayout();

  return (
    <div className="fixed top-4 right-4 z-40 flex items-center gap-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg p-2 shadow-lg">
      <Button
        variant={mode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('grid')}
        title="Grid View"
      >
        <Grid3x3 className="w-4 h-4" />
      </Button>
      <Button
        variant={mode === 'speaker' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('speaker')}
        title="Speaker View"
      >
        <User className="w-4 h-4" />
      </Button>
      <Button
        variant={mode === 'focus' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setMode('focus')}
        title="Focus View"
      >
        <Focus className="w-4 h-4" />
      </Button>
    </div>
  );
}