'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  X,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  BookOpen,
  ShieldCheck,
  PanelBottom,
  PanelRight,
  Maximize,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DockMode = 'bottom' | 'side' | 'floating';

export interface PdfEvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  authors: string[];
  year?: number | string;
  doi?: string;
  pdfPath?: string;
  evidenceQuote?: string;
  abstractText?: string;
  provenance?: 'zotero' | 'openalex' | 'crossref' | 'arxiv';
  /** When true, renders in docked (embedded) mode without floating chrome */
  isDocked?: boolean;
  /** Current dock mode */
  dockMode?: DockMode;
  /** Callback to switch dock mode */
  onDockModeChange?: (mode: DockMode) => void;
}

export const PdfEvidenceDrawer: React.FC<PdfEvidenceDrawerProps> = ({
  isOpen,
  onClose,
  title,
  authors,
  year,
  doi,
  pdfPath,
  evidenceQuote,
  abstractText,
  provenance = 'openalex',
  isDocked = false,
  dockMode = 'bottom',
  onDockModeChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [extractedPdfText, setExtractedPdfText] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const evidenceRef = useRef<HTMLDivElement>(null);

  // Auto-load extracted PDF text if in Tauri environment
  useEffect(() => {
    if (!isOpen && !isDocked) return;

    let isMounted = true;
    async function loadPdfContent() {
      if (!pdfPath) {
        setExtractedPdfText(null);
        return;
      }

      // In web app mode, extracted text is provided via props or remote endpoint
      setIsLoadingPdf(false);
      setExtractedPdfText(null);
    }

    loadPdfContent();
    return () => { isMounted = false; };
  }, [isOpen, isDocked, pdfPath]);

  // Smooth-scroll to highlighted evidence
  useEffect(() => {
    if ((isOpen || isDocked) && evidenceRef.current) {
      setTimeout(() => {
        evidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [isOpen, isDocked, evidenceQuote]);

  if (!isOpen && !isDocked) return null;

  const handleCopyQuote = () => {
    if (!evidenceQuote && !abstractText) return;
    const textToCopy = evidenceQuote || abstractText || '';
    navigator.clipboard.writeText(`"${textToCopy}" — ${authors.join(', ')} (${year})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const paragraphs = extractedPdfText
    ? extractedPdfText.split(/\n\s*\n/).filter((p) => p.trim().length > 20)
    : [];

  // ── Docked mode: compact inline panel ──────────────────────────────────
  if (isDocked) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 select-none overflow-hidden">
        {/* Compact docked header bar */}
        <div className="h-7 px-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="text-[11px] font-mono text-zinc-300 truncate">
              {title || 'Evidence Viewer'}
            </span>
            {year && (
              <span className="text-[10px] font-mono text-zinc-500">({year})</span>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {/* Dock mode toggle buttons */}
            <button
              onClick={() => onDockModeChange?.('side')}
              className={cn(
                'p-1 rounded transition-colors cursor-pointer',
                dockMode === 'side'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              )}
              title="Dock to side panel"
            >
              <PanelRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDockModeChange?.('bottom')}
              className={cn(
                'p-1 rounded transition-colors cursor-pointer',
                dockMode === 'bottom'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              )}
              title="Dock to bottom"
            >
              <PanelBottom className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDockModeChange?.('floating')}
              className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
              title="Pop out to floating window"
            >
              <Maximize className="w-3 h-3" />
            </button>

            {doi && (
              <a
                href={doi.startsWith('http') ? doi : `https://doi.org/${doi}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-sky-400 transition-colors"
                title="Open DOI"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              onClick={handleCopyQuote}
              className="p-1 rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer"
              title="Copy evidence quote"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-500 hover:bg-rose-900/60 hover:text-rose-300 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Docked content body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs font-mono">
          {/* Evidence Anchor */}
          {evidenceQuote && (
            <div
              ref={evidenceRef}
              className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded space-y-1"
            >
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                <span>Evidence Anchor</span>
              </div>
              <p className="text-emerald-100 text-[11px] italic leading-relaxed font-sans break-words">
                &ldquo;{evidenceQuote}&rdquo;
              </p>
            </div>
          )}

          {/* Abstract */}
          {abstractText && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                <BookOpen className="w-3 h-3 text-sky-400" />
                <span>Abstract</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed font-sans bg-zinc-900/60 p-2.5 rounded border border-zinc-800 break-words">
                {abstractText}
              </p>
            </div>
          )}

          {/* Loading */}
          {isLoadingPdf && (
            <div className="p-4 text-center text-zinc-500 text-[11px]">
              <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
              Extracting PDF text...
            </div>
          )}

          {/* Extracted paragraphs */}
          {paragraphs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Body ({paragraphs.length} Paragraphs)
              </span>
              {paragraphs.map((para, idx) => {
                const containsEvidence = evidenceQuote && para.toLowerCase().includes(evidenceQuote.slice(0, 30).toLowerCase());
                return (
                  <div
                    key={idx}
                    className={cn(
                      'p-2 rounded text-[11px] leading-relaxed break-words',
                      containsEvidence
                        ? 'bg-emerald-950/30 border border-emerald-500/40 text-emerald-200'
                        : 'bg-zinc-900/40 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                    )}
                  >
                    {para}
                  </div>
                );
              })}
            </div>
          )}

          {/* Local path */}
          {pdfPath && (
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between text-[10px] text-zinc-500">
              <span className="truncate">Path: {pdfPath}</span>
              <span className="text-emerald-400 font-semibold shrink-0">Indexed</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Floating mode: original overlay behavior ───────────────────────────
  return (
    <div
      className={cn(
        'fixed bottom-0 right-0 z-40 bg-zinc-950 border-t border-l border-zinc-800 shadow-2xl transition-all duration-200 flex flex-col font-sans select-none text-zinc-200',
        isMaximized
          ? 'top-10 left-64 w-[calc(100%-16rem)] h-[calc(100%-2.5rem)]'
          : 'w-[560px] h-[480px]'
      )}
    >
      {/* Header Bar */}
      <div className="h-8 px-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <h3 className="font-semibold text-xs text-zinc-100 truncate">
            {title || 'Evidence PDF Inspector'}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-zinc-400">
          <button
            onClick={handleCopyQuote}
            className="p-1.5 hover:bg-zinc-800 hover:text-zinc-200 rounded transition-colors cursor-pointer"
            title="Copy Evidence Quote"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {doi && (
            <a
              href={doi.startsWith('http') ? doi : `https://doi.org/${doi}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-zinc-800 hover:text-sky-400 rounded transition-colors"
              title="Open Online Publication (DOI)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-zinc-800 hover:text-zinc-200 rounded transition-colors cursor-pointer"
            title={isMaximized ? 'Restore View' : 'Maximize Drawer'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-rose-900/60 hover:text-rose-200 rounded transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Header Metadata Ribbon */}
      <div className="px-3 py-1.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="text-zinc-400 truncate">
            {authors.length > 0 ? authors.join(', ') : 'Unknown Authors'}
          </span>
          <span className="text-zinc-700">·</span>
          <span className="text-amber-400 font-semibold">{year || '2024'}</span>
        </div>

        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
          {provenance === 'zotero' ? 'Zotero Library' : 'Open-Access'}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans leading-relaxed">
        {/* Extracted Evidence Anchor Box */}
        {evidenceQuote && (
          <div
            ref={evidenceRef}
            className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded space-y-1.5"
          >
            <div className="flex items-center gap-1.5 font-sans font-bold text-[10px] text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Extracted Evidence Anchor</span>
            </div>
            <p className="text-emerald-100 text-[13px] italic leading-relaxed bg-zinc-950/80 p-2.5 rounded border border-emerald-500/20 break-words">
              &ldquo;{evidenceQuote}&rdquo;
            </p>
          </div>
        )}

        {/* Abstract / Full Context */}
        {abstractText && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-sans font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">
              <BookOpen className="w-3 h-3 text-sky-400" />
              <span>Publication Abstract & Context</span>
            </div>
            <p className="text-zinc-300 bg-zinc-900/60 p-3 rounded border border-zinc-800 leading-relaxed break-words">
              {abstractText}
            </p>
          </div>
        )}

        {/* In-process Extracted PDF Body Paragraphs */}
        {isLoadingPdf ? (
          <div className="p-8 text-center space-y-2 font-mono text-xs text-zinc-400">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Extracting raw PDF text from local storage...</p>
          </div>
        ) : paragraphs.length > 0 ? (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <span className="font-sans font-semibold text-[10px] text-zinc-400 uppercase tracking-wider">
              Extracted Manuscript Body ({paragraphs.length} Paragraphs)
            </span>
            {paragraphs.map((para, idx) => {
              const containsEvidence = evidenceQuote && para.toLowerCase().includes(evidenceQuote.slice(0, 30).toLowerCase());
              return (
                <div
                  key={idx}
                  className={cn(
                    'p-2.5 rounded leading-relaxed break-words',
                    containsEvidence
                      ? 'bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 font-semibold'
                      : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  )}
                >
                  {para}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Local Storage Indicator */}
        {pdfPath && (
          <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="truncate">Local Path: {pdfPath}</span>
            <span className="text-emerald-400 font-semibold shrink-0">Indexed</span>
          </div>
        )}
      </div>
    </div>
  );
};
