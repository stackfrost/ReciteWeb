'use client';

import React, { useState } from 'react';
import { Library, Link2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ZoteroTab() {
  // In a real app, this state would come from a user session/context
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleConnect = () => {
    // This would typically redirect to /api/auth/zotero
    alert('This would redirect to the Zotero OAuth authorization page.');
    setIsConnected(true);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    // Simulate network delay for API call to src/lib/services/zotero.ts
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLastSyncTime(new Date());
    setIsSyncing(false);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-6">
        <div className="relative">
          <Library className="w-12 h-12 text-zinc-700" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-zinc-950 rounded-full flex items-center justify-center">
            <Link2 className="w-3 h-3 text-zinc-500" />
          </div>
        </div>
        
        <div>
          <h3 className="text-xs font-semibold text-zinc-200 mb-2">Zotero Integration</h3>
          <p className="text-[11px] text-zinc-500 font-sans leading-relaxed max-w-[200px] mx-auto">
            Authorize CiteGuard to automatically push attached citations into a dedicated collection in your Zotero library.
          </p>
        </div>

        <button 
          onClick={handleConnect}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 rounded text-[11px] font-sans font-medium transition-colors w-full max-w-[200px] cursor-pointer"
        >
          Connect Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {/* Status Card */}
      <div className="p-4 border border-zinc-800 rounded bg-zinc-900/30">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-zinc-300 flex items-center">
            <Library className="w-4 h-4 mr-2 text-emerald-500" />
            Zotero Connected
          </h4>
          <span className="flex items-center text-[10px] text-emerald-400 font-sans font-medium border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Active
          </span>
        </div>

        <div className="space-y-2 text-[11px] font-sans text-zinc-500">
          <div className="flex justify-between">
            <span>Target Collection:</span>
            <span className="text-zinc-300">CiteGuard Imports</span>
          </div>
          <div className="flex justify-between">
            <span>Auto-Sync:</span>
            <span className="text-emerald-400">Enabled</span>
          </div>
          <div className="flex justify-between">
            <span>Last Sync:</span>
            <span className="text-zinc-400">
              {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Manual Sync Trigger */}
      <button 
        onClick={handleManualSync}
        disabled={isSyncing}
        className={cn(
          "w-full px-4 py-2 flex items-center justify-center space-x-2 border rounded text-[11px] font-sans font-medium transition-all cursor-pointer",
          isSyncing 
            ? "bg-zinc-800 border-zinc-700 text-zinc-500 cursor-wait" 
            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-600"
        )}
      >
        <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
        <span>{isSyncing ? "Syncing to Cloud..." : "Force Manual Sync"}</span>
      </button>

      {/* Info Notice */}
      <div className="flex items-start p-3 bg-blue-950/20 border border-blue-900/30 rounded mt-4">
        <AlertCircle className="w-3.5 h-3.5 text-blue-500 mr-2 shrink-0 mt-0.5" />
        <p className="text-[10px] text-blue-300/80 font-sans leading-relaxed">
          Citations you attach in the inspector will automatically push to your Zotero cloud account. You may need to press the Sync button in your desktop Zotero app to see them appear locally.
        </p>
      </div>
    </div>
  );
}