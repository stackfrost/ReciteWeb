'use client';

import React from 'react';
import { useReciteStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Library,
  X,
  Search,
  Activity,
  AlertTriangle,
  AlertOctagon,
  FileSearch,
  Wrench,
  ArrowRight,
  Diff,
  Sparkles,
  Info,
  Zap,
} from 'lucide-react';
import CandidateCard from './CandidateCard';
import ZoteroTab from './ZoteroTab';

// ─────────────────────────────────────────────────────────────────────────────
// § SEVERITY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  Critical: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/40',
    icon: <AlertOctagon className="w-3 h-3" />,
  },
  High: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/40',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  Medium: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/40',
    icon: <Zap className="w-3 h-3" />,
  },
  Low: {
    bg: 'bg-sky-500/15',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/40',
    icon: <Info className="w-3 h-3" />,
  },
};

const TYPE_LABELS: Record<string, string> = {
  MissingCitation: 'Missing Citation',
  WeakCitation: 'Weak Citation',
  Hallucination: 'Hallucination',
  Misattribution: 'Misattribution',
};

export default function ActionInspector() {
  const {
    filteredClaims,
    activeClaimIndex,
    inspectorTab,
    setInspectorTab,
    acceptCitation,
    dismissClaim,
    applyFix,
  } = useReciteStore();

  const activeClaim = filteredClaims[activeClaimIndex] || null;

  // 1. Idle State: No claim selected
  if (!activeClaim) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 transition-colors">
        <div className="h-9 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 flex items-center px-3.5">
          <span className="text-[11px] font-mono text-zinc-500 tracking-wide font-bold">
            CITATION INSPECTOR
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 font-sans text-xs space-y-2 p-6 text-center">
          <FileSearch className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
          <p className="font-semibold text-zinc-600 dark:text-zinc-400">No claim selected.</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs">
            Select a highlighted claim in the manuscript viewer to inspect candidates and retraction status.
          </p>
        </div>
      </div>
    );
  }

  const isAccepted = activeClaim.status === 'accepted';
  const isRetracted = activeClaim.isRetracted;
  const hasSuggestedFix = !!activeClaim.suggestedFix;
  const severityStyle = SEVERITY_STYLES[activeClaim.severity] || SEVERITY_STYLES.Medium;
  const auditTypeLabel = activeClaim.auditType ? TYPE_LABELS[activeClaim.auditType] || activeClaim.auditType : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 transition-colors">
      {/* 2. Top Console: Active Target Data */}
      <div className="flex-none border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20">
        {/* HUD Tab Bar */}
        <div className="flex text-[11px] font-sans border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-950">
          <TabButton
            active={inspectorTab === 'candidates'}
            onClick={() => setInspectorTab('candidates')}
            icon={<Search className="w-3.5 h-3.5" />}
            label={`Candidates (${activeClaim.suggestedPapers?.length || 0})`}
          />
          <TabButton
            active={inspectorTab === 'health'}
            onClick={() => setInspectorTab('health')}
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Integrity & Risk"
          />
          <TabButton
            active={inspectorTab === 'zotero'}
            onClick={() => setInspectorTab('zotero')}
            icon={<Library className="w-3.5 h-3.5" />}
            label="Zotero Sync"
          />
        </div>

        {/* Claim Summary Pane */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Status badge */}
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md border',
                  isRetracted
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
                    : isAccepted
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                )}
              >
                {isRetracted ? 'RETRACTED' : isAccepted ? 'VERIFIED' : 'UNVERIFIED'}
              </span>

              {/* Severity badge */}
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-md border',
                  severityStyle.bg,
                  severityStyle.text,
                  severityStyle.border
                )}
              >
                {severityStyle.icon}
                {activeClaim.severity}
              </span>

              {/* Audit type badge */}
              {auditTypeLabel && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-md border bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30">
                  {auditTypeLabel}
                </span>
              )}
            </div>

            <button
              onClick={() => dismissClaim(activeClaim.id)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-0.5 rounded flex-shrink-0"
              title="Dismiss Claim"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Claim text */}
          <p className="text-xs font-serif text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-zinc-300 dark:border-zinc-700 pl-2.5 italic">
            &quot;{activeClaim.text.replace(/\[\[MATH_BLOCK_\d+\]\]/g, ' [MATH] ')}&quot;
          </p>

          {/* Context (if available) */}
          {activeClaim.context && (
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed pl-2.5 border-l-2 border-zinc-200 dark:border-zinc-800 font-serif">
              <span className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Context: </span>
              {activeClaim.context}
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Body Content Based on Active Tab */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {inspectorTab === 'candidates' && (
          <div className="space-y-2.5">
            {/* Remediation Diff Viewer */}
            {hasSuggestedFix && (
              <RemediationDiffCard
                originalText={activeClaim.text}
                suggestedFix={activeClaim.suggestedFix!}
                onApply={() => applyFix(activeClaim.id)}
              />
            )}

            {activeClaim.suggestedPapers && activeClaim.suggestedPapers.length > 0 ? (
              activeClaim.suggestedPapers.map((paper, idx) => (
                <CandidateCard
                  key={paper.paperId || idx}
                  paper={paper}
                  onAccept={(selected) => acceptCitation(activeClaim.id, selected)}
                />
              ))
            ) : (
              !hasSuggestedFix && (
                <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-600 font-sans">
                  No matching citation candidates found.
                </div>
              )
            )}
          </div>
        )}

        {inspectorTab === 'health' && (
          <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100">Citation Integrity Diagnostics</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
              Cross-checked against OpenAlex, Semantic Scholar, and RetractionWatch index databases.
            </p>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">RETRACTION STATUS:</span>
                <span className={activeClaim.isRetracted ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                  {activeClaim.isRetracted ? 'FLAGGED' : 'CLEAR'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CLAIM SEVERITY:</span>
                <span className={cn('font-bold', severityStyle.text)}>{activeClaim.severity}</span>
              </div>
              {auditTypeLabel && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">AUDIT TYPE:</span>
                  <span className="text-zinc-800 dark:text-zinc-200 font-bold">{auditTypeLabel}</span>
                </div>
              )}
              {activeClaim.suggestedFix && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">REMEDIATION:</span>
                  <span className="text-emerald-500 font-bold">FIX AVAILABLE</span>
                </div>
              )}
            </div>

            {/* Show diff viewer in health tab too if fix exists */}
            {hasSuggestedFix && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <RemediationDiffCard
                  originalText={activeClaim.text}
                  suggestedFix={activeClaim.suggestedFix!}
                  onApply={() => applyFix(activeClaim.id)}
                />
              </div>
            )}
          </div>
        )}

        {inspectorTab === 'zotero' && <ZoteroTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § REMEDIATION DIFF CARD — macOS-style unified diff viewer
// ─────────────────────────────────────────────────────────────────────────────

function RemediationDiffCard({
  originalText,
  suggestedFix,
  onApply,
}: {
  originalText: string;
  suggestedFix: string;
  onApply: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/60">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-300 tracking-wide">
          <Diff className="w-3.5 h-3.5 text-violet-500" />
          <span>SUGGESTED REMEDIATION</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500/60" />
          <span className="w-2 h-2 rounded-full bg-amber-500/60" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
        </div>
      </div>

      {/* Diff Content */}
      <div className="p-2.5 space-y-2">
        {/* Original (red) */}
        <div className="rounded-md bg-rose-500/8 dark:bg-rose-500/10 border-l-4 border-rose-500 px-3 py-2">
          <div className="text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <span className="inline-block w-3 text-center">−</span>
            Original
          </div>
          <p className="text-[11px] font-serif text-rose-900 dark:text-rose-200 leading-relaxed break-words whitespace-pre-wrap">
            {originalText}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 rotate-90" />
        </div>

        {/* Suggested Fix (green) */}
        <div className="rounded-md bg-emerald-500/8 dark:bg-emerald-500/10 border-l-4 border-emerald-500 px-3 py-2">
          <div className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
            <span className="inline-block w-3 text-center">+</span>
            Suggested Fix
          </div>
          <p className="text-[11px] font-serif text-emerald-900 dark:text-emerald-200 leading-relaxed break-words whitespace-pre-wrap">
            {suggestedFix}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-3 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40">
        <button
          onClick={onApply}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-md transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Apply Fix to Manuscript</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// § TAB BUTTON
// ─────────────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 font-sans text-xs transition-colors',
        active
          ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold bg-white dark:bg-zinc-900/50'
          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}