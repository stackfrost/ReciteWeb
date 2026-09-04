'use client';

import React from 'react';
import {
  Files,
  Download,
  Settings,
  Shield,
  Sun,
  Moon,
  ChevronLeft,
  FolderOpen,
  FileCode2,
  ListTree,
  Database,
  X,
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
      setWorkspaceStatus('AST_PARSER_IDLE');
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

      const mainFile = Object.keys(files).find((k) => k === 'main.tex' || k.endsWith('.tex'));
      if (mainFile) {
        useReciteStore.getState().setActiveFile(mainFile);
      }

      setWorkspaceStatus('AST_PARSER_IDLE');
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

  return (
    <div className="h-full w-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col select-none font-sans overflow-hidden min-w-0">
      {/* ── Drawer Header ── */}
      <div className="h-9 px-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-900/40">
        <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold">
          <Files size={14} className="text-emerald-400" />
          <span>Project Workspace</span>
        </div>

        <button
          onClick={toggleSidebar}
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Collapse Drawer (Ctrl+B)"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* ── Drawer Content ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs min-h-0">
        {isMounted ? (
          <>
            {/* Active Manuscript Card */}
            <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 shadow-xs space-y-2">
              <div className="flex items-start gap-2">
                <FileCode2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-semibold text-zinc-100 truncate">
                    {workspace.fileName || 'manuscript.tex'}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    {workspace.fileSizeBytes
                      ? `${(workspace.fileSizeBytes / 1024).toFixed(1)} KB`
                      : 'Draft'}{' '}
                    · {filteredClaims.length} Findings
                  </div>
                </div>
              </div>

              <div className="pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span>Math blocks: {mathBlocks.size}</span>
                <span className="text-emerald-400 font-medium">Ready</span>
              </div>
            </div>

            {/* Attached BibTeX Database */}
            {bibtexFileName ? (
              <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-semibold text-emerald-300 truncate">
                      {bibtexFileName}
                    </div>
                    <div className="text-[10px] text-emerald-400/80">
                      {parsedBibEntries.size} citations loaded
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-500/20">
                  <button
                    onClick={handleMountBibClick}
                    className="flex-1 py-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded text-[11px] font-medium border border-zinc-800 transition-colors cursor-pointer"
                  >
                    Replace .bib
                  </button>
                  <button
                    onClick={unmountBibTex}
                    className="py-1 px-2 text-zinc-400 hover:text-rose-400 rounded text-[11px] transition-colors cursor-pointer"
                    title="Detach .bib database"
                  >
                    Detach
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleMountBibClick}
                className="w-full py-2 px-2.5 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300 hover:text-white border border-dashed border-zinc-800 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Database size={13} className="text-zinc-400" />
                <span>Attach references.bib</span>
              </button>
            )}

            {/* Multi-file Project Tree (if directory workspace) */}
            {workspace.type === 'directory' && (
              <div className="space-y-1">
                <div className="px-1 text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-semibold">
                  Project Files
                </div>
                <div className="space-y-0.5">
                  {Object.keys(workspace.projectFiles)
                    .sort()
                    .map((path) => {
                      const isCurrent = workspace.activeFilePath === path;
                      const depth = path.split('/').length - 1;
                      const name = path.split('/').pop();
                      return (
                        <button
                          key={path}
                          onClick={() => setActiveFile(path)}
                          style={{ paddingLeft: `${8 + depth * 10}px` }}
                          className={cn(
                            'w-full flex items-center justify-between py-1 pr-2 rounded text-left transition-colors font-mono text-xs',
                            isCurrent
                              ? 'bg-zinc-800 text-zinc-100 font-semibold'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                          )}
                        >
                          <span className="truncate">{name}</span>
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-6 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 text-zinc-500 border border-zinc-800">
              <FolderOpen size={18} />
            </div>
            <div className="text-xs text-zinc-400">No manuscript loaded.</div>
            <div className="space-y-2 pt-1">
              <button
                onClick={handleMountClick}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <FolderOpen size={14} />
                <span>Open File...</span>
              </button>
              <button
                onClick={handleMountDirectoryClick}
                className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <ListTree size={14} className="text-zinc-400" />
                <span>Open Folder...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Drawer Footer ── */}
      <div className="p-2 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 rounded hover:bg-zinc-900 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Preferences & License (Ctrl+,)"
          >
            <Settings size={13} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-1 rounded hover:bg-zinc-900 hover:text-zinc-200 transition-colors cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        <span className="text-zinc-400 text-[10px]">Client-Side ZDR</span>
      </div>
    </div>
  );
}
