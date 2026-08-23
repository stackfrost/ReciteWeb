'use client';

import React, { useState } from 'react';
import { useReciteStore, StreamFilter } from '@/lib/store';
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
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import CandidateCard from './CandidateCard';
import ZoteroTab from './ZoteroTab';

const TYPE_LABELS: Record<string, string> = {
  MissingCitation: 'Missing Citation',
  WeakCitation: 'Weak Citation',
  Hallucination: 'Hallucination',
  Misattribution: 'Misattribution',
  'Unsupported Assertion': 'Unsupported Claim',
  'Weak Attribution': 'Weak Attribution',
  'Empirical Gap': 'Empirical Gap',
  'Syntax Mismatch': 'Syntax Mismatch',
};

export default function ActionInspector() {
  const {
    claims,
    filteredClaims,
    activeClaimIndex,
    setActiveClaimIndex,
    streamFilter,
    setStreamFilter,
    inspectorTab,
    setInspectorTab,
    acceptCitation,
    insertCitationAndBib,
    dismissClaim,
    applyFix,
    setActiveLineHighlight,
  } = useReciteStore();

  const [activeDetailTab, setActiveDetailTab] = useState<'remediation' | 'evidence' | 'health' | 'zotero'>('remediation');

  const activeClaim: Claim | null = filteredClaims[activeClaimIndex] || null;

  const isAccepted = activeClaim?.status === 'accepted';
  const isRetracted = activeClaim?.isRetracted;
  const hasSuggestedFix = !!activeClaim?.suggestedFix;
  const auditTypeLabel = activeClaim?.auditType ? TYPE_LABELS[activeClaim.auditType] || activeClaim.auditType : null;

  // Real-time counter badges for the 3-way toggle
  const totalCount = claims.length;
  const integrityCount = claims.filter(
    (c) => c.streamType === 'integrity' || c.auditType === 'MissingCitation' || c.auditType === 'WeakCitation' || c.auditType === 'Syntax Mismatch'
  ).length;
  const discoveryCount = claims.filter(
    (c) => c.streamType === 'discovery' || c.auditType === 'Unsupported Assertion' || c.auditType === 'Weak Attribution' || c.auditType === 'Empirical Gap' || c.auditType === 'Misattribution' || c.auditType === 'Needs Literature'
  ).length;

  const handleRowSelect = (idx: number, lineIndex?: number) => {
    setActiveClaimIndex(idx);
    if (lineIndex) {
      setActiveLineHighlight(lineIndex);
      setTimeout(() => setActiveLineHighlight(null), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 select-none overflow-hidden font-sans transition-colors min-w-0">
      
      {/* ── TOP PANEL (Height: 44%): Problems Table & 3-Way Stream Filter ───── */}
      <div className="h-[44%] border-b border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
        
        {/* Problems Header with 3-Way Segmented Filter Control */}
        <div className="h-10 px-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/50 flex-shrink-0 gap-2">
          {/* 3-Way Segmented Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-zinc-700/60 text-xs">
            <button
              onClick={() => setStreamFilter('all')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                streamFilter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              )}
            >
              <span>All Issues</span>
              <span className={cn(
                'px-1 py-0.2 rounded-full text-[9px] font-mono font-bold',
                streamFilter === 'all' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' : 'text-zinc-500'
              )}>
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setStreamFilter('integrity')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                streamFilter === 'integrity'
                  ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400'
              )}
              title="Stream A: Missing .bib keys, syntax mismatches, orphaned records"
            >
              <AlertTriangle className="w-3 h-3 text-rose-500" />
              <span>Integrity Faults</span>
              <span className={cn(
                'px-1 py-0.2 rounded-full text-[9px] font-mono font-bold',
                streamFilter === 'integrity' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 'text-zinc-500'
              )}>
                {integrityCount}
              </span>
            </button>

            <button
              onClick={() => setStreamFilter('discovery')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer',
                streamFilter === 'discovery'
                  ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400'
              )}
              title="Stream B: Unsupported assertions and empirical literature candidates"
            >
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>Discoveries</span>
              <span className={cn(
                'px-1 py-0.2 rounded-full text-[9px] font-mono font-bold',
                streamFilter === 'discovery' ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400' : 'text-zinc-500'
              )}>
                {discoveryCount}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-zinc-400">
            <span>{filteredClaims.filter((c) => c.status === 'accepted').length} Resolved</span>
          </div>
        </div>

        {/* Problems Table Column Headers */}
        <div className="grid grid-cols-12 h-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 px-2.5 items-center select-none flex-shrink-0">
          <div className="col-span-2">Line</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-3">Pipeline / Type</div>
          <div className="col-span-3">Citation Key</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {/* Dense Problems Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
          {filteredClaims.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              No matching problems in selected stream.
            </div>
          ) : (
            filteredClaims.map((claim, idx) => {
              const isSelected = activeClaimIndex === idx;
              const lineNum = claim.lineIndex || Math.floor(claim.startIndex / 75) + 1;
              const citeMatch = claim.text.match(/\\cite[a-zA-Z]*\{([^}]+)\}/);
              const citeKey = claim.citationKey
                ? claim.citationKey
                : citeMatch
                ? citeMatch[1].split(',')[0].trim()
                : claim.suggestedPapers?.[0]?.authors?.[0]
                ? `${claim.suggestedPapers[0].authors[0]} (${claim.suggestedPapers[0].year || 'n.d.'})`
                : 'Unlinked';

              const isDiscovery = claim.streamType === 'discovery' || claim.auditType === 'Unsupported Assertion' || claim.auditType === 'Weak Attribution' || claim.auditType === 'Empirical Gap';
              const isResolved = claim.status === 'accepted';

              const sevLabel = claim.severity === 'High' || claim.severity === 'Critical' ? 'Critical' : claim.severity;
              
              let sevDotColor = 'bg-yellow-400';
              let sevTextColor = 'text-yellow-600 dark:text-yellow-400';

              if (isResolved) {
                sevDotColor = 'bg-emerald-500';
                sevTextColor = 'text-emerald-600 dark:text-emerald-400';
              } else if (isDiscovery) {
                sevDotColor = 'bg-sky-400';
                sevTextColor = 'text-sky-600 dark:text-sky-400';
              } else if (claim.severity === 'High' || claim.severity === 'Critical' || claim.isRetracted) {
                sevDotColor = 'bg-rose-500';
                sevTextColor = 'text-rose-600 dark:text-rose-400';
              }

              const statusText = claim.isRetracted ? 'Flagged' : isResolved ? 'Resolved' : 'Unresolved';
              const statusColor = claim.isRetracted
                ? 'text-rose-500 font-medium'
                : isResolved
                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                : 'text-zinc-400';

              return (
                <div
                  key={claim.id || idx}
                  onClick={() => handleRowSelect(idx, lineNum)}
                  className={cn(
                    'grid grid-cols-12 px-2.5 py-1.5 items-center cursor-pointer transition-colors select-none text-xs group',
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium border-l-2 border-emerald-500'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  {/* Line */}
                  <div className="col-span-2 font-mono text-[11px] text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">
                    L{String(lineNum).padStart(2, '0')}
                  </div>

                  {/* Severity */}
                  <div className={cn('col-span-2 flex items-center gap-1.5 text-[11px]', sevTextColor)}>
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', sevDotColor)} />
                    <span className="truncate">{sevLabel}</span>
                  </div>

                  {/* Type */}
                  <div className="col-span-3 truncate text-[11px] text-zinc-600 dark:text-zinc-400">
                    {auditTypeLabel || claim.auditType || claim.category || 'Claim'}
                  </div>

                  {/* Citation Key */}
                  <div className="col-span-3 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    {citeKey}
                  </div>

                  {/* Status */}
                  <div className={cn('col-span-2 text-right text-[11px]', statusColor)}>
                    {statusText}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── BOTTOM PANEL (Height: 56%): Focused Detail & Actionable Evidence ── */}
      <div className="h-[56%] flex flex-col min-h-0 bg-white dark:bg-zinc-950">
        {!activeClaim ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs space-y-2 p-6 text-center">
            <FileSearch className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
            <p className="font-medium text-zinc-600 dark:text-zinc-400">No finding selected</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs">
              Select any row in the Problems pane above to view details, evidence cards, and patch diffs.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Detail Tabs Bar */}
            <div className="flex-none border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40">
              <div className="flex text-xs border-b border-zinc-200 dark:border-zinc-800">
                <TabButton
                  active={activeDetailTab === 'remediation'}
                  onClick={() => setActiveDetailTab('remediation')}
                  icon={<Diff className="w-3.5 h-3.5" />}
                  label="Remediation & Diff"
                />
                <TabButton
                  active={activeDetailTab === 'evidence'}
                  onClick={() => setActiveDetailTab('evidence')}
                  icon={<BookOpen className="w-3.5 h-3.5" />}
                  label={`Evidence Cards (${activeClaim.suggestedPapers?.length || 0})`}
                />
                <TabButton
                  active={activeDetailTab === 'health'}
                  onClick={() => setActiveDetailTab('health')}
                  icon={<Activity className="w-3.5 h-3.5" />}
                  label="Integrity Diagnostics"
                />
                <TabButton
                  active={activeDetailTab === 'zotero'}
                  onClick={() => setActiveDetailTab('zotero')}
                  icon={<Library className="w-3.5 h-3.5" />}
                  label="Zotero Sync"
                />
              </div>

              {/* Status Header Sub-Bar */}
              <div className="px-3 py-1.5 flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-900 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-medium rounded border',
                      isRetracted
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        : isAccepted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                    )}
                  >
                    {isRetracted ? 'Flagged' : isAccepted ? 'Resolved' : 'Unresolved'}
                  </span>

                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {activeClaim.severity === 'High' || activeClaim.severity === 'Critical' ? 'Critical Severity' : `${activeClaim.severity} Severity`}
                  </span>

                  {auditTypeLabel && (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      · {auditTypeLabel}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => dismissClaim(activeClaim.id)}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-0.5 rounded cursor-pointer"
                  title="Dismiss finding"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Detail Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {/* Context Blockquote */}
              {activeClaim.context && (
                <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-2.5 space-y-1">
                  <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Manuscript Context</span>
                  </div>
                  <p className="text-xs font-serif text-zinc-700 dark:text-zinc-300 leading-relaxed italic border-l-2 border-zinc-300 dark:border-zinc-700 pl-2.5 my-1">
                    &quot;{activeClaim.context}&quot;
                  </p>
                </div>
              )}

              {/* Tab 1: Remediation & Unified Diff */}
              {activeDetailTab === 'remediation' && (
                <div className="space-y-3">
                  {hasSuggestedFix ? (
                    <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden text-xs">
                      {/* Diff Header */}
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/60 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Diff className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Suggested Remediation Patch</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Patch Ready</span>
                      </div>

                      {/* Diff Lines in strict font-mono */}
                      <div className="p-2.5 space-y-1.5 font-mono text-[11px]">
                        {/* Minus / Original */}
                        <div className="rounded bg-rose-500/10 border-l-2 border-rose-500 px-2.5 py-1.5 text-rose-900 dark:text-rose-200 leading-relaxed whitespace-pre-wrap">
                          <span className="font-bold mr-1.5 select-none text-rose-500">−</span>
                          {activeClaim.text.replace(/\[\[MATH_BLOCK_\d+\]\]/g, ' [MATH] ')}
                        </div>

                        {/* Plus / Remediation */}
                        <div className="rounded bg-emerald-500/10 border-l-2 border-emerald-500 px-2.5 py-1.5 text-emerald-900 dark:text-emerald-200 leading-relaxed whitespace-pre-wrap">
                          <span className="font-bold mr-1.5 select-none text-emerald-500">+</span>
                          {activeClaim.suggestedFix}
                        </div>
                      </div>

                      {/* Apply Action Button */}
                      <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center gap-2">
                        <button
                          onClick={() => dismissClaim(activeClaim.id)}
                          className="flex-1 flex items-center justify-center font-sans text-xs font-medium px-3 py-1.5 rounded-md transition-colors bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => applyFix(activeClaim.id)}
                          className="flex-1 flex items-center justify-center gap-2 font-sans text-xs font-semibold px-3 py-1.5 rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Accept Fix</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 text-xs">
                      No automated patch template available. Review evidence cards below.
                    </div>
                  )}

                  {/* Fallback Candidate Preview */}
                  {activeClaim.suggestedPapers && activeClaim.suggestedPapers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                        <span>Discovered Literature Evidence ({activeClaim.suggestedPapers.length})</span>
                      </div>
                      {activeClaim.suggestedPapers.map((paper, pIdx) => (
                        <CandidateCard
                          key={paper.paperId || pIdx}
                          paper={paper}
                          onAccept={(selected) => acceptCitation(activeClaim.id, selected)}
                          onInsertAndBib={(selected) => insertCitationAndBib(activeClaim.id, selected)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Candidate Evidence Cards */}
              {activeDetailTab === 'evidence' && (
                <div className="space-y-3">
                  {activeClaim.suggestedPapers && activeClaim.suggestedPapers.length > 0 ? (
                    activeClaim.suggestedPapers.map((paper, pIdx) => (
                      <CandidateCard
                        key={paper.paperId || pIdx}
                        paper={paper}
                        onAccept={(selected) => acceptCitation(activeClaim.id, selected)}
                        onInsertAndBib={(selected) => insertCitationAndBib(activeClaim.id, selected)}
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center text-zinc-400 text-xs space-y-1">
                      <BookOpen className="w-6 h-6 mx-auto text-zinc-300 dark:text-zinc-700" />
                      <p className="font-medium text-zinc-600 dark:text-zinc-400">No candidate papers found</p>
                      <p className="text-[11px] text-zinc-500">Run audit or configure LLM Router in settings.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Integrity Diagnostics */}
              {activeDetailTab === 'health' && (
                <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span>Citation Integrity Diagnostics</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
                    Cross-referenced against Semantic Scholar, OpenAlex, and RetractionWatch databases.
                  </p>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Retraction Status:</span>
                      <span className={activeClaim.isRetracted ? 'text-rose-500 font-medium' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                        {activeClaim.isRetracted ? 'Flagged' : 'Clear'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Severity:</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{activeClaim.severity}</span>
                    </div>
                    {auditTypeLabel && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Classification:</span>
                        <span className="text-zinc-800 dark:text-zinc-200 font-medium">{auditTypeLabel}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Zotero Sync */}
              {activeDetailTab === 'zotero' && <ZoteroTab />}
            </div>
          </div>
        )}
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
        'flex-1 flex items-center justify-center gap-1.5 py-1.5 border-b-2 text-xs transition-colors cursor-pointer',
        active
          ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold bg-white dark:bg-zinc-900/50'
          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30'
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}