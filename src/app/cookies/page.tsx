'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Cookie,
  ShieldCheck,
  ChevronLeft,
  Lock,
  Database,
  Trash2,
  CheckCircle2,
  Info,
  HardDrive,
  KeyRound,
  FileCode,
  Sliders,
  Check,
} from 'lucide-react';
import { purgeAllLocalData } from '@/lib/account-cleanup';

export default function CookiePolicyPage() {
  const [purged, setPurged] = useState(false);
  const [isConfirmingPurge, setIsConfirmingPurge] = useState(false);

  const handlePurge = async () => {
    if (!isConfirmingPurge) {
      setIsConfirmingPurge(true);
      setTimeout(() => setIsConfirmingPurge(false), 4000);
      return;
    }
    await purgeAllLocalData();
    setIsConfirmingPurge(false);
    setPurged(true);
    setTimeout(() => setPurged(false), 4000);
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-x-hidden">
      {/* ── Liquid Mesh Aura Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-50" />
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px] animate-liquid-orb" />
        <div
          className="absolute top-40 right-1/4 w-[700px] h-[450px] bg-gradient-to-bl from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-[150px] animate-liquid-orb"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* ── Top Header Bar ── */}
      <header className="sticky top-0 z-30 bg-[#05070d]/75 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back to Home</span>
            </Link>

            <span className="text-zinc-700">/</span>

            <h1 className="text-sm font-extrabold text-white tracking-tight">
              Cookie & Local Storage Policy
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-semibold">
              <Lock size={11} />
              <span>Strictly Essential Storage Only</span>
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Policy Content Container ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-8 relative z-10 text-xs text-zinc-300 leading-relaxed">
        
        {/* Policy Header Card */}
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-white/[0.06] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Cookie size={14} />
            <span>Essential Cookie & Local Storage Disclosure</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How ReciteWeb Uses Cookies & Browser Storage
          </h2>
          <p className="text-zinc-400 max-w-4xl text-xs sm:text-sm leading-relaxed">
            ReciteWeb operates under an uncompromising <strong>Zero-Knowledge & Air-Gapped Local Architecture</strong>. We do not deploy third-party advertising trackers, cross-site analytics beacons, or behavioral profiling cookies. We only use strictly necessary session cookies and local browser storage (IndexedDB) to keep your manuscript editing and verification functional on your device.
          </p>
        </div>

        {/* Section 1: Detailed Storage Inventory Table */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.04] via-white/[0.015] to-transparent border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database size={16} className="text-teal-400" />
                <span>Inventory of Active Cookies & Local Storage Keys</span>
              </h3>
              <p className="text-zinc-400 text-[11px]">
                Under GDPR Article 13 and EU ePrivacy Directive (Article 5(3)), the following table provides full transparency of every client storage item:
              </p>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono text-[10px] font-bold shrink-0 self-start sm:self-auto">
              5 Essential Keys Active
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-white/[0.06] bg-black/20">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-[28%]">Storage Key / Cookie Name</th>
                  <th className="py-3.5 px-4 w-[16%]">Storage Type</th>
                  <th className="py-3.5 px-4 w-[34%]">Functional Purpose</th>
                  <th className="py-3.5 px-4 w-[11%]">Retention</th>
                  <th className="py-3.5 px-4 w-[11%] text-right">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {/* Row 1: Session Token */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-teal-300 font-bold flex items-center gap-2">
                    <KeyRound size={13} className="text-teal-400 shrink-0" />
                    <span>better-auth.session_token</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">HTTP Cookie (HttpOnly)</td>
                  <td className="py-3.5 px-4 text-zinc-300">Cryptographically signed OAuth session token for Google, GitHub, and Microsoft sign-in.</td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">30 Days</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      Strictly Essential
                    </span>
                  </td>
                </tr>

                {/* Row 2: Free Audits Rate Limit */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-teal-300 font-bold flex items-center gap-2">
                    <ShieldCheck size={13} className="text-teal-400 shrink-0" />
                    <span>recite_free_audits</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">HTTP Cookie (HttpOnly)</td>
                  <td className="py-3.5 px-4 text-zinc-300">Fair-usage rate limiting counter for guest sessions to prevent API abuse.</td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">24 Hours</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      Strictly Essential
                    </span>
                  </td>
                </tr>

                {/* Row 3: Workspace Files (IndexedDB) */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-teal-300 font-bold flex items-center gap-2">
                    <HardDrive size={13} className="text-teal-400 shrink-0" />
                    <span>reciteweb_workspace_files</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">Browser IndexedDB</td>
                  <td className="py-3.5 px-4 text-zinc-300">Local manuscript drafts, BibTeX files, and AST cache (stores work locally like VS Code).</td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">Persistent</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      Local Workspace
                    </span>
                  </td>
                </tr>

                {/* Row 4: Theme Preferences */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-teal-300 font-bold flex items-center gap-2">
                    <Sliders size={13} className="text-teal-400 shrink-0" />
                    <span>recite-theme</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">LocalStorage</td>
                  <td className="py-3.5 px-4 text-zinc-300">Preserves user interface editor preferences and dark mode settings.</td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">Persistent</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                      UI Preference
                    </span>
                  </td>
                </tr>

                {/* Row 5: Cookie Consent State */}
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-mono text-teal-300 font-bold flex items-center gap-2">
                    <Check size={13} className="text-teal-400 shrink-0" />
                    <span>recite_cookie_consent</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">LocalStorage</td>
                  <td className="py-3.5 px-4 text-zinc-300">Stores your acknowledgment of this essential cookie disclosure banner.</td>
                  <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">1 Year</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                      Consent Record
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: Zero Third-Party Tracking Disclosure */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] via-white/[0.015] to-transparent border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>Zero Third-Party Advertising & Cross-Site Tracking Guarantee</span>
          </h3>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Unlike commercial consumer platforms, ReciteWeb is built specifically for confidential academic research and peer-review integrity. We never monetize user activity, sell data to data brokers, deploy third-party analytics pixels, or participate in cross-site retargeting advertising networks (e.g. Google AdSense, Meta Pixel, TikTok Beacons).
          </p>
        </section>

        {/* Section 3: User Storage Control & Purge */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] via-white/[0.015] to-transparent border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trash2 size={16} className="text-cyan-400" />
                <span>Instant Browser Storage Purge</span>
              </h3>
              <p className="text-zinc-400 text-xs">
                You have full control over your local browser state. Purge all IndexedDB manuscript drafts, cached tokens, and preferences on this device with one click:
              </p>
            </div>

            <button
              onClick={handlePurge}
              className={`px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] ${
                isConfirmingPurge
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 animate-pulse'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300'
              }`}
            >
              <Trash2 size={14} />
              <span>{isConfirmingPurge ? 'Click Again to Confirm Purge' : 'Purge All Browser Storage'}</span>
            </button>
          </div>

          {purged && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>All local browser storage, authentication tokens, and IndexedDB drafts have been completely erased from this machine.</span>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
