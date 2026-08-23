'use client';

import React, { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { fetchLiteratureRecommendations, fetchOfficialBibtex, CrossrefResult } from '@/services/crossref-client';
import { generateBibtex } from '@/utils/bibtex-generator';
import { rewriteBibtexKey, synthesizeQueryFromKey } from '@/utils/bibtex-editor';
import { stripLatexArtifacts } from '@/utils/latex-stripper';

export const IntegrityDiagnosticsPane: React.FC = () => {
  const activeFinding = useEditorStore((state) => state.activeFinding);
  const resolveFinding = useEditorStore((state) => state.resolveFinding);
  const isCacheValid = useEditorStore((state) => state.isCacheValid);
  const { fileTree, appendBibtex, injectCitationIntoTex } = useWorkspaceStore();

  const [results, setResults] = useState<CrossrefResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiError, setApiError] = useState<'RATE_LIMITED' | 'NOT_FOUND' | null>(null);

  if (!activeFinding) {
    return (
      <div className="p-4 text-neutral-500 text-xs flex items-center justify-center h-full">
        Select an issue from the Problems table to view context and remediation.
      </div>
    );
  }

  // Extract a 250-word context window around the finding's index in the target file
  const getChunkContext = (): string => {
    const file = fileTree[activeFinding.fileId];
    if (!file || !file.content) return activeFinding.claim || '';
    const start = Math.max(0, (activeFinding.index || 0) - 300);
    const end = Math.min(file.content.length, (activeFinding.index || 0) + (activeFinding.length || 100) + 300);
    const rawChunk = file.content.substring(start, end).replace(/\s+/g, ' ').trim();
    return stripLatexArtifacts(rawChunk);
  };

  const handleSearch = async () => {
    setApiError(null);
    setIsSearching(true);
    try {
      const contextChunk = getChunkContext();
      const queryToUse =
        activeFinding.type === 'Missing Citation' || activeFinding.type === 'MissingCitation'
          ? synthesizeQueryFromKey(activeFinding.key || activeFinding.claim, contextChunk)
          : activeFinding.searchQuery || contextChunk.slice(0, 120);

      const data = await fetchLiteratureRecommendations(queryToUse);
      setResults(data);
      if (data.length === 0) setApiError('NOT_FOUND');
    } catch (err: any) {
      if (err.message === 'RATE_LIMITED') setApiError('RATE_LIMITED');
      else setApiError('NOT_FOUND');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInject = async (result: CrossrefResult) => {
    let finalBibtex = await fetchOfficialBibtex(result.doi);
    const fallback = generateBibtex(result.raw);
    if (!finalBibtex) finalBibtex = fallback.bibtex;

    const keyToUse =
      activeFinding.type === 'Missing Citation' || activeFinding.type === 'MissingCitation'
        ? activeFinding.key || activeFinding.claim
        : fallback.citeKey;
    finalBibtex = rewriteBibtexKey(finalBibtex, keyToUse);

    await appendBibtex(finalBibtex);

    if (activeFinding.type === 'Needs Literature') {
      const targetFileId = activeFinding.fileId || useWorkspaceStore.getState().activeFileId || 'main.tex';
      if (targetFileId) {
        await injectCitationIntoTex(targetFileId, (activeFinding.index || 0) + (activeFinding.length || 0), keyToUse);
      }
    }

    if (resolveFinding) resolveFinding(activeFinding.id);
  };

  const renderResultsList = () => {
    if (results.length === 0) return null;
    return (
      <div className="flex flex-col gap-2 mt-2">
        {results.map((res) => (
          <div key={res.doi || res.title} className="bg-neutral-900 border border-neutral-800 p-3 rounded-md flex flex-col gap-1.5">
            <p className="font-bold text-sky-400">{res.title}</p>
            <p className="text-[10px] text-neutral-400">
              {res.authors.join(', ')} • {res.year}
            </p>
            {res.doi && (
              <a
                href={`https://doi.org/${res.doi}`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-500 hover:underline"
              >
                https://doi.org/{res.doi}
              </a>
            )}
            {activeFinding.isProtected ? (
              <div className="mt-1 w-full bg-amber-950/40 border border-amber-900/50 p-2 flex flex-col gap-1 rounded">
                <p className="text-amber-500 font-bold text-[10px] uppercase flex items-center gap-1">
                  ⚠️ Math/Environment Collision
                </p>
                <button
                  onClick={() => {
                    const fallback = generateBibtex(res.raw);
                    const keyToUse =
                      activeFinding.type === 'Missing Citation' || activeFinding.type === 'MissingCitation'
                        ? activeFinding.key || activeFinding.claim
                        : fallback.citeKey;
                    navigator.clipboard.writeText(`\\cite{${keyToUse}}`);
                  }}
                  className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded cursor-pointer mt-1 text-left w-fit"
                >
                  Copy Citation Key
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleInject(res)}
                className="mt-1 w-fit text-[10px] bg-emerald-900/40 hover:bg-emerald-800/60 border border-emerald-800/50 text-emerald-400 px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                + Accept &amp; Insert
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STATE A: Unused Reference
  // ─────────────────────────────────────────────────────────────────────────
  if (activeFinding.type === 'Unused Reference') {
    return (
      <div className="p-4 flex flex-col gap-4 overflow-y-auto h-full text-xs">
        <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-md">
          <h4 className="text-[10px] uppercase font-bold text-amber-500 mb-1">Unused Bibliography Entry</h4>
          <p className="text-neutral-300 font-mono text-[11px] break-all">{activeFinding.key}</p>
          <p className="text-neutral-400 text-[10px] mt-2">
            This entry exists in your .bib file but is never cited in the manuscript.
          </p>
        </div>
        <button
          onClick={() => resolveFinding(activeFinding.id)}
          className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-md transition-colors cursor-pointer"
        >
          Dismiss Finding
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE B: Missing Citation (Deterministic)
  // ─────────────────────────────────────────────────────────────────────────
  if (activeFinding.type === 'Missing Citation' || activeFinding.type === 'MissingCitation') {
    return (
      <div className="p-4 flex flex-col gap-4 overflow-y-auto h-full text-xs">
        <div className="bg-rose-950/30 border border-rose-900/50 p-3 rounded-md">
          <h4 className="text-[10px] uppercase font-bold text-rose-500 mb-1">Missing BibTeX Entry</h4>
          <p className="text-neutral-300 font-mono text-[11px]">{`\\cite{${activeFinding.key || activeFinding.claim}}`}</p>
          <p className="text-neutral-400 text-[10px] mt-2">
            This citation is used in the text but is missing from your .bib file. Compiler will fail.
          </p>
        </div>

        {!isCacheValid ? (
          <div className="bg-rose-950/40 border border-rose-900/50 p-3 rounded-md flex flex-col gap-2">
            <p className="font-bold text-rose-500 uppercase text-[10px]">Data Integrity Lock</p>
            <p className="text-rose-400 text-xs">
              The document has been modified since the last AI Sweep. Injection coordinates are stale. 
              Please re-run the Discovery Sweep to realign the syntax AST.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-md transition-colors cursor-pointer"
            >
              {isSearching ? 'Resolving via Crossref...' : 'Auto-Resolve via Crossref'}
            </button>

            {apiError === 'RATE_LIMITED' && (
              <p className="text-amber-500 text-xs">API rate limit reached. Please wait 10 seconds.</p>
            )}
            {apiError === 'NOT_FOUND' && (
              <p className="text-rose-500 text-xs">No matching verified DOI found.</p>
            )}

            {renderResultsList()}
          </>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE C: Needs Literature (AI Sweep)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 flex flex-col gap-4 overflow-y-auto h-full text-xs">
      <div className="bg-indigo-950/30 border border-indigo-900/50 p-3 rounded-md">
        <h4 className="text-[10px] uppercase font-bold text-indigo-400 mb-1">
          Literature Gap (Line {activeFinding.line || '--'})
        </h4>
        <p className="text-neutral-300 italic font-serif text-[12px] leading-relaxed">
          &quot;{activeFinding.claim || getChunkContext()}&quot;
        </p>
      </div>

      {!isCacheValid ? (
        <div className="bg-rose-950/40 border border-rose-900/50 p-3 rounded-md flex flex-col gap-2">
          <p className="font-bold text-rose-500 uppercase text-[10px]">Data Integrity Lock</p>
          <p className="text-rose-400 text-xs">
            The document has been modified since the last AI Sweep. Injection coordinates are stale. 
            Please re-run the Discovery Sweep to realign the syntax AST.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-md transition-colors cursor-pointer"
          >
            {isSearching ? 'Discovering Literature...' : 'Discover Literature'}
          </button>

          {apiError === 'RATE_LIMITED' && (
            <p className="text-amber-500 text-xs">API rate limit reached. Please wait 10 seconds.</p>
          )}
          {apiError === 'NOT_FOUND' && (
            <p className="text-rose-500 text-xs">No matching verified DOI found.</p>
          )}

          {renderResultsList()}
        </>
      )}
    </div>
  );
};
