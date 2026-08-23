'use client';

import React from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { FileText, Database, Layers, CheckCircle2, ChevronDown } from 'lucide-react';

export const SidebarExplorer: React.FC = () => {
  const { activeTexPath, bibPath, mountLocalProject } = useWorkspaceStore();

  const sections = [
    { title: 'Abstract & Overview', status: 'ready' },
    { title: '1. Theoretical Framework', status: 'pending' },
    { title: '2. Experimental Methodology', status: 'pending' },
    { title: '3. Quantum Spin Analysis', status: 'pending' },
    { title: '4. Discussion & Outlook', status: 'pending' },
  ];

  return (
    <aside className="w-64 shrink-0 h-full bg-[#0F1215] border-r border-[#21262D] flex flex-col justify-between overflow-hidden text-xs select-none">
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Explorer Header */}
        <div className="flex items-center justify-between text-neutral-400 uppercase font-mono text-[10px] tracking-wider">
          <div className="flex items-center gap-1.5 font-bold text-neutral-200">
            <Layers className="w-3.5 h-3.5 text-sky-400"/>
            <span>Explorer</span>
          </div>
          <ChevronDown className="w-3 h-3"/>
        </div>

        {/* Active Manuscript Card */}
        <div className="p-2.5 bg-[#161B20] border border-[#262C33] rounded-md space-y-1.5">
          <div className="flex items-center gap-2 font-mono text-neutral-200 font-medium">
            <FileText className="w-3.5 h-3.5 text-emerald-400"/>
            <span className="truncate">{activeTexPath ? (activeTexPath.split('\\').pop() || activeTexPath.split('/').pop()) : 'No Manuscript'}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Math blocks: 592</span>
            <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
              <CheckCircle2 className="w-3 h-3"/> Ready
            </span>
          </div>
        </div>

        {/* Attached Bib Database */}
        <div className="p-2.5 bg-[#161B20]/60 border border-[#262C33] rounded-md space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <Database className="w-3 h-3 text-amber-400"/> Linked Database
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
              {bibPath ? 'Attached' : 'Unattached'}
            </span>
          </div>
          <button 
            onClick={() => mountLocalProject()}
            className="w-full py-1.5 bg-[#21262D] hover:bg-[#30363D] text-neutral-200 rounded border border-[#30363D] text-center font-mono text-[11px] transition-colors cursor-pointer"
          >
            {bibPath ? 'Change .bib Database' : 'Attach .bib Database'}
          </button>
        </div>

        {/* Document Outline */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">Document Outline</span>
          <div className="space-y-0.5">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  idx === 0 ? 'bg-[#1C2128] text-white font-medium border-l-2 border-emerald-400' : 'text-neutral-400 hover:bg-[#161B20] hover:text-neutral-200'
                }`}
              >
                <span className="truncate">{sec.title}</span>
                {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
