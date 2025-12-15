'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  isOpen: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (width: number) => void;
}

export default function ResizablePanel({
  children,
  isOpen,
  defaultWidth = 320,
  minWidth = 280,
  maxWidth = 640,
  onWidthChange,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
        onWidthChange?.(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth, onWidthChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      {/* Panel */}
      <div
        ref={panelRef}
        className={`
          fixed right-0 
          bg-gray-900 border-l border-gray-800 
          flex flex-col shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          zIndex: 20,
          top: 0,
          height: 'calc(100vh - 88px)',
          width: `${width}px`,
        }}
      >
        {/* Resize Handle */}
        <div
          className={`
            absolute left-0 top-0 bottom-0 w-1
            cursor-ew-resize hover:bg-blue-500 transition-colors
            ${isResizing ? 'bg-blue-500' : 'bg-transparent'}
          `}
          onMouseDown={handleMouseDown}
          style={{ marginLeft: '-2px' }}
        >
          {/* Visual indicator */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-12 bg-gray-600 rounded-full opacity-50 hover:opacity-100" />
        </div>

        {children}
      </div>

      {/* Overlay khi đang resize */}
      {isResizing && (
        <div className="fixed inset-0 z-10" style={{ cursor: 'ew-resize' }} />
      )}
    </>
  );
}