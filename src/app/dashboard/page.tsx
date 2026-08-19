'use client';

import React, { useState, useEffect } from 'react';
import { useCiteGuardStore } from '@/lib/store';
import Toolbar from '@/components/Toolbar';
import ActivityBar from '@/components/ActivityBar';
import ManuscriptViewer from '@/components/viewer/ManuscriptViewer';
import ActionInspector from '@/components/inspector/ActionInspector';
import { Terminal } from 'lucide-react';

export default function DashboardPage() {
  const { isAuditing } = useCiteGuardStore();
  const [leftWidth, setLeftWidth] = useState(60); 
  const [isDragging, setIsDragging] = useState(false);

  // Native Drag Engine
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 25 && newWidth <= 75) setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans select-none">
      
      {/* 1. Left Activity Bar */}
      <ActivityBar/>

      <main className="flex flex-col flex-1 min-w-0">
        
        {/* 2. Top Action Ribbon */}
        <Toolbar/>

        {/* 3 & 4. Native Resizable Lab Environment */}
        <div className="flex-1 flex overflow-hidden relative bg-[#050505]">
          
          {/* LEFT PANE */}
          <div style={{ width: `${leftWidth}%` }} className="flex flex-col relative transition-none bg-zinc-950">
            <div className="flex-1 overflow-y-auto">
              <ManuscriptViewer/>
            </div>

            {/* Hardware-style Processing Overlay */}
            {isAuditing && (
              <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
                <div className="flex items-center gap-3 text-emerald-500 font-mono text-xs mb-3">
                  <Terminal className="animate-pulse" size="{14}"/>
                  <span className="tracking-widest">ISOLATING_CLAIMS...</span>
                </div>
                <div className="w-64 h-0.5 bg-zinc-900 overflow-hidden">
                  <div className="h-full bg-emerald-500/80 animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            )}
          </div>

          {/* THE DRAGGER */}
          <div 
            onMouseDown={() => setIsDragging(true)}
            className={`w-[1px] bg-zinc-800 hover:bg-emerald-500 hover:w-[3px] transition-all cursor-col-resize z-10 flex-shrink-0 ${isDragging ? 'bg-emerald-500 w-[3px]' : ''}`}
          />

          {/* RIGHT PANE */}
          <div className="flex-1 flex flex-col transition-none bg-zinc-950/50">
            <div className="flex-1 overflow-y-auto">
              <ActionInspector/>
            </div>
          </div>

          {isDragging && <div className="absolute inset-0 z-50 cursor-col-resize" />}
        </div>

        {/* 5. Status Bar */}
        <footer className="h-6 w-full border-t border-zinc-800 bg-zinc-950 flex items-center justify-between px-3 text-[10px] font-mono text-zinc-500 flex-shrink-0">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]"></div>
              SYSTEM_ONLINE
            </span>
            <span className="text-zinc-600">|</span>
            <span>LATENCY: {isAuditing ? '42ms' : '--ms'}</span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="text-emerald-500/70">STORAGE: INDEXED_DB</span>
            <span className="text-zinc-600">|</span>
            <span>LLM: BYOK_PENDING</span>
          </div>
        </footer>

      </main>
    </div>
  );
}