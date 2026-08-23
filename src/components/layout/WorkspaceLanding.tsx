'use client';

import React from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export const WorkspaceLanding: React.FC = () => {
  const mountLocalProject = useWorkspaceStore((state) => state.mountLocalProject);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-neutral-950 text-neutral-200">
      <div className="flex flex-col items-center max-w-md text-center gap-6">
        {/* Icon / Branding Area */}
        <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-2xl">⚡</span> 
        </div>
        
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">ReciteAI Workbench</h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            A closed-loop, deterministic literature discovery engine. 
            Mount a local directory containing your LaTeX manuscript and BibTeX references to begin the audit.
          </p>
        </div>

        <div className="w-full h-px bg-neutral-900 my-2 rounded-full" />

        <button 
          onClick={mountLocalProject}
          className="flex items-center gap-3 px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-md transition-all shadow-[0_0_15px_rgba(2,132,199,0.3)] hover:shadow-[0_0_25px_rgba(2,132,199,0.5)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          Mount Local Workspace
        </button>
        
        <p className="text-[10px] text-neutral-600 font-mono mt-4 uppercase tracking-wider">
          All analysis runs locally. Zero telemetry.
        </p>
      </div>
    </div>
  );
};
