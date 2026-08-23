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
  FileText,
  FileCode2,
  ListTree,
  Activity,
  CheckCircle2,
  Layers,
  Database,
  Link2,
} from 'lucide-react';
import { useReciteStore } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';
import { FileSystemService } from '@/services/file-system';
import { BibTeXParser } from '@/services/bibtex-parser';

export default function Sidebar() {
  const {
    sidebarOpen,
    toggleSidebar,
    setShowSettings,
    setShowExportModal,
    workspace,
    mountWorkspace,
    mountDirectoryWorkspace,
    setActiveFile,
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
    bibtexContent,
    bibtexFileName,
    mountBibTex,
    unmountBibTex,
  } = useReciteStore();

  const { resolvedTheme, toggleTheme } = useTheme();
  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';

  const handleMountClick = async () => {
    try {
      const { text, fileHandle, fileName, fileSize } = await FileSystemService.mountFile();
      setWorkspaceStatus('MOUNTING');
      
      const { text: parsed, mathBlocks } = parseMathBlocks(text);
      setRawText(text);
      setParsedText(parsed);
      setMathBlocks(mathBlocks);
      setDocumentTitle(fileName);
      setFileFormat(fileName.endsWith('.docx') ? 'docx' : fileName.endsWith('.txt') ? 'txt' : 'tex');
      
      mountWorkspace(fileName, fileSize, fileHandle);
      setWorkspaceStatus('AST_PARSING');
      
      setTimeout(() => {
        setWorkspaceStatus('AST_PARSER_IDLE');
      }, 200);
    } catch (err: any) {
      if (err.message !== 'USER_ABORTED') {
        const { addToast } = useReciteStore.getState();
        addToast(`Failed to open document: ${err.message}`, 'error');
      }
    }
  };

  const handleMountDirectoryClick = async () => {
    try {
      const { directoryName, files } = await FileSystemService.mountDirectory();
      setWorkspaceStatus('MOUNTING');
      mountDirectoryWorkspace(directoryName, files);
      
      const mainFile = Object.keys(files).find(k => k === 'main.tex' || k.endsWith('.tex'));
      if (mainFile) {
        useReciteStore.getState().setActiveFile(mainFile);
      }
      
      setWorkspaceStatus('AST_PARSING');
      setTimeout(() => {
        setWorkspaceStatus('AST_PARSER_IDLE');
      }, 200);
    } catch (err: any) {
      if (err.message !== 'USER_ABORTED') {
        const { addToast } = useReciteStore.getState();
        addToast(`Failed to open directory: ${err.message}`, 'error');
      }
    }
  };

  const handleMountBibClick = async () => {
    try {
      const { text, fileName } = await FileSystemService.mountBibFile();
      mountBibTex(fileName, text);
      const { addToast } = useReciteStore.getState();
      addToast(`Attached BibTeX database: ${fileName}`, 'success');
    } catch (err: any) {
      if (err.message !== 'USER_ABORTED') {
        const { addToast } = useReciteStore.getState();
        addToast(`Failed to open .bib file: ${err.message}`, 'error');
      }
    }
  };

  const parsedBibEntries = React.useMemo(() => {
    if (!bibtexContent) return new Map();
    return BibTeXParser.parse(bibtexContent);
  }, [bibtexContent]);

  const licColor =
    license.status === 'ACTIVE'
      ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30'
      : license.status === 'UNVERIFIED'
      ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30'
      : 'text-rose-500 bg-rose-500/10 border border-rose-500/30';

  return (
    <div className="flex h-full flex-shrink-0 z-20 select-none">
      {/* 1. Activity Rail (48px fixed) */}
      <aside className="w-12 h-full bg-zinc-100/90 dark:bg-zinc-950/90 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col items-center py-2.5 justify-between flex-shrink-0">
        {/* Top Icons */}
        <div className="flex flex-col gap-3 w-full px-1.5">
          <RailButton
            active={sidebarOpen}
            onClick={toggleSidebar}
            icon={<Files size={19} strokeWidth={1.5} />}
            title="Toggle Explorer (Ctrl+B)"
            badge={isMounted ? '1' : undefined}
          />

          <RailButton
            active={false}
            onClick={() => setShowSettings(true)}
            icon={<div className={cn("p-1 rounded", licColor)}><Shield size={19} strokeWidth={1.5} /></div>}
            title={`Seat License: ${license.status}`}
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
                <Sun size={18} strokeWidth={1.5} className="text-yellow-400" />
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
          'h-full bg-zinc-50/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col overflow-hidden transition-all duration-200 ease-in-out font-sans',
          !sidebarOpen ? 'w-0 opacity-0 border-r-0 pointer-events-none' : 'w-60 opacity-100'
        )}
      >
        {/* Explorer Header */}
        <div className="h-9 px-3 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between flex-shrink-0 bg-zinc-100/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 text-xs font-semibold">
            <ListTree size={14} className="text-zinc-500" />
            <span>Explorer</span>
          </div>

          <button
            onClick={toggleSidebar}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Collapse Sidebar (Ctrl+B)"
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Explorer Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Active File / Bibliography */}
          {isMounted ? (
            <>
              {/* Document Info Card */}
              <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/60 shadow-xs space-y-2">
                <div className="flex items-start gap-2">
                  <FileCode2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {workspace.fileName || 'Untitled'}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      {workspace.fileSizeBytes ? `${(workspace.fileSizeBytes / 1024).toFixed(1)} KB` : 'Draft'} · {filteredClaims.length} Findings
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Math blocks: {mathBlocks.size}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ready</span>
                </div>
              </div>

              {/* BibTeX Database Card */}
              {bibtexFileName ? (
                <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Database size={15} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate">
                          {bibtexFileName}
                        </div>
                        <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                          {parsedBibEntries.size} entries loaded
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-500/20">
                    <button
                      onClick={handleMountBibClick}
                      className="flex-1 py-1 px-2 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                    >
                      Replace .bib
                    </button>
                    <button
                      onClick={unmountBibTex}
                      className="py-1 px-2 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 rounded text-xs transition-colors cursor-pointer"
                      title="Detach .bib Database"
                    >
                      Detach
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleMountBibClick}
                  className="w-full py-1.5 px-2.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Database size={13} className="text-zinc-400" />
                  <span>Attach .bib Database</span>
                </button>
              )}

              {workspace.type === 'directory' && (
                <div className="space-y-1">
                  <div className="px-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                    Project Files
                  </div>
                  <div className="space-y-0.5">
                    {Object.keys(workspace.projectFiles).sort().map(path => {
                      const isCurrent = workspace.activeFilePath === path;
                      const depth = path.split('/').length - 1;
                      const name = path.split('/').pop();
                      return (
                        <button
                          key={path}
                          onClick={() => setActiveFile(path)}
                          style={{ paddingLeft: `${10 + depth * 12}px` }}
                          className={cn(
                            'w-full flex items-center justify-between py-1.5 pr-2.5 rounded text-left transition-colors font-mono text-xs',
                            isCurrent
                              ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
                          )}
                        >
                          <span className="truncate">{name}</span>
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                <FolderOpen size={18} />
              </div>
              <div className="text-xs text-zinc-500">
                No document loaded.
              </div>
              <div className="space-y-1.5 pt-1">
                <button
                  onClick={handleMountClick}
                  className="w-full py-1.5 px-3 bg-zinc-900 text-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Open Document...
                </button>
                <button
                  onClick={handleMountDirectoryClick}
                  className="w-full py-1.5 px-3 bg-zinc-900 text-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded text-xs font-medium transition-colors shadow-xs cursor-pointer"
                >
                  Open Folder...
                </button>
                <button
                  onClick={handleMountBibClick}
                  className="w-full py-1.5 px-3 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-medium transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Database size={13} className="text-zinc-400" />
                  <span>Attach .bib Database...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Explorer Footer */}
        <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/30 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>Local Storage</span>
          <span>Air-Gapped</span>
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
