'use client';

import React from 'react';
import { useReciteStore } from '@/lib/store';
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
} from 'lucide-react';
import CandidateCard from './CandidateCard';
import ZoteroTab from './ZoteroTab';

const TYPE_LABELS: Record<string, string> = {
  MissingCitation: 'Missing Citation',
  WeakCitation: 'Weak Citation',
  Hallucination: 'Hallucination',
  Misattribution: 'Misattribution',
};

export default function ActionInspector() {
  const {
    claims,
    filteredClaims,
    activeClaimIndex,
    setActiveClaimIndex,
    inspectorTab,
    setInspectorTab,
    acceptCitation,
    dismissClaim,
    applyFix,
  } = useReciteStore();

  const activeClaim: Claim | null = filteredClaims[activeClaimIndex] || null;

  const isAccepted = activeClaim?.status === 'accepted';
  const isRetracted = activeClaim?.isRetracted;
  const hasSuggestedFix = !!activeClaim?.suggestedFix;
  const auditTypeLabel = activeClaim?.auditType ? TYPE_LABELS[activeClaim.auditType] || activeClaim.auditType : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 select-none overflow-hidden font-sans transition-colors">
      
      {/* ── TOP PANEL (Height: 42%): VS Code-Style Problems Pane ──────────── */}
      <div className="h-[42%] border-b border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0 bg-white dark:bg-zinc-950">
        {/* Problems Header */}
        <div className="h-8 px-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 text-xs text-zinc-600 dark:text-zinc-400 flex-shrink-0">
          <div className="flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-200">
            <span>Problems</span>
            <span className="px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-[10px] text-zinc-700 dark:text-zinc-300 font-mono">
              {filteredClaims.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span>{claims.filter((c) => c.severity === 'High' || c.severity === 'Critical').length} Critical</span>
            <span>·</span>
            <span>{claims.filter((c) => c.severity === 'Medium').length} Medium</span>
          </div>
        </div>

        {/* Problems Table Column Headers */}
        <div className="grid grid-cols-12 h-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 px-2.5 items-center select-none flex-shrink-0">
          <div className="col-span-2">Line</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-3">Type</div>
          <div className="col-span-3">Citation Key</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {/* Dense Problems Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900 text-xs">
          {filteredClaims.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              No problems detected in manuscript.
            </div>
          ) : (
            filteredClaims.map((claim, idx) => {
              const isSelected = activeClaimIndex === idx;
              const lineNum = claim.lineIndex || Math.floor(claim.startIndex / 75) + 1;
              const citeMatch = claim.text.match(/\\cite[a-zA-Z]*\{([^}]+)\}/);
              const citeKey = citeMatch
                ? citeMatch[1].split(',')[0].trim()
                : claim.suggestedPapers?.[0]?.authors?.[0]
                ? `${claim.suggestedPapers[0].authors[0]} (${claim.suggestedPapers[0].year || 'n.d.'})`
                : 'Unlinked';

              const sevLabel = claim.severity === 'High' || claim.severity === 'Critical' ? 'Critical' : claim.severity;
              const sevDotColor =
                claim.severity === 'High' || claim.severity === 'Critical'
                  ? 'bg-rose-500'
                  : claim.severity === 'Medium'
                  ? 'bg-yellow-400'
                  : 'bg-blue-400';

              const sevTextColor =
                claim.severity === 'High' || claim.severity === 'Critical'
                  ? 'text-rose-600 dark:text-rose-400'
                  : claim.severity === 'Medium'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-blue-600 dark:text-blue-400';

              const statusText = claim.isRetracted ? 'Flagged' : claim.status === 'accepted' ? 'Resolved' : 'Unresolved';
              const statusColor = claim.isRetracted
                ? 'text-rose-500 font-medium'
                : claim.status === 'accepted'
                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                : 'text-zinc-400';

              return (
                <div
                  key={claim.id || idx}
                  onClick={() => setActiveClaimIndex(idx)}
                  className={cn(
                    'grid grid-cols-12 px-2.5 py-1.5 items-center cursor-pointer transition-colors select-none text-xs',
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium border-l-2 border-emerald-500'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300'
                  )}
                >
                  {/* Line */}
                  <div className="col-span-2 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
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

      {/* ── BOTTOM PANEL (Height: 58%): Focused Detail & Clean Unified Diff ── */}
      <div className="h-[58%] flex flex-col min-h-0 bg-white dark:bg-zinc-950">
        {!activeClaim ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs space-y-2 p-6 text-center">
            <FileSearch className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
            <p className="font-medium text-zinc-600 dark:text-zinc-400">No finding selected</p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs">
              Select any row in the Problems pane above to view details, context, and remediation diffs.
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Detail Tabs Bar */}
            <div className="flex-none border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40">
              <div className="flex text-xs border-b border-zinc-200 dark:border-zinc-800">
                <TabButton
                  active={inspectorTab === 'candidates'}
                  onClick={() => setInspectorTab('candidates')}
                  icon={<Diff className="w-3.5 h-3.5" />}
                  label="Remediation & Diff"
                />
                <TabButton
                  active={inspectorTab === 'health'}
                  onClick={() => setInspectorTab('health')}
                  icon={<Activity className="w-3.5 h-3.5" />}
                  label="Integrity Diagnostics"
                />
                <TabButton
                  active={inspectorTab === 'zotero'}
                  onClick={() => setInspectorTab('zotero')}
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
              {inspectorTab === 'candidates' && (
                <div className="space-y-3">
                  {/* Clean Unified Diff View */}
                  {hasSuggestedFix ? (
                    <div className="rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden text-xs">
                      {/* Diff Header */}
                      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-zinc-900/60 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Diff className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Suggested Remediation</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Fix Available</span>
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
                          className="flex-1 flex items-center justify-center font-sans text-sm font-medium px-4 py-1.5 rounded-md transition-colors duration-150 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => applyFix(activeClaim.id)}
                          className="flex-1 flex items-center justify-center gap-2 font-sans text-sm font-medium px-4 py-1.5 rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Accept Fix</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Candidate Papers List */}
                  {activeClaim.suggestedPapers && activeClaim.suggestedPapers.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Citation Candidates ({activeClaim.suggestedPapers.length})
                      </div>
                      {activeClaim.suggestedPapers.map((paper, pIdx) => (
                        <CandidateCard
                          key={paper.paperId || pIdx}
                          paper={paper}
                          onAccept={(selected) => acceptCitation(activeClaim.id, selected)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Tab 2: Integrity Diagnostics */}
              {inspectorTab === 'health' && (
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

              {/* Tab 3: Zotero Sync */}
              {inspectorTab === 'zotero' && <ZoteroTab />}
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
          ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 font-medium bg-white dark:bg-zinc-900/50'
          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}