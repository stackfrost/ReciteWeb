'use client';

import React, { useState } from 'react';
import { useReciteStore, computeIssueStatistics } from '@/lib/store';
import { AlertOctagon, ArrowRight, X, ExternalLink, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RetractionAlertHUD() {
  const claims = useReciteStore((s) => s.claims);
  const streamFilter = useReciteStore((s) => s.streamFilter);
  const setStreamFilter = useReciteStore((s) => s.setStreamFilter);
  const setActiveClaimIndex = useReciteStore((s) => s.setActiveClaimIndex);
  const [isDismissedByUser, setIsDismissedByUser] = useState(false);

  const stats = computeIssueStatistics(claims || []);

  if (stats.retractedCount === 0 || isDismissedByUser) {
    return null;
  }

  const retractedClaims = (claims || []).filter((c) => c.isRetracted && c.status !== 'dismissed');
  const firstRetracted = retractedClaims[0];

  const handleFilterRetractions = () => {
    if (streamFilter === 'retracted') {
      setStreamFilter('all');
    } else {
      setStreamFilter('retracted');
      setActiveClaimIndex(0);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        'w-full border-b transition-all duration-300 z-30 shrink-0 px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg',
        'bg-rose-950/90 border-rose-500/40 text-rose-100 backdrop-blur-md'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 shrink-0 animate-pulse border border-rose-500/40">
          <AlertOctagon size={14} className="text-rose-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-[11px] text-white uppercase tracking-wider bg-rose-600/60 px-1.5 py-0.5 rounded border border-rose-400/40 shadow-xs">
              Desk-Reject Alert
            </span>
            <span className="font-semibold text-xs text-rose-100">
              {stats.retractedCount} Retracted {stats.retractedCount === 1 ? 'Citation' : 'Citations'} Identified in Manuscript
            </span>
            {firstRetracted?.citationKey && (
              <span className="text-[11px] font-mono text-rose-300 bg-rose-900/50 px-1.5 py-0.2 rounded border border-rose-500/30">
                \cite&#123;{firstRetracted.citationKey}&#125;
              </span>
            )}
          </div>
          <p className="text-[11px] text-rose-300/90 leading-tight truncate mt-0.5">
            {firstRetracted?.retractedReason || 'Flagged in Crossref Crossmark / OpenAlex retraction registries. Citing retracted science triggers immediate desk rejection.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center ml-auto">
        <button
          type="button"
          onClick={handleFilterRetractions}
          className={cn(
            'px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 border active:scale-[0.98]',
            streamFilter === 'retracted'
              ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              : 'bg-rose-900/60 hover:bg-rose-900/90 text-rose-200 hover:text-white border-rose-500/40'
          )}
        >
          <span>{streamFilter === 'retracted' ? 'Showing Retractions' : `Filter Retractions (${stats.retractedCount})`}</span>
          <ArrowRight size={12} />
        </button>

        <button
          type="button"
          onClick={() => setIsDismissedByUser(true)}
          className="p-1 rounded text-rose-400/70 hover:text-rose-200 hover:bg-rose-900/40 transition-colors cursor-pointer"
          title="Dismiss Banner for this Session"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
