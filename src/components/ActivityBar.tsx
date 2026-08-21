'use client';

import React, { useEffect, useRef } from 'react';
import { useReciteStore } from '@/lib/store';

export default function ActivityBar() {
  const containerRef = useRef<HTMLDivElement>(null);
  const showTelemetry = useReciteStore((state) => state.showTelemetry);

  useEffect(() => {
    const updateHtml = (telemetry: any) => {
      if (!containerRef.current) return;
      const { astNodeCount, tokenPressure, lastWriteLatency, memoryUsage } = telemetry;
      
      const astStr = astNodeCount.toLocaleString();
      const tokenStr = tokenPressure >= 1000 ? `${(tokenPressure/1000).toFixed(1)}K` : tokenPressure;
      
      containerRef.current.innerHTML = `AST: ${astStr} <span class="text-zinc-700 mx-1.5">·</span> TOKENS: ${tokenStr}/8K <span class="text-zinc-700 mx-1.5">·</span> I/O: ${lastWriteLatency}ms <span class="text-zinc-700 mx-1.5">·</span> MEM: ${memoryUsage}MB`;
    };

    const unsubscribe = useReciteStore.subscribe((state) => {
      updateHtml(state.telemetry);
    });

    // Populate initial state immediately
    updateHtml(useReciteStore.getState().telemetry);

    return () => unsubscribe();
  }, []);

  if (!showTelemetry) return null;

  return (
    <div className="h-6 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-3 select-none w-full">
      <div ref={containerRef} className="font-mono text-[10px] text-zinc-400 tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
        AST: 0 <span className="text-zinc-700 mx-1.5">·</span> TOKENS: 0/8K <span className="text-zinc-700 mx-1.5">·</span> I/O: 0ms <span className="text-zinc-700 mx-1.5">·</span> MEM: 0MB
      </div>
    </div>
  );
}
