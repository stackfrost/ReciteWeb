'use client';

import React from 'react';
import { SidebarExplorer } from './SidebarExplorer';
import { AuditInspector } from './AuditInspector';
import { ManuscriptEditor } from './ManuscriptEditor';

export const WorkbenchView: React.FC = () => {
  return (
    <div className="flex-1 w-full flex flex-row min-h-0 overflow-hidden bg-[#0A0C0E]">
      {/* 1. Left Explorer: Fixed width, strictly locked */}
      <SidebarExplorer />

      {/* 2. Center Editor: Must have min-w-0 to contain wide LaTeX math strings */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden border-r border-[#21262D]">
        <ManuscriptEditor />
      </div>

      {/* 3. Right Inspector: Fixed width, strictly locked */}
      <AuditInspector />
    </div>
  );
};
