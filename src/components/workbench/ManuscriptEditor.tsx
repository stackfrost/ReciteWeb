'use client';

import React from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuditStore } from '@/store/useAuditStore';
import {
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Database,
  Layers,
} from 'lucide-react';

export const ManuscriptEditor: React.FC = () => {
  const {
    activeTexContent,
    activeTexPath,
    openTabs,
    activeFileId,
    setActiveFile,
    closeFileTab,
  } = useWorkspaceStore();

  const { findings, selectedFindingId, setSelectedFindingId } = useAuditStore();

  const lines = (activeTexContent || '').split('\n');
  const selectedFinding = findings.find((f) => f.id === selectedFindingId);

  // Group findings by line number for fast gutter lookup
  const findingsByLine = React.useMemo(() => {
    const map = new Map<number, (typeof findings)[0]>();
    findings.forEach((f) => {
      map.set(f.line, f);
    });
    return map;
  }, [findings]);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-[#0A0C0E] overflow-hidden text-xs select-none">
      {/* Multi-Tab File Ribbon */}
      <div className="h-9 px-2 border-b border-[#21262D] bg-[#0E1114] flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
        {openTabs.map((tabId) => {
          const fileName = tabId.split(/[/\\]/).pop() || tabId;
          const isActive = activeFileId === tabId || activeTexPath?.includes(fileName);
          const isBib = fileName.endsWith('.bib');

          return (
            <div
              key={tabId}
              onClick={() => setActiveFile(tabId)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t text-[11px] font-mono border-t-2 transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#0A0C0E] border-emerald-500 text-white font-semibold shadow-xs'
                  : 'bg-[#12161A] border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-[#161B20]'
              }`}
            >
              {isBib ? (
                <Database className="w-3 h-3 text-amber-400" />
              ) : (
                <FileText className={`w-3 h-3 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
              )}
              <span className="truncate max-w-[140px]">{fileName}</span>
              {openTabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFileTab(tabId);
                  }}
                  className="p-0.5 hover:bg-[#262C34] rounded text-neutral-500 hover:text-white transition-colors ml-1"
                  title="Close Tab"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Sub-Header Bar */}
      <div className="h-7 px-3 border-b border-[#1A2026] bg-[#0B0E11] flex items-center justify-between shrink-0 font-mono text-[10px] text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-semibold">
            {activeTexPath ? (activeTexPath.split(/[/\\]/).pop()) : 'main.tex'}
          </span>
          <span className="text-neutral-600">·</span>
          <span>UTF-8</span>
          <span className="text-neutral-600">·</span>
          <span>{lines.length} lines</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-400 border border-sky-800/40 font-semibold">
            AST-Synced
          </span>
          <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
            Adaptive Wrap
          </span>
        </div>
      </div>

      {/* Code / Text Area with NLI Gutter Indicators */}
      <div className="flex-1 min-h-0 w-full overflow-auto flex font-mono text-[12px] leading-relaxed">
        {/* Line Numbers & NLI Status Gutter */}
        <div className="w-16 py-3 bg-[#0A0C0E] border-r border-[#1B2026] text-neutral-600 text-right pr-2 select-none shrink-0 font-mono text-[11px] space-y-0">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const findingOnLine = findingsByLine.get(lineNum);
            const isSelected = selectedFinding?.line === lineNum;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (findingOnLine) setSelectedFindingId(findingOnLine.id);
                }}
                className={`h-6 flex items-center justify-end gap-1 px-1 cursor-pointer transition-colors ${
                  isSelected ? 'bg-emerald-950/60 text-emerald-300 font-bold' : 'hover:text-neutral-300'
                }`}
              >
                {/* NLI Semantic / Problem Status Indicator */}
                {findingOnLine && (
                  <span title={`[Line ${lineNum}] ${findingOnLine.type}: ${findingOnLine.suggestedFix || findingOnLine.context}`}>
                    {findingOnLine.entailmentStatus === 'contradicted' || findingOnLine.severity === 'Critical' ? (
                      <AlertOctagon className="w-3 h-3 text-rose-500 animate-pulse" />
                    ) : findingOnLine.entailmentStatus === 'tenuous' || findingOnLine.severity === 'Medium' ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </span>
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Text Content Area */}
        <div className="flex-1 min-w-0 p-3 text-neutral-200 overflow-x-auto whitespace-pre-wrap break-words selection:bg-sky-500/30">
          {lines.map((line, idx) => {
            const lineNum = idx + 1;
            const findingOnLine = findingsByLine.get(lineNum);
            const isSelected = selectedFinding?.line === lineNum;

            return (
              <div
                key={idx}
                className={`h-6 flex items-center px-1.5 rounded transition-colors ${
                  isSelected
                    ? 'bg-emerald-950/40 border-l-2 border-emerald-400 text-white font-medium'
                    : findingOnLine
                    ? findingOnLine.entailmentStatus === 'contradicted'
                      ? 'bg-rose-950/20 border-l-2 border-rose-500/60'
                      : 'bg-amber-950/15 border-l-2 border-amber-500/50'
                    : ''
                }`}
              >
                <span
                  className={
                    line.startsWith('%')
                      ? 'text-neutral-500 italic'
                      : line.startsWith('\\')
                      ? 'text-sky-300'
                      : 'text-neutral-200'
                  }
                >
                  {line || '\u00A0'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
