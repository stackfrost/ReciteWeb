'use client';

import React from 'react';
import { useCiteGuardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Library,
  X,
  Search,
  Activity,
  AlertTriangle,
  FileSearch,
} from 'lucide-react';
import CandidateCard from './CandidateCard';
import ZoteroTab from './ZoteroTab';

export default function ActionInspector() {
  const {
    filteredClaims,
    activeClaimIndex,
    inspectorTab,
    setInspectorTab,
    acceptCitation,
    dismissClaim,
  } = useCiteGuardStore();

  const activeClaim = filteredClaims[activeClaimIndex] || null;

  // 1. Idle State: No claim selected
  if (!activeClaim) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 transition-colors">
        <div className="h-9 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/40 flex items-center px-3.5">
          <span className="text-[11px] font-mono text-zinc-500 tracking-wide font-bold">
            CITATION INSPECTOR
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 font-sans text-xs space-y-2 p-6 text-center">
          <FileSearch className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
          <p className="font-semibold text-zinc-600 dark:text-zinc-400">No claim selected.</p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs">
            Select a highlighted claim in the manuscript viewer to inspect candidates and retraction status.
          </p>
        </div>
      </div>
    );
  }

  const isAccepted = activeClaim.status === 'accepted';
  const isRetracted = activeClaim.isRetracted;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 transition-colors">
      {/* 2. Top Console: Active Target Data */}
      <div className="flex-none border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20">
        {/* HUD Tab Bar */}
        <div className="flex text-[11px] font-sans border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-950">
          <TabButton
            active={inspectorTab === 'candidates'}
            onClick={() => setInspectorTab('candidates')}
            icon={<Search className="w-3.5 h-3.5" />}
            label={`Candidates (${activeClaim.suggestedPapers?.length || 0})`}
          />
          <TabButton
            active={inspectorTab === 'health'}
            onClick={() => setInspectorTab('health')}
            icon={<Activity className="w-3.5 h-3.5" />}
            label="Integrity & Risk"
          />
          <TabButton
            active={inspectorTab === 'zotero'}
            onClick={() => setInspectorTab('zotero')}
            icon={<Library className="w-3.5 h-3.5" />}
            label="Zotero Sync"
          />
        </div>

        {/* Claim Summary Pane */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-start justify-between">
            <span
              className={cn(
                'px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded border',
                isRetracted
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
                  : isAccepted
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
              )}
            >
              {isRetracted ? 'RETRACTED' : isAccepted ? 'VERIFIED' : 'UNVERIFIED'} • {activeClaim.category}
            </span>
            <button
              onClick={() => dismissClaim(activeClaim.id)}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-0.5 rounded"
              title="Dismiss Claim"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs font-serif text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-zinc-300 dark:border-zinc-700 pl-2.5 italic">
            "{activeClaim.text.replace(/\[\[MATH_BLOCK_\d+\]\]/g, ' [MATH] ')}"
          </p>
        </div>
      </div>

      {/* 3. Main Body Content Based on Active Tab */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {inspectorTab === 'candidates' && (
          <div className="space-y-2.5">
            {activeClaim.suggestedPapers && activeClaim.suggestedPapers.length > 0 ? (
              activeClaim.suggestedPapers.map((paper, idx) => (
                <CandidateCard
                  key={paper.paperId || idx}
                  paper={paper}
                  onAccept={(selected) => acceptCitation(activeClaim.id, selected)}
                />
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-600 font-sans">
                No matching citation candidates found.
              </div>
            )}
          </div>
        )}

        {inspectorTab === 'health' && (
          <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-zinc-900 dark:text-zinc-100">Citation Integrity Diagnostics</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px]">
              Cross-checked against OpenAlex, Semantic Scholar, and RetractionWatch index databases.
            </p>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">RETRACTION STATUS:</span>
                <span className={activeClaim.isRetracted ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                  {activeClaim.isRetracted ? 'FLAGGED' : 'CLEAR'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CLAIM SEVERITY:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">{activeClaim.severity}</span>
              </div>
            </div>
          </div>
        )}

        {inspectorTab === 'zotero' && <ZoteroTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 font-sans text-xs transition-colors',
        active
          ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold bg-white dark:bg-zinc-900/50'
          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}