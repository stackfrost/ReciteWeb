'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ResizableSplitView from '@/components/layout/ResizableSplitView';
import {
  FolderOpen,
  Sparkles,
  FileCode2,
  FileText,
  Activity,
  Upload,
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { wasmParser } from '@/lib/wasm-loader';
import type { Claim } from '@/lib/store';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS, DEMO_BIBTEX } from '@/lib/demo-data';
import { ThemeProvider } from '@/components/ThemeProvider';
import WorkbenchHeader, { LayoutPreset } from '@/components/workbench/WorkbenchHeader';
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
import PaywallModal from '@/components/modals/PaywallModal';
import WorkbenchErrorBoundary from '@/components/workbench/WorkbenchErrorBoundary';

// ─────────────────────────────────────────────────────────────────────────────
// § ACADEMIC PRE-FLIGHT EMPTY STATE — Drag & Drop Dropzone
// ─────────────────────────────────────────────────────────────────────────────

function AcademicPreFlightEmptyState({
  onMountClick,
  onLoadDemo,
  onLoadSample,
}: {
  onMountClick: () => void;
  onLoadDemo: () => void;
  onLoadSample?: (samplePath: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      className={cn(
        'h-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden bg-zinc-950 font-sans transition-colors',
        isDragOver && 'bg-emerald-950/20 border-2 border-dashed border-emerald-500/60'
      )}
    >
      {/* Subtle radial glow background */}
      <div className="absolute w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none -top-12" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-5">
        {/* Top Capability Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-sans text-emerald-400 font-semibold shadow-xs">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>Peer-Review Pre-Flight Defense</span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            Drop Your Manuscript to Begin Audit
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
            Scan your LaTeX or PDF submission against RetractionWatch, CrossRef, and OpenAlex. Eliminate dead DOIs, hallucinated citations, and missing venue baselines before peer review.
          </p>
        </div>

        {/* Action Button Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 text-xs">
          <button
            onClick={onMountClick}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer active:scale-[0.98]"
          >
            <Upload size={14} />
            <span>Select Manuscript (.tex / .pdf)</span>
          </button>

          <button
            onClick={() => {
              const { useWorkspaceStore } = require('@/store/useWorkspaceStore');
              useWorkspaceStore.getState().mountLocalProject();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg font-medium transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <FolderOpen size={14} className="text-zinc-400" />
            <span>Open Folder...</span>
          </button>

          <button
            onClick={() => onLoadSample ? onLoadSample('/samples/ieee-two-column-sample.tex') : onLoadDemo()}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-[0.98]"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>Load IEEE Sample</span>
          </button>
        </div>

        {/* Supported Formats & Privacy Assurance */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-zinc-500 font-sans">
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">.tex</span>
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">.bib</span>
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">.pdf</span>
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">.docx</span>
          <span>·</span>
          <span className="text-emerald-400/80 flex items-center gap-1 font-sans font-medium text-[11px]">
            <CheckCircle2 size={11} /> 100% Client-Side ZDR Privacy
          </span>
        </div>

        {/* Shortcut Legend */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-center gap-3 text-[10px] font-mono text-zinc-500">
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px]">Ctrl+O</kbd> Open File</span>
          <span>·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px]">Ctrl+B</kbd> Project Drawer</span>
          <span>·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px]">Ctrl+↵</kbd> Run Pre-Flight</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § WORKBENCH PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkbenchPage() {
  const router = useRouter();
  const {
    workspace,
    sidebarOpen,
    toggleSidebar,
    isAuditing,
    showExportModal,
    setShowExportModal,
    showPaywallModal,
    setShowPaywall,
    paywallReason,
    mountWorkspace,
    mountBibTex,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    setWorkspaceStatus,
    checkLicenseHeartbeat,
    setLicenseStatus,
    updateLicense,
    addToast,
  } = useReciteStore();

  // SSR hydration guard
  const [panelsMounted, setPanelsMounted] = useState(false);
  useEffect(() => setPanelsMounted(true), []);

  // ── Layout Presets & Smooth Resizable Split Control ──
  const [splitPercentage, setSplitPercentage] = useState(50);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>('balanced');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Restore saved split preference on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('reciteweb-workbench-split') || localStorage.getItem('citeassist-workbench-split');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 20 && val <= 80) {
          setSplitPercentage(val);
          if (val >= 65) setLayoutPreset('reader');
          else if (val <= 40) setLayoutPreset('audit');
          else setLayoutPreset('balanced');
        }
      }
    } catch {}
  }, []);

  const handleSplitChange = (newPercent: number) => {
    setSplitPercentage(newPercent);
    if (newPercent >= 65) setLayoutPreset('reader');
    else if (newPercent <= 40) setLayoutPreset('audit');
    else setLayoutPreset('balanced');
    try {
      localStorage.setItem('reciteweb-workbench-split', String(newPercent));
    } catch {}
  };

  const handleSetLayoutPreset = (preset: LayoutPreset) => {
    setLayoutPreset(preset);
    setIsInspectorOpen(true);
    let target = 50;
    if (preset === 'reader') target = 70;
    else if (preset === 'balanced') target = 50;
    else if (preset === 'audit') target = 35;
    setSplitPercentage(target);
    try {
      localStorage.setItem('reciteweb-workbench-split', String(target));
    } catch {}
  };

  const handleResetLayout = () => {
    setLayoutPreset('balanced');
    setIsInspectorOpen(true);
    setSplitPercentage(50);
    try {
      localStorage.setItem('reciteweb-workbench-split', '50');
    } catch {}
    addToast('Layout reset to balanced (50/50).', 'info');
  };

  const handleToggleInspector = () => {
    setIsInspectorOpen((prev) => !prev);
  };

  // Global hotkeys for layout: Ctrl+\ toggles Action Inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        handleToggleInspector();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInspectorOpen, layoutPreset]);

  useEffect(() => {
    checkLicenseHeartbeat();

    // Auto-claim session token if returning from Dodo Payments checkout redirect
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const paymentId = searchParams.get('payment_id');
        const paymentSuccess =
          searchParams.get('payment_success') === '1' ||
          searchParams.get('payment_status') === 'success';

        if (paymentId || paymentSuccess) {
          const claimParam = paymentId
            ? `payment_id=${encodeURIComponent(paymentId)}`
            : 'payment_id=dev_session';
          fetch(`/api/payments/claim-session?${claimParam}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.token) {
                localStorage.setItem('citeassist_pro_token', data.token);
                localStorage.setItem('citeassist_pro_tier', data.tier || 'researcher_pro');
                setLicenseStatus('ACTIVE');
                updateLicense({
                  key: data.token,
                  status: 'ACTIVE',
                  lastChecked: Date.now(),
                });
                addToast('Researcher Pro License Activated · Unlimited Audits Unlocked', 'success');
              }
            })
            .catch((err) => {
              console.warn('[WorkbenchPage] Failed to claim payment session token:', err);
            })
            .finally(() => {
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch {}
            });
        }
      } catch (err) {
        console.warn('[WorkbenchPage] URL parsing error:', err);
      }
    }

    // Auto-restore last workspace session on boot
    try {
      const { useWorkspaceStore } = require('@/store/useWorkspaceStore');
      useWorkspaceStore.getState().autoRestoreSession();
    } catch (e) {
      console.warn('[IDEWorkbench] Failed to auto-restore session:', e);
    }
  }, [checkLicenseHeartbeat, setLicenseStatus, updateLicense, addToast]);

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processDocumentFile = async (file: File) => {
    setWorkspaceStatus('MOUNTING');
    if (file.size > 25 * 1024 * 1024) {
      addToast(
        `Large Manuscript Detected: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Processing with background parser...`,
        'info'
      );
    }
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('utf-8').decode(buffer);
    const { text: parsed, mathBlocks } = parseMathBlocks(text);

    setRawText(text);
    setParsedText(parsed);
    setMathBlocks(mathBlocks);
    setDocumentTitle(file.name);
    setFileFormat(file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.txt') ? 'txt' : 'tex');
    mountWorkspace(file.name, file.size);
    setWorkspaceStatus('AST_PARSER_IDLE');

    try {
      const activeTier =
        typeof window !== 'undefined' ? localStorage.getItem('citeassist_pro_tier') || 'FREE' : 'FREE';
      const parsedWasm = await wasmParser.parseDocument({
        content: buffer,
        format: file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.typ') ? 'typst' : 'latex',
        licenseStatus: activeTier,
        filename: file.name,
      });

      if (parsedWasm.success && parsedWasm.claims.length > 0) {
        const mappedClaims: Claim[] = parsedWasm.claims.map((c, i) => ({
          id: c.id,
          text: c.claimSentence,
          category: 'Literature Claim',
          severity: i % 3 === 0 ? 'Critical' : i % 2 === 0 ? 'High' : 'Medium',
          status: 'pending',
          lineIndex: c.line,
          startIndex: c.column,
          endIndex: c.column + c.claimSentence.length,
          context: c.context,
          citationKey: c.citationKey,
          auditType: 'Needs Literature',
        }));
        setClaims(mappedClaims);
      }
    } catch (err) {
      console.warn('[WASM Parser] Fallback AST parsing active:', err);
    }
  };

  const handleDirectFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processDocumentFile(file);
    e.target.value = '';
  };

  const handleLoadSample = async (samplePath = '/samples/ieee-two-column-sample.tex') => {
    try {
      setWorkspaceStatus('MOUNTING');
      const res = await fetch(samplePath);
      const text = await res.text();
      const { text: parsed, mathBlocks } = parseMathBlocks(text);

      const fileName = samplePath.split('/').pop() || 'ieee-two-column-sample.tex';
      setRawText(text);
      setParsedText(parsed);
      setMathBlocks(mathBlocks);
      setDocumentTitle(fileName);
      setFileFormat('tex');
      mountWorkspace(fileName, text.length);
      mountBibTex('quantum_references.bib', DEMO_BIBTEX);
      setWorkspaceStatus('AST_PARSER_IDLE');

      const activeTier =
        typeof window !== 'undefined' ? localStorage.getItem('citeassist_pro_tier') || 'FREE' : 'FREE';
      const parsedWasm = await wasmParser.parseDocument({
        content: text,
        format: 'latex',
        licenseStatus: activeTier,
        filename: fileName,
      });

      if (parsedWasm.success && parsedWasm.claims.length > 0) {
        const mappedClaims: Claim[] = parsedWasm.claims.map((c, i) => ({
          id: c.id,
          text: c.claimSentence,
          category: 'Literature Claim',
          severity: i % 3 === 0 ? 'Critical' : i % 2 === 0 ? 'High' : 'Medium',
          status: 'pending',
          lineIndex: c.line,
          startIndex: c.column,
          endIndex: c.column + c.claimSentence.length,
          context: c.context,
          citationKey: c.citationKey,
          auditType: 'Needs Literature',
        }));
        setClaims(mappedClaims);
      }
    } catch (err) {
      console.warn('[Load Sample] Fallback to demo:', err);
      handleLoadDemo();
    }
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
    <ThemeProvider>
      <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans select-none antialiased transition-colors">
        {/* 1. Unified 44px Academic Workbench Header */}
        <WorkbenchHeader
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={sidebarOpen}
          layoutPreset={layoutPreset}
          onSetLayoutPreset={handleSetLayoutPreset}
          onResetLayout={handleResetLayout}
          isInspectorOpen={isInspectorOpen}
          onToggleInspector={handleToggleInspector}
        />

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".tex,.latex,.docx,.txt,.md"
          onChange={handleDirectFileSelect}
        />

        {/* 2. Main Workspace — Sidebar + Resizable Editor/Inspector */}
        <div className="flex-1 flex overflow-hidden relative min-h-0 bg-zinc-950">
          {/* Collapsible Project Drawer (outside PanelGroup — fixed width with CSS transition) */}
          <div
            className={cn(
              'h-full shrink-0 transition-all duration-200 ease-in-out overflow-hidden border-r border-zinc-800/80',
              sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 border-r-0'
            )}
          >
            <Sidebar />
          </div>

          {/* Center + Right: Resizable 2-Panel Split */}
          <main
            className="flex-1 flex flex-col min-w-0 overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) await processDocumentFile(file);
            }}
          >
            <div className="flex-1 overflow-hidden relative min-h-0">
              {panelsMounted ? (
                <ResizableSplitView
                  splitPercentage={splitPercentage}
                  onSplitChange={handleSplitChange}
                  isRightCollapsed={!isInspectorOpen}
                  onReset={handleResetLayout}
                  minLeftPercent={20}
                  maxLeftPercent={85}
                  left={
                    <WorkbenchErrorBoundary panelName="Manuscript Editor">
                      <section className="relative flex flex-col overflow-hidden bg-zinc-950 h-full min-w-0">
                        <div className="flex-1 overflow-hidden relative flex flex-col min-w-0">
                          {isMounted ? (
                            <ManuscriptViewer />
                          ) : (
                            <AcademicPreFlightEmptyState
                              onMountClick={() => fileInputRef.current?.click()}
                              onLoadDemo={handleLoadDemo}
                              onLoadSample={handleLoadSample}
                            />
                          )}
                        </div>
                      </section>
                    </WorkbenchErrorBoundary>
                  }
                  right={
                    <WorkbenchErrorBoundary panelName="Action Inspector">
                      <section className="flex flex-col overflow-hidden bg-zinc-950 h-full min-w-0">
                        <ActionInspector />
                      </section>
                    </WorkbenchErrorBoundary>
                  }
                />
              ) : (
                <div className="flex h-full bg-zinc-950" />
              )}
            </div>
          </main>
        </div>

        {/* Global Modals & Command Palette */}
        <KeyboardShortcuts />
        <CommandPalette />
        <SettingsWindow />
        <LegalWindow />
        <ConfirmModal />
        <ToastContainer />
        <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
        <PaywallModal
          isOpen={showPaywallModal}
          onClose={() => setShowPaywall(false)}
          triggerReason={paywallReason || undefined}
          onSuccess={(token, tier) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('citeassist_pro_token', token);
              localStorage.setItem('citeassist_pro_tier', tier);
            }
            setLicenseStatus('ACTIVE');
            updateLicense({ key: token, status: 'ACTIVE', lastChecked: Date.now() });
            setShowPaywall(false);
            addToast('Researcher Pro License Activated · Full Access Unlocked', 'success');
          }}
        />
      </div>
    </ThemeProvider>
  );
}
