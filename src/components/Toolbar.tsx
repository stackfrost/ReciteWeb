'use client';

import React from 'react';
import { useCiteGuardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { 
  Filter, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Play
} from 'lucide-react';

export default function Toolbar() {
  const {
    claims,
    filteredClaims,
    isAuditing,
    setIsAuditing, // Assuming we want a manual re-trigger
  } = useCiteGuardStore();

  // Telemetry Calculations
  const totalClaims = claims.length;
  const resolvedClaims = claims.filter(c => c.status === 'accepted').length;
  const completionPercentage = totalClaims === 0 ? 0 : Math.round((resolvedClaims / totalClaims) * 100);

  const highCount = claims.filter(c => c.severity === 'High').length;
  const medCount = claims.filter(c => c.severity === 'Medium').length;
  const lowCount = claims.filter(c => c.severity === 'Low').length;
  const retractedCount = claims.filter(c => c.isRetracted).length;

  return (
    <div className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-4 select-none shrink-0 overflow-x-auto overflow-y-hidden">
      
      {/* 1. Left: Engine Status & Master Progress */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3 w-3 items-center justify-center">
            {isAuditing ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-mono text-zinc-500 tracking-widest leading-none mb-0.5">LLM ENGINE</span>
            <span className={cn("text-[10px] font-mono font-bold leading-none", isAuditing ? "text-amber-400" : "text-emerald-400")}>
              {isAuditing ? 'AUDITING...' : 'STANDBY'}
            </span>
          </div>
        </div>

        <div className="w-px h-6 bg-zinc-800" />

        <div className="flex items-center space-x-3">
          <Activity className="w-4 h-4 text-zinc-500" />
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-mono text-zinc-500 tracking-widest leading-none mb-0.5">RESOLUTION</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }} 
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-300 leading-none">
                {resolvedClaims}/{totalClaims}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Center: Severity Toggles (Filters) */}
      <div className="hidden md:flex items-center space-x-2 bg-zinc-900/50 p-1 rounded border border-zinc-800/80">
        <Filter className="w-3 h-3 text-zinc-500 ml-1 mr-2" />
        
        <FilterToggle 
          label="CRITICAL" 
          count={retractedCount} 
          colorClass="text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20" 
          active={true}
        />
        <FilterToggle 
          label="HIGH" 
          count={highCount} 
          colorClass="text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20" 
          active={true}
        />
        <FilterToggle 
          label="MED" 
          count={medCount} 
          colorClass="text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20" 
          active={true}
        />
        <FilterToggle 
          label="LOW" 
          count={lowCount} 
          colorClass="text-sky-400 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20" 
          active={true}
        />
      </div>

      {/* 3. Right: Action Overrides */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={() => {
            // Trigger manual re-audit (Requires logic in page.tsx or store to re-run API)
            setIsAuditing(true);
            setTimeout(() => setIsAuditing(false), 2000); 
          }}
          disabled={isAuditing}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded transition-colors text-[10px] font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-3 h-3" />
          <span>RE-SCAN</span>
        </button>
      </div>
    </div>
  );
}

// --- Sub-Component ---

interface FilterToggleProps {
  label: string;
  count: number;
  colorClass: string;
  active: boolean;
}

function FilterToggle({ label, count, colorClass, active }: FilterToggleProps) {
  return (
    <button 
      className={cn(
        "flex items-center space-x-1.5 px-2 py-1 border rounded transition-all text-[9px] font-mono tracking-wider font-bold",
        active ? colorClass : "text-zinc-600 bg-zinc-950 border-zinc-800 hover:bg-zinc-900"
      )}
    >
      <span>{label}</span>
      <span className="px-1 py-0.5 bg-zinc-950/50 rounded text-[8px] leading-none">
        {count}
      </span>
    </button>
  );
}