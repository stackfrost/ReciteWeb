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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors">
      {/* ── TOP NAVIGATION BAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Back to Workbench</span>
            </Link>

            <span className="text-zinc-300 dark:text-zinc-700">/</span>

            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Account & Preferences
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {savedToast && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fadeIn">
                <CheckCircle2 size={13} />
                <span>Preferences Saved</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* ================================================================= */}
        {/* SEGMENT 1: PROFILE & OAUTH AUTHENTICATION                         */}
        {/* ================================================================= */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <User size={18} className="text-zinc-500" />
                <span>Identity & Access</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage your authenticated researcher profile and linked identity providers.
              </p>
            </div>

            {user && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
                    className="w-14 h-14 rounded-full ring-2 ring-zinc-200 dark:ring-zinc-700 object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'RA'}
                  </div>
                )}

                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {user.name || 'Researcher'}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {user.email}
                  </div>
                  <div className="text-[11px] text-zinc-400 pt-0.5">
                    Zero-Password Architecture · Cloudflare Verified
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated OAuth Sign-In State */
            <div className="space-y-4 pt-1">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Sign in with your institutional or developer identity to sync audit credits, persistent license keys, and verified citation dossiers across devices.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Google Sign-in */}
                <button
                  onClick={() => handleOAuthSignIn('google')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
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
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
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
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current text-zinc-900 dark:text-white" viewBox="0 0 24 24">
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
        <section className="bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <CreditCard size={18} className="text-zinc-500" />
                <span>Billing & Audit Credits</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track your active pre-flight allowance and semantic verification entitlements.
              </p>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isPro
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}>
              {isPro ? (
                <>
                  <Sparkles size={12} className="text-emerald-500" />
                  <span>Researcher Pro</span>
                </>
              ) : (
                <span>Free Pre-Flight</span>
              )}
            </span>
          </div>

          {isPro ? (
            /* Active Pro Tier Status */
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>Unlimited Entailment Audits Active</span>
                  </div>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                    Your subscription includes unlimited manuscript audits, semantic evidence extraction, and clean dossier exports.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span>Billing Provider: Encrypted Checkout</span>
                <span className="font-medium">Direct Settlement Verified</span>
              </div>
            </div>
          ) : (
            /* Free Tier Usage & Upgrade Prompt */
            <div className="space-y-5">
              {/* Audit Credits Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <span>Monthly Audit Credits</span>
                  <span className="font-mono">{creditsUsed} of {creditsTotal} credits used</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${creditsPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500">
                  Each deep semantic claim verification consumes 1 credit. Local AST checks remain unlimited.
                </p>
              </div>

              {/* Upgrade Box */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-zinc-50 to-emerald-50/40 dark:from-zinc-900 dark:to-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Zap size={15} className="text-emerald-500" />
                    <span>Upgrade to Researcher Pro</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md">
                    Unlock unlimited pre-submission audits, missing baseline detection, and institutional PDF verification for $49/year.
                  </p>
                </div>

                <Link
                  href="/"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
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
        <section className="bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sliders size={18} className="text-zinc-500" />
                <span>Workspace Preferences</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure local AST processing, citation standards, and verification thresholds.
              </p>
            </div>
          </div>

          <div className="space-y-6 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
            {/* Toggle: Local Processing */}
            <div className="flex items-start justify-between gap-4 pt-4 first:pt-0">
              <div className="space-y-1 max-w-lg">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Local Processing
                </label>
                <p className="text-zinc-500">
                  Parse LaTeX AST trees, math equations, and bibliography keys locally in your browser memory for air-gapped security and zero-latency performance.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={localProcessing}
                onClick={() => setLocalProcessing(!localProcessing)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  localProcessing ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
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
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Default Citation Format
                </label>
                <p className="text-zinc-500">
                  Standard format applied when inserting references into manuscript files.
                </p>
              </div>

              <select
                value={citationStyle}
                onChange={(e) => setCitationStyle(e.target.value)}
                className="w-full sm:w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="apa">APA 7th Edition</option>
                <option value="ieee">IEEE</option>
                <option value="chicago">Chicago 17th Edition</option>
                <option value="nature">Nature / Vancouver</option>
                <option value="acm">ACM Reference Format</option>
              </select>
            </div>

            {/* Selector: Audit Sensitivity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Audit Verification Rigor
                </label>
                <p className="text-zinc-500">
                  Configure confidence threshold for flagging attribution gaps.
                </p>
              </div>

              <select
                value={auditSensitivity}
                onChange={(e) => setAuditSensitivity(e.target.value)}
                className="w-full sm:w-48 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="standard">Standard (Balanced)</option>
                <option value="high">High Rigor (Peer Review)</option>
                <option value="conservative">Strict (0% Tolerance)</option>
              </select>
            </div>

            {/* Toggle: Report Summaries */}
            <div className="flex items-start justify-between gap-4 pt-4">
              <div className="space-y-1 max-w-lg">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Audit Export Dossier Sharing
                </label>
                <p className="text-zinc-500">
                  Include pre-formatted summary text for co-authors and Principal Investigators when generating dossiers.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={emailSummaries}
                onClick={() => setEmailSummaries(!emailSummaries)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  emailSummaries ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
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

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}
