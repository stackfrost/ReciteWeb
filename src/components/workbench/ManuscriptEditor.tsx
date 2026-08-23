'use client';

import React from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export const ManuscriptEditor: React.FC = () => {
  const { activeTexContent, activeTexPath } = useWorkspaceStore();

  const lines = (activeTexContent || '').split('\n');

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[#0A0C0E] overflow-hidden text-xs">
      {/* Editor Sub-Header Bar */}
      <div className="h-8 px-3 border-b border-[#21262D] bg-[#0E1114] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-emerald-400 font-semibold">{activeTexPath ? (activeTexPath.split('\\').pop() || activeTexPath.split('/').pop()) : 'main.tex'}</span>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">LaTeX Manuscript</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-400">
          <span>{lines.length} lines</span>
          <span>UTF-8</span>
          <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40 text-[10px] font-semibold">
            Adaptive Wrap
          </span>
        </div>
      </div>

      {/* Code / Text Area with Line Numbers */}
      <div className="flex-1 min-h-0 w-full overflow-auto flex font-mono text-[12px] leading-relaxed">
        {/* Line Numbers Gutter */}
        <div className="w-12 py-3 bg-[#0A0C0E] border-r border-[#1B2026] text-neutral-600 text-right pr-3 select-none shrink-0 font-mono text-[11px]">
          {lines.map((_, idx) => (
            <div key={idx} className="h-6 flex items-center justify-end">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Text Content Area */}
        <div className="flex-1 min-w-0 p-3 text-neutral-200 overflow-x-auto whitespace-pre-wrap break-words selection:bg-sky-500/30">
          {lines.map((line, idx) => (
            <div key={idx} className="h-6 flex items-center">
              <span className={line.startsWith('%') ? 'text-neutral-500 italic' : line.startsWith('\\') ? 'text-sky-300' : 'text-neutral-200'}>
                {line || '\u00A0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
