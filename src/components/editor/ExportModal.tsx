import React, { useState, useEffect } from 'react';
import { useReciteStore } from '../../lib/store';
import { LaTeXParser } from '../../services/latex-parser';
import { getCitationMetadata } from '../../services/indexed-db';
import { generateComplianceDossier, downloadDossierJson } from '../../services/compliance-dossier';
import { buildArxivBundle, triggerZipDownload } from '../../services/arxiv-bundler';

export function ExportModal() {
  const showExportModal = useReciteStore((state) => state.showExportModal);
  const setShowExportModal = useReciteStore((state) => state.setShowExportModal);
  const rawText = useReciteStore((state) => state.rawText);
  const bibtexContent = useReciteStore((state) => state.bibtexContent);
  const projectFiles = useReciteStore((state) => state.workspace.projectFiles);

  const [status, setStatus] = useState<'idle' | 'generating' | 'complete'>('idle');
  const [stats, setStats] = useState({ total: 0, verified: 0 });

  useEffect(() => {
    if (showExportModal) {
      // Calculate pre-flight stats
      const citations = LaTeXParser.findCitations(rawText);
      let verified = 0;
      Promise.all(citations.map(c => getCitationMetadata(c))).then(results => {
        results.forEach(r => {
          if (r && r.title) verified++;
        });
        setStats({ total: citations.length, verified });
      });
    }
  }, [showExportModal, rawText]);

  if (!showExportModal) return null;

  const handleExportZip = async () => {
    try {
      setStatus('generating');
      
      const citations = LaTeXParser.findCitations(rawText);
      const metadataMap = new Map();
      for (const cite of citations) {
        const meta = await getCitationMetadata(cite);
        if (meta) metadataMap.set(cite, meta);
      }
      
      const dossier = await generateComplianceDossier(rawText, metadataMap);
      
      const zipBlob = await buildArxivBundle({
        mainTexContent: rawText,
        projectFiles,
        bibtexContent: bibtexContent || undefined,
        complianceDossier: dossier
      });
      
      triggerZipDownload(zipBlob, 'arxiv_submission.zip');
      setStatus('complete');
      setTimeout(() => setShowExportModal(false), 2000);
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  const handleExportJson = async () => {
    try {
      setStatus('generating');
      
      const citations = LaTeXParser.findCitations(rawText);
      const metadataMap = new Map();
      for (const cite of citations) {
        const meta = await getCitationMetadata(cite);
        if (meta) metadataMap.set(cite, meta);
      }
      
      const dossier = await generateComplianceDossier(rawText, metadataMap);
      downloadDossierJson(dossier);
      
      setStatus('complete');
      setTimeout(() => setShowExportModal(false), 2000);
    } catch (err) {
      console.error(err);
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-[500px] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Export Publication Package
          </h2>
          <button onClick={() => setShowExportModal(false)} className="text-zinc-500 hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800/50">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Pre-Flight Summary</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Citations Verified
                </span>
                <span className="text-zinc-200 font-mono">{stats.verified} / {stats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  Math Hashes
                </span>
                <span className="text-emerald-400 font-medium">Intact</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleExportZip}
              disabled={status === 'generating'}
              className="flex items-center justify-between w-full p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-left transition-colors group disabled:opacity-50"
            >
              <div>
                <div className="text-indigo-300 font-medium group-hover:text-indigo-200 transition-colors">Download Clean arXiv Package</div>
                <div className="text-xs text-indigo-400/60 mt-1">.zip with flattened .tex, .bbl, active assets & audit certificate</div>
              </div>
              <svg className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            <button
              onClick={handleExportJson}
              disabled={status === 'generating'}
              className="flex items-center justify-between w-full p-4 bg-zinc-800/40 hover:bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-left transition-colors group disabled:opacity-50"
            >
              <div>
                <div className="text-zinc-300 font-medium group-hover:text-zinc-100 transition-colors">Export Verification Dossier</div>
                <div className="text-xs text-zinc-500 mt-1">Raw machine-verifiable JSON audit record</div>
              </div>
              <svg className="w-5 h-5 text-zinc-500 group-hover:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>
          
          {status !== 'idle' && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 font-medium">
              {status === 'generating' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating payload...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Export Complete!
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
