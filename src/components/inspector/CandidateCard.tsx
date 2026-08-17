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
    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
      {/* Subtle telemetry scanning glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="flex justify-between items-start mb-2 relative z-10">
        <h4 className="text-xs font-semibold text-zinc-200 leading-snug line-clamp-2 pr-4" title={paper.title}>
          {paper.title}
        </h4>
        {paper.doi && (
          <a 
            href={formatDoiUrl(paper.doi)} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-zinc-600 hover:text-emerald-400 transition-colors shrink-0"
            title="Open DOI in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      
      <p className="text-[10px] text-zinc-400 font-mono mb-3 relative z-10 truncate" title={paper.authors?.join(', ')}>
        {formatAuthorList(paper.authors)} • {paper.year}
      </p>

      <div className="flex items-center justify-between mt-4 relative z-10">
        <div className="flex space-x-4 text-[10px] font-mono">
          <span className="flex items-center text-zinc-500" title="Total Citations (Crossref / OpenAlex)">
            <Database className="w-3 h-3 mr-1" />
            {formatCitationCount(paper.citationCount)}
          </span>
          {paper.influentialCitationCount !== undefined && paper.influentialCitationCount > 0 && (
            <span className="flex items-center text-amber-500/80" title="Highly Influential Citations (Semantic Scholar)">
              <Activity className="w-3 h-3 mr-1" />
              {formatCitationCount(paper.influentialCitationCount)}
            </span>
          )}
        </div>

        <button 
          onClick={() => onAccept(paper)}
          className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono font-bold hover:bg-emerald-500 hover:text-zinc-950 transition-all shadow-[0_0_10px_rgba(16,185,129,0)] hover:shadow-[0_0_10px_rgba(16,185,129,0.3)] shrink-0"
        >
          ATTACH &rarr;
        </button>
      </div>
    </div>
  );
}