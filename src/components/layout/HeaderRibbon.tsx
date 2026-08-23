'use client';

import React, { useState, useEffect } from 'react';
import { isTauri } from '@/lib/tauri';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuditStore } from '@/store/useAuditStore';
import { Play, Search, Download, Minus, Square, X, Cpu } from 'lucide-react';

export const HeaderRibbon: React.FC = () => {
  const [inTauri, setInTauri] = useState(false);
  const { activeTexPath, resetWorkspace } = useWorkspaceStore();
  const { findings, isAuditing, runAudit } = useAuditStore();

  useEffect(() => {
    setInTauri(isTauri());
  }, []);

  const handleWindow = async (action: 'min' | 'max' | 'close') => {
    if (!inTauri) return;
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      if (action === 'min') await win.minimize();
      if (action === 'max') await win.toggleMaximize();
      if (action === 'close') await win.close();
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard shortcut Ctrl+Enter to trigger audit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runAudit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runAudit]);

  const criticalCount = findings.filter(f => f.severity === 'critical' && f.status === 'unresolved').length;
  const mediumCount = findings.filter(f => f.severity === 'medium' && f.status === 'unresolved').length;
  const lowCount = findings.filter(f => f.severity === 'low' && f.status === 'unresolved').length;

  return (
    <header
      data-tauri-drag-region
      className="h-10 w-full bg-[#0D0F11] border-b border-[#21262D] flex items-center justify-between px-2 select-none shrink-0 text-xs text-neutral-300 z-50 font-sans"
    >
      {/* Left: Native Menus & File Breadcrumb */}
      <div className="flex items-center gap-2" data-tauri-drag-region="false">
        <div className="flex items-center gap-1.5 px-2 text-[11px] text-neutral-400 font-medium">
          <span className="hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-[#161B22]">File</span>
          <span className="hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-[#161B22]">Edit</span>
          <span className="hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-[#161B22]">View</span>
          <span className="hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-[#161B22]">Engine</span>
          <span className="hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-[#161B22]">Terminal</span>
        </div>

        {/* Audit Execution Trigger */}
        <button
          onClick={() => runAudit()}
          disabled={isAuditing}
          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer text-xs"
        >
          <Play className={`w-3 h-3 fill-current ${isAuditing ? 'animate-spin' : ''}`}/>
          <span>{isAuditing ? 'Auditing...' : 'Run Audit'}</span>
          <kbd className="px-1 text-[9px] bg-black/30 rounded font-mono border border-white/10">Ctrl+↵</kbd>
        </button>

        {activeTexPath && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#161B22] border border-[#30363D] rounded text-[11px] font-mono text-neutral-300">
            <span>{activeTexPath.split('\\').pop() || activeTexPath.split('/').pop()}</span>
            <button onClick={resetWorkspace} className="hover:text-rose-400 ml-1 cursor-pointer">✕</button>
          </div>
        )}
      </div>

      {/* Center: Command Palette Search & Metric Pills */}
      <div className="flex items-center gap-2" data-tauri-drag-region="false">
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#161B22] border border-[#30363D] rounded-md text-neutral-400 w-64 justify-between">
          <div className="flex items-center gap-1.5">
            <Search className="w-3 h-3"/>
            <span className="text-[11px]">Search commands...</span>
          </div>
          <kbd className="text-[9px] font-mono bg-neutral-800 px-1 rounded border border-neutral-700">Ctrl+K</kbd>
        </div>

        {/* Severity Badges */}
        <div className="flex items-center gap-1 bg-[#161B22] px-2 py-0.5 rounded border border-[#21262D] text-[11px] font-mono">
          <span className="flex items-center gap-1 text-rose-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"/>{criticalCount} Critical</span>
          <span className="text-neutral-600">·</span>
          <span className="flex items-center gap-1 text-amber-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"/>{mediumCount} Medium</span>
          <span className="text-neutral-600">·</span>
          <span className="flex items-center gap-1 text-sky-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"/>{lowCount} Low</span>
        </div>
      </div>

      {/* Right: Engine Badge, Export, Window Controls */}
      <div className="flex items-center gap-2" data-tauri-drag-region="false">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#161B22] border border-[#21262D] rounded text-[11px] text-neutral-400 font-mono">
          <Cpu className="w-3 h-3 text-indigo-400"/>
          <span>Engine: <b className="text-neutral-200">OpenRouter</b></span>
        </div>

        <button className="flex items-center gap-1 px-2 py-1 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] rounded text-neutral-200 text-xs cursor-pointer">
          <Download className="w-3 h-3"/>
          <span>Export</span>
        </button>

        <div className="flex items-center border-l border-[#21262D] pl-2 ml-1">
          <button onClick={() => handleWindow('min')} className="h-7 w-7 flex items-center justify-center hover:bg-[#21262D] rounded text-neutral-400 hover:text-white cursor-pointer" title="Minimize">
            <Minus className="w-3 h-3"/>
          </button>
          <button onClick={() => handleWindow('max')} className="h-7 w-7 flex items-center justify-center hover:bg-[#21262D] rounded text-neutral-400 hover:text-white cursor-pointer" title="Maximize">
            <Square className="w-2.5 h-2.5"/>
          </button>
          <button onClick={() => handleWindow('close')} className="h-7 w-7 flex items-center justify-center hover:bg-rose-600 rounded text-neutral-400 hover:text-white cursor-pointer" title="Close">
            <X className="w-3 h-3"/>
          </button>
        </div>
      </div>
    </header>
  );
};
