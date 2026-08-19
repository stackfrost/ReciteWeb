'use client';

import React from 'react';
import { SuggestedPaper } from '@/lib/store';
import { formatAuthorList, formatCitationCount, formatDoiUrl } from '@/lib/utils';
import { Database, ExternalLink, Activity } from 'lucide-react';

interface CandidateCardProps {
  paper: SuggestedPaper;
  onAccept: (paper: SuggestedPaper) => void;
}

export default function CandidateCard({ paper, onAccept }: CandidateCardProps) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all group relative overflow-hidden shadow-xs">
      <div className="flex justify-between items-start mb-1.5 relative z-10">
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 leading-snug line-clamp-2 pr-3" title={paper.title}>
          {paper.title}
        </h4>
        {paper.doi && (
          <a
            href={formatDoiUrl(paper.doi)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
            title="Open DOI in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans mb-3 relative z-10 truncate" title={paper.authors?.join(', ')}>
        {formatAuthorList(paper.authors)} • {paper.year}
      </p>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 relative z-10">
        <div className="flex space-x-3 text-[10px] font-mono">
          <span className="flex items-center text-zinc-500" title="Total Citations (Crossref / OpenAlex)">
            <Database className="w-3 h-3 mr-1 text-zinc-400" />
            {formatCitationCount(paper.citationCount)}
          </span>
          {paper.influentialCitationCount !== undefined && paper.influentialCitationCount > 0 && (
            <span className="flex items-center text-amber-600 dark:text-amber-400" title="Highly Influential Citations (Semantic Scholar)">
              <Activity className="w-3 h-3 mr-1" />
              {formatCitationCount(paper.influentialCitationCount)}
            </span>
          )}
        </div>

        <button
          onClick={() => onAccept(paper)}
          className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono font-bold hover:bg-emerald-500 hover:text-white dark:hover:text-zinc-950 transition-all shrink-0"
        >
          Accept Citation &rarr;
        </button>
      </div>
    </div>
  );
}