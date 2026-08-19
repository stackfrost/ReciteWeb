'use client';

import React from 'react';
import { useCiteGuardStore } from '@/lib/store';
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
    severityFilter,
    setSeverityFilter,
  } = useCiteGuardStore();

  // Telemetry Calculations
  const totalClaims = claims?.length || 0;
  const resolvedClaims = claims?.filter((c) => c.status === 'accepted').length || 0;
  const completionPercentage = totalClaims === 0 ? 0 : Math.round((resolvedClaims / totalClaims) * 100);

  const retractedCount = claims?.filter((c) => c.isRetracted).length || 0;
  const highCount = claims?.filter((c) => c.severity === 'High').length || 0;
  const medCount = claims?.filter((c) => c.severity === 'Medium').length || 0;
  const lowCount = claims?.filter((c) => c.severity === 'Low').length || 0;

  // Toggle filter helper
  const handleToggleFilter = (severity: 'Critical' | 'High' | 'Medium' | 'Low') => {
    if (!setSeverityFilter) return;
    if (severityFilter?.includes(severity)) {
      setSeverityFilter(severityFilter.filter((s) => s !== severity));
    } else {
      setSeverityFilter([...(severityFilter || []), severity]);
    }
  };

  const isFilterActive = (severity: 'Critical' | 'High' | 'Medium' | 'Low') => {
    return !severityFilter || severityFilter.length === 0 || severityFilter.includes(severity);
  };

  return (
    <header className="h-11 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur flex items-center justify-between px-3 select-none shrink-0 overflow-x-auto overflow-y-hidden font-mono text-xs">
      
      {/* 1. Left Telemetry: Engine Status & Metric Gauge */}
      <div className="flex items-center gap-4">
        {/* Engine Status Block */}
        <div className="flex items-center gap-2.5 px-2 py-1 rounded bg-zinc-900/60 border border-zinc-800/80">
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
            <Cpu className="w-3 h-3 text-zinc-500" />
            <span className="text-zinc-500 text-[10px]">ENGINE:</span>
            <span className={cn("font-bold text-[10px] tracking-wide", isAuditing ? "text-amber-400" : "text-emerald-400")}>
              {isAuditing ? 'AUDITING...' : 'IDLE'}
            </span>
          </div>
        </div>

        <div className="w-px h-5 bg-zinc-800" />

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
          isActive={isFilterActive('Critical')}
          onClick={() => handleToggleFilter('Critical')}
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
          className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 border border-zinc-700/80 text-zinc-200 rounded transition-colors text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Re-run audit pipeline"
        >
          <RotateCcw className={cn("w-3 h-3 text-emerald-400", isAuditing && "animate-spin")} />
          <span>RE-SCAN</span>
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