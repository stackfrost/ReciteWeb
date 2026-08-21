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
      'bg-yellow-500/15 text-yellow-950 dark:text-yellow-100 rounded-[3px] px-1 ring-1 ring-inset ring-yellow-500/20 hover:bg-yellow-500/25';

    if (isRetracted || claim.severity === 'High') {
      colorClasses =
        'bg-red-500/15 text-red-950 dark:text-red-100 rounded-[3px] px-1 ring-1 ring-inset ring-red-500/20 hover:bg-red-500/25';
    } else if (claim.severity === 'Low') {
      colorClasses =
        'bg-cyan-500/15 text-cyan-950 dark:text-cyan-100 rounded-[3px] px-1 ring-1 ring-inset ring-cyan-500/20 hover:bg-cyan-500/25';
    }

    return (
      <span
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          'relative mx-0.5 cursor-pointer transition-all duration-150 inline',
          colorClasses,
          isActive &&
            'ring-2 ring-emerald-500 shadow-sm z-10'
        )}
      >
        {children}
      </span>
    );
  }
);

ClaimHighlight.displayName = 'ClaimHighlight';

export default ClaimHighlight;