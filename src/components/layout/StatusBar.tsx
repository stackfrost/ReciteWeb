'use client';

import React, { useEffect, useState } from 'react';
import { useReciteStore, computeIssueStatistics } from '@/lib/store';

export const StatusBar: React.FC = () => {
  const {
    telemetry,
    workspace,
    llmRouter,
    docMetrics,
    claims,
    setTelemetry,
  } = useReciteStore();

  const [memMb, setMemMb] = useState<number | null>(null);

  // Poll JS heap usage
  useEffect(() => {
    type PerfMemory = { usedJSHeapSize: number };
    const poll = () => {
      const mem = (performance as unknown as { memory?: PerfMemory }).memory;
      if (mem) setMemMb(Math.round(mem.usedJSHeapSize / 1048576));
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, []);

  // Online status
  useEffect(() => {
    const onOnline = () => setTelemetry({ isOnline: true });
    const onOffline = () => setTelemetry({ isOnline: false });
    setTelemetry({ isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setTelemetry]);

  const stats = computeIssueStatistics(claims || []);
  const isOnline = telemetry.isOnline;
  const latencyMs = telemetry.apiLatencyMs;
  const wordCount = docMetrics?.wordCount ?? 0;
  const fileFormat = workspace.status !== 'NO_WORKSPACE_MOUNTED' ? 'LaTeX (pdfTeX)' : '--';

  return (
    <footer className="h-6 w-full bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-3 text-[11px] font-mono text-zinc-400 select-none shrink-0 z-40">
      {/* LEFT: Document & AST Diagnostics */}
      <div className="flex items-center gap-0">
        <span className="text-zinc-500">UTF-8</span>
        <span className="text-zinc-700 px-1.5">│</span>
        <span className="text-zinc-400">{fileFormat}</span>
        <span className="text-zinc-700 px-1.5">│</span>
        <span className="text-zinc-400">
          {wordCount > 0 ? `${wordCount.toLocaleString()} Words` : '-- Words'}
        </span>
      </div>

      {/* CENTER: Engine Performance Telemetry */}
      <div className="flex items-center gap-0">
        <span className="text-zinc-500">
          Engine: <span className="text-zinc-300">Entailment v2 (429-Safe)</span>
        </span>
        <span className="text-zinc-700 px-1.5">│</span>
        <span className="text-zinc-500">
          Heap: <span className="text-zinc-300">{memMb !== null ? `${memMb}MB` : '--'}</span>
        </span>
        <span className="text-zinc-700 px-1.5">│</span>
        <span className="text-zinc-500">
          Latency: <span className="text-zinc-300">{latencyMs !== null ? `${latencyMs}ms` : '--'}</span>
        </span>
      </div>

      {/* RIGHT: Verification & Health Summary */}
      <div className="flex items-center gap-0">
        <span className="text-zinc-500">
          Claims:{' '}
          <span className="text-emerald-400">{stats.resolvedCount} Verified</span>
          {' / '}
          <span className={stats.unresolvedCount > 0 ? 'text-cyan-400' : 'text-zinc-400'}>
            {stats.unresolvedCount} Discoveries
          </span>
        </span>
        <span className="text-zinc-700 px-1.5">│</span>
        <span className={isOnline ? 'text-zinc-400' : 'text-amber-400'}>
          {isOnline ? 'Online' : 'Air-Gapped / Local'}
        </span>
      </div>
    </footer>
  );
};

export default StatusBar;
