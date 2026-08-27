'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useReciteStore } from '@/lib/store';
import type { Claim } from '@/lib/store';
import { cn } from '@/lib/utils';
import MathBlock from './MathBlock';
import ClaimHighlight from './ClaimHighlight';
import ASTBreadcrumbs from './ASTBreadcrumbs';
import { BibTeXParser } from '@/services/bibtex-parser';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import { FileCode2, ChevronRight, WrapText, AlignLeft } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// § MODULE-LEVEL KaTeX LRU CACHE
// Avoids re-running katex.renderToString + DOMPurify.sanitize for the same
// formula on every re-render triggered by scroll/cursor store mutations.
// Cap at 512 entries to bound memory usage on 10k-line manuscripts.
// ─────────────────────────────────────────────────────────────────────────────

const KATEX_CACHE_MAX = 512;
const katexCache = new Map<string, string>();

function renderKatexCached(formula: string, displayMode: boolean): string {
  const cacheKey = `${displayMode ? 'D' : 'I'}:${formula}`;
  const cached = katexCache.get(cacheKey);
  if (cached !== undefined) return cached;

  let html: string;
  try {
    html = katex.renderToString(formula, { displayMode, throwOnError: false });
    html = safeKatexHtml(html);
  } catch {
    html = formula;
  }

  // Evict oldest entry when cap is reached (FIFO via Map insertion order)
  if (katexCache.size >= KATEX_CACHE_MAX) {
    katexCache.delete(katexCache.keys().next().value!);
  }
  katexCache.set(cacheKey, html);
  return html;
}

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
  // ── High-frequency selectors (scroll/cursor) ─────────────────────────────────
  // These fire on every scroll/click tick. Keeping them as separate atomic
  // subscriptions means only the minimap scroll indicator re-renders on scroll,
  // NOT the expensive renderedContent paragraph tree.
  const activeLineHighlight = useReciteStore((s) => s.activeLineHighlight);
  const softWrap    = useReciteStore((s) => s.softWrap);
  const setSoftWrap = useReciteStore((s) => s.setSoftWrap);

  // ── Render-critical selectors ─────────────────────────────────────────────
  const parsedText         = useReciteStore((s) => s.parsedText);
  const rawText            = useReciteStore((s) => s.rawText);
  const mathBlocks         = useReciteStore((s) => s.mathBlocks);
  const claims             = useReciteStore((s) => s.claims);
  const filteredClaims     = useReciteStore((s) => s.filteredClaims);
  const activeClaimIndex   = useReciteStore((s) => s.activeClaimIndex);
  const setActiveClaimIndex = useReciteStore((s) => s.setActiveClaimIndex);
  const nextClaim          = useReciteStore((s) => s.nextClaim);
  const prevClaim          = useReciteStore((s) => s.prevClaim);
  const documentTitle      = useReciteStore((s) => s.documentTitle);
  const fileFormat         = useReciteStore((s) => s.fileFormat);
  const isAuditing         = useReciteStore((s) => s.isAuditing);
  const bibtexContent      = useReciteStore((s) => s.bibtexContent);

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

  // Auto-scroll to active claim
  useEffect(() => {
    if (activeClaimRef.current) {
      activeClaimRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeClaimIndex, activeLineHighlight]);

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

  // Track scroll progress
  const rafScrollRef = useRef<number | null>(null);
  const rafCursorRef = useRef<number | null>(null);

  const handleScroll = () => {
    if (rafScrollRef.current !== null) return;
    rafScrollRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const total = scrollHeight - clientHeight;
        const progress = total > 0 ? (scrollTop / total) * 100 : 0;
        setScrollProgress(progress);
        
        const scrollLine = Math.floor(scrollTop / 24);
        useReciteStore.getState().setScrollLine(scrollLine);
      }
      rafScrollRef.current = null;
    });
  };

  const updateCursorOffset = () => {
    if (rafCursorRef.current !== null) return;
    rafCursorRef.current = requestAnimationFrame(() => {
      let offset = 0;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        offset = sel.getRangeAt(0).startOffset;
      }
      useReciteStore.getState().setCursorOffset(offset);
      rafCursorRef.current = null;
    });
  };

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

  // ── 2. Rich Content Renderer (KaTeX + Citation Peek Hover Cards) ───────────
  const renderRichContent = (rawTextStr: string, keyPrefix: string) => {
    const text = rawTextStr
      .replace(/\\/g, '\\\\')
      .replace(/\[\[\s*R\s*E\s*C\s*I\s*T\s*E\s*A\s*I\s*_\s*Q\s*U\s*A\s*R\s*A\s*N\s*T\s*I\s*N\s*E[\s_A-Z0-9]*\]\]/gi, (match) => match.replace(/\s+/g, ''));

    // Split on quarantine tokens or math delimiters ($$, \[ \], $, \( \))
    const parts = text.split(/(\[\[RECITEAI_QUARANTINE_[A-Z_]+_\d+_[A-Z0-9]+\]\]|\$\$[\s\S]+?\$\$|\\\\\[[\s\S]+?\\\\\]|\$[^\$\n]+?\$|\\\\[(][^\n]+?\\\\[)])/g);

    return parts.map((part, pIdx) => {
      if (!part) return null;
      const pKey = `${keyPrefix}-p-${pIdx}`;

      // Check for placeholder math token
      if (part.startsWith('[[RECITEAI_QUARANTINE_') && mathBlocks.has(part)) {
        const mb = mathBlocks.get(part)!;
        try {
        const html = renderKatexCached(mb.rawFormula, mb.type === 'display');
          return (
            <span
              key={pKey}
              className={mb.type === 'display' ? 'block my-6 text-center max-w-full overflow-x-auto py-2 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded px-3 text-zinc-900 dark:text-zinc-100' : 'inline px-1 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-100'}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <MathBlock key={pKey} content={mb.rawFormula} isDisplay={mb.type === 'display'} />;
        }
      }

      // Check for display math $$...$$ or \[...\]
      if (
        (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) ||
        (part.startsWith('\\\[') && part.endsWith('\\\]') && part.length >= 6)
      ) {
        let formula = part.startsWith('$$') ? part.slice(2, -2) : part.slice(3, -3);
        formula = formula.trim().replace(/\\\\/g, '\\').replace(/\\t/g, '    ');
        try {
        const html = renderKatexCached(formula, true);
          return (
            <span
              key={pKey}
              className="block my-6 text-center max-w-full overflow-x-auto py-2 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded px-3 text-zinc-900 dark:text-zinc-100"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={pKey} className="font-mono text-xs">{part}</span>;
        }
      }

      // Check for inline math $...$ or \(...\)
      if (
        (part.startsWith('$') && part.endsWith('$') && part.length >= 2) ||
        (part.startsWith('\\\\(') && part.endsWith('\\\\)') && part.length >= 6)
      ) {
        let formula = part.startsWith('$') ? part.slice(1, -1) : part.slice(3, -3);
        formula = formula.trim().replace(/\\\\/g, '\\').replace(/\\t/g, ' ');
        try {
        const html = renderKatexCached(formula, false);
          return (
            <span
              key={pKey}
              className="inline px-1 bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded text-zinc-900 dark:text-zinc-100"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <span key={pKey} className="font-mono text-xs">{part}</span>;
        }
      }

      // 2. In non-math text, detect \cite{...} commands
      const citeRegex = /(\\\\cite[a-zA-Z]*\{[^}]+\})/g;
      const subParts = part.split(citeRegex);

      return subParts.map((subPart, sIdx) => {
        const subKey = `${pKey}-s-${sIdx}`;
        const match = subPart.match(/^\\\\cite[a-zA-Z]*\{([^}]+)\}$/);

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

  // ── 3. Segmentation Engine ────────────────────────────────────────────────
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
      claim?: Claim;
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

    // Split segments into paragraphs by \n\n
    type SeverityType = 'Critical' | 'High' | 'Medium' | 'Low' | null;
    const paragraphs: { 
      id: string; 
      segments: Segment[]; 
      hasUnresolvedClaim: boolean; 
      severityType: SeverityType;
      isDiscovery: boolean;
      startLine: number;
      primaryClaim?: Claim;
    }[] = [];
    let currentParagraph: Segment[] = [];
    let hasUnresolved = false;
    let highestSeverity: SeverityType = null;
    let isDiscoveryClaim = false;
    let currentLineNumber = 1;
    let currentParagraphStartLine = 1;
    let primaryClaimInPara: Claim | undefined = undefined;

    segments.forEach((seg) => {
      const parts = seg.content.split(/\n\n/);
      
      parts.forEach((part, i) => {
        if (i > 0) {
          paragraphs.push({ 
            id: `para-${paragraphs.length}`, 
            segments: currentParagraph, 
            hasUnresolvedClaim: hasUnresolved,
            severityType: highestSeverity,
            isDiscovery: isDiscoveryClaim,
            startLine: currentParagraphStartLine,
            primaryClaim: primaryClaimInPara,
          });
          currentParagraph = [];
          hasUnresolved = false;
          highestSeverity = null;
          isDiscoveryClaim = false;
          primaryClaimInPara = undefined;
          currentLineNumber += 2;
          currentParagraphStartLine = currentLineNumber;
        }
        
        if (part.length > 0 || seg.type === 'claim') {
          currentParagraph.push({
            ...seg,
            content: part,
          });
          
          if (seg.type === 'claim' && seg.claim) {
            primaryClaimInPara = seg.claim;
            if (seg.claim.status !== 'accepted' && !seg.claim.isRetracted) {
              hasUnresolved = true;
              const sev = seg.claim.severity;
              if (sev === 'Critical' || (sev === 'High' && highestSeverity !== 'Critical') || (sev === 'Medium' && highestSeverity !== 'Critical' && highestSeverity !== 'High') || (sev === 'Low' && highestSeverity === null)) {
                highestSeverity = sev as SeverityType;
              }
              if (seg.claim.streamType === 'discovery' || seg.claim.auditType === 'Unsupported Assertion' || seg.claim.auditType === 'Weak Attribution') {
                isDiscoveryClaim = true;
              }
            } else if (seg.claim.isRetracted) {
              hasUnresolved = true;
              highestSeverity = 'Critical';
            }
          }
        }
        
        const newlineCount = (part.match(/\n/g) || []).length;
        currentLineNumber += newlineCount;
      });
    });
    
    if (currentParagraph.length > 0) {
      paragraphs.push({ 
        id: `para-${paragraphs.length}`, 
        segments: currentParagraph, 
        hasUnresolvedClaim: hasUnresolved,
        severityType: highestSeverity,
        isDiscovery: isDiscoveryClaim,
        startLine: currentParagraphStartLine,
        primaryClaim: primaryClaimInPara,
      });
    }

    return paragraphs.map((para) => {
      const isMathDisplay = para.segments.length === 1 && para.segments[0].content.trim().startsWith('$$') && para.segments[0].content.trim().endsWith('$$');
      const isHighlightedLine = activeLineHighlight !== null && Math.abs(para.startLine - activeLineHighlight) <= 2;
      const isParaActive = para.primaryClaim && activeClaim?.id === para.primaryClaim.id;

      // Click handler on gutter indicator dot to focus claim in inspector
      const handleGutterDotClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (para.primaryClaim) {
          const targetIdx = filteredClaims.findIndex((c) => c.id === para.primaryClaim!.id);
          if (targetIdx !== -1) setActiveClaimIndex(targetIdx);
        }
      };

      return (
        <div
          key={para.id}
          className={cn(
            'flex group relative transition-all duration-200 rounded-sm',
            isMathDisplay ? 'my-6' : 'mb-4',
            (isHighlightedLine || isParaActive) && 'bg-emerald-500/5 dark:bg-emerald-500/10 ring-1 ring-emerald-500/40'
          )}
        >
          {/* Gutter Line Number & Interactive Diagnostic Dot */}
          <div className="w-9 shrink-0 border-r border-zinc-200 dark:border-zinc-800/80 mr-3 flex flex-col items-end pr-1.5 pt-0.5 select-none">
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-600 leading-none">
              {para.startLine}
            </span>
            {para.hasUnresolvedClaim && (
              <button
                onClick={handleGutterDotClick}
                title={para.isDiscovery ? 'Literature Discovery Claim (Click to inspect)' : 'Mechanical Citation Fault (Click to inspect)'}
                className={cn(
                  'w-2 h-2 rounded-full mt-1.5 cursor-pointer transition-transform hover:scale-150 focus:outline-none',
                  para.severityType === 'Critical' || para.severityType === 'High'
                    ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                    : para.isDiscovery
                    ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]'
                    : 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.6)]'
                )}
              />
            )}
            {!para.hasUnresolvedClaim && para.primaryClaim && para.primaryClaim.status === 'accepted' && (
              <div
                title="Citation Verified & Resolved"
                className="w-1.5 h-1.5 rounded-full mt-1.5 bg-emerald-500"
              />
            )}
          </div>

          {/* Paragraph Content Surface */}
          <div className="flex-1 min-w-0 pr-4 break-words">
            {para.segments.map((seg, sIdx) => {
              const segmentKey = `${para.id}-seg-${sIdx}`;
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
            })}
          </div>
        </div>
      );
    });
  }, [parsedText, rawText, filteredClaims, mathBlocks, activeClaim, bibtexMap, setActiveClaimIndex, activeLineHighlight]);

  return (
    <div className="bg-white dark:bg-zinc-950 flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* ── 1. Sleek AST Breadcrumb Bar (h-7 / 28px) ────────────────────────── */}
      <ASTBreadcrumbs />

      {/* ── 2. Main Inspection Canvas with Anomaly Minimap ─────── */}
      <div className="relative flex-1 flex min-w-0 overflow-hidden bg-white dark:bg-zinc-950 transition-colors">
        {/* Scrollable Text Viewport */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          onClick={updateCursorOffset}
          onKeyUp={updateCursorOffset}
          className={cn(
            'font-sans text-[14px] text-zinc-800 dark:text-zinc-200 leading-relaxed bg-transparent resize-none outline-none border-none focus:ring-0 flex-1 min-w-0 overflow-y-auto pt-4 px-3',
            softWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
          )}
          style={{ tabSize: 2 }}
        >
          {renderedContent}
        </div>

        {/* Anomaly Minimap Rail */}
        <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-zinc-100/80 dark:bg-zinc-900/40 border-l border-zinc-200 dark:border-zinc-800 z-20 select-none overflow-hidden">
          {claims.map((claim, idx) => {
            const totalLen = (parsedText || rawText || '').length || 1;
            const topPercent = Math.min(Math.max((claim.startIndex / totalLen) * 100, 1), 98);
            const isCurrent = activeClaim?.id === claim.id;

            let tickColor = 'bg-sky-400';
            if (claim.status === 'accepted') tickColor = 'bg-emerald-500';
            else if (claim.severity === 'Critical' || claim.severity === 'High') tickColor = 'bg-rose-500';
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
                  isCurrent && 'h-[3px] bg-emerald-500 z-30 ring-1 ring-emerald-400'
                )}
              />
            );
          })}

          {/* Current Viewport Scroll Indicator */}
          <div
            style={{ top: `${Math.min(Math.max(scrollProgress, 0), 94)}%` }}
            className="absolute left-0 right-0 h-4 border border-zinc-400/50 dark:border-zinc-500/40 bg-zinc-400/20 pointer-events-none rounded-[1px]"
          />
        </div>
      </div>

      {/* ── 3. Footer Bar with Wrap Toggle & Progress ───────────────────────── */}
      <div className="h-6 px-3 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] font-sans text-zinc-500 flex-shrink-0">
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

        <div className="flex items-center space-x-3">
          {/* Soft Wrap Toggle Button */}
          <button
            onClick={() => setSoftWrap(!softWrap)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Toggle Soft Wrap"
          >
            <WrapText className="w-3 h-3" />
            <span>Wrap: <strong className="font-semibold">{softWrap ? 'On' : 'Off'}</strong></span>
          </button>

          <span className="text-zinc-300 dark:text-zinc-700">│</span>

          <div className="flex items-center space-x-1.5">
            <span>Progress:</span>
            <span className="text-zinc-700 dark:text-zinc-300 font-mono text-[10px]">{Math.round(scrollProgress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
