'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Shield,
  Play,
  StopCircle,
  ChevronDown,
  Zap,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Cpu,
  Database,
  Network,
  MemoryStick,
  Sparkles,
  FileCode2,
  Sliders,
  Terminal,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCiteGuardStore, LLMProvider, WorkspaceStatus } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS } from '@/lib/demo-data';
import { ThemeProvider } from '@/components/ThemeProvider';
import MenuBar from '@/components/MenuBar';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import SettingsWindow from '@/components/SettingsWindow';
import ExportModal from '@/components/ExportModal';
import LegalWindow from '@/components/LegalWindow';
import ManuscriptViewer from '@/components/viewer/ManuscriptViewer';
import ActionInspector from '@/components/inspector/ActionInspector';

// ─────────────────────────────────────────────────────────────────────────────
// § CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_BAR_H = 24; // px — absolute bottom taskbar

const LLM_LABELS: Record<LLMProvider, string> = {
  openai: 'GPT-4o',
  anthropic: 'Claude 3.5',
  deepseek: 'DeepSeek-V3',
  gemini: 'Gemini 2.0',
};

// ─────────────────────────────────────────────────────────────────────────────
// § STATUS BAR — Clinical Lab Telemetry Taskbar
// ─────────────────────────────────────────────────────────────────────────────

function StatusBar() {
  const { telemetry, workspace, license, llmRouter, setTelemetry, setShowSettings } = useCiteGuardStore();

  useEffect(() => {
    const onOnline = () => setTelemetry({ isOnline: true });
    const onOffline = () => setTelemetry({ isOnline: false });
    setTelemetry({ isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setTelemetry]);

  useEffect(() => {
    type PerfMemory = { usedJSHeapSize: number };
    const poll = () => {
      const mem = (performance as unknown as { memory?: PerfMemory }).memory;
      if (mem) setTelemetry({ memUsedMB: Math.round(mem.usedJSHeapSize / 1048576) });
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [setTelemetry]);

  const wsStatus = workspace.status as WorkspaceStatus;
  const isOnline = telemetry.isOnline;
  const latency = telemetry.apiLatencyMs;
  const mem = telemetry.memUsedMB;
  const lic = license.licenseState;

  const statusLabel =
    wsStatus === 'NO_WORKSPACE_MOUNTED'
      ? 'Engine: Standby'
      : wsStatus === 'PREFLIGHT_RUNNING'
      ? 'Analyzing Document...'
      : wsStatus === 'PREFLIGHT_COMPLETE'
      ? 'Analysis Complete'
      : wsStatus === 'AST_PARSING'
      ? 'Parsing AST...'
      : 'Engine: Ready';

  const licColor =
    lic === 'VALID'
      ? 'text-emerald-600 dark:text-emerald-400'
      : lic === 'PENDING_SYNC'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <footer
      style={{ height: STATUS_BAR_H }}
      className="w-full border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/95 dark:bg-zinc-950/95 backdrop-blur-md flex items-center justify-between px-3 flex-shrink-0 select-none z-40 text-[10px] font-mono text-zinc-500 transition-colors"
    >
      {/* LEFT: Connection & System Diagnostics */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              isOnline
                ? 'bg-emerald-500 shadow-sm'
                : 'bg-red-500 shadow-sm animate-pulse'
            )}
          />
          <span className={isOnline ? 'text-zinc-700 dark:text-zinc-300' : 'text-red-600 dark:text-red-400'}>
            {isOnline ? 'Online' : 'Offline (Air-Gapped)'}
          </span>
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <Network size={11} className="text-zinc-400 dark:text-zinc-600" />
          Latency: {latency !== null ? `${latency}ms` : '--'}
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <MemoryStick size={11} className="text-zinc-400 dark:text-zinc-600" />
          Memory: {mem !== null ? `${mem} MB` : '--'}
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
          <Terminal size={10} className="text-zinc-400 dark:text-zinc-600" />
          {statusLabel}
        </span>
      </div>

      {/* RIGHT: Storage, LLM Model & License */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <Database size={11} className="text-zinc-400 dark:text-zinc-600" />
          Storage: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">IndexedDB</strong>
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <Cpu size={11} className="text-zinc-400 dark:text-zinc-600" />
          Model: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{LLM_LABELS[llmRouter.activeProvider]}</strong>
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <button
          onClick={() => setShowSettings(true)}
          className={cn('flex items-center gap-1 font-semibold hover:underline', licColor)}
          title="View License Details"
        >
          <Shield size={11} />
          License: {lic}
        </button>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § CONDENSED ACTION RIBBON (h-10)
// ─────────────────────────────────────────────────────────────────────────────

function CondensedActionRibbon() {
  const {
    isAuditing,
    setIsAuditing,
    workspace,
    mountWorkspace,
    unmountWorkspace,
    llmRouter,
    setLLMProvider,
    stats,
    filterSeverity,
    setFilterSeverity,
    setWorkspaceStatus,
    setTelemetry,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    setShowSettings,
  } = useCiteGuardStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [llmMenuOpen, setLlmMenuOpen] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRunAnalysis = () => {
    if (!isAuditing) {
      setIsAuditing(true);
      setWorkspaceStatus('PREFLIGHT_RUNNING');
      const t0 = performance.now();
      setTimeout(() => {
        setTelemetry({ apiLatencyMs: Math.round(performance.now() - t0) });
        setIsAuditing(false);
        setWorkspaceStatus('PREFLIGHT_COMPLETE');
      }, 1200);
    } else {
      setIsAuditing(false);
      setWorkspaceStatus('AST_PARSER_IDLE');
    }
  };

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';
  const providers: LLMProvider[] = ['openai', 'anthropic', 'deepseek', 'gemini'];

  return (
    <div className="h-10 w-full bg-white dark:bg-zinc-950/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800/80 rounded-lg shadow-sm flex items-center justify-between px-3 select-none flex-shrink-0 transition-colors">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".tex,.latex,.docx,.txt,.md"
        onChange={handleFileSelect}
      />

      {/* Left: Document indicator & Severity Filter cluster */}
      <div className="flex items-center gap-2">
        {/* Document Action Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Open Manuscript File (Ctrl+O)"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md font-sans text-xs font-semibold border transition-all shadow-xs',
            isMounted
              ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15'
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
        >
          <FolderOpen size={13} className="text-zinc-500 dark:text-zinc-400" />
          <span>
            {isMounted
              ? (workspace.fileName?.substring(0, 24) || 'Document') +
                ((workspace.fileName?.length || 0) > 24 ? '…' : '')
              : 'Open Document...'}
          </span>
        </button>

        {!isMounted && (
          <button
            onClick={handleLoadDemo}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md font-sans text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            <Sparkles size={12} className="text-amber-500" />
            <span>Sample Manuscript</span>
          </button>
        )}

        {isMounted && (
          <button
            onClick={unmountWorkspace}
            title="Close current document (Ctrl+W)"
            className="flex items-center px-1.5 py-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-sans text-xs transition-colors"
          >
            Close
          </button>
        )}

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Compact Severity Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <button
            onClick={() => setFilterSeverity(filterSeverity === 'High' ? 'All' : 'High')}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded border transition-colors',
              filterSeverity === 'High'
                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 font-bold'
                : 'border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            )}
            title="Toggle High Severity Claims"
          >
            <AlertTriangle size={11} className="text-rose-500" />
            <span>High: {stats.highSeverity}</span>
          </button>

          <button
            onClick={() => setFilterSeverity(filterSeverity === 'Medium' ? 'All' : 'Medium')}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded border transition-colors',
              filterSeverity === 'Medium'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold'
                : 'border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            )}
            title="Toggle Medium Severity Claims"
          >
            <Zap size={11} className="text-amber-500" />
            <span>Med: {stats.mediumSeverity}</span>
          </button>

          <button
            onClick={() => setFilterSeverity(filterSeverity === 'Low' ? 'All' : 'Low')}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded border transition-colors',
              filterSeverity === 'Low'
                ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40 font-bold'
                : 'border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
            )}
            title="Toggle Low Severity Claims"
          >
            <CheckCircle2 size={11} className="text-sky-500" />
            <span>Low: {stats.lowSeverity}</span>
          </button>
        </div>
      </div>

      {/* Right: LLM Provider Dropdown & Main Analyze Button */}
      <div className="flex items-center gap-2">
        {/* LLM Routing Dropdown */}
        <div className="relative">
          <button
            onClick={() => setLlmMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-sans text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-xs"
          >
            <Cpu size={12} className="text-emerald-500" />
            <span>{LLM_LABELS[llmRouter.activeProvider]}</span>
            <ChevronDown size={10} className={cn('transition-transform', llmMenuOpen && 'rotate-180')} />
          </button>

          {llmMenuOpen && (
            <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl w-44 p-1 font-sans text-xs animate-in fade-in duration-100">
              <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">
                LLM Routing
              </div>
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setLLMProvider(p);
                    setLlmMenuOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between transition-colors',
                    p === llmRouter.activeProvider ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 font-bold' : 'text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  <span>{LLM_LABELS[p]}</span>
                  {p === llmRouter.activeProvider && <CheckCircle2 size={12} />}
                </button>
              ))}
              <div className="border-b border-zinc-100 dark:border-zinc-800 my-1" />
              <button
                onClick={() => {
                  setLlmMenuOpen(false);
                  setShowSettings(true);
                }}
                className="w-full text-left px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded flex items-center gap-1.5"
              >
                <Sliders size={11} />
                <span>Configure Keys...</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          id="btn-analyze-document"
          onClick={handleRunAnalysis}
          disabled={!isMounted}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1 rounded-md font-sans text-xs font-bold border transition-all shadow-xs',
            !isMounted
              ? 'border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-900/40 cursor-not-allowed'
              : isAuditing
              ? 'border-rose-500/50 text-rose-700 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 animate-pulse'
              : 'border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 shadow-sm'
          )}
        >
          {isAuditing ? (
            <>
              <StopCircle size={13} />
              <span>Stop Analysis</span>
            </>
          ) : (
            <>
              <Play size={13} />
              <span>Analyze Document</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § EDITOR EMPTY STATE — Sterile Clinical Standby
// ─────────────────────────────────────────────────────────────────────────────

function SterileEditorEmptyState({
  onMountClick,
  onLoadDemo,
}: {
  onMountClick: () => void;
  onLoadDemo: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden bg-white/50 dark:bg-zinc-950/50">
      <div className="relative z-10 max-w-md w-full text-center space-y-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-500 dark:text-zinc-400">
          <FileCode2 size={24} />
        </div>

        <div className="space-y-1.5 font-sans">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No document loaded.
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Open a LaTeX (.tex), Microsoft Word (.docx), or plain text manuscript to analyze citation coverage and verify claims.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 font-sans text-xs">
          <button
            onClick={onMountClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors font-semibold shadow-xs"
          >
            <FolderOpen size={14} />
            <span>Open Document...</span>
          </button>

          <button
            onClick={onLoadDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors font-semibold"
          >
            <Sparkles size={14} />
            <span>Open Sample Manuscript</span>
          </button>
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center gap-4 text-[11px] font-mono text-zinc-400 dark:text-zinc-600">
          <span>Zero Retention</span>
          <span>•</span>
          <span>Local KaTeX Isolation</span>
          <span>•</span>
          <span>Air-Gapped Ready</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § DRAG ENGINE — Custom PointerEvent Splitter
// ─────────────────────────────────────────────────────────────────────────────

function usePointerDrag(initialPct: number, min: number, max: number) {
  const [pct, setPct] = useState(initialPct);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      if (rawPct >= min && rawPct <= max) setPct(rawPct);
    },
    [dragging, min, max]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragging(false);
  }, []);

  return { pct, dragging, containerRef, onPointerDown, onPointerMove, onPointerUp };
}

// ─────────────────────────────────────────────────────────────────────────────
// § MAIN IDE CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function IDEWorkbench() {
  const {
    workspace,
    isAuditing,
    showExportModal,
    setShowExportModal,
    mountWorkspace,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    setWorkspaceStatus,
  } = useCiteGuardStore();

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { pct, dragging, containerRef, onPointerDown, onPointerMove, onPointerUp } =
    usePointerDrag(58, 25, 75);

  const handleDirectFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 overflow-hidden font-sans select-none antialiased transition-colors">
      {/* 1. Global Menu Bar */}
      <MenuBar />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".tex,.latex,.docx,.txt,.md"
        onChange={handleDirectFileSelect}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative min-h-0 bg-zinc-200/40 dark:bg-[#070709]">
        {/* Activity Rail + Collapsible Explorer */}
        <Sidebar />

        {/* Floating Desktop Panes Main Area */}
        <main className="flex-1 flex flex-col min-w-0 p-2 gap-2 overflow-hidden">
          {/* Condensed Top Action Ribbon (h-10) */}
          <CondensedActionRibbon />

          {/* Split Panes Container */}
          <div
            ref={containerRef}
            className={cn(
              'flex-1 flex overflow-hidden relative min-h-0 gap-2',
              dragging && 'select-none'
            )}
          >
            {/* Left Pane: Manuscript Viewer */}
            <section
              style={{ width: `${pct}%` }}
              className="relative flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800/90 shadow-md dark:shadow-2xl bg-white dark:bg-zinc-950/90 backdrop-blur-md transition-colors"
            >
              <div
                className={cn(
                  'flex-1 overflow-hidden relative flex flex-col',
                  dragging && 'pointer-events-none'
                )}
              >
                {isMounted ? (
                  <ManuscriptViewer />
                ) : (
                  <SterileEditorEmptyState
                    onMountClick={() => fileInputRef.current?.click()}
                    onLoadDemo={handleLoadDemo}
                  />
                )}
              </div>

              {/* Analysis Active Overlay */}
              {isAuditing && (
                <div className="absolute inset-0 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-40 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5 font-sans text-xs text-emerald-700 dark:text-emerald-400 font-bold tracking-wide animate-pulse mb-3">
                    <Activity size={16} className="animate-spin" />
                    <span>Analyzing document claims and citation integrity...</span>
                  </div>
                  <div className="w-56 h-1 bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden border border-zinc-300 dark:border-zinc-800">
                    <div className="h-full bg-emerald-500 animate-[scan_1.2s_ease-in-out_infinite] rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>
              )}
            </section>

            {/* Custom Pointer Gutter Splitter */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={cn(
                'w-1.5 flex-shrink-0 cursor-col-resize z-30 transition-all rounded-full flex items-center justify-center group relative',
                dragging
                  ? 'bg-emerald-500 shadow-sm'
                  : 'bg-transparent hover:bg-emerald-500/40'
              )}
            >
              <div className="absolute inset-y-0 -left-2 -right-2" />
            </div>

            {/* Right Pane: Action Inspector */}
            <section
              className={cn(
                'flex-1 flex flex-col overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800/90 shadow-md dark:shadow-2xl bg-white dark:bg-zinc-950/90 backdrop-blur-md min-w-[280px] transition-colors',
                dragging && 'pointer-events-none'
              )}
            >
              <ActionInspector />
            </section>

            {/* Drag Overlay */}
            {dragging && (
              <div className="absolute inset-0 z-50 cursor-col-resize" />
            )}
          </div>
        </main>
      </div>

      {/* 3. Global Status Bar */}
      <StatusBar />

      {/* Global Modals & Command Palette */}
      <CommandPalette />
      <SettingsWindow />
      <LegalWindow />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
}

export default function IDEPage() {
  return (
    <ThemeProvider>
      <IDEWorkbench />
    </ThemeProvider>
  );
}