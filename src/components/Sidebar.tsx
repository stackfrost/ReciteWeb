'use client';

import React, { useRef } from 'react';
import {
  Files,
  Download,
  Settings,
  Shield,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Sparkles,
  FileText,
  FileCode2,
  ListTree,
  Activity,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useCiteGuardStore } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS } from '@/lib/demo-data';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    setShowSettings,
    setShowExportModal,
    workspace,
    mountWorkspace,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    setWorkspaceStatus,
    filteredClaims,
    mathBlocks,
    license,
    activeClaimIndex,
    jumpToClaim,
  } = useCiteGuardStore();

  const { resolvedTheme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWorkspaceStatus('MOUNTING');
    const text = await file.text();
    const { text: parsed, mathBlocks } = parseMathBlocks(text);

    setRawText(text);
    setParsedText(parsed);
    setMathBlocks(mathBlocks);
    setDocumentTitle(file.name);
    setFileFormat(file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.txt') ? 'txt' : 'tex');
    mountWorkspace(file.name, file.size);
    setWorkspaceStatus('AST_PARSING');

    setTimeout(() => {
      setWorkspaceStatus('AST_PARSER_IDLE');
    }, 200);

    e.target.value = '';
  };

  const handleLoadDemo = () => {
    setWorkspaceStatus('MOUNTING');
    const { text: parsed, mathBlocks } = parseMathBlocks(DEMO_MANUSCRIPT);

    setRawText(DEMO_MANUSCRIPT);
    setParsedText(parsed);
    setMathBlocks(mathBlocks);
    setClaims(DEMO_CLAIMS);
    setDocumentTitle('Quantum Spin Dynamics (Draft).tex');
    setFileFormat('tex');
    mountWorkspace('Quantum Spin Dynamics (Draft).tex', 14200);
    setWorkspaceStatus('MOUNTED');
  };

  const licColor =
    license.licenseState === 'VALID'
      ? 'text-emerald-500'
      : license.licenseState === 'PENDING_SYNC'
      ? 'text-amber-500'
      : 'text-red-500';

  // Sections outline for the loaded document
  const sections = [
    { title: 'Abstract & Overview', claimIdx: 0 },
    { title: '1. Theoretical Framework', claimIdx: 1 },
    { title: '2. Experimental Methodology', claimIdx: 2 },
    { title: '3. Quantum Spin Analysis', claimIdx: 3 },
    { title: '4. Discussion & Outlook', claimIdx: 4 },
  ];

  return (
    <div className="flex h-full flex-shrink-0 z-20 select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".tex,.latex,.docx,.txt,.md"
        onChange={handleFileChange}
      />

      {/* 1. Activity Rail (48px fixed) */}
      <aside className="w-12 h-full bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center py-2.5 justify-between flex-shrink-0">
        {/* Top Icons */}
        <div className="flex flex-col gap-3 w-full px-1.5">
          <RailButton
            active={!sidebarCollapsed}
            onClick={toggleSidebar}
            icon={<Files size={19} strokeWidth={1.5} />}
            title="Toggle Explorer (Ctrl+B)"
            badge={isMounted ? '1' : undefined}
          />

          <RailButton
            active={false}
            onClick={() => setShowSettings(true)}
            icon={<Shield size={19} strokeWidth={1.5} className={licColor} />}
            title={`Seat License: ${license.licenseState}`}
          />

          <RailButton
            active={false}
            onClick={() => setShowExportModal(true)}
            disabled={!isMounted}
            icon={<Download size={19} strokeWidth={1.5} />}
            title="Export Bibliography (.bib) (Ctrl+E)"
          />
        </div>

        {/* Bottom Icons: Theme & Settings */}
        <div className="flex flex-col gap-3 w-full px-1.5">
          <RailButton
            active={false}
            onClick={toggleTheme}
            icon={
              resolvedTheme === 'dark' ? (
                <Sun size={18} strokeWidth={1.5} className="text-amber-400" />
              ) : (
                <Moon size={18} strokeWidth={1.5} className="text-indigo-500" />
              )
            }
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode (Ctrl+T)`}
          />

          <RailButton
            active={false}
            onClick={() => setShowSettings(true)}
            icon={<Settings size={19} strokeWidth={1.5} />}
            title="Settings & Preferences (Ctrl+,)"
          />
        </div>
      </aside>

      {/* 2. Collapsible Explorer Pane (240px) */}
      <div
        className={cn(
          'h-full bg-zinc-50/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col overflow-hidden transition-all duration-200 ease-in-out',
          sidebarCollapsed ? 'w-0 opacity-0 border-r-0 pointer-events-none' : 'w-60 opacity-100'
        )}
      >
        {/* Explorer Header */}
        <div className="h-9 px-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between flex-shrink-0 bg-zinc-100/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-mono text-[11px] font-bold tracking-wider">
            <ListTree size={13} className="text-zinc-500" />
            <span>EXPLORER</span>
          </div>

          <button
            onClick={toggleSidebar}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            title="Collapse Sidebar (Ctrl+B)"
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Explorer Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 font-sans text-xs">
          {/* Active File / Outline */}
          {isMounted ? (
            <>
              {/* Document Info Card */}
              <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/60 shadow-sm space-y-2">
                <div className="flex items-start gap-2">
                  <FileCode2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {workspace.fileName || 'Untitled'}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {workspace.fileSizeBytes ? `${(workspace.fileSizeBytes / 1024).toFixed(1)} KB` : 'Draft'} • {filteredClaims.length} Claims
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>MATH TOKENS: {mathBlocks.size}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">READY</span>
                </div>
              </div>

              {/* Sections / Outline */}
              <div className="space-y-1">
                <div className="px-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-bold">
                  DOCUMENT SECTIONS
                </div>

                <div className="space-y-0.5">
                  {sections.map((sec, idx) => {
                    const isCurrent = activeClaimIndex === sec.claimIdx;
                    return (
                      <button
                        key={idx}
                        onClick={() => jumpToClaim(sec.claimIdx)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors font-sans text-xs',
                          isCurrent
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
                        )}
                      >
                        <span className="truncate">{sec.title}</span>
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                <FolderOpen size={18} />
              </div>
              <div className="font-mono text-xs text-zinc-500">
                No document loaded.
              </div>
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1.5 px-3 bg-zinc-900 text-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md font-mono text-[11px] font-bold transition-colors shadow-sm"
                >
                  Open Document...
                </button>
                <button
                  onClick={handleLoadDemo}
                  className="w-full py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-md font-mono text-[11px] font-bold transition-colors"
                >
                  Sample Manuscript
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Explorer Footer */}
        <div className="p-2 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/30 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
          <span>IDB LOCAL STORAGE</span>
          <span>AIR-GAPPED</span>
        </div>
      </div>
    </div>
  );
}

function RailButton({
  active,
  onClick,
  icon,
  title,
  disabled = false,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-full h-9 flex items-center justify-center rounded-lg transition-all relative group',
        disabled
          ? 'opacity-30 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
          : active
          ? 'bg-zinc-200/90 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 shadow-sm before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2.5px] before:bg-emerald-500 before:rounded-r'
          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-900/60'
      )}
    >
      {icon}
      {badge && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-zinc-950" />
      )}
    </button>
  );
}
