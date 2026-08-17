'use client';

import React from 'react';
import { useCiteGuardStore, SuggestedPaper, Claim } from '@/lib/store';
import { cn, formatAuthorList } from '@/lib/utils';
import { 
  CheckCircle2, 
  Database, 
  ShieldAlert, 
  Library, 
  X, 
  Search, 
  Activity,
  AlertTriangle
} from 'lucide-react';

// Import our newly extracted sub-components
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
      <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
        <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-4">
          <span className="text-[10px] font-mono text-zinc-500 tracking-wider">ACTION INSPECTOR // IDLE</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 font-mono text-xs space-y-4">
          <Activity className="w-12 h-12 text-zinc-800 animate-pulse" />
          <p>AWAITING TARGET ACQUISITION</p>
          <p className="text-[10px] text-zinc-700">Select a highlighted claim in the viewer.</p>
        </div>
      </div>
    );
  }

  const isAccepted = activeClaim.status === 'accepted';
  const isRetracted = activeClaim.isRetracted;

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      
      {/* 2. Top Console: Active Target Data */}
      <div className="flex-none border-b border-zinc-800 bg-zinc-900/30">
        {/* HUD Tab Bar */}
        <div className="flex text-[10px] font-mono border-b border-zinc-800/80 bg-zinc-950">
          <TabButton 
            active={inspectorTab === 'candidates'} 
            onClick={() => setInspectorTab('candidates')}
            icon={<Search className="w-3 h-3" />}
            label={`CANDIDATES [${activeClaim.suggestedPapers?.length || 0}]`} 
          />
          <TabButton 
            active={inspectorTab === 'health'} 
            onClick={() => setInspectorTab('health')}
            icon={<Activity className="w-3 h-3" />}
            label="HEALTH METRICS" 
          />
          <TabButton 
            active={inspectorTab === 'zotero'} 
            onClick={() => setInspectorTab('zotero')}
            icon={<Library className="w-3 h-3" />}
            label="ZOTERO SYNC" 
          />
        </div>

        {/* Claim Summary Pane */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <span className={cn(
              "px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border",
              isRetracted ? "bg-red-500/20 text-red-400 border-red-500/50" :
              isAccepted ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" :
              "bg-amber-500/20 text-amber-400 border-amber-500/50"
            )}>
              {isRetracted ? 'RETRACTED' : isAccepted ? 'RESOLVED' : 'UNVERIFIED'} // {activeClaim.category}
            </span>
            <button 
              onClick={() => dismissClaim(activeClaim.id)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Dismiss Claim (Ignore)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-serif text-zinc-300 leading-relaxed border-l-2 border-zinc-700 pl-3 italic">
            "{activeClaim.text.replace(/\[\[MATH_BLOCK_\d+\]\]/g, ' [MATH] ')}"
          </p>
        </div>
      </div>

      {/* 3. Main Action Viewport (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        
        {/* State: Accepted */}
        {isAccepted && activeClaim.acceptedPaper && (
          <div className="absolute inset-0 bg-zinc-950/90 z-10 flex flex-col items-center justify-center p-6 text-center space-y-4 backdrop-blur-sm">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2" />
            <h3 className="text-emerald-400 font-mono text-sm">CITATION LOCKED</h3>
            <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded max-w-sm">
              <p className="text-xs text-emerald-100 font-medium mb-1">{activeClaim.acceptedPaper.title}</p>
              <p className="text-[10px] text-emerald-500 font-mono">{formatAuthorList(activeClaim.acceptedPaper.authors)} ({activeClaim.acceptedPaper.year})</p>
            </div>
            <button 
              onClick={() => acceptCitation(activeClaim.id, null as any)} // Hack to reset for demo
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 underline mt-4"
            >
              UNDO ATTACHMENT
            </button>
          </div>
        )}

        {/* Tab Routing */}
        {inspectorTab === 'candidates' && (
          <CandidateListView claim={activeClaim} onAccept={(paper) => acceptCitation(activeClaim.id, paper)} />
        )}

        {inspectorTab === 'health' && (
          <HealthMetricsView claim={activeClaim} />
        )}

        {inspectorTab === 'zotero' && (
          <ZoteroTab />
        )}
      </div>
    </div>
  );
}

// --- Sub-Components ---

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center space-x-2 py-2.5 transition-colors duration-200",
        active 
          ? "bg-zinc-900 text-emerald-400 border-b-2 border-emerald-400" 
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border-b-2 border-transparent"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Replaced the inline card HTML with our CandidateCard component
function CandidateListView({ claim, onAccept }: { claim: Claim, onAccept: (p: SuggestedPaper) => void }) {
  const papers = claim.suggestedPapers;

  if (!papers || papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-zinc-600 font-mono text-xs">
        <Database className="w-8 h-8 mb-3 opacity-20" />
        <p>NO CANDIDATES DISCOVERED</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {papers.map((paper, idx) => (
        <CandidateCard 
          key={paper.paperId || idx}
          paper={paper}
          onAccept={onAccept}
        />
      ))}
    </div>
  );
}

function HealthMetricsView({ claim }: { claim: Claim }) {
  return (
    <div className="space-y-4">
      <div className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
        <h4 className="text-xs font-semibold text-zinc-300 flex items-center mb-2">
          <ShieldAlert className="w-4 h-4 mr-2 text-zinc-500" />
          Retraction Watch Index
        </h4>
        <p className="text-[10px] text-zinc-500 font-mono mb-3">Continuously polling OpenAlex and CrossRef for publisher retractions.</p>
        
        {claim.isRetracted ? (
          <div className="flex items-start p-3 bg-red-950/30 border border-red-900/50 rounded">
            <AlertTriangle className="w-4 h-4 text-red-500 mr-2 mt-0.5" />
            <div>
              <span className="text-xs text-red-400 font-bold block">CRITICAL ALERT</span>
              <span className="text-[10px] text-red-300/80 mt-1 block">{claim.retractedReason || "Associated citation has been flagged as retracted."}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-[10px] text-emerald-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>NO RETRACTIONS DETECTED IN CANDIDATES</span>
          </div>
        )}
      </div>
    </div>
  );
}