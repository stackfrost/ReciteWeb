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

    // Severity Color Mapping
    let colorClasses =
      'border-amber-500/60 bg-amber-500/15 text-amber-950 dark:text-amber-100 hover:bg-amber-500/25';
    let badgeColor =
      'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40';

    if (isRetracted) {
      colorClasses =
        'border-red-500 bg-red-500/20 text-red-950 dark:text-red-200 ring-1 ring-red-500/40';
      badgeColor = 'bg-red-500/20 text-red-800 dark:text-red-300 border-red-500/40';
    } else if (isAccepted) {
      colorClasses =
        'border-emerald-500/60 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100';
      badgeColor = 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40';
    } else if (claim.severity === 'High') {
      colorClasses =
        'border-rose-500/60 bg-rose-500/15 text-rose-950 dark:text-rose-100 hover:bg-rose-500/25';
      badgeColor = 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/40';
    } else if (claim.severity === 'Low') {
      colorClasses =
        'border-sky-500/50 bg-sky-500/10 text-sky-950 dark:text-sky-100 hover:bg-sky-500/20';
      badgeColor = 'bg-sky-500/20 text-sky-800 dark:text-sky-300 border-sky-500/40';
    }

    return (
      <span
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          'relative rounded px-1.5 py-0.5 mx-0.5 border-b-2 cursor-pointer transition-all duration-150 inline',
          colorClasses,
          isActive &&
            'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/25 shadow-sm z-10'
        )}
      >
        {children}

        {/* Minimalist Pin Badge on Active Target */}
        {isActive && (
          <span
            className={cn(
              'absolute -top-4 right-0 text-[8px] font-mono uppercase px-1 py-0.2 rounded border shadow-xs font-semibold whitespace-nowrap',
              badgeColor
            )}
          >
            CLAIM [{claim.severity}]
          </span>
        )}
      </span>
    );
  }
);

ClaimHighlight.displayName = 'ClaimHighlight';

export default ClaimHighlight;