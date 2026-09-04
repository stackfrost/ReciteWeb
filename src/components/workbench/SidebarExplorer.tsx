'use client';

import React, { useMemo, useCallback, startTransition } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuditStore } from '@/store/useAuditStore';
import {
  FileText,
  Database,
  Layers,
  CheckCircle2,
  FolderOpen,
  AlertCircle,
  FileCode2,
  GitBranch,
} from 'lucide-react';
import { MultiFileProjectResolver } from '@/services/multi-file-resolver';

// ── Atomic selectors ──────────────────────────────────────────────────────────
// Each hook call subscribes to exactly one scalar/reference so that unrelated
// store mutations (e.g. activeTexContent changes during typing) never trigger
// a SidebarExplorer re-render.

export const SidebarExplorer: React.FC = React.memo(() => {
  // Workspace — individual atomic subscriptions
  const activeTexPath  = useWorkspaceStore((s) => s.activeTexPath);
  const bibPath        = useWorkspaceStore((s) => s.bibPath);
  const fileTree       = useWorkspaceStore((s) => s.fileTree);
  const files          = useWorkspaceStore((s) => s.files);
  const activeFileId   = useWorkspaceStore((s) => s.activeFileId);
  const mountLocalProject = useWorkspaceStore((s) => s.mountLocalProject);
  const openFileTab    = useWorkspaceStore((s) => s.openFileTab);

  // Audit — subscribe only to findings array (changes on audit completion, not on every interaction)
  const findings = useAuditStore((s) => s.findings);

  // Combine disk files and virtual files for resolution
  const resolvedTree = useMemo(() => {
    const combinedFiles = { ...fileTree };
    Object.values(files).forEach((f) => {
      if (!combinedFiles[f.id] && !combinedFiles[f.name]) {
        combinedFiles[f.id] = { path: f.path || f.id, name: f.name, content: f.content };
      }
    });
    return MultiFileProjectResolver.resolveProject(combinedFiles, activeTexPath || 'main.tex');
  }, [fileTree, files, activeTexPath]);

  // Pre-computed issue counts per file path — single O(n) pass replaces
  // per-node .filter() calls that each scan the full findings array.
  const issuesByFilePath = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of findings) {
      if (f.filePath) {
        map.set(f.filePath, (map.get(f.filePath) ?? 0) + 1);
      }
    }
    return map;
  }, [findings]);

  // Fallback section outline — runs only when findings change (not on every render)
  const outlineSections = useMemo(() => {
    const sectionBoundaries = [0, 35, 70, Infinity];
    const sectionLabels = [
      '1. Theoretical Framework',
      '2. Experimental Methodology',
      '3. Quantum Spin Analysis',
    ];

    // Single O(n) scan over findings
    const counts = [0, 0, 0];
    for (const f of findings) {
      const line = f.line ?? 0;
      if (line < 35) counts[0]++;
      else if (line < 70) counts[1]++;
      else counts[2]++;
    }

    return [
      { title: 'Abstract & Overview', wordCount: 320, issues: 0 },
      { title: sectionLabels[0], wordCount: 840, issues: counts[0] },
      { title: sectionLabels[1], wordCount: 1120, issues: counts[1] },
      { title: sectionLabels[2], wordCount: 950, issues: counts[2] },
      { title: '4. Discussion & Outlook', wordCount: 460, issues: 0 },
    ];
  }, [findings]);

  // Wrap tab open in startTransition so clicking a file tab never blocks typing
  const handleOpenFileTab = useCallback(
    (id: string) => {
      startTransition(() => {
        openFileTab(id);
      });
    },
    [openFileTab]
  );

  return (
    <aside className="w-60 shrink-0 h-full bg-zinc-50/70 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between overflow-hidden text-xs select-none transition-colors">
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Explorer Header */}
        <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 uppercase font-sans font-semibold text-[10px] tracking-wider">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
            <Layers className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
            <span>Manuscript Explorer</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
            {resolvedTree.fileNodes.length} Files
          </span>
        </div>

        {/* Project Files Tree */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Project Hierarchy</span>
            <GitBranch className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
          </span>

          <div className="space-y-1">
            {resolvedTree.fileNodes.map((node) => {
              const isActive = activeFileId === node.id || activeTexPath?.includes(node.name);
              // O(1) lookup from pre-computed map — no per-node filter scan
              const nodeIssues = issuesByFilePath.get(node.id) ?? (isActive
                ? findings.filter((f) => !f.filePath).length
                : 0);

              return (
                <div
                  key={node.id}
                  onClick={() => handleOpenFileTab(node.id)}
                  className={`p-2 rounded border transition-all cursor-pointer space-y-1 ${
                    isActive
                      ? 'bg-white dark:bg-zinc-900 border-emerald-500/50 shadow-xs'
                      : 'bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      />
                      <span
                        className={`font-mono text-[11px] truncate font-medium ${
                          isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {node.name}
                      </span>
                    </div>

                    {nodeIssues > 0 ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/10 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[9px] font-mono font-bold">
                        {nodeIssues}
                      </span>
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500 pl-5">
                    <span>{node.wordCount.toLocaleString()} words</span>
                    <span>{node.lineCount} lines</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attached Bib Database */}
        <div className="p-2.5 bg-zinc-100/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-md space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300 font-medium">
              <Database className="w-3 h-3 text-amber-500" /> Linked Bibliography
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {bibPath ? 'Attached' : 'Unattached'}
            </span>
          </div>
          <button
            onClick={() => mountLocalProject()}
            className="w-full py-1.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded border border-zinc-200 dark:border-zinc-700 text-center font-mono text-[11px] transition-colors cursor-pointer"
          >
            {bibPath ? 'Change .bib Database' : 'Attach .bib Database'}
          </button>
        </div>

        {/* Document Outline & Section Diagnostics */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-zinc-500 dark:text-zinc-400">
            Section Density
          </span>
          <div className="space-y-1">
            {outlineSections.map((sec, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white/80 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]"
              >
                <span className="truncate">{sec.title}</span>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-zinc-400 dark:text-zinc-500">{sec.wordCount}w</span>
                  {sec.issues > 0 ? (
                    <span className="px-1 py-0.2 rounded bg-rose-500/10 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 font-bold text-[9px]">
                      {sec.issues}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
});

SidebarExplorer.displayName = 'SidebarExplorer';
