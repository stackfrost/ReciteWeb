'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen,
  Play,
  RotateCcw,
  Copy,
  Check,
  Download,
  Shield,
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  FileCheck2,
  BookX,
  ChevronDown,
  FileCode2,
  FileText,
  Sliders,
  X,
  Sidebar as SidebarIcon,
  Search,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore, computeIssueStatistics } from '@/lib/store';
import { useAuditStore } from '@/store/useAuditStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { LaTeXParser } from '@/services/latex-parser';
import { BibTeXParser } from '@/services/bibtex-parser';
import { FileSystemService } from '@/services/file-system';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS, DEMO_BIBTEX } from '@/lib/demo-data';

export type LayoutPreset = 'reader' | 'balanced' | 'audit';

interface WorkbenchHeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  layoutPreset?: LayoutPreset;
  onSetLayoutPreset?: (preset: LayoutPreset) => void;
  onResetLayout?: () => void;
  isInspectorOpen?: boolean;
  onToggleInspector?: () => void;
}

export default function WorkbenchHeader({
  onToggleSidebar,
  isSidebarOpen,
  layoutPreset = 'balanced',
  onSetLayoutPreset,
  onResetLayout,
  isInspectorOpen = true,
  onToggleInspector,
}: WorkbenchHeaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [overleafCopied, setOverleafCopied] = useState(false);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  const {
    workspace,
    isAuditing,
    auditProgress,
    claims,
    rawText,
    parsedText,
    bibtexContent,
    license,
    setShowSettings,
    setShowExportModal,
    runAudit,
    setWorkspaceStatus,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    mountWorkspace,
    unmountWorkspace,
    mountBibTex,
    addToast,
    toggleSidebar,
    sidebarOpen,
  } = useReciteStore();

  const { findings, runAudit: runAuditStore } = useAuditStore();
  const { activeTexContent } = useWorkspaceStore();

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';

  // Close menu on click outside
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // ── 1. Calculate Consolidated Submission Health Metrics ───────────────────
  const healthMetrics = useMemo(() => {
    const stats = computeIssueStatistics(claims || []);
    
    // Check findings store or claims store
    const retractionCount = Math.max(
      stats.retractedCount,
      findings.filter((f) => f.type?.toLowerCase().includes('retract')).length
    );
    const brokenDoiCount = findings.filter((f) => f.type?.toLowerCase().includes('doi')).length;
    const missingCiteCount = Math.max(
      stats.discoveryCount,
      findings.filter((f) => f.type?.toLowerCase().includes('missing')).length
    );
    const missingBaselineCount = findings.filter((f) => f.type?.toLowerCase().includes('baseline')).length;

    let score = 100;
    score -= retractionCount * 25;
    score -= brokenDoiCount * 15;
    score -= missingCiteCount * 5;
    score -= missingBaselineCount * 8;

    if (!isMounted && claims.length === 0) {
      return { score: 100, retractions: 0, brokenDois: 0, missingCites: 0, missingBaselines: 0, isStandby: true };
    }

    const finalScore = Math.max(0, Math.min(100, score));
    return {
      score: finalScore,
      retractions: retractionCount,
      brokenDois: brokenDoiCount,
      missingCites: missingCiteCount,
      missingBaselines: missingBaselineCount,
      isStandby: false,
    };
  }, [claims, findings, isMounted]);

  // ── 2. Bound Citations Calculation ─────────────────────────────────────────
  const citationStats = useMemo(() => {
    const text = rawText || parsedText || '';
    if (!text) return { boundCount: 0, totalCount: 0 };
    const citeKeys = LaTeXParser.findCitations(text);
    const bibMap = BibTeXParser.parse(bibtexContent || '');
    const bound = citeKeys.filter((k) => bibMap.has(k)).length;
    return { boundCount: bound, totalCount: citeKeys.length };
  }, [rawText, parsedText, bibtexContent]);

  // ── 3. Overleaf Fast-Sync Handler ──────────────────────────────────────────
  const handleCopyForOverleaf = () => {
    const text = rawText || parsedText || activeTexContent || '';
    if (!text) {
      addToast('No manuscript loaded to copy.', 'warning');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setOverleafCopied(true);
        addToast('Patched LaTeX copied! Paste directly into your Overleaf main.tex.', 'success');
        setTimeout(() => setOverleafCopied(false), 2000);
      })
      .catch(() => {
        addToast('Failed to copy to clipboard.', 'error');
      });
  };

  // ── 4. File Processing Handlers ────────────────────────────────────────────
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
    setWorkspaceStatus('AST_PARSER_IDLE');
    setFileMenuOpen(false);
    e.target.value = '';
  };

  const handleLoadDemo = () => {
    setFileMenuOpen(false);
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
    addToast('Loaded Quantum Spin Dynamics sample manuscript.', 'info');
  };

  const isHealthy = healthMetrics.score >= 85;
  const isWarning = healthMetrics.score >= 60 && healthMetrics.score < 85;
  const scoreColor = isHealthy ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400';
  const scoreBadgeBg = isHealthy ? 'bg-emerald-950/40 border-emerald-500/30' : isWarning ? 'bg-amber-950/40 border-amber-500/30' : 'bg-rose-950/40 border-rose-500/30';

  return (
    <header className="h-11 w-full bg-zinc-950 border-b border-zinc-800/80 px-3 flex items-center justify-between select-none shrink-0 font-sans z-30 text-xs relative">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".tex,.latex,.docx,.txt,.md"
        onChange={handleFileSelect}
      />

      {/* ── LEFT: Brand, Sidebar Toggle, File Switcher ────────────────────────── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Toggle Project Drawer */}
        <button
          onClick={onToggleSidebar || toggleSidebar}
          className={cn(
            'p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer',
            (isSidebarOpen ?? sidebarOpen) && 'bg-zinc-900 text-zinc-200 border-zinc-800'
          )}
          title="Toggle Project Drawer (Ctrl+B)"
        >
          <SidebarIcon size={15} />
        </button>

        {/* Brand Link */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-zinc-900 transition-colors group cursor-pointer"
          title="Back to Overview"
        >
          <span className="font-bold text-xs tracking-tight text-white flex items-center gap-0.5">
            Recite<span className="text-emerald-400 font-semibold">Web</span>
          </span>
        </Link>

        <span className="text-zinc-700">/</span>

        {/* Document Dropdown Pill */}
        <div className="relative" ref={menuDropdownRef}>
          <button
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-medium border transition-all cursor-pointer select-none max-w-[200px] truncate',
              isMounted
                ? 'bg-zinc-900/90 border-zinc-800 text-zinc-200 hover:border-zinc-700 shadow-xs'
                : 'bg-zinc-900/40 border-dashed border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            )}
            title={isMounted ? `${workspace.fileName} (Click for file actions)` : 'Click to mount manuscript'}
          >
            <FolderOpen size={13} className="text-emerald-400 shrink-0" />
            <span className="truncate">{workspace.fileName || 'No File Mounted'}</span>
            <ChevronDown size={12} className="text-zinc-500 shrink-0 ml-0.5" />
          </button>

          {/* File Actions Dropdown */}
          {fileMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-lg p-1.5 z-50 font-sans text-xs animate-in fade-in zoom-in-95 duration-100 space-y-0.5">
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <FolderOpen size={14} className="text-emerald-400" />
                <span>Open Manuscript (.tex, .pdf)...</span>
                <kbd className="ml-auto text-[10px] font-mono text-zinc-500">Ctrl+O</kbd>
              </button>

              <button
                onClick={async () => {
                  setFileMenuOpen(false);
                  try {
                    const { text, fileName } = await FileSystemService.mountBibFile();
                    mountBibTex(fileName, text);
                    addToast(`Attached BibTeX: ${fileName}`, 'success');
                  } catch (e: any) {
                    if (e.message !== 'USER_ABORTED') addToast('Failed to attach .bib', 'error');
                  }
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <FileCode2 size={14} className="text-sky-400" />
                <span>Attach .bib Database...</span>
              </button>

              <button
                onClick={handleLoadDemo}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Load Sample Manuscript</span>
              </button>

              <div className="border-t border-zinc-800 my-1" />
              <button
                onClick={() => {
                  setFileMenuOpen(false);
                  onResetLayout?.();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <Sliders size={14} className="text-zinc-400" />
                <span>Reset Panel Layout (50/50)</span>
              </button>

              {isMounted && (
                <>
                  <button
                    onClick={() => {
                      setFileMenuOpen(false);
                      unmountWorkspace();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                    <span>Close Document</span>
                    <kbd className="ml-auto text-[10px] font-mono text-zinc-500">Ctrl+W</kbd>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CENTER: Embedded Submission Health Scorecard ─────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {healthMetrics.isStandby ? (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-500">
            <span>Standby · Open manuscript to assess desk-reject risk</span>
          </div>
        ) : (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${scoreBadgeBg} transition-all`}>
            {/* Score Ring / Pill */}
            <div className="flex items-center gap-1.5">
              <span className={`font-mono font-bold text-xs ${scoreColor}`}>
                {healthMetrics.score}%
              </span>
              <span className="text-[10px] font-medium text-zinc-300">
                {isHealthy ? 'Submission Ready' : isWarning ? 'Pre-Flight Warnings' : 'Desk-Reject Risks'}
              </span>
            </div>

            <span className="text-zinc-700">│</span>

            {/* Quick Flag Badges */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {healthMetrics.retractions > 0 && (
                <span className="flex items-center gap-1 text-rose-400 font-semibold animate-pulse">
                  <AlertOctagon size={11} />
                  <span>{healthMetrics.retractions} Retracted</span>
                </span>
              )}
              {healthMetrics.brokenDois > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <AlertTriangle size={11} />
                  <span>{healthMetrics.brokenDois} Dead DOI</span>
                </span>
              )}
              {healthMetrics.missingCites > 0 && (
                <span className="flex items-center gap-1 text-sky-400 font-medium hidden md:inline-flex">
                  <span>{healthMetrics.missingCites} Attribution Gap</span>
                </span>
              )}
              {healthMetrics.retractions === 0 && healthMetrics.brokenDois === 0 && healthMetrics.missingCites === 0 && (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <FileCheck2 size={11} />
                  <span>Citations Clean</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Audit Action, Overleaf Fast-Sync, Pro Badge ────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Run Audit Primary Button */}
        <button
          onClick={() => runAudit(false)}
          disabled={!isMounted || isAuditing}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer active:scale-[0.98] shadow-xs',
            !isMounted
              ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
              : isAuditing
              ? 'bg-amber-950/70 text-amber-300 border border-amber-500/50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
          )}
          title={isMounted ? 'Run Pre-Flight Peer-Review Audit (Ctrl+Enter)' : 'Open a manuscript first'}
        >
          {isAuditing ? (
            <>
              <RotateCcw size={12} className="animate-spin text-amber-400" />
              <span>Auditing...</span>
            </>
          ) : (
            <>
              <Play size={11} fill="currentColor" />
              <span>Run Audit</span>
              <kbd className="hidden xl:inline text-[9px] font-mono bg-black/25 px-1 py-0.2 rounded text-white/90 ml-0.5">
                Ctrl+↵
              </kbd>
            </>
          )}
        </button>

        {/* 1-Click Copy for Overleaf */}
        <button
          onClick={handleCopyForOverleaf}
          disabled={!isMounted}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer active:scale-[0.98]',
            !isMounted
              ? 'opacity-40 border-zinc-800 text-zinc-600 cursor-not-allowed'
              : overleafCopied
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:border-zinc-700'
          )}
          title="Copy patched LaTeX directly to clipboard for Overleaf main.tex"
        >
          {overleafCopied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} className="text-zinc-400" />
              <span className="hidden sm:inline">Copy for Overleaf</span>
              <span className="sm:hidden">Overleaf</span>
            </>
          )}
        </button>

        {/* Layout Presets Control (Reader 70/30, Balanced 50/50, Audit 35/65) */}
        <div className="hidden lg:flex items-center rounded-md border border-zinc-800 bg-zinc-900/60 p-0.5 gap-0.5 text-[11px] font-sans font-medium select-none">
          <button
            onClick={() => onSetLayoutPreset?.('reader')}
            className={cn(
              'px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1',
              layoutPreset === 'reader'
                ? 'bg-zinc-800 text-zinc-100 font-bold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Reader Mode (70% Editor / 30% Inspector)"
          >
            <span>◨</span>
            <span>Reader</span>
          </button>

          <button
            onClick={() => onSetLayoutPreset?.('balanced')}
            className={cn(
              'px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1',
              layoutPreset === 'balanced'
                ? 'bg-zinc-800 text-zinc-100 font-bold shadow-xs'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Balanced Layout (50% Editor / 50% Inspector)"
          >
            <span>◫</span>
            <span>Balanced</span>
          </button>

          <button
            onClick={() => onSetLayoutPreset?.('audit')}
            className={cn(
              'px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1',
              layoutPreset === 'audit'
                ? 'bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
            title="Audit Focus (35% Editor / 65% Inspector)"
          >
            <span>◧</span>
            <span>Audit</span>
          </button>
        </div>

        {/* Toggle Right Inspector */}
        <button
          onClick={onToggleInspector}
          className={cn(
            'p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer',
            isInspectorOpen && 'text-emerald-400 bg-zinc-900 border-zinc-800'
          )}
          title="Toggle Action Inspector (Ctrl+\)"
        >
          <Sliders size={14} />
        </button>

        {/* Export Modal Trigger */}
        <button
          onClick={() => setShowExportModal(true)}
          disabled={!isMounted}
          className={cn(
            'p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer',
            !isMounted && 'opacity-40 cursor-not-allowed'
          )}
          title="Export publication package & reports (Ctrl+E)"
        >
          <Download size={14} />
        </button>

        <span className="text-zinc-800 hidden sm:inline">|</span>

        {/* License Pill */}
        <button
          onClick={() => setShowSettings(true)}
          className={cn(
            'hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer',
            license.status === 'ACTIVE'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          )}
          title="Account Subscription & Cryptographic License"
        >
          {license.status === 'ACTIVE' ? (
            <>
              <Shield size={11} className="text-emerald-400" />
              <span>Pro</span>
            </>
          ) : (
            <>
              <Sparkles size={11} className="text-amber-400" />
              <span>Free</span>
            </>
          )}
        </button>
      </div>

      {/* ── Ambient Scan Beam during audit execution ───────────────────────── */}
      {isAuditing && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800 overflow-hidden">
          <div className="h-full bg-emerald-500 animate-[scan_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
      )}
    </header>
  );
}
