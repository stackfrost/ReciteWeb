'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCiteGuardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import MathBlock from './MathBlock';
import ClaimHighlight from './ClaimHighlight';

export default function ManuscriptViewer() {
  const {
    parsedText,
    mathBlocks,
    filteredClaims,
    activeClaimIndex,
    setActiveClaimIndex,
    nextClaim,
    prevClaim,
    documentTitle,
    fileFormat,
    isAuditing,
  } = useCiteGuardStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const activeClaimRef = useRef<HTMLSpanElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Active claim instance
  const activeClaim = useMemo(() => {
    if (activeClaimIndex >= 0 && activeClaimIndex < filteredClaims.length) {
      return filteredClaims[activeClaimIndex];
    }
    return null;
  }, [filteredClaims, activeClaimIndex]);

  // Track scroll progress
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const total = scrollHeight - clientHeight;
      const progress = total > 0 ? (scrollTop / total) * 100 : 0;
      setScrollProgress(progress);
    }
  };

  // Auto-scroll to active claim
  useEffect(() => {
    if (activeClaimRef.current) {
      activeClaimRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeClaimIndex]);

  // Keyboard shortcuts (J/K for claim stepping)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextClaim();
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevClaim();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextClaim, prevClaim]);

  // Segmentation Engine
  const renderedContent = useMemo(() => {
    if (!parsedText) {
      return (
        <div className="flex flex-col items-center justify-center h-80 text-zinc-400 dark:text-zinc-600 font-sans text-xs">
          <p>No document text loaded.</p>
        </div>
      );
    }

    const sortedClaims = [...filteredClaims].sort((a, b) => a.startIndex - b.startIndex);

    interface Segment {
      type: 'text' | 'claim';
      content: string;
      claim?: any;
    }

    const segments: Segment[] = [];
    let currentIndex = 0;

    for (const claim of sortedClaims) {
      if (claim.startIndex > currentIndex) {
        segments.push({
          type: 'text',
          content: parsedText.slice(currentIndex, claim.startIndex),
        });
      }

      if (claim.endIndex > claim.startIndex) {
        segments.push({
          type: 'claim',
          content: parsedText.slice(claim.startIndex, claim.endIndex),
          claim,
        });
        currentIndex = claim.endIndex;
      }
    }

    if (currentIndex < parsedText.length) {
      segments.push({
        type: 'text',
        content: parsedText.slice(currentIndex),
      });
    }

    const renderWithMath = (text: string) => {
      const parts = text.split(/(\[\[MATH_BLOCK_\d+\]\])/g);

      return parts.map((part, pIdx) => {
        if (part.startsWith('[[MATH_BLOCK_') && mathBlocks.has(part)) {
          const mb = mathBlocks.get(part)!;
          return <MathBlock key={pIdx} content={mb.rawFormula} isDisplay={mb.type === 'display'} />;
        }
        return <span key={pIdx}>{part}</span>;
      });
    };

    return segments.map((seg, sIdx) => {
      if (seg.type === 'claim' && seg.claim) {
        const claim = seg.claim;
        const isActive = activeClaim?.id === claim.id;

        return (
          <ClaimHighlight
            key={sIdx}
            ref={isActive ? activeClaimRef : undefined}
            claim={claim}
            isActive={isActive}
            onClick={() => {
              const targetIdx = filteredClaims.findIndex((c) => c.id === claim.id);
              if (targetIdx !== -1) setActiveClaimIndex(targetIdx);
            }}
          >
            {renderWithMath(seg.content)}
          </ClaimHighlight>
        );
      }

      return <span key={sIdx}>{renderWithMath(seg.content)}</span>;
    });
  }, [parsedText, filteredClaims, mathBlocks, activeClaim, setActiveClaimIndex]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 select-text overflow-hidden transition-colors">
      {/* 1. Header Bar */}
      <div className="h-9 px-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 backdrop-blur font-sans text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center space-x-2.5 truncate">
          <span className="flex h-2 w-2 relative">
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isAuditing ? 'bg-amber-500' : 'bg-emerald-500')} />
            <span className={cn('relative inline-flex rounded-full h-2 w-2', isAuditing ? 'bg-amber-500' : 'bg-emerald-500')} />
          </span>
          <span className="text-zinc-900 dark:text-zinc-200 font-semibold truncate max-w-xs font-mono text-[11px]">{documentTitle}</span>
          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-700 uppercase">
            {fileFormat}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <span className="text-zinc-500">
            MATH: <strong className="text-zinc-800 dark:text-zinc-200">{mathBlocks.size}</strong>
          </span>
          <span className="text-zinc-500">
            CLAIMS: <strong className="text-emerald-600 dark:text-emerald-400">{filteredClaims.length}</strong>
          </span>
          <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">|</span>
          <span className="hidden sm:inline text-[10px] text-zinc-400 font-mono">
            NAV: <kbd className="px-1 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">J</kbd>/<kbd className="px-1 py-0.2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">K</kbd>
          </span>
        </div>
      </div>

      {/* 2. Main Inspection Canvas with Line Numbers & Mini-Map */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Optical Line Gutter */}
        <div className="w-9 bg-zinc-50/60 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-900 flex flex-col items-center py-5 select-none font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="h-6 leading-6">
              {(i + 1) * 5}
            </div>
          ))}
        </div>

        {/* Scrollable Text Viewport */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 md:p-8 font-serif leading-relaxed text-sm md:text-base tracking-normal text-zinc-800 dark:text-zinc-200 selection:bg-emerald-500/25 space-y-4"
        >
          <div className="max-w-3xl mx-auto whitespace-pre-wrap font-sans">
            {renderedContent}
          </div>
        </div>

        {/* Mini-Map Heatstrip */}
        <div className="w-2.5 bg-zinc-100/50 dark:bg-zinc-900/30 border-l border-zinc-200 dark:border-zinc-900 relative flex flex-col justify-between py-1 select-none">
          {filteredClaims.map((claim, idx) => {
            const topPercent = parsedText.length > 0 ? (claim.startIndex / parsedText.length) * 100 : 0;
            const isCurrent = activeClaim?.id === claim.id;

            return (
              <div
                key={claim.id}
                onClick={() => setActiveClaimIndex(idx)}
                style={{ top: `${topPercent}%` }}
                title={`Claim #${idx + 1} (${claim.severity})`}
                className={cn(
                  'absolute left-0 right-0 h-1 cursor-pointer transition-all duration-150',
                  claim.severity === 'High' ? 'bg-rose-500' : claim.severity === 'Medium' ? 'bg-amber-400' : 'bg-sky-400',
                  isCurrent && 'h-2 bg-emerald-500 shadow-sm z-10'
                )}
              />
            );
          })}

          {/* Current Viewport Indicator */}
          <div
            style={{ top: `${scrollProgress}%` }}
            className="absolute left-0 right-0 h-4 border border-zinc-400/50 dark:border-zinc-500/50 bg-zinc-400/10 pointer-events-none rounded-[1px]"
          />
        </div>
      </div>

      {/* 3. Footer Bar */}
      <div className="h-6 px-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <div className="flex items-center space-x-2">
          <span>TARGET:</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
            {activeClaim ? `[${activeClaim.startIndex} : ${activeClaim.endIndex}]` : 'None'}
          </span>
          {activeClaim && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="text-amber-700 dark:text-amber-300 font-semibold">{activeClaim.category}</span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span>PROGRESS:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round(scrollProgress)}%</span>
        </div>
      </div>
    </div>
  );
}