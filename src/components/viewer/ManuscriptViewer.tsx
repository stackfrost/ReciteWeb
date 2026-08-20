'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReciteStore } from '@/lib/store';
import type { Claim } from '@/lib/store';
import { cn } from '@/lib/utils';
import MathBlock from './MathBlock';
import ClaimHighlight from './ClaimHighlight';
import { BibTeXParser } from '@/services/bibtex-parser';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import { FileCode2, ChevronRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// § DOM PURIFY CONFIG
// ─────────────────────────────────────────────────────────────────────────────

function safeKatexHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const config: any = {
    ALLOWED_TAGS: [
      'span', 'div', 'math', 'mi', 'mn', 'mo', 'ms', 'mspace', 'mtext', 'merror',
      'mfrac', 'mpadded', 'mphantom', 'mroot', 'mrow', 'msqrt', 'mstyle',
      'mmultiscripts', 'mover', 'mprescripts', 'msub', 'msubsup', 'msup',
      'munder', 'munderover', 'none', 'semantics', 'annotation', 'annotation-xml',
    ],
    ALLOWED_ATTR: [
      'class', 'style', 'aria-hidden', 'href', 'title', 'xmlns', 'display',
      'mathvariant', 'mathcolor', 'mathbackground', 'mathsize', 'dir', 'id',
    ],
    PARSER_MEDIA_TYPE: 'text/html',
  };
  return DOMPurify.sanitize(html, config) as unknown as string;
}

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

  // ── 1. AST Breadcrumb Computations ─────────────────────────────────────────
  const activeSection = useMemo(() => {
    const text = rawText || parsedText || '';
    if (!text) return '§1 Introduction';

    const sectionRegex = /\\section\*?\{([^}]+)\}/g;
    let match;
    let currentSection = '§1 Introduction';
    const targetOffset = activeClaim ? activeClaim.startIndex : 0;

    while ((match = sectionRegex.exec(text)) !== null) {
      if (match.index <= targetOffset + 100) {
        currentSection = `§ ${match[1].trim()}`;
      } else {
        break;
      }
    }
    return currentSection;
  }, [rawText, parsedText, activeClaim]);

  const activeCitationTag = useMemo(() => {
    if (!activeClaim) return null;
    const match = activeClaim.text.match(/\\cite[a-zA-Z]*\{([^}]+)\}/);
    if (match) return match[0];
    if (activeClaim.suggestedPapers?.[0]?.doi) {
      return `[${activeClaim.suggestedPapers[0].authors[0] || 'Ref'}]`;
    }
    return null;
  }, [activeClaim]);

  // ── 2. Line Number & Gutter Anomaly Pin Mapping ────────────────────────────
  const textLines = useMemo(() => {
    const text = rawText || parsedText || '';
    if (!text) return [];
    return text.split('\n');
  }, [rawText, parsedText]);

  const lineCountList = useMemo(() => {
    const count = Math.max(textLines.length, 45);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [textLines]);

  const lineClaimMap = useMemo(() => {
    const text = rawText || parsedText || '';
    if (!text || !claims.length) return new Map<number, Claim>();

    const map = new Map<number, Claim>();
    const lines = text.split('\n');
    let currentOffset = 0;

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const lineStart = currentOffset;
      const lineEnd = currentOffset + lineText.length + 1;

      // Find if any claim begins or exists in this line
      const match = claims.find((c) => {
        if (c.lineIndex !== undefined && c.lineIndex === lineNum) return true;
        return c.startIndex >= lineStart && c.startIndex < lineEnd;
      });

      if (match) {
        map.set(lineNum, match);
      }

      currentOffset = lineEnd;
    });

    return map;
  }, [rawText, parsedText, claims]);

  // ── 3. Rich Content Renderer (KaTeX + Citation Peek Hover Cards) ───────────
  const renderRichContent = (text: string, keyPrefix: string) => {
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
              className={mb.type === 'display' ? 'block my-3 text-center overflow-x-auto py-1 font-mono' : 'inline-block px-0.5 font-mono'}
              dangerouslySetInnerHTML={{ __html: safeKatexHtml(html) }}
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
              className="block my-3 text-center overflow-x-auto py-1 font-mono"
              dangerouslySetInnerHTML={{ __html: safeKatexHtml(html) }}
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
              className="inline-block px-0.5 font-mono"
              dangerouslySetInnerHTML={{ __html: safeKatexHtml(html) }}
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
              {/* Peek Definition Hover Card */}
              <span className="hidden group-hover:flex flex-col absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 max-w-sm p-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-xl rounded border border-zinc-200 dark:border-zinc-800 text-left font-sans text-xs text-zinc-800 dark:text-zinc-200 pointer-events-none transition-all duration-150 animate-in fade-in zoom-in-95">
                <span className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  <span>Citation Reference</span>
                  <span className="text-[10px] text-zinc-400">{keys.length > 1 ? `${keys.length} entries` : 'BibTeX'}</span>
                </span>
                <span className="space-y-2.5">
                  {keys.map((k, kIdx) => {
                    const entry = bibtexMap.get(k);
                    return (
                      <span key={kIdx} className="block space-y-1">
                        <span className="flex items-center justify-between text-[11px] font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                          <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[180px]">
                            @{entry?.type || 'article'}{'{'}{k}{'}'}
                          </span>
                          {entry?.year && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                              {entry.year}
                            </span>
                          )}
                        </span>
                        {entry ? (
                          <>
                            <span className="block text-[11px] font-sans font-medium text-zinc-800 dark:text-zinc-200 leading-snug line-clamp-2">
                              {entry.title || '(No title)'}
                            </span>
                            {entry.author && (
                              <span className="block text-[10px] font-sans text-zinc-500 truncate">
                                {entry.author}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="block text-[10px] font-sans text-rose-500 dark:text-rose-400 italic">
                            Unresolved: &quot;{k}&quot; not found in .bib database
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

  // ── 4. Segmentation Engine ────────────────────────────────────────────────
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

  const activeLineNum = activeClaim?.lineIndex || 1;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 select-text overflow-hidden transition-colors">
      {/* ── 1. Sleek AST Breadcrumb Bar (h-7 / 28px) ────────────────────────── */}
      <div className="h-7 px-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/40 font-sans text-[12px] text-zinc-500 dark:text-zinc-400 flex-shrink-0 select-none">
        <div className="flex items-center gap-1.5 truncate">
          <FileCode2 size={13} className="text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {documentTitle || 'untitled.tex'}
          </span>
          <ChevronRight size={12} className="text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400 truncate max-w-[220px]">
            {activeSection}
          </span>
          {activeCitationTag && (
            <>
              <ChevronRight size={12} className="text-zinc-400" />
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {activeCitationTag}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span>Ln {activeLineNum}</span>
          <span>·</span>
          <span>{filteredClaims.length} findings</span>
        </div>
      </div>

      {/* ── 2. Main Inspection Canvas with Line Gutter & Anomaly Minimap ─────── */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Optical Line Gutter with Monospace Numbers & Clean Diagnostic Dots */}
        <div className="w-10 bg-zinc-50/60 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-800 flex flex-col py-6 select-none font-mono text-[11px] text-zinc-400 dark:text-zinc-600 flex-shrink-0 overflow-hidden">
          {lineCountList.map((lineNum) => {
            const claimOnLine = lineClaimMap.get(lineNum);
            const isCurrent = activeClaim && claimOnLine && activeClaim.id === claimOnLine.id;

            let dotColor = 'bg-sky-400';
            if (claimOnLine) {
              if (claimOnLine.isRetracted || claimOnLine.severity === 'High' || claimOnLine.severity === 'Critical') {
                dotColor = 'bg-rose-500';
              } else if (claimOnLine.severity === 'Medium') {
                dotColor = 'bg-amber-400';
              } else if (claimOnLine.status === 'accepted') {
                dotColor = 'bg-emerald-500';
              }
            }

            return (
              <div
                key={lineNum}
                className={cn(
                  'h-6 leading-6 px-1 flex items-center justify-between group transition-colors',
                  isCurrent && 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-semibold'
                )}
              >
                {/* Flat 6px Diagnostic Anomaly Dot */}
                <div className="w-2.5 flex items-center justify-center">
                  {claimOnLine ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetIdx = filteredClaims.findIndex((c) => c.id === claimOnLine.id);
                        if (targetIdx !== -1) setActiveClaimIndex(targetIdx);
                      }}
                      title={`[${claimOnLine.severity}] Line ${lineNum}: ${claimOnLine.text.substring(0, 60)}...`}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full cursor-pointer transition-transform hover:scale-125',
                        dotColor,
                        isCurrent && 'scale-125 ring-1 ring-zinc-400 dark:ring-zinc-500'
                      )}
                    />
                  ) : null}
                </div>

                {/* Monospace Line Number */}
                <span className="text-right pr-2 tabular-nums opacity-60 group-hover:opacity-100">
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Scrollable Text Viewport */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 md:p-8 pr-6 font-mono leading-relaxed text-sm tracking-normal text-zinc-800 dark:text-zinc-200 selection:bg-emerald-500/25 space-y-4"
        >
          <div className="max-w-3xl mx-auto whitespace-pre-wrap">
            {renderedContent}
          </div>
        </div>

        {/* Anomaly Minimap Rail */}
        <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-zinc-100/50 dark:bg-zinc-900/40 border-l border-zinc-200 dark:border-zinc-800 z-20 select-none overflow-hidden">
          {claims.map((claim, idx) => {
            const totalLen = (parsedText || rawText || '').length || 1;
            const topPercent = Math.min(Math.max((claim.startIndex / totalLen) * 100, 1), 98);
            const isCurrent = activeClaim?.id === claim.id;

            let tickColor = 'bg-sky-400';
            if (claim.severity === 'High') tickColor = 'bg-rose-500';
            else if (claim.severity === 'Medium') tickColor = 'bg-amber-400';

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
                  'absolute left-0 right-0 h-[2px] cursor-pointer transition-all duration-150 hover:h-[3px] hover:z-30',
                  tickColor,
                  isCurrent && 'h-[3px] bg-emerald-500 z-30'
                )}
              />
            );
          })}

          {/* Current Viewport Scroll Indicator */}
          <div
            style={{ top: `${Math.min(Math.max(scrollProgress, 0), 94)}%` }}
            className="absolute left-0 right-0 h-4 border border-zinc-400/40 dark:border-zinc-500/40 bg-zinc-400/10 pointer-events-none rounded-[1px]"
          />
        </div>
      </div>

      {/* ── 3. Footer Bar ──────────────────────────────────────────────────── */}
      <div className="h-6 px-3 bg-zinc-50/80 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-sans text-zinc-500 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span>Target:</span>
          <span className="text-zinc-700 dark:text-zinc-300 font-mono text-[10px]">
            {activeClaim ? `[${activeClaim.startIndex} : ${activeClaim.endIndex}]` : 'None'}
          </span>
          {activeClaim && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">{activeClaim.category}</span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span>Progress:</span>
          <span className="text-zinc-700 dark:text-zinc-300 font-mono text-[10px]">{Math.round(scrollProgress)}%</span>
        </div>
      </div>
    </div>
  );
}
