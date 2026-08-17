'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  X, 
  Settings, 
  Key, 
  Globe, 
  Sliders, 
  Save, 
  Cpu
} from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  // Local state for configuration
  const [apiKey, setApiKey] = useState('AIzaSyB..._MockKey_...');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [providers, setProviders] = useState({
    semanticScholar: true,
    openAlex: true,
    arxiv: true,
    crossref: false,
  });
  const [sensitivity, setSensitivity] = useState(75);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate saving to local storage or secure cookie
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsSaving(false);
    onClose();
  };

  const toggleProvider = (key: keyof typeof providers) => {
    setProviders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl rounded-lg overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="h-12 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between px-4">
          <div className="flex items-center space-x-2 text-zinc-300">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-mono tracking-widest font-bold">CONFIGURATION MATRIX</span>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          
          {/* Section 1: LLM Engine */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2">
              <Cpu className="w-3.5 h-3.5" />
              <h3 className="text-[10px] font-mono tracking-widest font-bold">LLM ENGINE</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-1.5">ACTIVE MODEL</label>
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - High Speed)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 flex justify-between">
                  <span>API KEY</span>
                  <span className="text-emerald-500/50">Local encryption active</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded pl-9 pr-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Search Orchestration */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2">
              <Globe className="w-3.5 h-3.5" />
              <h3 className="text-[10px] font-mono tracking-widest font-bold">SEARCH ORCHESTRATION NODES</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <ProviderToggle 
                label="SEMANTIC SCHOLAR" 
                active={providers.semanticScholar} 
                onClick={() => toggleProvider('semanticScholar')} 
              />
              <ProviderToggle 
                label="OPENALEX" 
                active={providers.openAlex} 
                onClick={() => toggleProvider('openAlex')} 
              />
              <ProviderToggle 
                label="ARXIV (PREPRINTS)" 
                active={providers.arxiv} 
                onClick={() => toggleProvider('arxiv')} 
              />
              <ProviderToggle 
                label="CROSSREF" 
                active={providers.crossref} 
                onClick={() => toggleProvider('crossref')} 
              />
            </div>
          </section>

          {/* Section 3: Audit Parameters */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-zinc-400 border-b border-zinc-800 pb-2">
              <Sliders className="w-3.5 h-3.5" />
              <h3 className="text-[10px] font-mono tracking-widest font-bold">AUDIT SENSITIVITY</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                <span>RELAXED</span>
                <span className="text-emerald-400 font-bold">{sensitivity}% STRICT</span>
                <span>MAXIMUM</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={sensitivity}
                onChange={(e) => setSensitivity(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[9px] font-mono text-zinc-600 pt-2">
                Higher strictness increases false positives by flagging common knowledge (e.g., "The Earth orbits the sun"). Lower strictness ignores passing mentions.
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-[10px] font-mono font-bold text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            CANCEL
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono font-bold transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'APPLYING...' : 'SAVE CONFIGURATION'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// --- Sub Component ---
function ProviderToggle({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-2.5 border rounded transition-all text-left group",
        active 
          ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400" 
          : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
      )}
    >
      <span className="text-[10px] font-mono tracking-wider font-bold">{label}</span>
      <div className={cn(
        "w-2 h-2 rounded-full",
        active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-zinc-800 group-hover:bg-zinc-600"
      )} />
    </button>
  );
}