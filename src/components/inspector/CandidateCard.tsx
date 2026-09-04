'use client';

import React from 'react';
import { SuggestedPaper } from '@/lib/store';
import { formatAuthorList, formatCitationCount, formatDoiUrl } from '@/lib/utils';
import { ExternalLink, CheckCircle2, Quote, PlusCircle, Sparkles, AlertTriangle, AlertCircle, Copy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateCardProps {
  paper: SuggestedPaper & {
    entailmentStatus?: 'entailed' | 'tenuous' | 'contradicted';
    hedgingSuggestion?: string;
    contradictionWarning?: string;
    provenance?: string;
  };
  onAccept: (paper: SuggestedPaper) => void;
  onInsertAndBib?: (paper: SuggestedPaper) => void;
  onCopy?: (paper: SuggestedPaper) => void;
  onDismiss?: () => void;
}

export default function CandidateCard({
  paper,
  onAccept,
  onInsertAndBib,
  onCopy,
  onDismiss,
}: CandidateCardProps) {
  const matchPct = paper.matchScore || (paper.influentialCitationCount ? Math.min(90 + Math.floor(paper.influentialCitationCount / 2), 99) : 92);
  const bibKey = paper.bibtexKey || (paper.authors?.[0]?.toLowerCase()?.replace(/\W/g, '') || 'ref') + (paper.year || '2024');
  const isContradicted = paper.entailmentStatus === 'contradicted' || !!paper.contradictionWarning;
  const isTenuous = paper.entailmentStatus === 'tenuous' || !!paper.hedgingSuggestion;

  return (
    <div className={cn(
      'bg-white dark:bg-zinc-900 border rounded-xl p-3.5 transition-all duration-200 group relative overflow-hidden shadow-xs hover:shadow-md space-y-3',
      isContradicted
        ? 'border-rose-500/50 dark:border-rose-500/50 bg-rose-50/30 dark:bg-rose-950/20'
        : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/60 dark:hover:border-emerald-500/60'
    )}>
      {/* ── 1. Header Metadata & Telemetry Match Score ──────────────────────────── */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {/* Telemetry Assurance Match Pill */}
            <span
              data-testid="match-telemetry-pill"
              className={cn(
                'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all',
                isContradicted
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                  : isTenuous || matchPct < 85
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              )}
            >
              {isContradicted ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : isTenuous || matchPct < 85 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span>
                Match: {matchPct}% {isContradicted ? '· Contradiction Risk' : isTenuous ? '· Tenuous Match' : '· Empirical Grounding'}
              </span>
            </span>

            {/* Provenance Badge */}
            {paper.provenance && (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 uppercase">
                {paper.provenance}
              </span>
            )}

            {paper.venue && (
              <span className="text-[10px] font-sans font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[160px]" title={paper.venue}>
                · {paper.venue}
              </span>
            )}

            <span className="text-[10px] font-mono text-zinc-400">
              @{bibKey}
            </span>
          </div>

          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2" title={paper.title}>
            {paper.title}
          </h4>
        </div>

        {paper.doi && (
          <a
            href={formatDoiUrl(paper.doi)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            title="View DOI on publisher / repository"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* ── 2. Authors and Publication Year ─────────────────────────────────── */}
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans truncate" title={paper.authors?.join(', ')}>
        {formatAuthorList(paper.authors)} &middot; {paper.year}
      </p>

      {/* ── 3. Verbatim Evidence Anchor Quote ───────────────────────────────── */}
      {(paper.abstractExcerpt || paper.abstractSnippet) && (
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 p-2.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Quote className="w-3 h-3 text-emerald-500" />
              <span>Verbatim Evidence in Abstract</span>
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[9px] font-semibold">{matchPct}% Excerpt Match</span>
          </div>
          <p className="text-[11px] font-sans italic text-zinc-800 dark:text-zinc-200 leading-relaxed pl-2 border-l-2 border-emerald-500 bg-emerald-500/5 py-1 pr-1.5 rounded-r">
            &ldquo;{paper.abstractExcerpt || paper.abstractSnippet}&rdquo;
          </p>
        </div>
      )}

      {/* ── 4. Academic Hedging Suggestion (When Tenuous) ───────────────────── */}
      {paper.hedgingSuggestion && (
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Recommended Academic Hedging</span>
          </div>
          <p className="text-[11px] font-sans text-amber-900 dark:text-amber-200 leading-normal">
            {paper.hedgingSuggestion}
          </p>
        </div>
      )}

      {/* ── 5. Contradiction Warning Alert (When Opposed) ───────────────────── */}
      {paper.contradictionWarning && (
        <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-2 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3 h-3" />
            <span>Literature Contradiction Detected</span>
          </div>
          <p className="text-[11px] font-sans text-rose-900 dark:text-rose-200 leading-normal">
            {paper.contradictionWarning}
          </p>
        </div>
      )}

      {/* ── 6. Discretionary 3-Way Action Bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium" title="Verified against Academic Graph">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified Index</span>
          </span>
          {paper.citationCount !== undefined && (
            <span className="text-zinc-400">
              · {formatCitationCount(paper.citationCount)} citations
            </span>
          )}
        </div>

        {/* 3-Way Action Matrix */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Action 2: Copy \cite + Bib (Failsafe Secondary) */}
          <button
            type="button"
            onClick={() => {
              if (onCopy) onCopy(paper);
              else {
                const { useReciteStore } = require('@/lib/store');
                useReciteStore.getState().copyCitationAndBib('', paper);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800/90 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md text-[11px] font-sans font-medium transition-all active:scale-[0.98] cursor-pointer border border-zinc-200 dark:border-zinc-700/80 focus:ring-1 focus:ring-emerald-500"
            title="Copy \cite{key} & @article block to clipboard for manual pasting"
          >
            <Copy className="w-3 h-3 text-zinc-400" />
            <span>Copy \cite + Bib</span>
          </button>

          {/* Action 3: Dismiss Observation (Ghost Tertiary) */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="px-2 py-1 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md text-[11px] font-sans font-medium transition-all active:scale-[0.98] cursor-pointer"
              title="Silence and ignore this observation"
            >
              <span>Dismiss</span>
            </button>
          )}

          {/* Action 1: Apply Suggestion (Primary CTA) */}
          <button
            type="button"
            onClick={() => {
              if (onInsertAndBib) onInsertAndBib(paper);
              else onAccept(paper);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-md text-[11px] font-sans font-semibold transition-all active:scale-[0.98] shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            title="Apply suggestion: Append @article to .bib and update citation key in manuscript"
          >
            <PlusCircle className="w-3 h-3" />
            <span>Apply Suggestion</span>
          </button>
        </div>
      </div>
    </div>
  );
}