'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import {
  FolderOpen,
  Sparkles,
  FileCode2,
  FileText,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore } from '@/lib/store';
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
import { StatusBar } from '@/components/layout/StatusBar';

// ─────────────────────────────────────────────────────────────────────────────
// § RESIZE HANDLE — Sleek 4px splitter with centered grab pill
// ─────────────────────────────────────────────────────────────────────────────

function ResizeHandle() {
  return (
    <PanelResizeHandle
      className="w-1 cursor-col-resize bg-zinc-800 hover:bg-emerald-500/80 active:bg-emerald-500 transition-colors shrink-0 flex items-center justify-center group"
    >
      <div className="h-6 w-0.5 rounded-full bg-zinc-600 group-hover:bg-white transition-colors" />
    </PanelResizeHandle>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § EDITOR EMPTY STATE — VS Code Style Muted Workspace Standby
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
            No Workspace Open
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Open a LaTeX manuscript folder or document to analyze citation coverage, evaluate semantic entailment, and verify claims.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 text-xs">
          <button
            onClick={() => {
              const { useWorkspaceStore } = require('@/store/useWorkspaceStore');
              useWorkspaceStore.getState().mountLocalProject();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors shadow-sm cursor-pointer"
          >
            <FolderOpen size={14} />
            <span>Open Project Folder...</span>
          </button>

          <button
            onClick={onMountClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded font-medium transition-colors cursor-pointer"
          >
            <FileText size={14} />
            <span>Open File...</span>
          </button>

          <button
            onClick={onLoadDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs transition-colors cursor-pointer"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>Sample Demo</span>
          </button>
        </div>

        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-3 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
          <span>Ctrl+O Open</span>
          <span>·</span>
          <span>Ctrl+Shift+O Project</span>
          <span>·</span>
          <span>Ctrl+↵ Audit</span>
        </div>
      </div>
    </div>
  );
}

// usePointerDrag removed — replaced by react-resizable-panels Group/Panel/Separator

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

  // SSR hydration guard — PanelGroup calculates layout dimensions that can mismatch during SSR
  const [panelsMounted, setPanelsMounted] = useState(false);
  useEffect(() => setPanelsMounted(true), []);

  useEffect(() => {
    checkLicenseHeartbeat();
    // Auto-restore last workspace session on boot
    try {
      const { useWorkspaceStore } = require('@/store/useWorkspaceStore');
      useWorkspaceStore.getState().autoRestoreSession();
    } catch (e) {
      console.warn('[IDEWorkbench] Failed to auto-restore session:', e);
    }
  }, [checkLicenseHeartbeat]);

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans select-none antialiased transition-colors">
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
      <div className="flex flex-1 overflow-hidden relative min-h-0 bg-zinc-950">
        {/* Activity Rail + Collapsible Explorer (Docked Left) */}
        <Sidebar />

        {/* Center & Right Docked Work Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Full-Bleed Action Toolbar */}
          <Toolbar />

          {/* Resizable Split Panes via react-resizable-panels */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            {panelsMounted ? (
              <PanelGroup orientation="horizontal" id="citeassist-main-layout">
                {/* Center Pane: Manuscript Viewer */}
                <Panel id="editor-pane" defaultSize="55%" minSize="30%">
                  <section className="relative flex flex-col overflow-hidden bg-zinc-950 h-full min-w-0">
                    <div className="flex-1 overflow-hidden relative flex flex-col min-w-0">
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
                      <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center z-40">
                        <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 font-bold tracking-wide mb-2">
                          <Activity size={14} className="animate-spin" />
                          <span>AUDITING CITATIONS & CLAIMS...</span>
                        </div>
                        <div className="w-48 h-0.5 bg-zinc-800 overflow-hidden">
                          <div className="h-full bg-emerald-500 animate-[scan_1.2s_ease-in-out_infinite]" style={{ width: '45%' }} />
                        </div>
                      </div>
                    )}
                  </section>
                </Panel>

                <ResizeHandle />

                {/* Right Pane: Action Inspector */}
                <Panel id="inspector-pane" defaultSize="45%" minSize="25%" maxSize="55%">
                  <section className="flex flex-col overflow-hidden bg-zinc-950 h-full min-w-0">
                    <ActionInspector />
                  </section>
                </Panel>
              </PanelGroup>
            ) : (
              /* Static fallback during SSR to prevent hydration mismatch */
              <div className="flex h-full bg-zinc-950" />
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
