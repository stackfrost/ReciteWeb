'use client';

import React from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useAuditTriageStore } from '@/store/useAuditTriageStore';
import { ProblemsTable } from './ProblemsTable'; 
import { IntegrityDiagnosticsPane } from './IntegrityDiagnosticsPane';

export const RightSidebarPanels: React.FC = () => {
  const { activeFilter, setActiveFilter, restoreIgnored } = useAuditTriageStore();

  return (
    <aside className="w-[360px] shrink-0 border-l border-neutral-800 bg-neutral-950 flex flex-col h-full select-none">
      {/* Triage Filter Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-neutral-800 bg-neutral-900/50">
        {(['all', 'open', 'review', 'ignored'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-colors cursor-pointer ${
              activeFilter === filter 
                ? 'bg-neutral-700 text-white' 
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            {filter}
          </button>
        ))}
        {activeFilter === 'ignored' && (
          <button
            onClick={restoreIgnored}
            className="ml-auto text-[10px] text-sky-400 hover:text-sky-300 cursor-pointer"
          >
            Restore All
          </button>
        )}
      </div>

      <PanelGroup orientation="vertical">
        {/* Top Pane: Problems Table */}
        <Panel defaultSize="50%" minSize="20%">
          <div className="h-full overflow-y-auto">
            <ProblemsTable filter={activeFilter} />
          </div>
        </Panel>

        {/* Resizable Divider */}
        <PanelResizeHandle className="h-1.5 bg-neutral-900 hover:bg-sky-600 transition-colors cursor-row-resize flex items-center justify-center relative group">
          <div className="w-8 h-0.5 bg-neutral-700 rounded-full group-hover:bg-white" />
        </PanelResizeHandle>

        {/* Bottom Pane: Diagnostics */}
        <Panel defaultSize="50%" minSize="25%">
          <div className="h-full overflow-y-auto border-t border-neutral-800 bg-neutral-900/40">
            <IntegrityDiagnosticsPane />
          </div>
        </Panel>
      </PanelGroup>
    </aside>
  );
};
