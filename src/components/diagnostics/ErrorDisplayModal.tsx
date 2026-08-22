'use client';

import React, { useState } from 'react';
import { useErrorStore } from '@/store/useErrorStore';
import { diagnosticReporter } from '@/services/error-reporter';

export const ErrorDisplayModal: React.FC = () => {
  const { activeReport, isModalOpen, dismissError } = useErrorStore();
  const [copied, setCopied] = useState(false);

  if (!isModalOpen || !activeReport) return null;

  const handleCopyMarkdown = async () => {
    const markdown = diagnosticReporter.formatMarkdownReport(activeReport);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    diagnosticReporter.downloadReportBundle(activeReport);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full text-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <div>
              <h2 className="text-sm font-semibold text-white">Diagnostics & Incident Report</h2>
              <p className="text-[11px] font-mono text-neutral-400">ID: {activeReport.incidentId}</p>
            </div>
          </div>
          <button
            onClick={dismissError}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs font-sans">
          <div className="p-3 bg-rose-950/30 border border-rose-900/60 rounded-lg text-rose-200 font-mono text-[11px] break-words">
            <div className="font-bold text-rose-300 mb-1">{activeReport.errorName}</div>
            <div>{activeReport.errorMessage}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-neutral-950/50 border border-neutral-800 rounded-md">
              <span className="text-neutral-500 block">Active Format</span>
              <span className="font-mono text-neutral-300 uppercase">{activeReport.context.activeFormat || 'N/A'}</span>
            </div>
            <div className="p-2.5 bg-neutral-950/50 border border-neutral-800 rounded-md">
              <span className="text-neutral-500 block">Document Length</span>
              <span className="font-mono text-neutral-300">{activeReport.context.documentLength || 0} characters</span>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-neutral-400 mb-1">Recent Execution Log Stream:</div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-md font-mono text-[10px] text-neutral-400 max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {activeReport.recentLogs.length > 0
                ? activeReport.recentLogs.join('\n')
                : 'No logs recorded prior to incident.'}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800 bg-neutral-950/40">
          <span className="text-[10px] text-neutral-500">
            Share this bundle with the dev team for instant fix deployment.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
            >
              {copied ? '✓ Copied Markdown' : 'Copy Report'}
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors"
            >
              Download .json
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
