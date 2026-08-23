'use client';

import React, { useMemo, useRef } from 'react';
import { useReciteStore } from '@/lib/store';
import type { FilterSeverity, LLMProvider } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  RotateCcw,
  Play,
  FolderOpen,
  Cpu,
  Link2,
  Download,
  X,
} from 'lucide-react';
import { LaTeXParser } from '@/services/latex-parser';
import { BibTeXParser } from '@/services/bibtex-parser';
import { parseMathBlocks } from '@/lib/parsers/math-parser';

const PROVIDER_NAMES: Record<LLMProvider, string> = {
  anthropic:  'Claude',
  openai:     'OpenAI',
  google:     'Gemini',
  openrouter: 'OpenRouter',
  ollama:     'Ollama',
};

export default function Toolbar() {
  const {
    claims,
    rawText,
    parsedText,
    bibtexContent,
    workspace,
    isAuditing,
    auditProgress,
    filterSeverity,
    setFilterSeverity,
    llmRouter,
    setShowSettings,
    setShowExportModal,
    runAudit,
    setWorkspaceStatus,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    mountWorkspace,
    unmountWorkspace,
  } = useReciteStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';

  // ── Diagnostics Counts ─────────────────────────────────────────────────────
  const totalClaims = claims?.length || 0;
  const criticalCount = claims?.filter((c) => c.severity === 'High' || c.severity === 'Critical').length || 0;
  const medCount = claims?.filter((c) => c.severity === 'Medium').length || 0;
  const lowCount = claims?.filter((c) => c.severity === 'Low').length || 0;

  // ── Bound References Calculation ───────────────────────────────────────────
  const { boundRefsCount, totalCitationsCount } = useMemo(() => {
    const text = rawText || parsedText || '';
    if (!text) return { boundRefsCount: 0, totalCitationsCount: 0 };

    const citeKeys = LaTeXParser.findCitations(text);
    const bibMap = BibTeXParser.parse(bibtexContent || '');
    const bound = citeKeys.filter((k) => bibMap.has(k)).length;

    return {
      boundRefsCount: bound,
      totalCitationsCount: citeKeys.length,
    };
  }, [rawText, parsedText, bibtexContent]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleFilter = (severity: FilterSeverity) => {
    setFilterSeverity(filterSeverity === severity ? 'All' : severity);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setWorkspaceStatus('MOUNTING');
    const text = await file.text();
    const { text: parsed, mathBlocks } = parseMathBlocks(text);

    setRawText(text);
    setParsedText(parsed);
    setMathBlocks(mathBlocks);
    setDocumentTitle(file.name);
    setFileFormat(file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.txt') ? 'txt' : 'tex');
    mountWorkspace(file.name, file.size);
    setWorkspaceStatus('AST_PARSING');

    setTimeout(() => {
      setWorkspaceStatus('AST_PARSER_IDLE');
    }, 200);

    e.target.value = '';
  };

  const engineName = PROVIDER_NAMES[llmRouter.activeProvider] || llmRouter.activeProvider;

  return (
    <header className="h-10 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur flex items-center justify-between px-3 select-none flex-shrink-0 font-sans text-xs z-30 transition-colors overflow-hidden whitespace-nowrap">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".tex,.latex,.docx,.txt,.md"
        onChange={handleFileSelect}
      />

      {/* ── LEFT SECTION: Primary Action & Document I/O ─────────────────────── */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        {/* Primary Run Audit Button */}
        <button
          id="btn-analyze-document"
          onClick={runAudit}
          disabled={!isMounted || isAuditing}
          className={cn(
            'shrink-0 flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 rounded-md transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xs',
            !isMounted
              ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
              : isAuditing
              ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          )}
        >
          {isAuditing ? (
            <>
              <RotateCcw size={12} className="animate-spin text-yellow-500 shrink-0" />
              <span>Auditing...</span>
            </>
          ) : (
            <>
              <Play size={11} fill="currentColor" className="shrink-0" />
              <span>Run Audit</span>
              <kbd className="hidden xl:inline px-1 py-0.2 text-[9px] font-mono bg-black/20 text-white/90 rounded">
                Ctrl+↵
              </kbd>
            </>
          )}
        </button>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5 shrink-0" />

        {/* Restricted Filename Tab / Switcher Pill */}
        <div
          onClick={() => {
            if (!isMounted) fileInputRef.current?.click();
          }}
          className={cn(
            'group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors min-w-0 max-w-[130px] sm:max-w-[160px] md:max-w-[180px] shrink cursor-pointer select-none',
            isMounted
              ? 'bg-zinc-100/90 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-xs'
              : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900'
          )}
          title={isMounted ? `${workspace.fileName} (Click to switch, Ctrl+O)` : 'Open Manuscript File (Ctrl+O)'}
        >
          <FolderOpen size={13} className="shrink-0 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
          <span className="truncate min-w-0 text-xs">
            {isMounted ? workspace.fileName || 'Document' : 'Open File...'}
          </span>
          {isMounted && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                unmountWorkspace();
              }}
              title="Close document (Ctrl+W)"
              className="ml-auto shrink-0 p-0.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── MIDDLE SECTION: Diagnostics Summary ─────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs shrink-0">
        {auditProgress ? (
          <span className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium animate-pulse">
            <RotateCcw size={11} className="animate-spin" />
            {auditProgress}
          </span>
        ) : (
          <>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
              {totalClaims} {totalClaims === 1 ? 'issue' : 'issues'}
            </span>
            <span>·</span>

            {/* Critical Filter Pill */}
            <button
              onClick={() => handleToggleFilter('High')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer',
                filterSeverity === 'High'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-medium'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{criticalCount} Critical</span>
            </button>

            {/* Medium Filter Pill */}
            <button
              onClick={() => handleToggleFilter('Medium')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer',
                filterSeverity === 'Medium'
                  ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 font-medium'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span>{medCount} Medium</span>
            </button>

            {/* Low Filter Pill */}
            <button
              onClick={() => handleToggleFilter('Low')}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer',
                filterSeverity === 'Low'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{lowCount} Low</span>
            </button>
          </>
        )}
      </div>

      {/* ── RIGHT SECTION: Telemetry & Engine Pill ──────────────────────────── */}
      <div className="flex items-center gap-2.5 text-zinc-500 dark:text-zinc-400 shrink-0">
        {/* Linked references count */}
        <span className="hidden xl:flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <Link2 size={12} className="text-zinc-400" />
          <span>
            <strong className="text-zinc-800 dark:text-zinc-200 font-medium">{boundRefsCount}/{totalCitationsCount}</strong> references linked
          </span>
        </span>

        <span className="hidden xl:inline text-zinc-300 dark:text-zinc-800">|</span>

        {/* Flat Engine Pill */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors duration-150 cursor-pointer text-xs font-medium shadow-xs"
          title="Configure LLM Inference Engine & API Keys"
        >
          <Cpu size={13} className="text-emerald-500" />
          <span>Engine: <strong className="font-semibold">{engineName}</strong></span>
        </button>

        <span className="hidden sm:inline text-zinc-300 dark:text-zinc-800">|</span>

        {/* Export Button */}
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors duration-150 cursor-pointer text-xs font-medium border border-indigo-500/20 shadow-xs"
          title="Export Publication Package"
        >
          <Download size={13} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}