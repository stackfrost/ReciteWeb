'use client';

import React, { useTransition } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

interface ProblemsTableProps {
  filter?: string;
}

export const ProblemsTable: React.FC<ProblemsTableProps> = ({ filter }) => {
  const allFindings = useEditorStore((state) => state.findings) || [];
  const findings = filter && filter !== 'all' 
    ? allFindings.filter(f => filter === 'ignored' ? f.ignored : !f.ignored) 
    : allFindings;
  const activeFindingId = useEditorStore((state) => state.activeFinding?.id);
  const setActiveFinding = useEditorStore((state) => state.setActiveFinding);
  const [isPending, startTransition] = useTransition();

  // Segment findings into Deterministic Compilation Hygiene vs Semantic AI Gaps
  const hygieneFindings = findings.filter(
    (f) => f.type === 'Missing Citation' || f.type === 'MissingCitation' || f.type === 'Unused Reference'
  );
  const semanticFindings = findings.filter(
    (f) => f.type === 'Needs Literature' || f.type === 'WeakCitation' || f.type === 'Hallucination' || f.type === 'Misattribution'
  );

  const handleSelect = (finding: any) => startTransition(() => setActiveFinding(finding));

  const handleKeyDown = (e: React.KeyboardEvent, finding: any) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(finding);
    }
  };

  const renderGroup = (title: string, groupFindings: any[], isAI: boolean) => {
    if (groupFindings.length === 0) return null;
    return (
      <div className="mb-4" role="group" aria-labelledby={`group-${title.replace(/\s+/g, '-')}`}>
        <h3
          id={`group-${title.replace(/\s+/g, '-')}`}
          className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-neutral-500 bg-neutral-900 border-y border-neutral-800"
        >
          {title} ({groupFindings.length})
        </h3>
        <div className="flex flex-col divide-y divide-neutral-800/50" role="listbox">
          {groupFindings.map((finding) => (
            <div
              key={finding.id}
              role="option"
              aria-selected={activeFindingId === finding.id}
              tabIndex={0}
              onClick={() => handleSelect(finding)}
              onKeyDown={(e) => handleKeyDown(e, finding)}
              className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer focus:outline-none transition-colors duration-75 ${
                activeFindingId === finding.id
                  ? isAI
                    ? 'bg-indigo-950/40 border-l-2 border-indigo-500 text-white'
                    : 'bg-neutral-800 border-l-2 border-rose-500 text-white'
                  : 'text-neutral-400 hover:bg-neutral-900 focus:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-[10px] text-neutral-500 w-8">
                  {finding.line ? `L${finding.line}` : '--'}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAI ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                <span className="truncate font-medium">{finding.key || finding.claim || finding.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full h-full overflow-y-auto ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      {hygieneFindings.length === 0 && semanticFindings.length === 0 ? (
        <div className="p-4 text-center text-neutral-500 text-xs">No issues detected.</div>
      ) : (
        <>
          {renderGroup('Compilation Hygiene', hygieneFindings, false)}
          {renderGroup('Semantic Gaps (AI)', semanticFindings, true)}
        </>
      )}
    </div>
  );
};
