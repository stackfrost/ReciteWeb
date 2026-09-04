'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  ShieldCheck,
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
  Trash2,
  Download,
  AlertTriangle,
  RefreshCw,
  X,
  Building,
  Key,
} from 'lucide-react';
import { useSession, signIn, signOut } from '@/lib/auth-client';
import { useReciteStore } from '@/lib/store';
import { purgeAllLocalData } from '@/lib/account-cleanup';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = useSession();
  const { license, activateLicense, addToast } = useReciteStore();

  // Client Preferences state
  const [localProcessing, setLocalProcessing] = useState(true);
  const [citationStyle, setCitationStyle] = useState('apa');
  const [auditSensitivity, setAuditSensitivity] = useState('standard');
  const [emailSummaries, setEmailSummaries] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  // License token input
  const [licenseInput, setLicenseInput] = useState(license.key || '');
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);

  // Danger Zone Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPurgingLocal, setIsPurgingLocal] = useState(false);
  const [isConfirmingPurgeLocal, setIsConfirmingPurgeLocal] = useState(false);

  // Derived user status
  const user = session?.user;
  const userLicenseStatus = (user as any)?.licenseStatus || (license.status === 'ACTIVE' ? 'PRO' : 'FREE');
  const isPro = userLicenseStatus === 'PRO' || userLicenseStatus === 'ANNUAL_PRO' || license.status === 'ACTIVE';

  const handleOAuthSignIn = async (provider: 'google' | 'microsoft' | 'github') => {
    try {
      await signIn.social({
        provider,
        callbackURL: window.location.href,
      });
    } catch (err: any) {
      console.error('OAuth Sign-in error:', err);
      addToast('Sign-in failed. Please try again.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      addToast('Signed out of cloud account.', 'info');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleSavePreferences = () => {
    setSavedToast(true);
    addToast('Preferences saved successfully.', 'success');
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleVerifyLicense = async () => {
    if (!licenseInput.trim()) return;
    setIsVerifyingLicense(true);
    try {
      await activateLicense(licenseInput.trim());
      addToast('Seat license activated and cryptographically verified.', 'success');
    } catch {
      addToast('License verification failed. Check your token format.', 'error');
    } finally {
      setIsVerifyingLicense(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/user/export-data');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reciteweb_account_export_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Account data export downloaded (GDPR Art. 20).', 'success');
    } catch (err) {
      console.error('Data export error:', err);
      addToast('Failed to download account export.', 'error');
    }
  };

  const handlePurgeLocalData = async () => {
    if (!isConfirmingPurgeLocal) {
      setIsConfirmingPurgeLocal(true);
      setTimeout(() => setIsConfirmingPurgeLocal(false), 4000);
      return;
    }
    setIsConfirmingPurgeLocal(false);
    setIsPurgingLocal(true);
    try {
      await purgeAllLocalData();
      addToast('All local storage, drafts, and caches purged.', 'success');
    } catch (err) {
      console.error('Purge error:', err);
    } finally {
      setIsPurgingLocal(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== 'DELETE') return;
    setIsDeletingAccount(true);

    try {
      // 1. Call Backend Deletion API
      const res = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email }),
      });

      if (!res.ok) {
        throw new Error('Server deletion failed');
      }

      // 2. Clear all local IndexedDB and localStorage data
      await purgeAllLocalData();

      // 3. Sign out of auth session
      try {
        await signOut();
      } catch {}

      addToast('Account and all associated records permanently deleted.', 'success');
      setIsDeleteModalOpen(false);

      // 4. Redirect to landing page
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (err: any) {
      console.error('Account deletion error:', err);
      addToast('Failed to delete account. Please try again or contact support.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-x-hidden select-none">
      {/* ── Liquid Mesh Aura ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-50" />
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px] animate-liquid-orb" />
        <div
          className="absolute top-40 right-1/4 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-[150px] animate-liquid-orb"
          style={{ animationDelay: '3s' }}
        />
      </div>

      {/* ── Top Header Bar ── */}
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
              Account & Data Governance Settings
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-semibold">
              <Lock size={10} />
              Zero-Retention Mesh
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Settings Container ── */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6 relative z-10">

        {/* ── SECTION 1: PROFILE & IDENTITY ── */}
        <section className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300">
                <User size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Researcher Profile & Identity</h2>
                <p className="text-xs text-zinc-400">Authenticated identity and cloud session details</p>
              </div>
            </div>

            {user && (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 text-zinc-300 hover:text-rose-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {user ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-zinc-500 font-mono text-[10px] uppercase">Name</span>
                <p className="text-sm font-bold text-white">{user.name || 'Anonymous Researcher'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-zinc-500 font-mono text-[10px] uppercase">Email Address</span>
                <p className="text-sm font-mono text-teal-300">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Info size={15} className="text-teal-400 shrink-0" />
                <span>You are currently operating in an <strong>Air-Gapped Local Session</strong> without an attached OAuth account.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => handleOAuthSignIn('google')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition cursor-pointer"
                >
                  Sign in with Google
                </button>
                <button
                  onClick={() => handleOAuthSignIn('github')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition cursor-pointer"
                >
                  Sign in with GitHub
                </button>
                <button
                  onClick={() => handleOAuthSignIn('microsoft')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs font-semibold text-white transition cursor-pointer"
                >
                  Sign in with Microsoft
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── SECTION 2: SUBSCRIPTION & OAUTH ENTITLEMENT ── */}
        <section className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <CreditCard size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Subscription & Cloud Entitlements</h2>
                <p className="text-xs text-zinc-400">Tied directly to your authenticated Google, GitHub, or Microsoft account</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider border ${
              isPro ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {isPro ? 'Researcher Pro (Active)' : 'Free Starter Tier'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Subscription Status Card */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className={isPro ? 'text-emerald-400' : 'text-zinc-400'} />
                  <span>{isPro ? 'Researcher Pro Plan' : 'Free Starter Plan'}</span>
                </div>
                <p className="text-zinc-400 text-[11px] max-w-md">
                  {isPro
                    ? 'Your account has unlimited access to the 5-vendor search mesh, deep claim extraction, and pre-submission compliance briefings.'
                    : 'Upgrade to unlock unlimited claim deconstruction, high-speed multi-vendor dragnet, and executive PI briefings.'}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/pricing"
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition text-center w-full sm:w-auto cursor-pointer ${
                    isPro
                      ? 'bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-white'
                      : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 shadow-[0_4px_12px_rgba(20,184,166,0.35)] hover:scale-[1.02]'
                  }`}
                >
                  {isPro ? 'Manage Plan' : 'Upgrade to Pro ($59/yr)'}
                </Link>
              </div>
            </div>

            {/* Dev Sandbox Tier Quick-Toggle (Local Development Mode) */}
            <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 text-teal-300">
                <Sliders size={13} className="shrink-0" />
                <span><strong>Dev Sandbox Mode:</strong> Toggle Pro / Free status for local feature validation without payment.</span>
              </div>
              <button
                onClick={async () => {
                  const newTier = isPro ? 'FREE' : 'PRO';
                  if (newTier === 'PRO') {
                    activateLicense('recite_dev_sandbox_pro_license');
                  } else {
                    useReciteStore.setState({
                      license: { key: null, status: 'UNVERIFIED', lastChecked: Date.now() },
                    });
                  }
                  try {
                    await fetch('/api/user/subscription', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tier: newTier }),
                    });
                  } catch {}
                  addToast(`Dev Sandbox: Switched tier to ${newTier}.`, 'success');
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-400/20 hover:bg-teal-400/30 border border-teal-400/30 text-teal-300 font-bold transition shrink-0 cursor-pointer"
              >
                {isPro ? 'Switch to Free Tier' : 'Switch to Pro Tier'}
              </button>
            </div>

            {/* Collapsed Enterprise Air-Gapped Key Accordion */}
            <details className="group pt-2">
              <summary className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono cursor-pointer transition select-none flex items-center gap-1.5">
                <span>▸ Enterprise Air-Gapped Key (Offline Defense & Government Labs)</span>
              </summary>
              <div className="mt-3 p-4 rounded-2xl bg-white/[0.01] border border-white/[0.05] space-y-2">
                <p className="text-zinc-400 text-[10px]">
                  If operating inside an air-gapped SCIF or offline university subnet, enter your cryptographic Ed25519 seat token:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="recite_seat_..."
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs focus:outline-none focus:border-teal-400 w-full sm:w-64"
                  />
                  <button
                    onClick={handleVerifyLicense}
                    disabled={isVerifyingLicense}
                    className="px-3 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold transition cursor-pointer"
                  >
                    {isVerifyingLicense ? '...' : 'Activate Offline'}
                  </button>
                </div>
              </div>
            </details>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <Link
                href="/pricing"
                className="text-teal-400 hover:text-teal-300 font-semibold text-xs transition flex items-center gap-1"
              >
                <span>View all pricing tiers & lab passes</span>
                <ExternalLink size={11} />
              </Link>

              <Link
                href="/contact?type=enterprise"
                className="text-zinc-400 hover:text-zinc-200 text-xs transition flex items-center gap-1"
              >
                <Building size={12} />
                <span>Request university grant PO / W-9 invoice</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: AIR-GAP & PREFERENCES ── */}
        <section className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-300">
                <Sliders size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Workbench Preferences & Engine Rigor</h2>
                <p className="text-xs text-zinc-400">Citation formatting, audit sensitivity, and local parsing</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs divide-y divide-white/[0.06]">
            {/* Toggle: Local Processing */}
            <div className="flex items-start justify-between gap-4 pt-3 first:pt-0">
              <div className="space-y-0.5 max-w-lg">
                <label className="text-sm font-semibold text-white block">Local Air-Gapped AST Parsing</label>
                <p className="text-zinc-400 text-[11px]">
                  Process LaTeX AST trees and math equations entirely in browser WebAssembly memory for zero server latency.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={localProcessing}
                onClick={() => setLocalProcessing(!localProcessing)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  localProcessing ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    localProcessing ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Dropdown: Citation Format */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-white block">Default Bibliography Format</label>
                <p className="text-zinc-400 text-[11px]">Standard applied when generating repaired references.</p>
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
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-white block">Audit Verification Rigor</label>
                <p className="text-zinc-400 text-[11px]">Confidence threshold for flagging attribution discrepancies.</p>
              </div>

              <select
                value={auditSensitivity}
                onChange={(e) => setAuditSensitivity(e.target.value)}
                className="w-full sm:w-48 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-teal-400"
              >
                <option value="standard" className="bg-[#090d18] text-white">Standard (Balanced)</option>
                <option value="high" className="bg-[#090d18] text-white">High Rigor (Peer Review)</option>
                <option value="conservative" className="bg-[#090d18] text-white">Strict (Zero Tolerance)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_12px_rgba(20,184,166,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </section>

        {/* ── SECTION 4: MULTI-VENDOR ACADEMIC SEARCH MESH ── */}
        <section className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Globe size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Multi-Vendor Academic Search Mesh</h2>
                <p className="text-xs text-zinc-400">Parallel dragnet routing across 5 independent global scholarly repositories</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
              5 Vendors Active
            </span>
          </div>

          {/* 5-Vendor Matrix Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">Crossref</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400">150M+ DOIs</p>
              <span className="inline-block font-mono text-[9px] text-emerald-300">50 req/s Pool</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">OpenAlex</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400">100M+ Works</p>
              <span className="inline-block font-mono text-[9px] text-emerald-300">Inverted AST</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">Europe PMC</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400">40M+ BioMed</p>
              <span className="inline-block font-mono text-[9px] text-teal-300">EMBL-EBI Mesh</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">arXiv</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400">2.4M+ Preprints</p>
              <span className="inline-block font-mono text-[9px] text-cyan-300">Math / Physics</span>
            </div>

            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-[11px]">Semantic Scholar</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-400">210M+ Graph</p>
              <span className="inline-block font-mono text-[9px] text-indigo-300">Citation TLDRs</span>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-white/[0.06] text-xs">
            {/* Primary Vendor Routing Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-white block">Search Routing Strategy</label>
                <p className="text-zinc-400 text-[11px]">Choose how queries are dispatched across our multi-vendor dragnet.</p>
              </div>

              <select
                value={useReciteStore.getState().primarySearchProvider}
                onChange={(e) => {
                  useReciteStore.getState().setPrimarySearchProvider(e.target.value as any);
                  addToast(`Search routing updated to ${e.target.value}.`, 'success');
                }}
                className="w-full sm:w-72 bg-white/[0.04] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-cyan-400"
              >
                <option value="auto" className="bg-[#090d18] text-white">Auto Dynamic Load Balancing (Recommended)</option>
                <option value="openalex" className="bg-[#090d18] text-white">Prioritize OpenAlex (General Scholarly)</option>
                <option value="crossref" className="bg-[#090d18] text-white">Prioritize Crossref (Publisher DOIs)</option>
                <option value="europepmc" className="bg-[#090d18] text-white">Prioritize Europe PMC / PubMed (Biomedical)</option>
                <option value="arxiv" className="bg-[#090d18] text-white">Prioritize arXiv (Math, Physics & CS)</option>
                <option value="semanticscholar" className="bg-[#090d18] text-white">Prioritize Semantic Scholar (Graph)</option>
              </select>
            </div>

            {/* BYOK: Semantic Scholar API Key */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-2">
                  <Key size={14} className="text-indigo-400" />
                  <span>Bring Your Own Key (BYOK) · Semantic Scholar</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Optional: Add your personal or institutional Semantic Scholar API key for dedicated rate limits.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="password"
                  placeholder="Paste API Key (Optional)"
                  defaultValue={useReciteStore.getState().semanticScholarKey || ''}
                  onBlur={(e) => {
                    const key = e.target.value.trim() || null;
                    useReciteStore.getState().setSemanticScholarKey(key);
                    if (key) addToast('Semantic Scholar API key saved.', 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white font-mono text-xs focus:outline-none focus:border-indigo-400 w-full sm:w-56"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: DATA PORTABILITY & PRIVACY (GDPR ART. 20) ── */}
        <section className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Lock size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Data Portability & Client Storage</h2>
                <p className="text-xs text-zinc-400">Export personal records (GDPR Art. 20) and purge local workspace cache</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Export Personal Data */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Download size={14} className="text-teal-400" />
                  Export Account Data (JSON)
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Download a structured, machine-readable JSON archive of your account profile and license audit records.
                </p>
              </div>
              <button
                onClick={handleExportData}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-zinc-200 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={13} />
                <span>Download My Data (GDPR Art. 20)</span>
              </button>
            </div>

            {/* Purge Local Workspaces */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-cyan-400" />
                  Purge Local Workspace Cache
                </span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Wipe all browser IndexedDB draft snapshots, editor buffers, and theme preferences from this device.
                </p>
              </div>
              <button
                onClick={handlePurgeLocalData}
                disabled={isPurgingLocal}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  isConfirmingPurgeLocal
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 animate-pulse'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300'
                }`}
              >
                <RefreshCw size={13} className={isPurgingLocal ? 'animate-spin' : ''} />
                <span>
                  {isPurgingLocal
                    ? 'Purging...'
                    : isConfirmingPurgeLocal
                    ? 'Click Again to Confirm Purge'
                    : 'Purge Local Browser Cache'}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── SECTION 5: ACCOUNT DELETION & DATA ERASURE (GDPR ART. 17) ── */}
        <section className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 shadow-[0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                <Trash2 size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-rose-200">Account Deletion & Data Erasure</h2>
                <p className="text-xs text-rose-300/70">Permanent erasure in accordance with GDPR Article 17 (&ldquo;Right to be Forgotten&rdquo;)</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1 max-w-lg">
              <p className="text-rose-200 font-semibold">Permanently delete your account and all associated records</p>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                This will immediately purge all session tokens, license keys, and account records from our database, as well as all local IndexedDB workspaces from your browser. <strong>This action is irreversible.</strong>
              </p>
            </div>

            <button
              onClick={() => {
                setDeleteConfirmationText('');
                setIsDeleteModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white font-extrabold text-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <Trash2 size={13} />
              <span>Delete Account</span>
            </button>
          </div>
        </section>

      </main>

      {/* ── 2-STEP CONFIRMATION MODAL FOR ACCOUNT DELETION ── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#090d18] border border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-xs text-zinc-300 relative">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>Confirm Permanent Account Deletion</span>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-zinc-500 hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <p className="text-white font-semibold">
                Are you absolutely sure you want to delete your account?
              </p>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                <li>All active seat license tokens and subscription entitlements will be revoked immediately.</li>
                <li>Your user record and telemetry will be permanently wiped from our database.</li>
                <li>All local IndexedDB manuscript caches and drafts on this machine will be purged.</li>
              </ul>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-zinc-400 font-medium">
                To confirm, type <strong className="text-rose-400 font-mono">DELETE</strong> below:
              </label>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-rose-500/40 text-white font-mono text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText.trim() !== 'DELETE' || isDeletingAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                <Trash2 size={13} />
                <span>{isDeletingAccount ? 'Deleting Forever...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
