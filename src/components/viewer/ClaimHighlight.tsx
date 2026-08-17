'use client';

import React, { forwardRef } from 'react';
import { Claim } from '@/lib/store';
import { cn } from '@/lib/utils';

interface ClaimHighlightProps {
  claim: Claim;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const ClaimHighlight = forwardRef<HTMLSpanElement, ClaimHighlightProps>(
  ({ claim, isActive, onClick, children }, ref) => {
    const isAccepted = claim.status === 'accepted';
    const isRetracted = claim.isRetracted;

    // Severity Color Mapping Console
    let colorClasses = 'border-amber-500/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20';
    let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';

    if (isRetracted) {
      // Critical Red for Retractions
      colorClasses = 'border-red-500 bg-red-950/30 text-red-200 ring-1 ring-red-500/50';
      badgeColor = 'bg-red-500/20 text-red-300 border-red-500/40';
    } else if (isAccepted) {
      // Resolved Emerald
      colorClasses = 'border-emerald-500/60 bg-emerald-950/20 text-emerald-100';
      badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    } else if (claim.severity === 'High') {
      // Rose for High Severity Uncited Claims
      colorClasses = 'border-rose-500/60 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20';
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    } else if (claim.severity === 'Low') {
      // Sky Blue for Low Severity / Passing Mentions
      colorClasses = 'border-sky-500/40 bg-sky-500/5 text-sky-100 hover:bg-sky-500/15';
      badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }

    return (
      <span
        ref={ref}
        onClick={(e) => {
          e.stopPropagation(); // Prevent clicks from bubbling up
          onClick();
        }}
        className={cn(
          'relative rounded px-1.5 py-0.5 mx-0.5 border-b-2 cursor-pointer transition-all duration-200 inline',
          colorClasses,
          isActive && 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] z-10'
        )}
      >
        {children}

        {/* Minimalist Pin Badge on Active Target */}
        {isActive && (
          <span className={cn(
            'absolute -top-4 right-0 text-[8px] font-mono uppercase px-1 py-0.5 rounded border shadow-sm font-semibold whitespace-nowrap', 
            badgeColor
          )}>
            TARGET [{claim.severity}]
          </span>
        )}
      </span>
    );
  }
);

ClaimHighlight.displayName = 'ClaimHighlight';

export default ClaimHighlight;