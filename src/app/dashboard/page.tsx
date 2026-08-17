'use client';

import React, { useEffect, useState } from 'react';
import { useCiteGuardStore } from '@/lib/store';
import ManuscriptViewer from '@/components/viewer/ManuscriptViewer';
import ActionInspector from '@/components/inspector/ActionInspector';
import Toolbar from '@/components/Toolbar';
import ExportModal from '@/components/ExportModal';
import SettingsPanel from '@/components/SettingsPanel';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS } from '@/lib/demo-data';
import { Crosshair, Download, Settings } from 'lucide-react';

export default function DashboardPage() {
  const { 
    setParsedText, 
    setClaims, 
    setDocumentTitle, 
    isAuditing, 
    setIsAuditing 
  } = useCiteGuardStore();

  // State to manage Modal visibilities
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load demo data on mount so we can test the UI immediately.
  // In production, this data will be set by the file upload route.
  useEffect(() => {
    // Prevent overriding if data is already loaded via an actual upload
    const currentText = useCiteGuardStore.getState().parsedText;
    if (currentText) return;

    setIsAuditing(true);
    
    // Simulate network delay to show off the loading state
    const timer = setTimeout(() => {
      setParsedText(DEMO_MANUSCRIPT);
      setClaims(DEMO_CLAIMS);
      setDocumentTitle('demo_quantum_spin_liquids.tex');
      setIsAuditing(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [setParsedText, setClaims, setDocumentTitle, setIsAuditing]);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-200 overflow-hidden font-sans">
      
      {/* 1. Top Global Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur flex items-center justify-between px-4 shrink-0 z-20 relative shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Crosshair className="w-4 h-4 text-emerald-400" />
          </div>
          <h1 className="font-bold tracking-widest text-sm uppercase flex items-center space-x-2">
            <span>ReciteAI</span>
            <span className="text-zinc-600 font-normal">//</span> 
            <span className="text-zinc-400 font-mono text-xs">Telemetry Console</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-4 text-xs font-mono">
          
          {/* Configuration Matrix Trigger */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Configuration Matrix"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-zinc-400">ENGINE: <span className="text-emerald-400">ONLINE</span></span>
          </div>
          
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center space-x-2 px-4 py-1.5 bg-zinc-200 text-zinc-900 font-bold rounded hover:bg-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT .BIB</span>
          </button>
        </div>
      </header>

      {/* 2. Telemetry & Filter Toolbar */}
      <Toolbar />

      {/* 3. Main Split-Pane Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Manuscript Viewer (60%) */}
        <section className="w-3/5 h-full relative">
          <ManuscriptViewer />
          
          {/* Overlay Loading State during LLM Auditing */}
          {isAuditing && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
              <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-500 animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs font-mono text-emerald-400 tracking-widest animate-pulse">
                ISOLATING CLAIMS...
              </p>
            </div>
          )}
        </section>

        {/* Right Pane: Action Inspector (40%) */}
        <section className="w-2/5 h-full bg-zinc-950 shadow-[-10px_0_20px_rgba(0,0,0,0.2)] z-10 relative border-l border-zinc-800">
          <ActionInspector />
        </section>
        
      </main>

      {/* 4. Overlay Modals */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}