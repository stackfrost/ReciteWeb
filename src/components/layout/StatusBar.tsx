'use client';

import React from 'react';
import { HardDrive, ShieldCheck } from 'lucide-react';

export const StatusBar: React.FC = () => {
  return (
    <footer className="h-6 w-full bg-[#080A0C] border-t border-[#1C2025] flex items-center justify-between px-3 text-[11px] font-mono text-neutral-400 select-none shrink-0 z-50">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
        </span>
        <span className="flex items-center gap-1 text-neutral-400">
          <HardDrive className="w-3 h-3 text-neutral-500"/> Local Storage
        </span>
        <span className="text-neutral-500">·</span>
        <span className="flex items-center gap-1 text-neutral-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400"/> Air-Gapped AST
        </span>
      </div>

      <div className="flex items-center gap-3 text-neutral-400">
        <span>Latency: <b className="text-neutral-200">12ms</b></span>
        <span className="text-neutral-600">|</span>
        <span>Doc: <b className="text-neutral-200">10,360 words</b> (~13,468 tokens)</span>
        <span className="text-neutral-600">|</span>
        <span>Memory: <b className="text-neutral-200">62 MB</b></span>
        <span className="text-neutral-600">|</span>
        <span className="text-emerald-400 font-semibold">Ready</span>
      </div>
    </footer>
  );
};
