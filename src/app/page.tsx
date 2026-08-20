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
  FileText,
  Sliders,
  Terminal,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore, LLMProvider, WorkspaceStatus } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS, DEMO_BIBTEX } from '@/lib/demo-data';
import { ThemeProvider } from '@/components/ThemeProvider';
import MenuBar from '@/components/MenuBar';
import Toolbar from '@/components/Toolbar';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import SettingsWindow from '@/components/SettingsWindow';
import ExportModal from '@/components/ExportModal';
import LegalWindow from '@/components/LegalWindow';
import ConfirmModal from '@/components/ConfirmModal';
import ToastContainer from '@/components/ToastContainer';
import ManuscriptViewer from '@/components/viewer/ManuscriptViewer';
import ActionInspector from '@/components/inspector/ActionInspector';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import VaultUnlockModal from '@/components/VaultUnlockModal';

// ─────────────────────────────────────────────────────────────────────────────
// § CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_BAR_H = 24; // px — absolute bottom taskbar

const LLM_LABELS: Record<LLMProvider, string> = {
  anthropic:  'Claude',
  openai:     'OpenAI',
  google:     'Gemini',
  openrouter: 'OpenRouter',
  ollama:     'Ollama',
};

// ─────────────────────────────────────────────────────────────────────────────
// § STATUS BAR — Clinical Lab Telemetry Taskbar
// ─────────────────────────────────────────────────────────────────────────────

function StatusBar() {
  const { telemetry, workspace, license, llmRouter, docMetrics, setTelemetry, setShowSettings } = useReciteStore();

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
  const lic = license.status;

  const statusLabel =
    wsStatus === 'NO_WORKSPACE_MOUNTED'
      ? 'Engine: Standby'
      : wsStatus === 'PREFLIGHT_RUNNING'
      ? 'Auditing Manuscript...'
      : wsStatus === 'PREFLIGHT_COMPLETE'
      ? 'Audit Complete'
      : wsStatus === 'AST_PARSING'
      ? 'Parsing AST...'
      : 'Engine: Ready';

  const licColor =
    lic === 'ACTIVE'
      ? 'text-emerald-600 dark:text-emerald-400 hover:underline'
      : lic === 'UNVERIFIED'
      ? 'text-amber-600 dark:text-amber-400 hover:underline'
      : 'text-rose-600 dark:text-rose-400 hover:underline';

  return (
    <footer
      style={{ height: STATUS_BAR_H }}
      className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between px-3 flex-shrink-0 select-none z-40 text-[11px] font-sans text-zinc-500 dark:text-zinc-400 transition-colors"
    >
      {/* LEFT: Connection & System Diagnostics */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              isOnline
                ? 'bg-emerald-500'
                : 'bg-rose-500'
            )}
          />
          <span className={isOnline ? 'text-zinc-700 dark:text-zinc-300' : 'text-rose-600 dark:text-rose-400'}>
            {isOnline ? 'Online' : 'Air-Gapped'}
          </span>
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <Network size={11} className="text-zinc-400" />
          Latency: {latency !== null ? `${latency}ms` : '--'}
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <FileText size={11} className="text-zinc-400" />
          <span>Doc:</span>
          <span className="text-zinc-800 dark:text-zinc-200">
            {docMetrics && docMetrics.wordCount > 0
              ? `${docMetrics.wordCount.toLocaleString()} words · ~${docMetrics.tokenCount.toLocaleString()} tokens`
              : '-- words · -- tokens'}
          </span>
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <MemoryStick size={11} className="text-zinc-400" />
          Memory: {mem !== null ? `${mem} MB` : '--'}
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
          <Terminal size={11} className="text-zinc-400" />
          {statusLabel}
        </span>
      </div>

      {/* RIGHT: Storage, LLM Model & License */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <Database size={11} className="text-zinc-400" />
          Storage: <strong className="font-medium text-zinc-700 dark:text-zinc-300">IndexedDB</strong>
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <Cpu size={11} className="text-zinc-400" />
          Model: <strong className="font-medium text-zinc-800 dark:text-zinc-200">{LLM_LABELS[llmRouter.activeProvider]}</strong>
        </span>

        <span className="text-zinc-300 dark:text-zinc-800">│</span>

        <button
          onClick={() => setShowSettings(true)}
          className={cn('flex items-center gap-1 font-medium cursor-pointer', licColor)}
          title="View License Details"
        >
          <Shield size={11} />
          License: {lic === 'ACTIVE' ? 'Active' : lic === 'UNVERIFIED' ? 'Unverified' : 'Required'}
        </button>
      </div>
    </footer>
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
    <div className="h-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden bg-zinc-50/40 dark:bg-zinc-950 font-sans">
      <div className="relative z-10 max-w-md w-full text-center space-y-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs text-zinc-500">
          <FileCode2 size={24} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No document loaded
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Open a LaTeX (.tex), Microsoft Word (.docx), or text manuscript to analyze citation coverage and verify claims.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 text-xs">
          <button
            onClick={onMountClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded font-medium transition-colors shadow-xs cursor-pointer"
          >
            <FolderOpen size={14} />
            <span>Open Document...</span>
          </button>

          <button
            onClick={onLoadDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded font-medium transition-colors cursor-pointer"
          >
            <Sparkles size={14} className="text-amber-500" />
            <span>Sample Manuscript</span>
          </button>
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
          <span>Client-side Processing</span>
          <span>·</span>
          <span>Local KaTeX Rendering</span>
          <span>·</span>
          <span>Air-Gapped Safe</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § DRAG ENGINE — Custom PointerEvent Splitter
// ─────────────────────────────────────────────────────────────────────────────

function usePointerDrag(
  currentPct: number,
  onPctChange: (pct: number) => void,
  min: number,
  max: number
) {
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
      if (rawPct >= min && rawPct <= max) {
        onPctChange(Math.round(rawPct * 10) / 10);
      }
    },
    [dragging, min, max, onPctChange]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragging(false);
  }, []);

  return { pct: currentPct, dragging, containerRef, onPointerDown, onPointerMove, onPointerUp };
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
    editorPaneWidth,
    setEditorPaneWidth,
    mountWorkspace,
    mountBibTex,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    setWorkspaceStatus,
    isVaultUnlocked,
    checkLicenseHeartbeat,
  } = useReciteStore();

  useEffect(() => {
    checkLicenseHeartbeat();
  }, [checkLicenseHeartbeat]);

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { pct, dragging, containerRef, onPointerDown, onPointerMove, onPointerUp } =
    usePointerDrag(editorPaneWidth || 50, setEditorPaneWidth, 25, 75);

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
    mountBibTex('quantum_references.bib', DEMO_BIBTEX);
    setWorkspaceStatus('MOUNTED');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 overflow-hidden font-sans select-none antialiased transition-colors">
      {/* Vault Unlock Gate — displayed until Stronghold is unlocked */}
      {!isVaultUnlocked && <VaultUnlockModal />}

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

      {/* 2. Main Workspace Layout — Zero-Margin Full-Bleed Docking Grid */}
      <div className="flex flex-1 overflow-hidden relative min-h-0 bg-zinc-50 dark:bg-zinc-950">
        {/* Activity Rail + Collapsible Explorer (Docked Left) */}
        <Sidebar />

        {/* Center & Right Docked Work Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Full-Bleed Action Toolbar with Integrity HUD (h-10) */}
          <Toolbar />

          {/* Docked Split Panes Container (Zero Margin, Hairline Border Dividers) */}
          <div
            ref={containerRef}
            className={cn(
              'flex-1 flex overflow-hidden relative min-h-0',
              dragging && 'select-none'
            )}
          >
            {/* Center Pane: Manuscript Viewer */}
            <section
              style={{ width: `${pct}%` }}
              className="relative flex flex-col overflow-hidden bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-colors"
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
                  <div className="flex items-center gap-2.5 font-mono text-xs text-emerald-700 dark:text-emerald-400 font-bold tracking-wide animate-pulse mb-3">
                    <Activity size={16} className="animate-spin" />
                    <span>AUDITING CITATIONS & CLAIMS...</span>
                  </div>
                  <div className="w-56 h-1 bg-zinc-200 dark:bg-zinc-900 overflow-hidden border border-zinc-300 dark:border-zinc-800">
                    <div className="h-full bg-emerald-500 animate-[scan_1.2s_ease-in-out_infinite]" style={{ width: '45%' }} />
                  </div>
                </div>
              )}
            </section>

            {/* Hairline Pointer Gutter Splitter */}
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={cn(
                'w-1 -ml-[2px] flex-shrink-0 cursor-col-resize z-30 transition-all flex items-center justify-center group relative',
                dragging
                  ? 'bg-emerald-500 shadow-sm'
                  : 'bg-transparent hover:bg-emerald-500/50'
              )}
            >
              <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            </div>

            {/* Right Pane: Action Inspector */}
            <section
              className={cn(
                'flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 min-w-[320px] transition-colors',
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
      <KeyboardShortcuts />
      <CommandPalette />
      <SettingsWindow />
      <LegalWindow />
      <ConfirmModal />
      <ToastContainer />
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
