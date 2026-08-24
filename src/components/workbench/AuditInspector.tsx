'use client';

import React from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useAuditStore } from '@/store/useAuditStore';
import { Check, Sparkles, BookOpen, GitCompare, Database, ExternalLink, RotateCcw } from 'lucide-react';

export const AuditInspector: React.FC = () => {
  const {
    findings,
    selectedFindingId,
    setSelectedFindingId,
    activeFilter,
    setActiveFilter,
    activeTab,
    setActiveTab,
    resolveFinding,
  } = useAuditStore();

  const filteredFindings = findings.filter(
    (f) => activeFilter === 'all' || f.category === activeFilter
  );
  const selectedFinding =
    findings.find((f) => f.id === selectedFindingId) || findings[0];

  const bibMismatchCount = findings.filter(
    (f) => f.category === 'bib_mismatch'
  ).length;
  const discoveryCount = findings.filter(
    (f) => f.category === 'literature_discovery'
  ).length;

  const criticalCount = findings.filter(
    (f) => (f.severity?.toLowerCase() === 'critical' || f.severity?.toLowerCase() === 'high') && f.status === 'unresolved'
  ).length;
  const mediumCount = findings.filter(
    (f) => f.severity?.toLowerCase() === 'medium' && f.status === 'unresolved'
  ).length;

  return (
    <aside className="w-[480px] shrink-0 h-full bg-[#0E1114] flex flex-col overflow-hidden text-xs select-none">
      <PanelGroup orientation="vertical" className="h-full w-full min-w-0">
        {/* Top Pane: Problems Table & Filters */}
        <Panel defaultSize={45} minSize={25} maxSize={75} className="flex flex-col overflow-hidden min-w-0">
          {/* Section 1: Findings Table Header & Filter Buttons */}
          <div className="p-2.5 border-b border-[#21262D] space-y-2 bg-[#12161A] shrink-0 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-neutral-200">Problems</span>
                <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 rounded font-mono text-[10px]">
                  {findings.length}
                </span>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const { useReciteStore } = require('@/lib/store');
                      useReciteStore.getState().undoLastPatch();
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded font-mono text-[10px] transition-colors cursor-pointer ml-1"
                  title="Undo last applied patch (Ctrl+Z)"
                >
                  <RotateCcw className="w-2.5 h-2.5" /> Undo
                </button>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <span className="text-rose-400 font-semibold">{criticalCount} Critical</span>
                <span className="text-neutral-600">·</span>
                <span className="text-amber-400 font-semibold">{mediumCount} Medium</span>
              </div>
            </div>

            {/* Dual-Stream Filter Buttons */}
            <div className="grid grid-cols-3 gap-1 bg-[#0A0C0E] p-1 rounded border border-[#21262D] font-mono text-[10px]">
              <button
                onClick={() => setActiveFilter('all')}
                className={`py-1 rounded text-center truncate transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#21262D] text-white font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All ({findings.length})
              </button>
              <button
                onClick={() => setActiveFilter('bib_mismatch')}
                className={`py-1 rounded text-center truncate flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeFilter === 'bib_mismatch'
                    ? 'bg-[#21262D] text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Database className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">Bib Mismatches ({bibMismatchCount})</span>
              </button>
              <button
                onClick={() => setActiveFilter('literature_discovery')}
                className={`py-1 rounded text-center truncate flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  activeFilter === 'literature_discovery'
                    ? 'bg-[#21262D] text-sky-400 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">Discoveries ({discoveryCount})</span>
              </button>
            </div>
          </div>

          {/* Section 2: Interactive Problems Table */}
          <div className="flex-1 overflow-y-auto font-mono text-[11px] bg-[#0A0C0E] min-w-0">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="sticky top-0 border-b border-[#21262D] text-neutral-500 text-[10px] bg-[#0A0C0E] z-10">
                  <th className="p-2 w-12">Line</th>
                  <th className="p-2 w-20">Severity</th>
                  <th className="p-2 w-32">Type</th>
                  <th className="p-2">Citation / Claim</th>
                  <th className="p-2 w-16">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B2026]">
                {filteredFindings.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedFindingId(item.id)}
                    className={`cursor-pointer transition-colors ${
                      item.id === selectedFinding?.id
                        ? 'bg-[#1A2027] text-white'
                        : 'hover:bg-[#14181D] text-neutral-400'
                    }`}
                  >
                    <td className="p-2 text-sky-400 font-semibold truncate">L{item.line}</td>
                    <td className="p-2 truncate">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          item.severity?.toLowerCase() === 'critical' || item.severity?.toLowerCase() === 'high'
                            ? 'text-rose-400'
                            : item.severity?.toLowerCase() === 'medium'
                            ? 'text-amber-400'
                            : 'text-sky-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.severity?.toLowerCase() === 'critical' || item.severity?.toLowerCase() === 'high'
                              ? 'bg-rose-400'
                              : item.severity?.toLowerCase() === 'medium'
                              ? 'bg-amber-400'
                              : 'bg-sky-400'
                          }`}
                        />{' '}
                        <span className="truncate">{item.severity?.toLowerCase() === 'critical' || item.severity?.toLowerCase() === 'high' ? 'Critical' : item.severity?.toLowerCase() === 'medium' ? 'Medium' : 'Low'}</span>
                      </span>
                    </td>
                    <td className="p-2 text-neutral-300 truncate">{item.type}</td>
                    <td className="p-2 truncate text-neutral-300">{item.citationKey || item.claimText || 'N/A'}</td>
                    <td className="p-2 text-neutral-500 capitalize truncate">
                      <span className={item.status === 'resolved' ? 'text-emerald-400 font-semibold' : ''}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Vertical Resize Handle */}
        <PanelResizeHandle className="h-1 bg-[#1F242C] hover:bg-sky-500 active:bg-sky-400 transition-colors cursor-row-resize flex items-center justify-center relative group z-20 shrink-0">
          <div className="w-8 h-0.5 bg-[#3B4252] rounded-full group-hover:bg-white group-active:bg-white" />
        </PanelResizeHandle>

        {/* Bottom Pane: Remediation & Verified Literature Inspector */}
        <Panel defaultSize={55} minSize={25} className="flex flex-col overflow-hidden bg-[#0B0E11] min-w-0">
          {/* Tab Selection */}
          <div className="flex items-center border-b border-[#21262D] bg-[#12161A] text-[11px] font-medium text-neutral-400 shrink-0 min-w-0">
            <button
              onClick={() => setActiveTab('remediation')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors cursor-pointer truncate ${
                activeTab === 'remediation'
                  ? 'border-emerald-500 text-emerald-400 bg-[#161B20]'
                  : 'border-transparent hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Remediation & Diff</span>
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors cursor-pointer truncate ${
                activeTab === 'sources'
                  ? 'border-sky-500 text-sky-400 bg-[#161B20]'
                  : 'border-transparent hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Verified Sources ({selectedFinding?.verifiedSources?.length || 0})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs min-w-0">
            {selectedFinding && activeTab === 'remediation' && (
              <>
                {/* Manuscript Context */}
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    Manuscript Context
                  </span>
                  <div className="p-2.5 bg-[#14181D] border border-[#21262D] rounded-md italic text-neutral-300 leading-relaxed font-serif text-[13px] break-words">
                    "{selectedFinding.context}"
                  </div>
                </div>

                {/* Suggested Remediation Diff */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                      Suggested Remediation
                    </span>
                    {selectedFinding.status !== 'resolved' ? (
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            const { useReciteStore } = require('@/lib/store');
                            const reciteStore = useReciteStore.getState();
                            if (selectedFinding.suggestedPatch) {
                              const { AtomicPatchEngine } = require('@/services/atomic-patch-engine');
                              const { updatedTex } = AtomicPatchEngine.applyPatchToManuscript(
                                reciteStore.rawText || reciteStore.parsedText || '',
                                reciteStore.bibtexContent,
                                selectedFinding.suggestedPatch.diffRemove,
                                selectedFinding.suggestedPatch.diffAdd,
                                selectedFinding.id
                              );
                              reciteStore.setRawText(updatedTex);
                              reciteStore.setParsedText(updatedTex);
                              AtomicPatchEngine.persistToDisk(
                                reciteStore.workspace.fileName || 'main.tex',
                                updatedTex,
                                reciteStore.workspace.bibPath || 'references.bib',
                                reciteStore.bibtexContent
                              );
                              reciteStore.addToast('Remediation patch applied to manuscript.', 'success');
                            }
                            resolveFinding(selectedFinding.id);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-mono text-[10px] font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        <Check className="w-3 h-3" /> Apply Patch
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px] font-semibold shrink-0">
                        <Check className="w-3 h-3" /> Patch Resolved
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-[#0D1013] border border-[#21262D] rounded-md font-mono text-[11px] space-y-2 min-w-0">
                    {selectedFinding.suggestedPatch?.diffRemove && (
                      <div className="p-2 bg-rose-950/30 border-l-2 border-rose-500 text-rose-300 leading-normal break-words whitespace-pre-wrap">
                        - {selectedFinding.suggestedPatch.diffRemove}
                      </div>
                    )}
                    {selectedFinding.suggestedPatch?.diffAdd && (
                      <div className="p-2 bg-emerald-950/30 border-l-2 border-emerald-500 text-emerald-300 leading-normal break-words whitespace-pre-wrap">
                        + {selectedFinding.suggestedPatch.diffAdd}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {selectedFinding && activeTab === 'sources' && (
              <div className="space-y-2.5 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                    Cross-Verified Literature Candidates
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    {selectedFinding.verifiedSources?.length || 0} Candidates Found
                  </span>
                </div>

                {selectedFinding.verifiedSources && selectedFinding.verifiedSources.length > 0 ? (
                  selectedFinding.verifiedSources.map((source, i) => {
                    const matchPct = Math.round(source.relevanceScore * 100);

                    const handleInsert = () => {
                      if (typeof window !== 'undefined') {
                        const { useReciteStore } = require('@/lib/store');
                        const reciteStore = useReciteStore.getState();
                        reciteStore.insertCitationAndBib(selectedFinding.id, {
                          title: source.title,
                          year: source.year,
                          authors: source.authors,
                          venue: source.venue,
                          doi: source.doi,
                          bibtexKey: source.bibtexKey,
                          matchScore: matchPct,
                          abstractExcerpt: source.abstractExcerpt || source.abstractSnippet,
                          verificationStatus: source.verificationStatus,
                          bibtexEntry: source.bibtexEntry,
                        });
                        resolveFinding(selectedFinding.id);
                      }
                    };

                    return (
                      <div
                        key={i}
                        className="p-3 bg-[#14181D] border border-[#21262D] rounded-md space-y-2 min-w-0 hover:border-sky-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.2 bg-sky-950/80 border border-sky-500/30 text-sky-400 rounded text-[9px] font-mono font-bold">
                                {matchPct}% Match
                              </span>
                              {source.venue && (
                                <span className="text-[10px] text-neutral-400 truncate max-w-[200px]">
                                  {source.venue}
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-neutral-100 text-xs leading-snug break-words">
                              {source.title}
                            </h4>
                          </div>

                          {source.doi && (
                            <a
                              href={`https://doi.org/${source.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-neutral-400 hover:text-sky-400 transition-colors shrink-0"
                              title="Open DOI on publisher site"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <p className="text-[11px] text-neutral-400 truncate">
                          {source.authors.join(', ')} • {source.year}
                        </p>

                        {(source.abstractExcerpt || source.abstractSnippet) && (
                          <div className="p-2 bg-[#0A0C0E] rounded border border-[#1C2229] space-y-1">
                            <span className="text-[9px] font-mono text-neutral-500 uppercase">
                              Abstract Anchor Excerpt:
                            </span>
                            <p className="text-[11px] font-serif italic text-neutral-300 leading-relaxed border-l border-sky-500/50 pl-1.5">
                              "{source.abstractExcerpt || source.abstractSnippet}"
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1.5 border-t border-[#1C2229] text-[10px] font-mono">
                          <span className="text-neutral-400 truncate">
                            Key: <code className="text-amber-400 font-bold">@{source.bibtexKey}</code>
                          </span>

                          <button
                            onClick={handleInsert}
                            className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-sans font-semibold transition-colors cursor-pointer shrink-0"
                            title="Append @article to .bib and update citation key in manuscript"
                          >
                            <Check className="w-3 h-3" />
                            <span>Insert & Append .bib</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-neutral-500 font-mono text-xs">
                    No external literature candidate required for this mismatch.
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>
    </aside>
  );
};
