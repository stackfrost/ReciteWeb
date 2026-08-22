'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

export const PdfPreviewPane: React.FC = () => {
  const { rawLatex, pdfBlobUrl, isCompilingPdf, compilationLog, lastCompileTimeMs, compileCurrentDocument } = useEditorStore();
  const [showLogs, setShowLogs] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-compilation (500ms after user stops typing)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      compileCurrentDocument();
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [rawLatex, compileCurrentDocument]);

  return (
    <div className="flex flex-col h-full bg-neutral-950 border-l border-neutral-800 text-neutral-200">
      {/* Top Preview Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-900/90 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-300">Live PDF</span>
          {isCompilingPdf ? (
            <span className="flex items-center gap-1 text-sky-400">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Compiling...
            </span>
          ) : (
            <span className="text-[11px] text-neutral-500 font-mono">
              {lastCompileTimeMs > 0 ? `${Math.round(lastCompileTimeMs)}ms` : 'Ready'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
          >
            -
          </button>
          <span className="text-[11px] font-mono text-neutral-400 w-10 text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
            className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
          >
            +
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`ml-2 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              showLogs ? 'bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            Logs
          </button>
        </div>
      </div>

      {/* PDF Display Container */}
      <div className="flex-1 relative bg-neutral-900/40 overflow-hidden flex items-center justify-center">
        {pdfBlobUrl ? (
          <iframe
            src={`${pdfBlobUrl}#zoom=${zoomLevel}`}
            className="w-full h-full border-none"
            title="PDF Preview"
          />
        ) : (
          <div className="text-xs text-neutral-500 text-center p-6">
            {isCompilingPdf ? 'Compiling document preview...' : 'Enter LaTeX content to generate a live PDF.'}
          </div>
        )}
      </div>

      {/* Expandable Compiler Log Drawer */}
      {showLogs && (
        <div className="h-44 bg-neutral-950 border-t border-neutral-800 p-3 font-mono text-[11px] overflow-y-auto text-neutral-400 select-text">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-neutral-800 text-neutral-500 font-sans text-xs">
            <span>TeX Compilation Log</span>
            <button onClick={() => setShowLogs(false)} className="hover:text-white">✕</button>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed">{compilationLog || 'No log output available.'}</pre>
        </div>
      )}
    </div>
  );
};
export default PdfPreviewPane;
