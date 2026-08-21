'use client';

import React, { useEffect, useRef } from 'react';
import { useReciteStore } from '@/lib/store';

export default function ASTBreadcrumbs() {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Transient subscription to avoid React render cascades
    const unsubscribe = useReciteStore.subscribe((state) => {
      if (!textRef.current) return;
      const offset = state.cursorOffset;
      textRef.current.innerHTML = `<span>main.tex</span> <span class="text-zinc-600">/</span> <span class="text-zinc-300">Document</span> <span class="text-zinc-600">/</span> <span class="text-zinc-500 font-mono">[Offset: ${offset}]</span>`;
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="h-7 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 flex items-center px-3 select-none flex-shrink-0">
      <span ref={textRef} className="font-mono text-[11px] text-zinc-400 tracking-tight flex items-center gap-1.5 whitespace-nowrap">
        <span>main.tex</span> <span className="text-zinc-600">/</span> <span className="text-zinc-300">Document</span> <span className="text-zinc-600">/</span> <span className="text-zinc-500 font-mono">[Offset: 0]</span>
      </span>
    </div>
  );
}
