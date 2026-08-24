'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  X,
  ExternalLink,
  Copy,
  Check,
  Search,
  Maximize2,
  Minimize2,
  BookOpen,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

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
}) => {
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [extractedPdfText, setExtractedPdfText] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const evidenceRef = useRef<HTMLDivElement>(null);

  // Auto-load extracted PDF text if in Tauri environment
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadPdfContent() {
      if (!pdfPath) {
        setExtractedPdfText(null);
        return;
      }

      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri && !pdfPath.startsWith('http')) {
        setIsLoadingPdf(true);
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const cleanPath = pdfPath.replace(/^file:\/\//, '');
          const text = await invoke<string>('extract_pdf_text', { path: cleanPath });
          if (isMounted) setExtractedPdfText(text);
        } catch (err) {
          console.warn('[PdfEvidenceDrawer] Failed to extract text from local PDF:', err);
          if (isMounted) setExtractedPdfText(null);
        } finally {
          if (isMounted) setIsLoadingPdf(false);
        }
      }
    }

    loadPdfContent();
    return () => { isMounted = false; };
  }, [isOpen, pdfPath]);

  // Smooth-scroll to highlighted evidence
  useEffect(() => {
    if (isOpen && evidenceRef.current) {
      setTimeout(() => {
        evidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [isOpen, evidenceQuote]);

  if (!isOpen) return null;

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

  return (
    <div
      className={`fixed bottom-0 right-0 z-40 bg-[#0E1115] border-t border-l border-[#262C34] shadow-2xl transition-all duration-200 flex flex-col font-sans select-none text-neutral-200 ${
        isMaximized
          ? 'top-10 left-64 w-[calc(100%-16rem)] h-[calc(100%-2.5rem)]'
          : 'w-[560px] h-[480px]'
      }`}
    >
      {/* Header Bar */}
      <div className="h-10 px-3.5 bg-[#14181D] border-b border-[#21262D] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded bg-rose-950/60 border border-rose-500/30 text-rose-400">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-xs text-neutral-100 truncate">
              {title || 'Evidence PDF Inspector'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-neutral-400">
          <button
            onClick={handleCopyQuote}
            className="p-1.5 hover:bg-[#21262D] hover:text-neutral-200 rounded transition-colors cursor-pointer"
            title="Copy Evidence Quote"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {doi && (
            <a
              href={doi.startsWith('http') ? doi : `https://doi.org/${doi}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-[#21262D] hover:text-sky-400 rounded transition-colors"
              title="Open Online Publication (DOI)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-[#21262D] hover:text-neutral-200 rounded transition-colors cursor-pointer"
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
      <div className="px-3.5 py-2 bg-[#101418] border-b border-[#1C2229] flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="text-neutral-400 truncate">
            {authors.length > 0 ? authors.join(', ') : 'Unknown Authors'}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-amber-400 font-semibold">{year || '2024'}</span>
        </div>

        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-950/80 border border-teal-500/30 text-teal-300 shrink-0">
          {provenance === 'zotero' ? 'Personal Zotero Library' : 'Open-Access Record'}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-serif leading-relaxed">
        {/* Extracted Evidence Anchor Box */}
        {evidenceQuote && (
          <div
            ref={evidenceRef}
            className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg space-y-1.5 shadow-sm"
          >
            <div className="flex items-center gap-1.5 font-sans font-bold text-[10px] text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Extracted Evidence Anchor Quote</span>
            </div>
            <p className="text-emerald-100 text-[13px] italic leading-relaxed bg-[#0A0D10]/80 p-2.5 rounded border border-emerald-500/20 break-words">
              "{evidenceQuote}"
            </p>
          </div>
        )}

        {/* Abstract / Full Context */}
        {abstractText && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-sans font-semibold text-[10px] text-neutral-400 uppercase tracking-wider">
              <BookOpen className="w-3 h-3 text-sky-400" />
              <span>Publication Abstract & Context</span>
            </div>
            <p className="text-neutral-300 bg-[#12161A] p-3 rounded border border-[#21262D] leading-relaxed break-words">
              {abstractText}
            </p>
          </div>
        )}

        {/* In-process Extracted PDF Body Paragraphs */}
        {isLoadingPdf ? (
          <div className="p-8 text-center space-y-2 font-mono text-xs text-neutral-400">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Extracting raw PDF text from local storage...</p>
          </div>
        ) : paragraphs.length > 0 ? (
          <div className="space-y-3 pt-2 border-t border-[#21262D]">
            <span className="font-sans font-semibold text-[10px] text-neutral-400 uppercase tracking-wider">
              Extracted Manuscript Body ({paragraphs.length} Paragraphs)
            </span>
            {paragraphs.map((para, idx) => {
              const containsEvidence = evidenceQuote && para.toLowerCase().includes(evidenceQuote.slice(0, 30).toLowerCase());
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded leading-relaxed break-words ${
                    containsEvidence
                      ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 font-semibold'
                      : 'bg-[#12161A]/60 text-neutral-400 hover:text-neutral-200 border border-[#1A2026]'
                  }`}
                >
                  {para}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Local Storage Indicator */}
        {pdfPath && (
          <div className="p-2.5 bg-[#12161A] border border-[#21262D] rounded flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span className="truncate">Local Path: {pdfPath}</span>
            <span className="text-emerald-400 font-semibold shrink-0">Indexed</span>
          </div>
        )}
      </div>
    </div>
  );
};
