'use client';

import React, { useMemo, useCallback, startTransition, useRef, useEffect, useState } from 'react';
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
  // ── Atomic selectors ─────────────────────────────────────────────────────────
  const activeTexContent  = useWorkspaceStore((s) => s.activeTexContent);
  const activeTexPath     = useWorkspaceStore((s) => s.activeTexPath);
  const openTabs          = useWorkspaceStore((s) => s.openTabs);
  const activeFileId      = useWorkspaceStore((s) => s.activeFileId);
  const setActiveFile     = useWorkspaceStore((s) => s.setActiveFile);
  const closeFileTab      = useWorkspaceStore((s) => s.closeFileTab);

  const findings             = useAuditStore((s) => s.findings);
  const selectedFindingId    = useAuditStore((s) => s.selectedFindingId);
  const setSelectedFindingId = useAuditStore((s) => s.setSelectedFindingId);

  // Memoized line split — avoids O(n) string.split on every render tick
  const lines = useMemo(() => (activeTexContent || '').split('\n'), [activeTexContent]);
  const selectedFinding = useMemo(
    () => findings.find((f) => f.id === selectedFindingId),
    [findings, selectedFindingId]
  );



  // Group findings by line number for O(1) gutter lookup
  const findingsByLine = useMemo(() => {
    const map = new Map<number, (typeof findings)[0]>();
    findings.forEach((f) => { map.set(f.line, f); });
    return map;
  }, [findings]);

  // ── Virtual scroller for 10k-line documents ──────────────────────────────────
  // ROW_HEIGHT = 24px to match h-6 class on each line div.
  // Only renders the ~80 visible rows + 20 buffer rows above/below.
  const ROW_HEIGHT = 24;
  const BUFFER_ROWS = 20;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewportHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleVirtualScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop);
  }, []);

  const totalHeight = lines.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
  const endIdx = Math.min(lines.length - 1, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_ROWS);
  const offsetY = startIdx * ROW_HEIGHT;

  // Stable tab handlers wrapped in startTransition
  const handleSetActiveFile = useCallback(
    (id: string) => startTransition(() => setActiveFile(id)),
    [setActiveFile]
  );
  const handleCloseFileTab = useCallback(
    (id: string) => startTransition(() => closeFileTab(id)),
    [closeFileTab]
  );

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden text-xs select-none transition-colors">
      {/* Multi-Tab File Ribbon (h-8 Compressed) */}
      <div className="h-8 px-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center gap-1 overflow-x-auto shrink-0 scrollbar-none">
        {openTabs.map((tabId) => {
          const fileName = tabId.split(/[/\\]/).pop() || tabId;
          const isActive = activeFileId === tabId || activeTexPath?.includes(fileName);
          const isBib = fileName.endsWith('.bib');

          return (
            <div
              key={tabId}
              onClick={() => handleSetActiveFile(tabId)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-t text-[11px] font-mono border-t-2 transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-zinc-950 border-emerald-500 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-900/40 border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              {isBib ? (
                <Database className="w-3 h-3 text-amber-500" />
              ) : (
                <FileText className={`w-3 h-3 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
              )}
              <span className="truncate max-w-[140px]">{fileName}</span>
              {openTabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseFileTab(tabId);
                  }}
                  className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors ml-0.5"
                  title="Close Tab"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Editor Sub-Header Bar (h-7) */}
      <div className="h-7 px-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between shrink-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {activeTexPath ? (activeTexPath.split(/[/\\]/).pop()) : 'main.tex'}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>UTF-8</span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>{lines.length} lines</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-semibold">
            AST-Synced
          </span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            Adaptive Wrap
          </span>
        </div>
      </div>

      {/* Code / Text Area with NLI Gutter Indicators — VIRTUALIZED */}
      <div
        ref={scrollRef}
        onScroll={handleVirtualScroll}
        className="flex-1 min-h-0 w-full overflow-auto flex font-mono text-[12px] leading-relaxed"
      >
        {/* Gutter — fixed width, only renders visible rows */}
        <div
          className="w-12 bg-zinc-50/60 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-600 text-right pr-2 select-none shrink-0 font-mono text-[11px] relative"
          style={{ height: totalHeight }}
        >
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {lines.slice(startIdx, endIdx + 1).map((_, relIdx) => {
              const idx = startIdx + relIdx;
              const lineNum = idx + 1;
              const findingOnLine = findingsByLine.get(lineNum);
              const isSelected = selectedFinding?.line === lineNum;

              return (
                <div
                  key={idx}
                  onClick={() => { if (findingOnLine) setSelectedFindingId(findingOnLine.id); }}
                  className={`h-6 flex items-center justify-end gap-1 px-1 cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-bold' : 'hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {findingOnLine && (
                    <span title={`[Line ${lineNum}] ${findingOnLine.type}: ${findingOnLine.suggestedFix || findingOnLine.context}`}>
                      {findingOnLine.entailmentStatus === 'contradicted' || findingOnLine.severity === 'Critical' ? (
                        <AlertOctagon className="w-3 h-3 text-rose-500 animate-pulse" />
                      ) : findingOnLine.entailmentStatus === 'tenuous' || findingOnLine.severity === 'Medium' ? (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      )}
                    </span>
                  )}
                  <span>{lineNum}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Text Content Area — only renders visible rows */}
        <div
          className="flex-1 min-w-0 text-zinc-800 dark:text-zinc-200 overflow-x-auto whitespace-pre-wrap break-words selection:bg-emerald-500/20 relative"
          style={{ height: totalHeight }}
        >
          <div style={{ transform: `translateY(${offsetY}px)` }} className="p-3 pt-0">
            {lines.slice(startIdx, endIdx + 1).map((line, relIdx) => {
              const idx = startIdx + relIdx;
              const lineNum = idx + 1;
              const findingOnLine = findingsByLine.get(lineNum);
              const isSelected = selectedFinding?.line === lineNum;

              return (
                <div
                  key={idx}
                  className={`h-6 flex items-center px-1.5 rounded transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-l-2 border-emerald-500 text-zinc-950 dark:text-white font-medium'
                      : findingOnLine
                      ? findingOnLine.entailmentStatus === 'contradicted'
                        ? 'bg-rose-500/10 dark:bg-rose-950/20 border-l-2 border-rose-500/60'
                        : 'bg-amber-500/10 dark:bg-amber-950/15 border-l-2 border-amber-500/50'
                      : ''
                  }`}
                >
                  <span
                    className={
                      line.startsWith('%')
                        ? 'text-zinc-400 dark:text-zinc-500 italic'
                        : line.startsWith('\\')
                        ? 'text-sky-600 dark:text-sky-300 font-medium'
                        : 'text-zinc-800 dark:text-zinc-200'
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
    </div>
  );
};

