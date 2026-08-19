'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useReciteStore, LLMProvider } from '@/lib/store';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileSystemService } from '@/services/file-system';

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
  } = useReciteStore();

  const { resolvedTheme, toggleTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<MenuCategory | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

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

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';
  const menuItems: MenuCategory[] = ['File', 'Edit', 'View', 'Engine', 'Terminal', 'Help'];

  const triggerCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <header
      ref={menuBarRef}
      className="h-8 w-full bg-zinc-100/95 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-3 text-[12px] font-sans select-none flex-shrink-0 z-50 transition-colors"
    >
      {/* Left OS Frame & Menus */}
      <div className="flex items-center">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-1.5 mr-3 px-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer transition-colors shadow-sm" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 hover:bg-amber-400 cursor-pointer transition-colors shadow-sm" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 hover:bg-emerald-400 cursor-pointer transition-colors shadow-sm" />
        </div>

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
                <div className="absolute top-full left-0 mt-1 min-w-[230px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-lg backdrop-blur-md p-1 font-sans text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                  {item === 'File' && (
                    <>
                      <MenuAction
                        icon={<FolderOpen size={13} className="text-zinc-500" />}
                        label="Open Document..."
                        shortcut="Ctrl+O"
                        onClick={handleMountClick}
                      />
                      <MenuAction
                        icon={<Sparkles size={13} className="text-amber-500" />}
                        label="Open Sample Manuscript"
                        shortcut="Ctrl+Shift+D"
                        onClick={handleLoadDemo}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
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
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={resolvedTheme === 'dark' ? <Sun size={13} className="text-amber-500" /> : <Moon size={13} className="text-indigo-500" />}
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
                      <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                        LLM ROUTING
                      </div>
                      {(['openai', 'anthropic', 'deepseek', 'gemini'] as LLMProvider[]).map((prov) => (
                        <MenuAction
                          key={prov}
                          icon={<Cpu size={13} className={prov === llmRouter.activeProvider ? 'text-emerald-500' : 'text-zinc-400'} />}
                          label={prov.toUpperCase()}
                          active={prov === llmRouter.activeProvider}
                          onClick={() => {
                            setLLMProvider(prov);
                            setActiveMenu(null);
                          }}
                        />
                      ))}
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<Sliders size={13} className="text-zinc-500" />}
                        label="LLM Key Matrix..."
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
                        label="Telemetry Diagnostics"
                        onClick={() => {
                          setActiveMenu(null);
                          setTelemetry({ apiLatencyMs: 38 });
                        }}
                      />
                      <MenuAction
                        icon={<Activity size={13} className="text-zinc-500" />}
                        label="Ping OpenAlex / arXiv Nodes"
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
                        label="Keyboard Shortcuts (J/K Nav)"
                        onClick={() => {
                          setActiveMenu(null);
                          alert('Navigation Shortcuts:\n\n[J] / [Down Arrow]: Step Next Claim\n[K] / [Up Arrow]: Step Previous Claim\n[Ctrl+K]: Command Palette\n[Ctrl+O]: Open Document\n[Ctrl+E]: Export Bibliography\n[Ctrl+T]: Toggle Light/Dark Mode\n[Ctrl+,]: Preferences');
                        }}
                      />
                      <MenuAction
                        icon={<Shield size={13} className="text-zinc-500" />}
                        label={`Seat License: ${license.licenseState}`}
                        onClick={() => {
                          setActiveMenu(null);
                          setShowSettings(true);
                        }}
                      />
                      <MenuAction
                        icon={<Shield size={13} className="text-amber-500" />}
                        label="Legal & Privacy Compliance..."
                        onClick={() => {
                          setActiveMenu(null);
                          setShowLegalWindow(true);
                        }}
                      />
                      <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
                      <MenuAction
                        icon={<HelpCircle size={13} className="text-zinc-400" />}
                        label="ReciteAI Core v0.1.0-ENTERPRISE"
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
      <div className="flex items-center">
        <button
          onClick={triggerCommandPalette}
          className="flex items-center gap-2 px-3 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all font-sans text-[11px] shadow-xs"
        >
          <Search size={11} className="text-zinc-400" />
          <span className="hidden sm:inline">Search commands...</span>
          <kbd className="hidden sm:inline px-1 py-0.2 rounded text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right License & Status Pill */}
      <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
        <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold truncate max-w-[200px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm flex-shrink-0" />
          {isMounted ? documentTitle : 'No Document Loaded'}
        </span>
        <span className={cn(
          "hidden sm:inline px-1.5 py-0.5 rounded",
          license.licenseState === 'VALID'
            ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30'
            : license.licenseState === 'PENDING_SYNC'
            ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30'
            : 'text-rose-500 bg-rose-500/10 border border-rose-500/30'
        )}>
          LICENSE: {license.licenseState}
        </span>
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
