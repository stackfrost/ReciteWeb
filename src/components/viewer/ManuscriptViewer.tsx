'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReciteStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import MathBlock from './MathBlock';
import ClaimHighlight from './ClaimHighlight';
import { BibTeXParser } from '@/services/bibtex-parser';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function ManuscriptViewer() {
  const {
    parsedText,
    rawText,
    mathBlocks,
    claims,
    filteredClaims,
    activeClaimIndex,
    setActiveClaimIndex,
    nextClaim,
    prevClaim,
    documentTitle,
    fileFormat,
    isAuditing,
    bibtexContent,
  } = useReciteStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const activeClaimRef = useRef<HTMLSpanElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Parse BibTeX database for instant inline hover lookup
  const bibtexMap = useMemo(() => {
    if (!bibtexContent) return new Map();
    return BibTeXParser.parse(bibtexContent);
  }, [bibtexContent]);

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

  /**
   * Rich content renderer: parses math formulas via KaTeX and wraps \cite{} keys
   * in interactive peek definition hover cards.
   */
  const renderRichContent = (text: string, keyPrefix: string) => {
    // 1. Split by math placeholders or explicit delimiters
    const parts = text.split(/(\[\[MATH_BLOCK_\d+\]\]|\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g);

    return parts.map((part, pIdx) => {
      const pKey = `${keyPrefix}-p-${pIdx}`;

      // Check for placeholder math token
      if (part.startsWith('[[MATH_BLOCK_') && mathBlocks.has(part)) {
        const mb = mathBlocks.get(part)!;
        try {
          const html = katex.renderToString(mb.rawFormula, {
            displayMode: mb.type === 'display',
            throwOnError: false,
          });
          return (
            <span
              key={pKey}
              className={mb.type === 'display' ? 'block my-3 text-center overflow-x-auto py-1' : 'inline-block px-0.5'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <MathBlock key={pKey} content={mb.rawFormula} isDisplay={mb.type === 'display'} />;
        }
      }

      // Check for display math $$...$$
      if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
        const formula = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(formula, { displayMode: true, throwOnError: false });
          return (
            <span
              key={pKey}
              className="block my-3 text-center overflow-x-auto py-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={pKey} className="font-mono text-xs">{part}</span>;
        }
      }

      // Check for inline math $...$
      if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        const formula = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(formula, { displayMode: false, throwOnError: false });
          return (
            <span
              key={pKey}
              className="inline-block px-0.5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={pKey} className="font-mono text-xs">{part}</span>;
        }
      }

      // 2. In non-math text, detect \cite{...} commands
      const citeRegex = /(\\cite[a-zA-Z]*\{[^}]+\})/g;
      const subParts = part.split(citeRegex);

      return subParts.map((subPart, sIdx) => {
        const subKey = `${pKey}-s-${sIdx}`;
        const match = subPart.match(/^\\cite[a-zA-Z]*\{([^}]+)\}$/);

        if (match) {
          const rawKeys = match[1];
          const keys = rawKeys.split(',').map((k) => k.trim());

          return (
            <span
              key={subKey}
              className="group relative inline-block text-emerald-600 dark:text-emerald-400 font-mono text-[0.9em] cursor-help border-b border-emerald-500/40 border-dashed mx-0.5 select-text hover:bg-emerald-500/10 px-1 py-0.2 rounded transition-colors"
            >
              <span>{subPart}</span>
              {/* Peek Definition Hover Card (macOS style floating popover) */}
              <span className="hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 max-w-sm p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-2xl rounded-md border border-zinc-200 dark:border-zinc-800 text-left font-sans text-xs text-zinc-800 dark:text-zinc-200 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
                <span className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">PEEK DEFINITION</span>
                  <span className="uppercase">{keys.length > 1 ? `${keys.length} CITATIONS` : 'BIBTEX ENTRY'}</span>
                </span>
                <span className="space-y-2.5">
                  {keys.map((k, kIdx) => {
                    const entry = bibtexMap.get(k);
                    return (
                      <span key={kIdx} className="block space-y-1">
                        <span className="flex items-center justify-between text-[11px] font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[180px]">
                            @{entry?.type || 'ref'}{'{'}{k}{'}'}
                          </span>
                          {entry?.year && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                              {entry.year}
                            </span>
                          )}
                        </span>
                        {entry ? (
                          <>
                            <span className="block text-[11px] font-medium text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                              {entry.title || '(No title in BibTeX entry)'}
                            </span>
                            {entry.author && (
                              <span className="block text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                                {entry.author}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="block text-[10px] text-rose-500 dark:text-rose-400 italic">
                            Unresolved: "{k}" not found in .bib database
                          </span>
                        )}
                      </span>
                    );
                  })}
                </span>
              </span>
            </span>
          );
        }

        return <span key={subKey}>{subPart}</span>;
      });
    });
  };

  // Segmentation Engine: separates parsed text into claims and neutral text
  const renderedContent = useMemo(() => {
    const textToRender = parsedText || rawText;

    if (!textToRender) {
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
          content: textToRender.slice(currentIndex, claim.startIndex),
        });
      }

      if (claim.endIndex > claim.startIndex) {
        segments.push({
          type: 'claim',
          content: textToRender.slice(claim.startIndex, claim.endIndex),
          claim,
        });
        currentIndex = claim.endIndex;
      }
    }

    if (currentIndex < textToRender.length) {
      segments.push({
        type: 'text',
        content: textToRender.slice(currentIndex),
      });
    }

    return segments.map((seg, sIdx) => {
      const segmentKey = `seg-${sIdx}`;
      if (seg.type === 'claim' && seg.claim) {
        const claim = seg.claim;
        const isActive = activeClaim?.id === claim.id;

        return (
          <ClaimHighlight
            key={segmentKey}
            ref={isActive ? activeClaimRef : undefined}
            claim={claim}
            isActive={isActive}
            onClick={() => {
              const targetIdx = filteredClaims.findIndex((c) => c.id === claim.id);
              if (targetIdx !== -1) setActiveClaimIndex(targetIdx);
            }}
          >
            {renderRichContent(seg.content, segmentKey)}
          </ClaimHighlight>
        );
      }

      return <span key={segmentKey}>{renderRichContent(seg.content, segmentKey)}</span>;
    });
  }, [parsedText, rawText, filteredClaims, mathBlocks, activeClaim, bibtexMap, setActiveClaimIndex]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 select-text overflow-hidden transition-colors">
      {/* 1. Header Bar */}
      <div className="h-9 px-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 backdrop-blur font-sans text-xs text-zinc-600 dark:text-zinc-400 flex-shrink-0">
        <div className="flex items-center space-x-2.5 truncate">
          <span className="flex h-2 w-2 relative">
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isAuditing ? 'bg-amber-500' : 'bg-emerald-500')} />
            <span className={cn('relative inline-flex rounded-full h-2 w-2', isAuditing ? 'bg-amber-500' : 'bg-emerald-500')} />
          </span>
          <span className="text-zinc-900 dark:text-zinc-200 font-semibold truncate max-w-xs font-mono text-[11px]">{documentTitle}</span>
          <span className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-700 uppercase">
            {fileFormat}
          </span>
          {bibtexContent && (
            <span className="px-1.5 py-0.2 text-[9px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-500/30 flex items-center gap-1">
              BIBTEX: {bibtexMap.size} REFS
            </span>
          )}
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

      {/* 2. Main Inspection Canvas with Line Numbers & Anomaly Minimap */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Optical Line Gutter */}
        <div className="w-9 bg-zinc-50/60 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-900 flex flex-col items-center py-5 select-none font-mono text-[10px] text-zinc-400 dark:text-zinc-600 flex-shrink-0">
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
          className="flex-1 overflow-y-auto p-6 md:p-8 pr-6 font-serif leading-relaxed text-sm md:text-base tracking-normal text-zinc-800 dark:text-zinc-200 selection:bg-emerald-500/25 space-y-4"
        >
          <div className="max-w-3xl mx-auto whitespace-pre-wrap font-sans">
            {renderedContent}
          </div>
        </div>

        {/* Anomaly Minimap Rail (12px / w-3 right-edge VS Code style) */}
        <div className="absolute right-0 top-0 bottom-0 w-3 bg-zinc-100/60 dark:bg-zinc-900/50 border-l border-zinc-200 dark:border-zinc-800/80 z-20 select-none overflow-hidden">
          {claims.map((claim, idx) => {
            const totalLen = (parsedText || rawText || '').length || 1;
            const topPercent = Math.min(Math.max((claim.startIndex / totalLen) * 100, 1), 98);
            const isCurrent = activeClaim?.id === claim.id;

            let tickColor = 'bg-sky-400';
            if (claim.severity === 'High') tickColor = 'bg-red-500';
            else if (claim.severity === 'Medium') tickColor = 'bg-yellow-500';

            return (
              <div
                key={claim.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  const targetIdx = filteredClaims.findIndex((c) => c.id === claim.id);
                  if (targetIdx !== -1) setActiveClaimIndex(targetIdx);
                }}
                style={{ top: `${topPercent}%` }}
                title={`[${claim.severity}] ${claim.text.slice(0, 60)}...`}
                className={cn(
                  'absolute left-0 right-0 h-[2px] cursor-pointer transition-all duration-150 hover:h-[4px] hover:z-30',
                  tickColor,
                  isCurrent && 'h-[4px] bg-emerald-500 ring-1 ring-emerald-400 z-30'
                )}
              />
            );
          })}

          {/* Current Viewport Scroll Indicator */}
          <div
            style={{ top: `${Math.min(Math.max(scrollProgress, 0), 94)}%` }}
            className="absolute left-0 right-0 h-4 border border-zinc-400/50 dark:border-zinc-500/50 bg-zinc-400/10 pointer-events-none rounded-[1px]"
          />
        </div>
      </div>

      {/* 3. Footer Bar */}
      <div className="h-6 px-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500 flex-shrink-0">
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