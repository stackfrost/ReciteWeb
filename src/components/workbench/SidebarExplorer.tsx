'use client';

import React, { useMemo } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuditStore } from '@/store/useAuditStore';
import {
  FileText,
  Database,
  Layers,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  AlertCircle,
  FileCode2,
  GitBranch,
} from 'lucide-react';
import { MultiFileProjectResolver } from '@/services/multi-file-resolver';

export const SidebarExplorer: React.FC = () => {
  const { activeTexPath, bibPath, mountLocalProject, fileTree, files, activeFileId, openFileTab } =
    useWorkspaceStore();
  const { findings } = useAuditStore();

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

  // Fallback section outline if multi-file tree has single root
  const outlineSections = useMemo(() => {
    return [
      { title: 'Abstract & Overview', wordCount: 320, issues: 0 },
      { title: '1. Theoretical Framework', wordCount: 840, issues: findings.filter(f => f.line < 35).length },
      { title: '2. Experimental Methodology', wordCount: 1120, issues: findings.filter(f => f.line >= 35 && f.line < 70).length },
      { title: '3. Quantum Spin Analysis', wordCount: 950, issues: findings.filter(f => f.line >= 70).length },
      { title: '4. Discussion & Outlook', wordCount: 460, issues: 0 },
    ];
  }, [findings]);

  return (
    <aside className="w-64 shrink-0 h-full bg-[#0F1215] border-r border-[#21262D] flex flex-col justify-between overflow-hidden text-xs select-none">
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Explorer Header */}
        <div className="flex items-center justify-between text-neutral-400 uppercase font-mono text-[10px] tracking-wider">
          <div className="flex items-center gap-1.5 font-bold text-neutral-200">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Manuscript Explorer</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
            {resolvedTree.fileNodes.length} Files
          </span>
        </div>

        {/* Project Files Tree */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 flex items-center justify-between">
            <span>Project Hierarchy</span>
            <GitBranch className="w-3 h-3 text-neutral-500" />
          </span>

          <div className="space-y-1">
            {resolvedTree.fileNodes.map((node) => {
              const isActive = activeFileId === node.id || activeTexPath?.includes(node.name);
              const nodeIssues = findings.filter(
                (f) => f.filePath === node.id || (!f.filePath && isActive)
              ).length;

              return (
                <div
                  key={node.id}
                  onClick={() => openFileTab(node.id)}
                  className={`p-2 rounded border transition-all cursor-pointer space-y-1 ${
                    isActive
                      ? 'bg-[#181D23] border-emerald-500/40 shadow-xs'
                      : 'bg-[#14181D] border-[#21262D] hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-emerald-400' : 'text-neutral-400'
                        }`}
                      />
                      <span
                        className={`font-mono text-[11px] truncate font-medium ${
                          isActive ? 'text-white' : 'text-neutral-300'
                        }`}
                      >
                        {node.name}
                      </span>
                    </div>

                    {nodeIssues > 0 ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-500/30 text-[9px] font-mono font-bold">
                        {nodeIssues}
                      </span>
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pl-5">
                    <span>{node.wordCount.toLocaleString()} words</span>
                    <span>{node.lineCount} lines</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attached Bib Database */}
        <div className="p-2.5 bg-[#161B20]/60 border border-[#262C33] rounded-md space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
              <Database className="w-3 h-3 text-amber-400" /> Linked Bibliography
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

        {/* Document Outline & Section Diagnostics */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
            Section Density
          </span>
          <div className="space-y-1">
            {outlineSections.map((sec, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#12161A] border border-[#1C2229] text-neutral-300 text-[11px]"
              >
                <span className="truncate">{sec.title}</span>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-neutral-500">{sec.wordCount}w</span>
                  {sec.issues > 0 ? (
                    <span className="px-1 py-0.2 rounded bg-rose-950/80 text-rose-300 font-bold text-[9px]">
                      {sec.issues}
                    </span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
