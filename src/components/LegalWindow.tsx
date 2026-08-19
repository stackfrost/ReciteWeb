'use client';

import React from 'react';
import { Shield, X, Lock, CheckCircle2 } from 'lucide-react';
import { useCiteGuardStore } from '@/lib/store';

export default function LegalWindow() {
  const { showLegalWindow, setShowLegalWindow } = useCiteGuardStore();

  if (!showLegalWindow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-100 font-sans">
      {/* Centered Modal Container */}
      <div className="relative w-[650px] max-w-[95vw] h-[520px] max-h-[90vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans select-none animate-in zoom-in-95 duration-100 text-zinc-900 dark:text-zinc-100">
        
        {/* Window Title Bar */}
        <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 mr-2">
              <div
                onClick={() => setShowLegalWindow(false)}
                className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer shadow-xs"
              />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 opacity-60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 opacity-60" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
              LEGAL & PRIVACY COMPLIANCE
            </span>
          </div>

          <button
            onClick={() => setShowLegalWindow(false)}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50 dark:bg-zinc-900/20">
          
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Privacy & Zero-Knowledge Architecture</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Enterprise Compliance Statement</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-zinc-700 dark:text-zinc-300">
            {/* Zero Knowledge */}
            <section className="space-y-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" />
                Zero-Knowledge Architecture
              </h3>
              <p className="leading-relaxed">
                ReciteAI employs a strict zero-knowledge architecture. We have absolutely zero access to your manuscript data, parsed claims, or uploaded documents. All processing occurs locally on your machine or is routed directly from your client application to the configured LLM provider.
              </p>
            </section>

            {/* BYOK Liability */}
            <section className="space-y-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Bring Your Own Key (BYOK) Liability
              </h3>
              <p className="leading-relaxed">
                You assume all financial and security liability for the API keys (OpenAI, Anthropic, DeepSeek, Gemini) entered into the application. We do not store, proxy, or manage these keys on our servers. They remain strictly on your local machine within <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">IndexedDB</code>. You are responsible for monitoring your API usage and securing your device.
              </p>
            </section>

            {/* Telemetry */}
            <section className="space-y-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Telemetry & Network Transmission
              </h3>
              <p className="leading-relaxed">
                The application transmits only the following non-PII diagnostic data to ReciteAI servers:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>License Seat checks (Seat ID verification)</li>
                <li>Application version pinging (for OTA updates)</li>
                <li>Basic crash telemetry (anonymized stack traces)</li>
              </ul>
            </section>

            {/* Local Storage */}
            <section className="space-y-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                Local Storage Security
              </h3>
              <p className="leading-relaxed">
                The user is solely responsible for the physical and digital security of their local machine. Any <code className="font-mono text-[11px] bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded">.recite</code> session files stored via the File System Access API are unencrypted on disk to support immediate enterprise integration.
              </p>
            </section>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-14 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-6 flex items-center justify-between flex-shrink-0">
          <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
            Compliance Policy v2.4 (August 2026)
          </div>
          <button
            onClick={() => setShowLegalWindow(false)}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30 rounded-lg text-xs font-sans font-semibold hover:bg-zinc-800 dark:hover:bg-emerald-500/30 transition-all shadow-xs"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}
