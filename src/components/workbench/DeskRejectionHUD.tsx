'use client';

import React, { useState, useMemo } from 'react';
import { useAuditStore } from '@/store/useAuditStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useReciteStore, computeIssueStatistics } from '@/lib/store';
import {
  AlertOctagon,
  AlertTriangle,
  FileCheck2,
  Download,
  BookX,
  Check,
  Copy,
  FileCode,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeskRejectionHUDProps {
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
  defaultExpanded?: boolean;
}

export const DeskRejectionHUD: React.FC<DeskRejectionHUDProps> = ({
  className,
  variant = 'card',
  defaultExpanded = false,
}) => {
  const { findings } = useAuditStore();
  const { activeTexContent, activeTexPath } = useWorkspaceStore();
  const { workspace, rawText, bibtexContent, claims, addToast, setStreamFilter } = useReciteStore();
  const [overleafCopied, setOverleafCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const isDocumentLoaded =
    workspace.status !== 'NO_WORKSPACE_MOUNTED' &&
    (!!rawText || !!activeTexContent || claims.length > 0);

  // Synchronize counts across both claims and findings
  const stats = useMemo(() => computeIssueStatistics(claims || []), [claims]);

  const retractions = isDocumentLoaded
    ? Math.max(
        stats.retractedCount,
        findings.filter((f) => f.type?.toLowerCase().includes('retract')).length
      )
    : 0;
  const brokenDois = isDocumentLoaded ? findings.filter((f) => f.type?.toLowerCase().includes('doi')).length : 0;
  const missingBibs = isDocumentLoaded ? findings.filter((f) => f.type?.toLowerCase().includes('missing')).length : 0;
  const missingBaselines = isDocumentLoaded ? findings.filter((f) => f.type?.toLowerCase().includes('baseline')).length : 0;
  const mediumCount = isDocumentLoaded ? stats.mediumCount : 0;

  // Compute citation health score (0 to 100)
  let score = 100;
  if (isDocumentLoaded) {
    score -= retractions * 25;
    score -= brokenDois * 15;
    score -= missingBibs * 10;
    score -= missingBaselines * 8;
    score -= mediumCount * 3;
  }
  const riskScore = Math.max(0, Math.min(100, score));

  const isHealthy = riskScore >= 85;
  const isWarning = riskScore >= 60 && riskScore < 85;

  const scoreColor = isHealthy ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400';
  const scoreBorderColor = isHealthy ? 'border-emerald-500/30' : isWarning ? 'border-amber-500/30' : 'border-rose-500/30';
  const scoreBg = isHealthy ? 'bg-emerald-950/20' : isWarning ? 'bg-amber-950/20' : 'bg-rose-950/20';

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyForOverleaf = () => {
    const tex = rawText || activeTexContent || '';
    if (!tex) {
      addToast('No manuscript content to copy.', 'warning');
      return;
    }
    navigator.clipboard
      .writeText(tex)
      .then(() => {
        setOverleafCopied(true);
        addToast('Patched LaTeX copied! Paste directly into your Overleaf main.tex.', 'success');
        setTimeout(() => setOverleafCopied(false), 2000);
      })
      .catch(() => {
        addToast('Failed to copy to clipboard.', 'error');
      });
  };

  const handleDownloadCleanTex = () => {
    const tex = rawText || activeTexContent || '';
    downloadFile(activeTexPath?.split(/[/\\]/).pop() || 'manuscript_clean.tex', tex, 'text/x-tex;charset=utf-8');
    addToast('Downloaded patched LaTeX file.', 'info');
  };

  const handleDownloadCleanBib = () => {
    const bib = bibtexContent || '';
    downloadFile('references_clean.bib', bib, 'text/plain;charset=utf-8');
    addToast('Downloaded updated BibTeX file.', 'info');
  };

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'h-8 w-full bg-zinc-950 border-b border-zinc-800/80 px-3 flex items-center justify-between select-none shrink-0 font-sans z-30 text-xs',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${scoreBorderColor} ${scoreBg}`}>
            <span className={`text-[11px] font-mono font-bold ${scoreColor}`}>{riskScore}%</span>
            <span className="text-[10px] text-zinc-400 font-medium">
              {isHealthy ? 'Clean Citations' : isWarning ? 'Warnings' : 'Desk-Reject Risks'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            {retractions > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300">
                <AlertOctagon size={11} className="text-rose-400" />
                {retractions} Retracted
              </span>
            )}
            {brokenDois > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300">
                <AlertTriangle size={11} className="text-amber-400" />
                {brokenDois} Dead DOIs
              </span>
            )}
            {retractions === 0 && brokenDois === 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                <FileCheck2 size={11} className="text-emerald-400" />
                Peer-Review Defense Verified
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyForOverleaf}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-sans text-[11px] font-semibold transition-all cursor-pointer shadow-xs"
          >
            {overleafCopied ? (
              <>
                <Check size={11} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy for Overleaf</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Standby mode when no manuscript is loaded
  if (!isDocumentLoaded) {
    return (
      <div
        className={cn(
          'px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm select-none shrink-0 font-sans flex items-center justify-between',
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-5 h-5 rounded border border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-500 font-bold shrink-0">
            --
          </div>
          <span className="text-xs font-semibold text-zinc-300 truncate">Pre-Flight Audit Standby</span>
          <span className="text-[11px] text-zinc-500 hidden sm:inline font-sans truncate">· No manuscript mounted</span>
        </div>
        <span className="text-[11px] font-sans text-zinc-500 shrink-0">0 Citations Loaded</span>
      </div>
    );
  }

  // Variant = 'card' (Collapsible at top of ActionInspector)
  return (
    <div
      className={cn(
        'border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm select-none shrink-0 font-sans transition-all duration-200',
        isExpanded ? 'p-3 space-y-2.5' : 'px-2.5 py-1.5',
        className
      )}
    >
      {/* Top row / Compact view */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'flex items-center justify-center shrink-0 rounded border font-mono font-bold transition-all',
              isExpanded ? 'w-7 h-7 text-xs rounded-lg' : 'w-5 h-5 text-[10px] rounded',
              scoreBorderColor,
              scoreBg,
              scoreColor
            )}
          >
            {riskScore}%
          </div>

          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200 truncate">
              {isExpanded ? 'Peer-Review Submission Health' : 'Health Score'}
            </span>

            {/* Quick status pills visible in compact mode */}
            {!isExpanded && (
              <div className="flex items-center gap-1.5 font-mono text-[10px] truncate">
                {retractions > 0 ? (
                  <button
                    onClick={() => setStreamFilter('retracted')}
                    className="px-1.5 py-0.2 rounded bg-rose-950/60 text-rose-300 border border-rose-500/40 hover:bg-rose-900/60 transition-colors cursor-pointer"
                  >
                    {retractions} Retracted
                  </button>
                ) : (
                  <span className="text-emerald-400 text-[10px] font-mono hidden sm:inline">0 Retractions</span>
                )}

                {brokenDois > 0 && (
                  <button
                    onClick={() => setStreamFilter('integrity')}
                    className="px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60 transition-colors cursor-pointer"
                  >
                    {brokenDois} Dead DOIs
                  </button>
                )}

                {missingBibs > 0 && (
                  <button
                    onClick={() => setStreamFilter('discovery')}
                    className="px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors cursor-pointer hidden md:inline"
                  >
                    {missingBibs} Gaps
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Icons: Overleaf + Expand/Collapse Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleCopyForOverleaf}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[10px] font-sans font-medium transition-colors cursor-pointer"
            title="Copy patched LaTeX directly for Overleaf"
          >
            {overleafCopied ? (
              <>
                <Check size={11} className="text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} className="text-zinc-400" />
                <span>Overleaf</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse scorecard' : 'Expand full diagnostics'}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded diagnostic breakdown */}
      {isExpanded && (
        <div className="space-y-2 pt-1 border-t border-zinc-800/60 animate-in fade-in duration-150">
          <p className="text-[10px] text-zinc-400">
            {isHealthy
              ? 'All scanned citations empirically grounded & verified.'
              : `${retractions + brokenDois + missingBaselines} potential desk-rejection flag${retractions + brokenDois + missingBaselines === 1 ? '' : 's'} detected.`}
          </p>

          {/* Grid of 4 Diagnostic Vectors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
            {/* Retractions */}
            <button
              onClick={() => setStreamFilter('retracted')}
              className={cn(
                'p-1.5 rounded border text-left transition-colors cursor-pointer flex flex-col justify-between',
                retractions > 0
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 hover:bg-rose-950/60'
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
              )}
            >
              <span className="text-[9px] text-zinc-500 uppercase">Retractions</span>
              <span className={cn('font-bold', retractions > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                {retractions > 0 ? `${retractions} Detected` : '0 Clean'}
              </span>
            </button>

            {/* Dead DOIs */}
            <button
              onClick={() => setStreamFilter('integrity')}
              className={cn(
                'p-1.5 rounded border text-left transition-colors cursor-pointer flex flex-col justify-between',
                brokenDois > 0
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 hover:bg-amber-950/60'
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
              )}
            >
              <span className="text-[9px] text-zinc-500 uppercase">Dead DOIs</span>
              <span className={cn('font-bold', brokenDois > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                {brokenDois > 0 ? `${brokenDois} Unresolved` : '0 Clean'}
              </span>
            </button>

            {/* Attribution Gaps */}
            <button
              onClick={() => setStreamFilter('discovery')}
              className={cn(
                'p-1.5 rounded border text-left transition-colors cursor-pointer flex flex-col justify-between',
                missingBibs > 0
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 hover:bg-cyan-950/60'
                  : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400'
              )}
            >
              <span className="text-[9px] text-zinc-500 uppercase">Attributions</span>
              <span className="font-bold text-zinc-300">
                {missingBibs > 0 ? `${missingBibs} Gaps` : 'Verified'}
              </span>
            </button>

            {/* Baselines */}
            <div className="p-1.5 rounded border bg-zinc-900/40 border-zinc-800/80 text-left flex flex-col justify-between">
              <span className="text-[9px] text-zinc-500 uppercase">Baselines</span>
              <span className="font-bold text-zinc-300">
                {missingBaselines > 0 ? `${missingBaselines} Missing` : 'Complete'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default DeskRejectionHUD;
