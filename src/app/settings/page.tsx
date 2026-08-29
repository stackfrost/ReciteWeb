'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Shield,
  CreditCard,
  Sliders,
  CheckCircle2,
  ChevronLeft,
  Sparkles,
  Zap,
  Lock,
  Globe,
  Cpu,
  Layers,
  FileCheck2,
  LogOut,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useSession, signIn, signOut } from '@/lib/auth-client';
import { useReciteStore } from '@/lib/store';

export default function SettingsPage() {
  const { data: session, isPending: isSessionLoading } = useSession();
  const { license } = useReciteStore();

  // Client Preferences state
  const [localProcessing, setLocalProcessing] = useState(true);
  const [citationStyle, setCitationStyle] = useState('apa');
  const [auditSensitivity, setAuditSensitivity] = useState('standard');
  const [emailSummaries, setEmailSummaries] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  // Derived user status
  const user = session?.user;
  const userLicenseStatus = (user as any)?.licenseStatus || (license.status === 'ACTIVE' ? 'PRO' : 'FREE');
  const isPro = userLicenseStatus === 'PRO' || userLicenseStatus === 'ANNUAL_PRO' || license.status === 'ACTIVE';

  // Audit credits usage mock/state
  const creditsUsed = 3;
  const creditsTotal = 10;
  const creditsPercent = Math.min(100, Math.round((creditsUsed / creditsTotal) * 100));

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft' | 'github') => {
    try {
      await signIn.social({
        provider,
        callbackURL: window.location.href,
      });
    } catch (err: any) {
      console.error('OAuth Sign-in error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err: any) {
      console.error('Sign-out error:', err);
    }
  };

  const handleSavePreferences = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-hidden">
      {/* ─── Liquid Mesh Texture & Multi-Spectral Atmosphere ─────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-50" />
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px] animate-liquid-orb" />
        <div className="absolute top-40 right-1/4 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-[150px] animate-liquid-orb" style={{ animationDelay: '3s' }} />
      </div>

      {/* ── TOP NAVIGATION BAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#05070d]/70 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>Back to Workbench</span>
            </Link>

            <span className="text-zinc-700">/</span>

            <h1 className="text-sm font-extrabold text-white tracking-tight">
              Account & Preferences
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="flex items-center gap-1 text-xs text-teal-300 font-semibold px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 animate-fadeIn">
                <CheckCircle2 size={13} />
                <span>Preferences Saved</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8 relative z-10">
        
        {/* ================================================================= */}
        {/* SEGMENT 1: PROFILE & OAUTH AUTHENTICATION                         */}
        {/* ================================================================= */}
        <section className="p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User size={18} className="text-teal-400" />
                <span>Identity & Access</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Manage your authenticated researcher profile and linked identity providers.
              </p>
            </div>

            {user && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                OAuth Authenticated
              </span>
            )}
          </div>

          {isSessionLoading ? (
            <div className="py-8 flex items-center justify-center text-xs text-zinc-400">
              Loading researcher profile...
            </div>
          ) : user ? (
            /* Authenticated Profile View */
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-4">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || 'User avatar'}
                    className="w-14 h-14 rounded-2xl ring-2 ring-white/20 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-indigo-500 flex items-center justify-center text-zinc-950 font-extrabold text-lg shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'RA'}
                  </div>
                )}

                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-white">
                    {user.name || 'Researcher'}
                  </div>
                  <div className="text-xs text-teal-300/80 font-mono">
                    {user.email}
                  </div>
                  <div className="text-[11px] text-zinc-400 pt-0.5">
                    Zero-Password Architecture · Cloudflare Verified
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-rose-950/30 hover:text-rose-300 hover:border-rose-500/30 text-xs font-semibold text-zinc-300 transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated OAuth Sign-In State */
            <div className="space-y-4 pt-1">
              <p className="text-xs text-zinc-400">
                Sign in with your institutional or developer identity to sync audit credits, persistent license keys, and verified citation dossiers across devices.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Google Sign-in */}
                <button
                  onClick={() => handleOAuthSignIn('google')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-200 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Microsoft Sign-in */}
                <button
                  onClick={() => handleOAuthSignIn('microsoft')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-200 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  <span>Continue with Microsoft</span>
                </button>

                {/* GitHub Sign-in */}
                <button
                  onClick={() => handleOAuthSignIn('github')}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-200 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>Continue with GitHub</span>
                </button>
              </div>
            </div>
          )}
        </section>


        {/* ================================================================= */}
        {/* SEGMENT 2: PLAN, USAGE & AUDIT CREDITS                            */}
        {/* ================================================================= */}
        <section className="p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-teal-400" />
                <span>Billing & Audit Credits</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Track your active pre-flight allowance and semantic verification entitlements.
              </p>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isPro
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                : 'bg-white/[0.06] text-zinc-300 border border-white/10'
            }`}>
              {isPro ? (
                <>
                  <Sparkles size={12} className="text-teal-300" />
                  <span>Researcher Pro</span>
                </>
              ) : (
                <span>Free Pre-Flight</span>
              )}
            </span>
          </div>

          {isPro ? (
            /* Active Pro Tier Status */
            <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-950/30 border border-teal-500/30 space-y-3 backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-extrabold text-teal-200 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-400" />
                    <span>Unlimited Entailment Audits Active</span>
                  </div>
                  <p className="text-xs text-teal-300/80 leading-relaxed">
                    Your subscription includes unlimited manuscript audits, semantic evidence extraction, and clean dossier exports.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-teal-500/20 flex items-center justify-between text-xs text-teal-300">
                <span>Billing Provider: Encrypted Direct Settlement</span>
                <span className="font-semibold">Direct Settlement Verified</span>
              </div>
            </div>
          ) : (
            /* Free Tier Usage & Upgrade Prompt */
            <div className="space-y-5">
              {/* Audit Credits Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-zinc-300">
                  <span>Monthly Audit Credits</span>
                  <span className="font-mono text-teal-300">{creditsUsed} of {creditsTotal} credits used</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.08]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                    style={{ width: `${creditsPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Each deep semantic claim verification consumes 1 credit. Local AST checks remain unlimited.
                </p>
              </div>

              {/* Upgrade Box */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-500/10 via-white/[0.02] to-indigo-500/10 border border-teal-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl">
                <div className="space-y-1">
                  <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                    <Zap size={15} className="text-teal-300" />
                    <span>Upgrade to Researcher Pro</span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
                    Unlock unlimited pre-submission audits, missing baseline detection, and institutional PDF verification for $49/year.
                  </p>
                </div>

                <Link
                  href="/"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs rounded-xl transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_20px_rgba(20,184,166,0.35)] shrink-0 flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>Get Researcher Pro</span>
                </Link>
              </div>
            </div>
          )}
        </section>


        {/* ================================================================= */}
        {/* SEGMENT 3: WORKSPACE & LOCAL PROCESSING PREFERENCES               */}
        {/* ================================================================= */}
        <section className="p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders size={18} className="text-teal-400" />
                <span>Workspace Preferences</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Configure local AST processing, citation standards, and verification thresholds.
              </p>
            </div>
          </div>

          <div className="space-y-6 divide-y divide-white/[0.08] text-xs">
            {/* Toggle: Local Processing */}
            <div className="flex items-start justify-between gap-4 pt-4 first:pt-0">
              <div className="space-y-1 max-w-lg">
                <label className="text-sm font-semibold text-white block">
                  Local Processing
                </label>
                <p className="text-zinc-400 leading-relaxed">
                  Parse LaTeX AST trees, math equations, and bibliography keys locally in your browser memory for air-gapped security and zero-latency performance.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={localProcessing}
                onClick={() => setLocalProcessing(!localProcessing)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  localProcessing ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    localProcessing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Dropdown: Citation Style */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-white block">
                  Default Citation Format
                </label>
                <p className="text-zinc-400 leading-relaxed">
                  Standard format applied when inserting references into manuscript files.
                </p>
              </div>

              <select
                value={citationStyle}
                onChange={(e) => setCitationStyle(e.target.value)}
                className="w-full sm:w-48 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-teal-400"
              >
                <option value="apa" className="bg-[#090d18] text-white">APA 7th Edition</option>
                <option value="ieee" className="bg-[#090d18] text-white">IEEE</option>
                <option value="chicago" className="bg-[#090d18] text-white">Chicago 17th Edition</option>
                <option value="nature" className="bg-[#090d18] text-white">Nature / Vancouver</option>
                <option value="acm" className="bg-[#090d18] text-white">ACM Reference Format</option>
              </select>
            </div>

            {/* Selector: Audit Sensitivity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-white block">
                  Audit Verification Rigor
                </label>
                <p className="text-zinc-400 leading-relaxed">
                  Configure confidence threshold for flagging attribution gaps.
                </p>
              </div>

              <select
                value={auditSensitivity}
                onChange={(e) => setAuditSensitivity(e.target.value)}
                className="w-full sm:w-48 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-teal-400"
              >
                <option value="standard" className="bg-[#090d18] text-white">Standard (Balanced)</option>
                <option value="high" className="bg-[#090d18] text-white">High Rigor (Peer Review)</option>
                <option value="conservative" className="bg-[#090d18] text-white">Strict (0% Tolerance)</option>
              </select>
            </div>

            {/* Toggle: Report Summaries */}
            <div className="flex items-start justify-between gap-4 pt-4">
              <div className="space-y-1 max-w-lg">
                <label className="text-sm font-semibold text-white block">
                  Audit Export Dossier Sharing
                </label>
                <p className="text-zinc-400 leading-relaxed">
                  Include pre-formatted summary text for co-authors and Principal Investigators when generating dossiers.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={emailSummaries}
                onClick={() => setEmailSummaries(!emailSummaries)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  emailSummaries ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    emailSummaries ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_6px_15px_rgba(20,184,166,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
