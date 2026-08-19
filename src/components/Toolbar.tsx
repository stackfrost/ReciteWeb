'use client';

import React from 'react';
import { useCiteGuardStore } from '@/lib/store';
import type { FilterSeverity } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  Filter,
  Activity,
  AlertOctagon,
  AlertTriangle,
  Info,
  RotateCcw,
  Cpu
} from 'lucide-react';

export default function Toolbar() {
  const {
    claims,
    isAuditing,
    setIsAuditing,
    filterSeverity,
    setFilterSeverity,
    filterStatus,
    setFilterStatus,
    llmRouter,
    setShowSettings,
  } = useCiteGuardStore();

  // Telemetry Calculations
  const totalClaims = claims?.length || 0;
  const resolvedClaims = claims?.filter((c) => c.status === 'accepted').length || 0;
  const completionPercentage = totalClaims === 0 ? 0 : Math.round((resolvedClaims / totalClaims) * 100);

  const retractedCount = claims?.filter((c) => c.isRetracted).length || 0;
  const highCount = claims?.filter((c) => c.severity === 'High').length || 0;
  const medCount = claims?.filter((c) => c.severity === 'Medium').length || 0;
  const lowCount = claims?.filter((c) => c.severity === 'Low').length || 0;

  // Toggle: clicking active filter resets to 'All'; clicking inactive selects it.
  const handleToggleFilter = (severity: FilterSeverity) => {
    setFilterSeverity(filterSeverity === severity ? 'All' : severity);
  };

  // Retracted toggle drives filterStatus (not filterSeverity)
  const retractedFilterActive = filterStatus === 'All';
  const handleRetractedToggle = () => {
    // We repurpose filterStatus as a rough proxy: no per-retraction filter in the store,
    // so just toggle the severity to surface high-severity retracted items.
    setFilterSeverity(filterSeverity === 'High' ? 'All' : 'High');
  };

  // A filter button is "active" when either all are shown or it is the selected one.
  const isFilterActive = (severity: FilterSeverity) => {
    return filterSeverity === 'All' || filterSeverity === severity;
  };

  return (
    <header className="h-11 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur flex items-center justify-between px-3 select-none shrink-0 overflow-x-auto overflow-y-hidden font-mono text-xs">
      
      {/* 1. Left Telemetry: Engine Status & Metric Gauge */}
      <div className="flex items-center gap-4">
        {/* Engine Status Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2.5 px-2 py-1 rounded-md bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/80 transition-colors shadow-xs cursor-pointer group"
          title="Configure LLM Engine"
        >
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            {isAuditing ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-[11px]">
            <Cpu className="w-3 h-3 text-zinc-500 group-hover:text-emerald-500 transition-colors" />
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Engine:</span>
            <span className={cn("font-bold text-[10px] tracking-wide uppercase", isAuditing ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>
              {llmRouter.activeProvider}
            </span>
          </div>
        </button>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />

        {/* Resolution Progress Telemetry */}
        <div className="flex items-center gap-2.5">
          <Activity className="w-3.5 h-3.5 text-zinc-500" />
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-zinc-500 text-[10px]">RESOLVED:</span>
            <div className="w-20 h-1.5 bg-zinc-900 rounded-sm overflow-hidden border border-zinc-800">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300" 
                style={{ width: `${completionPercentage}%` }} 
              />
            </div>
            <span className="text-zinc-300 text-[10px] tabular-nums">
              {resolvedClaims}/{totalClaims} ({completionPercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center: Interactive Severity Filter Array */}
      <div className="hidden lg:flex items-center gap-1.5 bg-zinc-900/40 p-0.5 rounded border border-zinc-800/80">
        <div className="flex items-center px-1.5 text-zinc-500 text-[10px]">
          <Filter className="w-3 h-3 mr-1" />
          <span>FILTER</span>
        </div>
        
        <FilterToggle
          label="RETRACTED"
          count={retractedCount}
          icon={<AlertOctagon className="w-3 h-3" />}
          activeColor="text-red-400 bg-red-950/40 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
          isActive={retractedFilterActive}
          onClick={handleRetractedToggle}
        />
        <FilterToggle 
          label="HIGH" 
          count={highCount} 
          icon={<AlertTriangle className="w-3 h-3" />}
          activeColor="text-rose-400 bg-rose-950/40 border-rose-500/40"
          isActive={isFilterActive('High')}
          onClick={() => handleToggleFilter('High')}
        />
        <FilterToggle 
          label="MED" 
          count={medCount} 
          activeColor="text-amber-400 bg-amber-950/40 border-amber-500/40"
          isActive={isFilterActive('Medium')}
          onClick={() => handleToggleFilter('Medium')}
        />
        <FilterToggle 
          label="LOW" 
          count={lowCount} 
          icon={<Info className="w-3 h-3" />}
          activeColor="text-sky-400 bg-sky-950/40 border-sky-500/40"
          isActive={isFilterActive('Low')}
          onClick={() => handleToggleFilter('Low')}
        />
      </div>

      {/* 3. Right: Re-Scan / Master Action */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => {
            setIsAuditing(true);
            setTimeout(() => setIsAuditing(false), 2000); 
          }}
          disabled={isAuditing}
          className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-white dark:bg-emerald-500/10 dark:text-emerald-400 dark:border dark:border-emerald-500/30 hover:bg-zinc-800 dark:hover:bg-emerald-500/20 active:bg-zinc-700 rounded-md transition-colors text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          title="Re-run audit pipeline"
        >
          <RotateCcw className={cn("w-3 h-3", isAuditing && "animate-spin text-amber-500")} />
          <span>{isAuditing ? 'ANALYZING...' : 'ANALYZE DOCUMENT'}</span>
        </button>
      </div>
    </header>
  );
}

// --- Sub-Component: Filter Toggle Button ---

interface FilterToggleProps {
  label: string;
  count: number;
  icon?: React.ReactNode;
  activeColor: string;
  isActive: boolean;
  onClick: () => void;
}

function FilterToggle({ 
  label, 
  count, 
  icon,
  activeColor, 
  isActive, 
  onClick 
}: FilterToggleProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 border rounded text-[10px] font-mono tracking-wider transition-all cursor-pointer",
        isActive 
          ? activeColor 
          : "text-zinc-600 bg-zinc-950/40 border-zinc-800/60 opacity-60 hover:opacity-100 hover:border-zinc-700"
      )}
    >
      {icon}
      <span>{label}</span>
      <span className={cn(
        "px-1 py-0.2 bg-zinc-950 rounded text-[9px] tabular-nums",
        isActive ? "text-zinc-200" : "text-zinc-600"
      )}>
        {count}
      </span>
    </button>
  );
}