'use client';

import React from 'react';
import { WorkspaceExplorer } from '@/components/editor/WorkspaceExplorer';

export const LeftSidebar: React.FC = () => {
  return (
    <aside className="w-64 shrink-0 flex flex-col border-r border-neutral-800 bg-neutral-950 h-full overflow-hidden">
      <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
        <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Explorer</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <WorkspaceExplorer />
      </div>
    </aside>
  );
};
