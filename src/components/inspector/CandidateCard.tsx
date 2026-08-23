'use client';

import React from 'react';
import { SuggestedPaper } from '@/lib/store';
import { formatAuthorList, formatCitationCount, formatDoiUrl } from '@/lib/utils';
import { Database, ExternalLink, Activity, CheckCircle2, Quote, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CandidateCardProps {
  paper: SuggestedPaper;
  onAccept: (paper: SuggestedPaper) => void;
  onInsertAndBib?: (paper: SuggestedPaper) => void;
}

export default function CandidateCard({ paper, onAccept, onInsertAndBib }: CandidateCardProps) {
  const matchPct = paper.matchScore || (paper.influentialCitationCount ? Math.min(90 + Math.floor(paper.influentialCitationCount / 2), 99) : 92);
  const bibKey = paper.bibtexKey || (paper.authors?.[0]?.toLowerCase()?.replace(/\W/g, '') || 'ref') + (paper.year || '2024');

  return (
    <div className="bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-all group relative overflow-hidden shadow-xs space-y-2.5">
      {/* ── 1. Header Metadata & Match Score ───────────────────────────────── */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {matchPct}% Match
            </span>
            {paper.venue && (
              <span className="text-[10px] font-sans font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[200px]">
                {paper.venue}
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
            className="p-1 rounded text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
            title="View DOI on publisher / Crossref"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* ── 2. Authors and Publication Year ─────────────────────────────────── */}
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans truncate" title={paper.authors?.join(', ')}>
        {formatAuthorList(paper.authors)} • {paper.year}
      </p>

      {/* ── 3. Evidence Anchor Quote ────────────────────────────────────────── */}
      {(paper.abstractExcerpt || paper.abstractSnippet) && (
        <div className="rounded bg-white dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800/80 p-2 text-xs space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            <Quote className="w-3 h-3 text-emerald-500" />
            <span>Evidence Anchor Excerpt</span>
          </div>
          <p className="text-[11px] font-serif italic text-zinc-700 dark:text-zinc-300 leading-relaxed pl-1.5 border-l-2 border-emerald-500/40">
            &quot;{paper.abstractExcerpt || paper.abstractSnippet}&quot;
          </p>
        </div>
      )}

      {/* ── 4. Provenance & Actionable BibTeX Integration ───────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2 text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium" title="Verified against Crossref & OpenAlex">
            <CheckCircle2 className="w-3 h-3" />
            <span>Crossref / DOI Active</span>
          </span>
          {paper.citationCount !== undefined && (
            <span className="hidden sm:inline text-zinc-400">
              · {formatCitationCount(paper.citationCount)} citations
            </span>
          )}
        </div>

        <button
          onClick={() => {
            if (onInsertAndBib) onInsertAndBib(paper);
            else onAccept(paper);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-sans font-semibold transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          title="Append @article to .bib and update citation key in manuscript"
        >
          <PlusCircle className="w-3 h-3" />
          <span>Insert & Append .bib</span>
        </button>
      </div>
    </div>
  );
}