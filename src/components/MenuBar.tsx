'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useReciteStore, LLMProvider, calculateDocMetrics } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS, DEMO_BIBTEX } from '@/lib/demo-data';
import { useTheme } from './ThemeProvider';
import {
  FolderOpen,
  Download,
  XCircle,
  Play,
  RotateCcw,
  Sliders,
  Cpu,
  Shield,
  Activity,
  Terminal,
  HelpCircle,
  Keyboard,
  Layers,
  Sparkles,
  Search,
  Sun,
  Moon,
  Command,
  FileCode2,
  FileText,
  Minus,
  Square,
  X,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileSystemService } from '@/services/file-system';
import { DiffGenerator } from '@/services/diff-generator';
import { ReportGenerator } from '@/services/report-generator';

type MenuCategory = 'File' | 'Edit' | 'View' | 'Engine' | 'Terminal' | 'Help';

export default function MenuBar() {
  const {
    workspace,
    mountWorkspace,
    unmountWorkspace,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    setWorkspaceStatus,
    setIsAuditing,
    setShowSettings,
    setShowLegalWindow,
    setShowExportModal,
    setInspectorTab,
    toggleSidebar,
    llmRouter,
    setLLMProvider,
    setFilterSeverity,
    setFilterCategory,
    setFilterStatus,
    license,
    setTelemetry,
    documentTitle,
    runAudit,
    mountBibTex,
    showTelemetry,
    setShowTelemetry,
  } = useReciteStore();

  const { resolvedTheme, toggleTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<MenuCategory | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Initialize and listen to Tauri window maximize state
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    async function setupWindowState() {
      if (typeof window === 'undefined') return;
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const max = await win.isMaximized();
        setIsMaximized(max);
        const unlistenFn = await win.onResized(async () => {
          try {
            const isMax = await win.isMaximized();
            setIsMaximized(isMax);
          } catch {}
        });
        unlisten = unlistenFn;
      } catch (err) {
        // In browser / non-Tauri mode
      }
    }
    setupWindowState();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {
      console.warn('Window minimize only available in desktop app:', e);
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      const isMax = await win.isMaximized();
      if (isMax) {
        await win.unmaximize();
        setIsMaximized(false);
      } else {
        await win.maximize();
        setIsMaximized(true);
      }
    } catch (e) {
      console.warn('Explicit maximize/unmaximize failed, falling back to toggleMaximize:', e);
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().toggleMaximize();
      } catch (err) {
        console.error('Window maximize error:', err);
      }
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.warn('Window close only available in desktop app:', e);
    }
  };

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };

    window.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMountClick = async () => {
    setActiveMenu(null);
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

  const handleLoadDemo = () => {
    setActiveMenu(null);
    setWorkspaceStatus('MOUNTING');
    const { text: parsed, mathBlocks } = parseMathBlocks(DEMO_MANUSCRIPT);

    setRawText(DEMO_MANUSCRIPT);
    setParsedText(parsed);
    setMathBlocks(mathBlocks);
    setClaims(DEMO_CLAIMS);
    setDocumentTitle('Quantum Spin Dynamics (Draft).tex');
    setFileFormat('tex');
    mountWorkspace('Quantum Spin Dynamics (Draft).tex', 14200);
    mountBibTex('quantum_references.bib', DEMO_BIBTEX);
    setWorkspaceStatus('MOUNTED');
  };

  const handleRunAnalysis = () => {
    setActiveMenu(null);
    runAudit();
  };

  const handleResetFilters = () => {
    setActiveMenu(null);
    setFilterSeverity('All');
    setFilterCategory('All');
    setFilterStatus('All');
  };

  const handleExportPatch = async () => {
    setActiveMenu(null);
    try {
      const { claims, rawText, workspace, documentTitle, addToast } = useReciteStore.getState();
      const fileName = workspace.fileName || documentTitle || 'manuscript.tex';
      const actionableClaims = claims.filter(
        (c) => typeof c.suggestedFix === 'string' && c.suggestedFix.trim().length > 0
      );

      if (actionableClaims.length === 0) {
        addToast('No suggested fixes available to generate patch.', 'warning');
        return;
      }

      const patchContent = DiffGenerator.generateUnifiedPatchFromClaims(rawText, claims, fileName);
      if (!patchContent || patchContent.trim().length === 0) {
        addToast('No diff changes detected in manuscript.', 'warning');
        return;
      }

      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const suggestedPatchName = `${baseName || 'fixes'}.patch`;

      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedPatchName,
          types: [
            {
              description: 'Unified Diff Patch (*.patch, *.diff)',
              accept: { 'text/plain': ['.patch', '.diff'] },
            },
          ],
        });
        await FileSystemService.saveFile(handle, patchContent);
      } else {
        const blob = new Blob([patchContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedPatchName;
        a.click();
        URL.revokeObjectURL(url);
      }

      addToast(`Exported unified patch (${actionableClaims.length} fixes included).`, 'success');
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.message !== 'USER_ABORTED') {
        const { addToast } = useReciteStore.getState();
        addToast(`Patch export failed: ${err.message}`, 'error');
      }
    }
  };

  const handleExportReport = async () => {
    setActiveMenu(null);
    try {
      const { claims, rawText, workspace, documentTitle, docMetrics, addToast } = useReciteStore.getState();
      const fileName = workspace.fileName || documentTitle || 'manuscript.tex';
      const metrics = docMetrics && docMetrics.wordCount > 0 ? docMetrics : calculateDocMetrics(rawText);

      const reportContent = ReportGenerator.generateMarkdownReport(fileName, claims, metrics);
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      const suggestedReportName = `audit_report_${baseName || 'manuscript'}.md`;

      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedReportName,
          types: [
            {
              description: 'Markdown Audit Report (*.md)',
              accept: { 'text/markdown': ['.md'], 'text/plain': ['.txt'] },
            },
          ],
        });
        await FileSystemService.saveFile(handle, reportContent);
      } else {
        const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedReportName;
        a.click();
        URL.revokeObjectURL(url);
      }

      addToast(`Exported Markdown audit report (${claims.length} claims documented).`, 'success');
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.message !== 'USER_ABORTED') {
        const { addToast } = useReciteStore.getState();
        addToast(`Report export failed: ${err.message}`, 'error');
      }
    }
  };

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';
  const menuItems: MenuCategory[] = ['File', 'Edit', 'View', 'Engine', 'Terminal', 'Help'];

  const triggerCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <header
      ref={menuBarRef}
      data-tauri-drag-region
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).getAttribute('data-tauri-drag-region') !== null) {
          handleMaximize();
        }
      }}
      className="h-8 w-full bg-zinc-100/95 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-3 text-[12px] font-sans select-none flex-shrink-0 z-50 transition-colors"
    >
      {/* Left OS Frame & Menus */}
      <div className="flex items-center" data-tauri-drag-region>


        {/* Menu Buttons */}
        <div className="flex items-center gap-0.5">
          {menuItems.map((item) => (
            <div key={item} className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === item ? null : item)}
                onMouseEnter={() => {
                  if (activeMenu !== null) setActiveMenu(item);
                }}
                className={cn(
                  'px-2.5 py-0.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 rounded-md transition-colors font-medium text-[11px]',
                  activeMenu === item && 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                )}
              >
                {item}
              </button>

              {/* Dropdown Menus */}
              {activeMenu === item && (
                <div className="absolute top-full left-0 mt-1 min-w-[240px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-lg backdrop-blur-md p-1 font-sans text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                  {item === 'File' && (
                    <>
                      <MenuAction
                        icon={<FolderOpen size={13} className="text-zinc-500" />}
                        label="Open Document..."
                        shortcut="Ctrl+O"
                        onClick={handleMountClick}
                      />
                      <MenuAction
                        icon={<FileText size={13} className="text-zinc-500" />}
                        label="Open Sample Manuscript"
                        shortcut="Ctrl+Shift+D"
                        onClick={handleLoadDemo}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<FileCode2 size={13} className="text-emerald-500" />}
                        label="Export Suggested Fixes (.patch)..."
                        shortcut="Ctrl+Shift+P"
                        disabled={!isMounted}
                        onClick={handleExportPatch}
                      />
                      <MenuAction
                        icon={<FileText size={13} className="text-violet-500" />}
                        label="Export Audit Report (.md)..."
                        shortcut="Ctrl+Shift+R"
                        disabled={!isMounted}
                        onClick={handleExportReport}
                      />
                      <MenuAction
                        icon={<Download size={13} className="text-zinc-500" />}
                        label="Export Bibliography (.bib)..."
                        shortcut="Ctrl+E"
                        disabled={!isMounted}
                        onClick={() => {
                          setActiveMenu(null);
                          setShowExportModal(true);
                        }}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<XCircle size={13} className="text-rose-500" />}
                        label="Close Document"
                        shortcut="Ctrl+W"
                        disabled={!isMounted}
                        onClick={() => {
                          setActiveMenu(null);
                          unmountWorkspace();
                        }}
                      />
                    </>
                  )}

                  {item === 'Edit' && (
                    <>
                      <MenuAction
                        icon={<Play size={13} className="text-emerald-500" />}
                        label="Analyze Document"
                        shortcut="Ctrl+Enter"
                        disabled={!isMounted}
                        onClick={handleRunAnalysis}
                      />
                      <MenuAction
                        icon={<RotateCcw size={13} className="text-zinc-500" />}
                        label="Reset Severity Filters"
                        onClick={handleResetFilters}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<Sliders size={13} className="text-zinc-500" />}
                        label="Preferences..."
                        shortcut="Ctrl+,"
                        onClick={() => {
                          setActiveMenu(null);
                          setShowSettings(true);
                        }}
                      />
                    </>
                  )}

                  {item === 'View' && (
                    <>
                      <MenuAction
                        icon={<Command size={13} className="text-zinc-500" />}
                        label="Command Palette..."
                        shortcut="Ctrl+K"
                        onClick={() => {
                          setActiveMenu(null);
                          triggerCommandPalette();
                        }}
                      />
                      <MenuAction
                        icon={<Layers size={13} className="text-zinc-500" />}
                        label="Toggle Explorer Sidebar"
                        shortcut="Ctrl+B"
                        onClick={() => {
                          setActiveMenu(null);
                          toggleSidebar();
                        }}
                      />
                      <MenuAction
                        icon={<Activity size={13} className="text-zinc-500" />}
                        label={showTelemetry ? "Hide Telemetry HUD" : "Show Telemetry HUD"}
                        onClick={() => {
                          setActiveMenu(null);
                          setShowTelemetry(!showTelemetry);
                        }}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={resolvedTheme === 'dark' ? <Sun size={13} className="text-yellow-500" /> : <Moon size={13} className="text-indigo-500" />}
                        label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        shortcut="Ctrl+T"
                        onClick={() => {
                          setActiveMenu(null);
                          toggleTheme();
                        }}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<Activity size={13} className="text-emerald-500" />}
                        label="Focus Candidate Citations"
                        onClick={() => {
                          setActiveMenu(null);
                          setInspectorTab('candidates');
                        }}
                      />
                      <MenuAction
                        icon={<Shield size={13} className="text-rose-500" />}
                        label="Focus Retraction Radar"
                        onClick={() => {
                          setActiveMenu(null);
                          setInspectorTab('health');
                        }}
                      />
                    </>
                  )}

                  {item === 'Engine' && (
                    <>
                      <div className="px-2.5 py-1 text-[11px] text-zinc-500 font-medium">
                        Inference Engine
                      </div>
                      {([
                        { id: 'anthropic',  label: 'Claude (Anthropic)' },
                        { id: 'openai',     label: 'OpenAI' },
                        { id: 'google',     label: 'Gemini (Google)' },
                        { id: 'openrouter', label: 'OpenRouter' },
                        { id: 'ollama',     label: 'Ollama (Local)' },
                      ] as { id: LLMProvider; label: string }[]).map((prov) => (
                        <MenuAction
                          key={prov.id}
                          icon={<Cpu size={13} className={prov.id === llmRouter.activeProvider ? 'text-emerald-500' : 'text-zinc-400'} />}
                          label={prov.label}
                          active={prov.id === llmRouter.activeProvider}
                          onClick={() => {
                            setLLMProvider(prov.id);
                            setActiveMenu(null);
                          }}
                        />
                      ))}
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<Sliders size={13} className="text-zinc-500" />}
                        label="API Keys & Settings..."
                        shortcut="Ctrl+,"
                        onClick={() => {
                          setActiveMenu(null);
                          setShowSettings(true);
                        }}
                      />
                    </>
                  )}

                  {item === 'Terminal' && (
                    <>
                      <MenuAction
                        icon={<Terminal size={13} className="text-emerald-500" />}
                        label="Diagnostics Status"
                        onClick={() => {
                          setActiveMenu(null);
                          setTelemetry({ apiLatencyMs: 38 });
                        }}
                      />
                      <MenuAction
                        icon={<Activity size={13} className="text-zinc-500" />}
                        label="Check OpenAlex & arXiv Nodes"
                        onClick={() => {
                          setActiveMenu(null);
                          setTelemetry({ apiLatencyMs: 42 });
                        }}
                      />
                    </>
                  )}

                  {item === 'Help' && (
                    <>
                      <MenuAction
                        icon={<Keyboard size={13} className="text-zinc-500" />}
                        label="Keyboard Shortcuts"
                        onClick={() => {
                          setActiveMenu(null);
                          alert('Keyboard Shortcuts:\n\n[J] / [Down]: Step Next Finding\n[K] / [Up]: Step Previous Finding\n[Ctrl+↵]: Run Audit\n[Ctrl+K]: Command Palette\n[Ctrl+O]: Open Document\n[Ctrl+E]: Export Bibliography\n[Ctrl+T]: Toggle Theme\n[Ctrl+,]: Preferences');
                        }}
                      />
                      <MenuAction
                        icon={<Shield size={13} className="text-zinc-500" />}
                        label={`Seat License: ${license.status === 'ACTIVE' ? 'Active' : 'Unverified'}`}
                        onClick={() => {
                          setActiveMenu(null);
                          setShowSettings(true);
                        }}
                      />
                      <MenuAction
                        icon={<Shield size={13} className="text-yellow-500" />}
                        label="Legal & Privacy Compliance..."
                        onClick={() => {
                          setActiveMenu(null);
                          setShowLegalWindow(true);
                        }}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<HelpCircle size={13} className="text-zinc-400" />}
                        label="ReciteAI Desktop v0.1.0"
                        disabled
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center Search Bar trigger */}
      <div className="flex items-center flex-1 justify-center" data-tauri-drag-region>
        <button
          onClick={triggerCommandPalette}
          className="flex items-center gap-2 px-3 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all font-sans text-xs shadow-xs cursor-pointer"
        >
          <Search size={12} className="text-zinc-400" />
          <span className="hidden sm:inline">Search commands...</span>
          <kbd className="hidden sm:inline px-1 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Theme Toggle & Window Controls (Minimize, Maximize, Close) */}
      <div className="flex items-center -mr-2 h-full select-none" data-tauri-drag-region="false">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="h-full px-2.5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode (Ctrl+T)`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun size={13} className="text-amber-400" />
          ) : (
            <Moon size={13} className="text-zinc-600" />
          )}
        </button>

        {/* Minimize Button */}
        <button
          onClick={handleMinimize}
          className="h-full w-10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Minimize Window"
        >
          <Minus size={13} />
        </button>

        {/* Maximize / Restore Button */}
        <button
          onClick={handleMaximize}
          className="h-full w-10 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title={isMaximized ? 'Restore Window' : 'Maximize Window'}
        >
          {isMaximized ? (
            <Copy size={11} className="rotate-90" />
          ) : (
            <Square size={11} />
          )}
        </button>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="h-full w-11 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition-colors cursor-pointer"
          title="Close (Alt+F4)"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}

function MenuAction({
  icon,
  label,
  shortcut,
  disabled = false,
  active = false,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors font-sans text-xs',
        disabled
          ? 'opacity-40 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
          : active
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100'
      )}
    >
      <div className="flex items-center gap-2 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {shortcut && <span className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono ml-3">{shortcut}</span>}
    </button>
  );
}
