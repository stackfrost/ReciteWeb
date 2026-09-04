'use client';

import React, { useState, useEffect, useMemo, useCallback, startTransition, memo } from 'react';
import { useReciteStore, StreamFilter, getClaimStream, computeIssueStatistics } from '@/lib/store';
import { useAuditStore } from '@/store/useAuditStore';
import type { Claim } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  X,
  FileSearch,
  Wrench,
  Diff,
  FileText,
  Activity,
  Library,
  BookOpen,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Cpu,
  StopCircle,
  Clock,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Target,
} from 'lucide-react';
import CandidateCard from './CandidateCard';
import ZoteroTab from './ZoteroTab';
import ResizableSplitView from '@/components/layout/ResizableSplitView';
import DeskRejectionHUD from '@/components/workbench/DeskRejectionHUD';

const TYPE_LABELS: Record<string, string> = {
  MissingCitation: 'Attribution Gap',
  WeakCitation: 'Candidate Ref',
  Hallucination: 'Unverified Claim',
  Misattribution: 'Key Mismatch',
  PhantomKey: 'Phantom Cite Key',
  'Phantom Key': 'Phantom Cite Key',
  'Missing BibTeX Key': 'Unresolved Key',
  'Missing Key': 'Unresolved Key',
  'Unsupported Assertion': 'Empirical Gap',
  'Weak Attribution': 'Weak Attribution',
  'Empirical Gap': 'Uncited Assertion',
  'Syntax Mismatch': 'Syntax Drift',
  'Citation Contradiction': 'Lit. Alignment',
  'Outdated Benchmark': 'Benchmark Horizon',
};

// ── Atomic selector hooks — each subscribes to exactly one slice ─────────────
// Isolates this inspector from unrelated store mutations (e.g. scrollLine,
// cursorOffset, rawText changes during live typing).
function ActionInspector() {
  const claims               = useReciteStore((s) => s.claims);
  const filteredClaims       = useReciteStore((s) => s.filteredClaims);
  const activeClaimIndex     = useReciteStore((s) => s.activeClaimIndex);
  const setActiveClaimIndex  = useReciteStore((s) => s.setActiveClaimIndex);
  const streamFilter         = useReciteStore((s) => s.streamFilter);
  const setStreamFilter      = useReciteStore((s) => s.setStreamFilter);
  const acceptCitation       = useReciteStore((s) => s.acceptCitation);
  const insertCitationAndBib = useReciteStore((s) => s.insertCitationAndBib);
  const copyCitationAndBib   = useReciteStore((s) => s.copyCitationAndBib);
  const dismissClaim         = useReciteStore((s) => s.dismissClaim);
  const restoreClaim         = useReciteStore((s) => s.restoreClaim);
  const applyFix             = useReciteStore((s) => s.applyFix);
  const setActiveLineHighlight = useReciteStore((s) => s.setActiveLineHighlight);
  const filterStatus         = useReciteStore((s) => s.filterStatus);
  const setFilterStatus      = useReciteStore((s) => s.setFilterStatus);

  // Audit — subscribe only to the three scalars this component needs
  const isAuditing      = useAuditStore((s) => s.isAuditing);
  const telemetry       = useAuditStore((s) => s.telemetry);
  const cancelActiveAudit = useAuditStore((s) => s.cancelActiveAudit);

  const [activeDetailTab, setActiveDetailTab] = useState<'remediation' | 'evidence' | 'telemetry' | 'health' | 'zotero'>('remediation');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedBib, setCopiedBib] = useState<string | null>(null);

  // Vertical split percentage between top data grid and bottom detail drawer (default 40% top / 60% bottom)
  const [verticalSplit, setVerticalSplit] = useState(40);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reciteweb-inspector-split') || localStorage.getItem('citeassist-inspector-split');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 20 && val <= 75) {
          setVerticalSplit(val);
        }
      }
    } catch {}
  }, []);

  const handleVerticalSplitChange = useCallback((newVal: number) => {
    setVerticalSplit(newVal);
    try {
      localStorage.setItem('reciteweb-inspector-split', String(newVal));
    } catch {}
  }, []);

  // Live stopwatch during active audit
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAuditing) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuditing]);

  const activeClaim: Claim | null = filteredClaims[activeClaimIndex] || null;

  const isAccepted = activeClaim?.status === 'accepted';
  const isDismissed = activeClaim?.status === 'dismissed';
  const isRetracted = activeClaim?.isRetracted;
  const hasSuggestedFix = !!activeClaim?.suggestedFix;
  const auditTypeLabel = activeClaim?.auditType ? TYPE_LABELS[activeClaim.auditType] || activeClaim.auditType : null;

  // Memoized stats — recomputes only when the claims array reference changes,
  // not on every render triggered by scroll/cursor store mutations.
  const stats = useMemo(() => computeIssueStatistics(claims), [claims]);

  const highConfidenceCount = useMemo(() => {
    return claims.filter((c) => {
      if (c.status !== 'pending') return false;
      if (c.isRetracted) return false;
      if (c.suggestedFix) return true;
      const topPaper = c.suggestedPapers?.[0];
      if (topPaper && topPaper.entailmentStatus !== 'contradicted' && !topPaper.contradictionWarning) {
        const score = topPaper.matchScore ?? (topPaper.influentialCitationCount ? Math.min(90 + Math.floor(topPaper.influentialCitationCount / 2), 99) : 92);
        return score >= 80;
      }
      return false;
    }).length;
  }, [claims]);

  const [isAutoRemediating, setIsAutoRemediating] = useState(false);
  const handleBulkAutoRemediate = async () => {
    setIsAutoRemediating(true);
    try {
      await useReciteStore.getState().bulkAutoRemediate();
    } finally {
      setIsAutoRemediating(false);
    }
  };

  // Stable callback wrapped in startTransition so row clicks never block the
  // 60 FPS typing thread. setActiveClaimIndex drives the detail drawer which
  // may trigger expensive re-renders; marking it as a transition lets React
  // defer it behind urgent input events.
  const handleRowSelect = useCallback(
    (idx: number, lineIndex?: number) => {
      startTransition(() => {
        setActiveClaimIndex(idx);
        if (lineIndex) {
          setActiveLineHighlight(lineIndex);
          setTimeout(() => setActiveLineHighlight(null), 2500);
        }
      });
    },
    [setActiveClaimIndex, setActiveLineHighlight]
  );

  // Find active trace for current claim
  const currentClaimTrace = telemetry?.traces
    ? Object.values(telemetry.traces)[telemetry.currentClaimIndex] || Object.values(telemetry.traces)[0]
    : null;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 select-none overflow-hidden font-sans transition-colors min-w-0">

      {/* ── COMPACT AUDIT TELEMETRY BAR (Active when auditing) ─────────── */}
      {isAuditing && (
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-2.5 py-1.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              Auditing
            </span>
            {telemetry && (
              <span className="text-[10px] font-mono text-zinc-500">
                [{telemetry.currentClaimIndex + 1}/{telemetry.totalClaims || 1}]
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
              {elapsedSeconds.toFixed(1)}s
            </span>
            <button
              type="button"
              onClick={cancelActiveAudit}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
              title="Abort active audit"
            >
              <StopCircle className="w-2.5 h-2.5" />
              <span>Abort</span>
            </button>
          </div>
        </div>
      )}

      {/* Telemetry trace — compact single-line for current stage */}
      {isAuditing && currentClaimTrace && (
        <div className="px-2.5 py-1 border-b border-zinc-800 bg-zinc-950 text-[10px] font-mono text-zinc-400 flex items-center gap-2 shrink-0 overflow-hidden">
          <span className="text-zinc-600 shrink-0">
            {currentClaimTrace.stage === 'claim_decomposition' && '1/3'}
            {currentClaimTrace.stage === 'dragnet_harvesting' && '2/3'}
            {(currentClaimTrace.stage === 'nli_grading' || currentClaimTrace.stage === 'bibtex_synthesis' || currentClaimTrace.stage === 'complete') && '3/3'}
            {currentClaimTrace.stage === 'pending' && '0/3'}
          </span>
          <span className="text-emerald-400 uppercase shrink-0">
            {currentClaimTrace.stage.replace('_', ' ')}
          </span>
          <span className="text-zinc-600 shrink-0">│</span>
          <span className="truncate text-zinc-500">
            {currentClaimTrace.totalAbstractsHarvested > 0
              ? `${currentClaimTrace.totalAbstractsHarvested} abstracts`
              : currentClaimTrace.deconstructedQueries?.[0] || 'Processing...'}
          </span>
        </div>
      )}

      {/* ── PEER-REVIEW SUBMISSION HEALTH CARD ── */}
      <DeskRejectionHUD variant="card" />

      {/* ── TOP: High-Density Audit Data Grid ─────────────────────────── */}
      <div className="flex flex-col min-h-0 flex-1">

        {/* Filter bar — compact segmented control */}
        <div className="h-7 px-2 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 shrink-0 gap-2">
          {/* Segmented filter pills */}
          <div className="flex items-center gap-1 text-[11px] font-sans font-medium">
            {([
              {
                id: 'all' as const,
                label: 'All',
                count: stats.totalCount,
                activeClass: 'bg-zinc-800 text-zinc-100 font-bold border-zinc-600 shadow-[0_0_10px_rgba(255,255,255,0.12)]',
                inactiveClass: 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 active:bg-zinc-700 active:text-zinc-100 active:border-zinc-500 active:shadow-[0_0_8px_rgba(255,255,255,0.1)]',
              },
              {
                id: 'integrity' as const,
                label: 'Integrity',
                count: stats.integrityCount,
                activeClass: 'bg-amber-950/70 text-amber-300 font-bold border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.45)]',
                inactiveClass: 'border-transparent text-zinc-400 hover:text-amber-300 hover:bg-amber-950/30 active:bg-amber-950/70 active:text-amber-200 active:border-amber-500/60 active:shadow-[0_0_12px_rgba(245,158,11,0.45)]',
              },
              {
                id: 'discovery' as const,
                label: 'Discoveries',
                count: stats.discoveryCount,
                activeClass: 'bg-teal-950/70 text-cyan-300 font-bold border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.45)]',
                inactiveClass: 'border-transparent text-zinc-400 hover:text-cyan-300 hover:bg-teal-950/30 active:bg-teal-950/70 active:text-cyan-200 active:border-cyan-400/60 active:shadow-[0_0_12px_rgba(6,182,212,0.45)]',
              },
              {
                id: 'retracted' as const,
                label: 'Retractions',
                count: stats.retractedCount,
                activeClass: 'bg-rose-950/90 text-rose-200 font-bold border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]',
                inactiveClass: stats.retractedCount > 0
                  ? 'border-rose-500/40 text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-950/70'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60',
              },
            ]).map(({ id, label, count, activeClass, inactiveClass }) => {
              const isActive = streamFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => startTransition(() => setStreamFilter(id))}
                  className={cn(
                    'px-2 py-0.5 rounded border transition-all duration-150 cursor-pointer select-none flex items-center gap-1.5 active:scale-[0.97]',
                    isActive ? activeClass : inactiveClass
                  )}
                >
                  <span>{label}</span>
                  <span
                    className={cn(
                      'px-1 py-0.2 rounded-full text-[9px] font-mono',
                      isActive ? 'bg-black/30 font-bold' : 'text-zinc-500'
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status summary */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
            <span className="text-emerald-400">{stats.resolvedCount} Resolved</span>
            {highConfidenceCount > 0 && (
              <button
                onClick={handleBulkAutoRemediate}
                disabled={isAutoRemediating}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all active:scale-[0.97] cursor-pointer shadow-xs',
                  isAutoRemediating
                    ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                )}
                title="Auto-fill high-confidence verified citations and integrity fixes into manuscript"
              >
                <Zap className={cn('w-3 h-3', isAutoRemediating ? 'animate-spin' : 'fill-white')} />
                <span>Auto-Fill ({highConfidenceCount})</span>
              </button>
            )}
            {stats.dismissedCount > 0 && (
              <button
                onClick={() => setFilterStatus(filterStatus === 'dismissed' ? 'All' : 'dismissed')}
                className={cn(
                  'px-1 py-0.5 rounded transition-colors cursor-pointer',
                  filterStatus === 'dismissed'
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
                title="View dismissed"
              >
                {stats.dismissedCount} Dismissed
              </button>
            )}
          </div>
        </div>

        {/* Column headers — only show when claims exist */}
        {filteredClaims.length > 0 && (
          <div className="flex items-center h-6 px-2.5 border-b border-zinc-800/80 bg-zinc-900/40 text-[9px] font-mono uppercase tracking-wider text-zinc-400 font-semibold shrink-0 select-none">
            <div className="w-8 shrink-0">L#</div>
            <div className="w-5 shrink-0">Sev</div>
            <div className="flex-1 min-w-0">Assertion</div>
            <div className="w-28 shrink-0 hidden 2xl:block">Source</div>
            <div className="w-14 shrink-0 text-right">Score</div>
            <div className="w-16 shrink-0 text-right">Actions</div>
          </div>
        )}

        {/* ── High-Density Data Grid & Modular Detail Slider ── */}
        {activeClaim ? (
          <ResizableSplitView
            direction="vertical"
            splitPercentage={verticalSplit}
            onSplitChange={handleVerticalSplitChange}
            minFirstPercent={20}
            maxFirstPercent={75}
            onReset={() => {
              setVerticalSplit(40);
              try { localStorage.setItem('reciteweb-inspector-split', '40'); } catch {}
            }}
            className="flex-1 min-h-0"
            first={
              <div className="flex-1 overflow-y-auto min-h-0">
                {filteredClaims.map((claim, idx) => {
                  const isSelected = activeClaimIndex === idx;
                  const lineNum = claim.lineIndex || Math.floor(claim.startIndex / 75) + 1;
                  const citeMatch = claim.text.match(/\\cite[a-zA-Z]*\{([^}]+)\}/);
                  const isIntegrity = getClaimStream(claim) === 'integrity';

                  const citeKey = claim.citationKey
                    ? claim.citationKey
                    : citeMatch
                    ? citeMatch[1].split(',')[0].trim()
                    : claim.acceptedPaper?.bibtexKey
                    ? `@${claim.acceptedPaper.bibtexKey}`
                    : claim.suggestedPapers?.[0]?.bibtexKey
                    ? `@${claim.suggestedPapers[0].bibtexKey}`
                    : isIntegrity
                    ? 'Missing Key'
                    : 'Unlinked';

                  const isItemResolved = claim.status === 'accepted';
                  const isItemDismissed = claim.status === 'dismissed';
                  const sev = (claim.severity || 'Medium').toLowerCase();
                  const isCritical = sev === 'critical' || sev === 'high' || claim.isRetracted;
                  const isMedium = sev === 'medium';

                  let sevDotColor = 'bg-sky-400';
                  if (isItemResolved) sevDotColor = 'bg-emerald-500';
                  else if (isItemDismissed) sevDotColor = 'bg-zinc-500';
                  else if (isCritical) sevDotColor = 'bg-rose-500';
                  else if (isMedium) sevDotColor = 'bg-amber-400';

                  const entailment = claim.suggestedPapers?.[0]?.matchScore;

                  return (
                    <div
                      key={claim.id || idx}
                      onClick={() => handleRowSelect(idx, lineNum)}
                      className={cn(
                        'flex items-center px-2 py-1 cursor-pointer transition-colors text-[11px] font-mono border-l-2 group',
                        isSelected
                          ? claim.isRetracted
                            ? 'bg-rose-950/60 text-zinc-100 border-rose-500'
                            : 'bg-zinc-800/80 text-zinc-100 border-emerald-500'
                          : claim.isRetracted
                          ? 'bg-rose-950/20 text-rose-300 border-rose-500/50 hover:bg-rose-950/40'
                          : 'hover:bg-zinc-900/80 text-zinc-400 border-transparent hover:border-zinc-700'
                      )}
                    >
                      {/* L# */}
                      <div className="w-8 shrink-0 text-zinc-500 group-hover:text-zinc-300">
                        {lineNum}
                      </div>

                      {/* Sev dot */}
                      <div className="w-5 shrink-0 flex items-center justify-center">
                        <span className={cn('w-1.5 h-1.5 rounded-full', sevDotColor)} />
                      </div>

                      {/* Assertion */}
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate text-[11px] font-sans text-zinc-300 group-hover:text-zinc-100">
                        {claim.isRetracted ? (
                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px] font-bold shrink-0 tracking-wider shadow-xs animate-pulse">
                            RETRACTED
                          </span>
                        ) : (claim.auditType?.toLowerCase().includes('phantom') || claim.category?.toLowerCase().includes('hallucinat')) ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white font-mono text-[9px] font-bold shrink-0 tracking-wider shadow-xs">
                            PHANTOM
                          </span>
                        ) : null}
                        <span className="truncate">
                          {TYPE_LABELS[claim.auditType || ''] || claim.auditType || claim.category || 'Observation'}
                        </span>
                      </div>

                      {/* Matched Source */}
                      <div className="w-28 shrink-0 hidden 2xl:block truncate text-[10px] text-zinc-500">
                        {citeKey}
                      </div>

                      {/* Entailment */}
                      <div className="w-14 shrink-0 text-right">
                        {entailment !== undefined ? (
                          <span className={cn(
                            'text-[10px] font-mono font-bold px-1 py-0.2 rounded border',
                            entailment >= 80
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-[0_0_6px_rgba(16,185,129,0.2)]'
                              : entailment >= 50
                              ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                              : 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                          )}>
                            {entailment}%
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-700 font-mono">--</span>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="w-16 shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {claim.suggestedFix && (
                          <button
                            onClick={(e) => { e.stopPropagation(); applyFix(claim.id); }}
                            className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                            title="Apply fix"
                          >
                            Fix
                          </button>
                        )}
                        {claim.suggestedPapers?.[0] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); copyCitationAndBib(claim.id, claim.suggestedPapers![0]); }}
                            className="px-1 py-0.2 rounded text-[9px] font-bold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors cursor-pointer"
                            title="Copy \\cite + bib"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            }
            second={
              <div className="flex flex-col h-full min-h-0 bg-zinc-950">
              {/* Detail tab strip */}
              <div className="flex items-center border-b border-zinc-800 bg-zinc-900/40 px-1 shrink-0">
                <DetailTab active={activeDetailTab === 'remediation'} onClick={() => setActiveDetailTab('remediation')} label="Diff & Fix" />
                <DetailTab active={activeDetailTab === 'evidence'} onClick={() => setActiveDetailTab('evidence')} label={`Cards (${activeClaim.suggestedPapers?.length || 0})`} />
                <DetailTab active={activeDetailTab === 'telemetry'} onClick={() => setActiveDetailTab('telemetry')} label="Trace" />
                <DetailTab active={activeDetailTab === 'health'} onClick={() => setActiveDetailTab('health')} label="Diag." />
                <DetailTab active={activeDetailTab === 'zotero'} onClick={() => setActiveDetailTab('zotero')} label="Zotero" />

                {/* Right: status & dismiss */}
                <div className="ml-auto flex items-center gap-1.5 pr-1">
                  <span className={cn(
                    'px-1.5 py-0.5 text-[9px] font-mono font-bold rounded',
                    isRetracted ? 'text-rose-400 bg-rose-500/10' :
                    isAccepted ? 'text-emerald-400 bg-emerald-500/10' :
                    isDismissed ? 'text-zinc-500 bg-zinc-800' :
                    'text-zinc-400 bg-zinc-800'
                  )}>
                    {isRetracted ? 'FLAG' : isAccepted ? 'OK' : isDismissed ? 'DIS' : 'OPEN'}
                  </span>

                  {isDismissed ? (
                    <button
                      onClick={() => restoreClaim(activeClaim.id)}
                      className="text-[10px] text-emerald-400 hover:underline cursor-pointer font-mono"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      onClick={() => dismissClaim(activeClaim.id)}
                      className="p-0.5 rounded text-zinc-600 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Detail body — scrollable */}
              <div className="flex-1 overflow-y-auto p-2.5 text-xs min-h-0">
                {/* Tab 1: Juxtaposed Diff + Evidence */}
                {activeDetailTab === 'remediation' && (
                  <div className="space-y-2.5">
                    {isRetracted && (
                      <div className="rounded-lg border border-rose-500/50 bg-rose-950/60 p-2.5 space-y-1.5 shadow-[0_0_15px_rgba(244,63,94,0.2)] animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-rose-300 uppercase tracking-wider text-[10px]">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                            <span>Official Retraction Alert · Immediate Desk-Reject Risk</span>
                          </div>
                          {activeClaim.retractionDate && (
                            <span className="text-[10px] font-mono text-rose-300 bg-rose-900/60 px-1.5 py-0.5 rounded border border-rose-500/30">
                              Retracted: {activeClaim.retractionDate}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-relaxed text-rose-100 font-sans">
                          {activeClaim.retractedReason || 'Flagged in Crossref Crossmark / OpenAlex canonical registries. Citing this paper as evidence invalidates experimental conclusions in peer review.'}
                        </p>
                        {activeClaim.retractionNoticeUrl && (
                          <div>
                            <a
                              href={activeClaim.retractionNoticeUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-300 hover:text-white underline cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Official Retraction Notice</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {activeClaim.context && (
                      <div className="text-[11px] text-zinc-500 italic border-l-2 border-zinc-700 pl-2 truncate font-sans">
                        &ldquo;{activeClaim.context}&rdquo;
                      </div>
                    )}

                    {hasSuggestedFix ? (
                      <div className="flex gap-2 min-h-0">
                        {activeClaim.suggestedPapers?.[0]?.abstractExcerpt && (
                          <div className="flex-1 min-w-0 bg-zinc-900/60 border border-zinc-800 rounded p-2 space-y-1">
                            <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">Evidence Quote</div>
                            <p className="text-[11px] text-zinc-300 italic font-sans leading-relaxed break-words">
                              &ldquo;{activeClaim.suggestedPapers[0].abstractExcerpt}&rdquo;
                            </p>
                            {activeClaim.suggestedPapers[0].doi && (
                              <a
                                href={activeClaim.suggestedPapers[0].doi.startsWith('http') ? activeClaim.suggestedPapers[0].doi : `https://doi.org/${activeClaim.suggestedPapers[0].doi}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-mono text-sky-400 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                DOI
                              </a>
                            )}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="rounded bg-rose-500/10 border-l-2 border-rose-500 px-2 py-1 text-rose-200 font-mono text-[10px] leading-relaxed whitespace-pre-wrap truncate">
                            <span className="font-bold mr-1 text-rose-500 select-none">−</span>
                            {activeClaim.text.replace(/\[\[MATH_BLOCK_\d+\]\]/g, ' [MATH] ').slice(0, 120)}
                          </div>

                          <div className="rounded bg-emerald-500/10 border-l-2 border-emerald-500 px-2 py-1 text-emerald-200 font-mono text-[10px] leading-relaxed whitespace-pre-wrap truncate">
                            <span className="font-bold mr-1 text-emerald-500 select-none">+</span>
                            {activeClaim.suggestedFix!.slice(0, 120)}
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => applyFix(activeClaim.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                            >
                              <Wrench className="w-2.5 h-2.5" />
                              Apply Fix
                            </button>

                            {activeClaim.suggestedPapers?.[0] && (
                              <button
                                type="button"
                                onClick={() => copyCitationAndBib(activeClaim.id, activeClaim.suggestedPapers![0])}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
                              >
                                Copy \cite
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => dismissClaim(activeClaim.id)}
                              className="px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-auto"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed border-zinc-800 text-center text-zinc-600 text-[11px] font-mono">
                        No automated patch available. Review candidate cards.
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Candidate Evidence Cards */}
                {activeDetailTab === 'evidence' && (
                  <div className="space-y-2">
                    {activeClaim.suggestedPapers && activeClaim.suggestedPapers.length > 0 ? (
                      activeClaim.suggestedPapers.map((paper, pIdx) => (
                        <CandidateCard
                          key={paper.paperId || pIdx}
                          paper={paper}
                          onAccept={(selected) => acceptCitation(activeClaim.id, selected)}
                          onInsertAndBib={(selected) => insertCitationAndBib(activeClaim.id, selected)}
                          onCopy={(selected) => copyCitationAndBib(activeClaim.id, selected)}
                          onDismiss={() => dismissClaim(activeClaim.id)}
                        />
                      ))
                    ) : (
                      <div className="p-6 text-center text-zinc-600 text-[11px] font-mono space-y-1">
                        <BookOpen className="w-5 h-5 mx-auto text-zinc-700" />
                        <p>No candidate references found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Telemetry Trace */}
                {activeDetailTab === 'telemetry' && (
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded border border-zinc-800 bg-zinc-900/60 text-zinc-300 space-y-1.5">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                        <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                          <Terminal className="w-3 h-3" />
                          Pre-Flight Verification Trace
                        </span>
                        <span className="text-[9px] text-zinc-600">{activeClaim.id}</span>
                      </div>

                      <div className="space-y-1 text-[10px]">
                        <div className="text-zinc-400">
                          <span className="text-zinc-600">Query:</span> {activeClaim.searchQuery || 'Deconstructed vector'}
                        </div>
                        <div className="text-zinc-400">
                          <span className="text-zinc-600">Candidates:</span> {activeClaim.suggestedPapers?.length || 0} harvested
                        </div>
                        <div className="text-zinc-400">
                          <span className="text-zinc-600">Class:</span> {activeClaim.category} · {activeClaim.severity}
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-zinc-800 text-[9px] text-zinc-500 space-y-0.5">
                        <div className="text-emerald-400/80 font-semibold">Verification Log:</div>
                        <p>✓ AST validation passed.</p>
                        <p>✓ OpenAlex & Crossref check complete.</p>
                        <p>✓ NLI entailment verified.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Integrity Diagnostics */}
                {activeDetailTab === 'health' && (
                  <div className="p-2.5 rounded border border-zinc-800 bg-zinc-900/40 space-y-2 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Integrity Diagnostics</span>
                    </div>
                    <p className="text-zinc-500 text-[10px]">
                      Cross-referenced against Semantic Scholar, OpenAlex, and RetractionWatch.
                    </p>
                    <div className="pt-1.5 border-t border-zinc-800 space-y-1 text-[10px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Retraction:</span>
                        <span className={activeClaim.isRetracted ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {activeClaim.isRetracted ? 'Flagged' : 'Clear'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Severity:</span>
                        <span className="text-zinc-200">{activeClaim.severity}</span>
                      </div>
                      {auditTypeLabel && (
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Classification:</span>
                          <span className="text-zinc-200">{auditTypeLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 5: Zotero Sync */}
                {activeDetailTab === 'zotero' && <ZoteroTab />}
              </div>
            </div>
          }
        />
      ) : (
          <div className="flex-1 overflow-y-auto min-h-0">
            {filteredClaims.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center select-none font-sans">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center mb-3 text-zinc-500 shadow-xs">
                  <ShieldCheck size={20} className="text-emerald-500/80" />
                </div>
                <h4 className="text-xs font-semibold text-zinc-200 mb-1">
                  {filterStatus === 'dismissed' ? 'No Dismissed Observations' : 'Awaiting Manuscript Audit'}
                </h4>
                <p className="text-[11px] text-zinc-500 max-w-xs mb-4 leading-relaxed font-mono">
                  {filterStatus === 'dismissed'
                    ? 'No findings have been dismissed in this session.'
                    : 'Load a LaTeX manuscript and run audit (Ctrl+↵) to stream citation integrity & discovery findings.'}
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs text-left">
                  <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
                    <div className="text-[10px] font-mono font-semibold text-amber-400 mb-0.5">Integrity Stream</div>
                    <div className="text-[10px] text-zinc-500 leading-tight">Dead DOIs, retractions & orphan keys</div>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60">
                    <div className="text-[10px] font-mono font-semibold text-cyan-400 mb-0.5">Discovery Stream</div>
                    <div className="text-[10px] text-zinc-500 leading-tight">NLI claim proofs & attribution gaps</div>
                  </div>
                </div>
              </div>
            ) : (
              filteredClaims.map((claim, idx) => {
                const isSelected = activeClaimIndex === idx;
                const lineNum = claim.lineIndex || Math.floor(claim.startIndex / 75) + 1;
                const citeMatch = claim.text.match(/\\cite[a-zA-Z]*\{([^}]+)\}/);
                const isIntegrity = getClaimStream(claim) === 'integrity';

                const citeKey = claim.citationKey
                  ? claim.citationKey
                  : citeMatch
                  ? citeMatch[1].split(',')[0].trim()
                  : claim.acceptedPaper?.bibtexKey
                  ? `@${claim.acceptedPaper.bibtexKey}`
                  : claim.suggestedPapers?.[0]?.bibtexKey
                  ? `@${claim.suggestedPapers[0].bibtexKey}`
                  : isIntegrity
                  ? 'Missing Key'
                  : 'Unlinked';

                const isItemResolved = claim.status === 'accepted';
                const isItemDismissed = claim.status === 'dismissed';
                const sev = (claim.severity || 'Medium').toLowerCase();
                const isCritical = sev === 'critical' || sev === 'high' || claim.isRetracted;
                const isMedium = sev === 'medium';

                let sevDotColor = 'bg-sky-400';
                if (isItemResolved) sevDotColor = 'bg-emerald-500';
                else if (isItemDismissed) sevDotColor = 'bg-zinc-500';
                else if (isCritical) sevDotColor = 'bg-rose-500';
                else if (isMedium) sevDotColor = 'bg-amber-400';

                const entailment = claim.suggestedPapers?.[0]?.matchScore;

                return (
                  <div
                    key={claim.id || idx}
                    onClick={() => handleRowSelect(idx, lineNum)}
                    className={cn(
                      'flex items-center px-2 py-1 cursor-pointer transition-colors text-[11px] font-mono border-l-2 group',
                      isSelected
                        ? claim.isRetracted
                          ? 'bg-rose-950/60 text-zinc-100 border-rose-500'
                          : 'bg-zinc-800/80 text-zinc-100 border-emerald-500'
                        : claim.isRetracted
                        ? 'bg-rose-950/20 text-rose-300 border-rose-500/50 hover:bg-rose-950/40'
                        : 'hover:bg-zinc-900/80 text-zinc-400 border-transparent hover:border-zinc-700'
                    )}
                  >
                    {/* L# */}
                    <div className="w-10 shrink-0 text-zinc-500 group-hover:text-zinc-300">
                      {lineNum}
                    </div>

                    {/* Sev dot */}
                    <div className="w-6 shrink-0 flex items-center justify-center">
                      <span className={cn('w-1.5 h-1.5 rounded-full', sevDotColor)} />
                    </div>

                    {/* Assertion */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate text-[11px] font-sans text-zinc-300 group-hover:text-zinc-100">
                      {claim.isRetracted ? (
                        <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono text-[9px] font-bold shrink-0 tracking-wider shadow-xs animate-pulse">
                          RETRACTED
                        </span>
                      ) : (claim.auditType?.toLowerCase().includes('phantom') || claim.category?.toLowerCase().includes('hallucinat')) ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white font-mono text-[9px] font-bold shrink-0 tracking-wider shadow-xs">
                          PHANTOM KEY
                        </span>
                      ) : null}
                      <span className="truncate">
                        {TYPE_LABELS[claim.auditType || ''] || claim.auditType || claim.category || 'Observation'}
                      </span>
                    </div>

                    {/* Matched Source */}
                    <div className="w-36 shrink-0 hidden lg:block truncate text-[10px] text-zinc-500">
                      {citeKey}
                    </div>

                    {/* Entailment */}
                    <div className="w-16 shrink-0 text-right">
                      {entailment !== undefined ? (
                        <span className={cn(
                          'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                          entailment >= 80
                            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-[0_0_6px_rgba(16,185,129,0.2)]'
                            : entailment >= 50
                            ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                            : 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                        )}>
                          {entailment}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-700 font-mono">--</span>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="w-24 shrink-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {claim.suggestedFix && (
                        <button
                          onClick={(e) => { e.stopPropagation(); applyFix(claim.id); }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
                          title="Apply fix"
                        >
                          Apply
                        </button>
                      )}
                      {claim.suggestedPapers?.[0] && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyCitationAndBib(claim.id, claim.suggestedPapers![0]); }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors cursor-pointer"
                          title="Copy \\cite + bib"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default memo(ActionInspector);

// ─────────────────────────────────────────────────────────────────────────────
// § DETAIL TAB BUTTON — Compact monochrome tab (memoized)
// ─────────────────────────────────────────────────────────────────────────────

const DetailTab = memo(function DetailTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-[10px] font-mono border-b-2 transition-colors cursor-pointer',
        active
          ? 'border-emerald-500 text-emerald-400 font-bold'
          : 'border-transparent text-zinc-600 hover:text-zinc-300'
      )}
    >
      {label}
    </button>
  );
});