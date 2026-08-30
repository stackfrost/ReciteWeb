'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Shield,
  Sliders,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  Database,
  Lock,
  Sparkles,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore } from '@/lib/store';

interface SettingsWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type SettingsTab = 'license' | 'preferences' | 'security';

export default function SettingsWindow({ isOpen: propIsOpen, onClose: propOnClose }: SettingsWindowProps) {
  const {
    showSettings,
    setShowSettings,
    license,
    activateLicense,
    telemetry,
    openConfirm,
    addToast,
  } = useReciteStore();

  const isOpen = propIsOpen !== undefined ? propIsOpen : showSettings;
  const handleClose = () => {
    if (propOnClose) propOnClose();
    setShowSettings(false);
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const [activeTab, setActiveTab] = useState<SettingsTab>('license');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sensitivity, setSensitivity] = useState(80);
  const [licenseInput, setLicenseInput] = useState(license.key || '');
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);

  if (!isOpen) return null;

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

  const isPro = license.status === 'ACTIVE';

  const handleApply = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    addToast('Preferences saved successfully', 'success');
  };

  const labelCls = 'block text-[11px] font-sans font-medium text-zinc-600 dark:text-zinc-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none">
      <div
        className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans"
        role="dialog"
        aria-labelledby="settings-title"
      >
        {/* Modal Header */}
        <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h2 id="settings-title" className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-wide font-sans">
              Settings & Subscription
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden min-h-[380px]">
          {/* Left Navigation Sidebar */}
          <div className="w-48 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 flex flex-col justify-between flex-shrink-0">
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Account & App
              </div>

              <NavTabButton
                active={activeTab === 'license'}
                onClick={() => setActiveTab('license')}
                icon={<Shield className="w-4 h-4" />}
                label="Subscription"
              />

              <NavTabButton
                active={activeTab === 'preferences'}
                onClick={() => setActiveTab('preferences')}
                icon={<Sliders className="w-4 h-4" />}
                label="Preferences"
              />

              <NavTabButton
                active={activeTab === 'security'}
                onClick={() => setActiveTab('security')}
                icon={<HardDrive className="w-4 h-4" />}
                label="Privacy & Data"
              />
            </div>

            {/* Bottom Status Card */}
            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-xs font-sans text-zinc-500 space-y-1.5 shadow-2xs">
              <div className="flex justify-between items-center text-[11px]">
                <span>Plan:</span>
                <span className={cn('font-semibold', isPro ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300')}>
                  {isPro ? 'Researcher Pro' : 'Free Starter'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span>Status:</span>
                <span className={isPro ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
                  {isPro ? 'Active · Verified' : 'Evaluation'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 bg-white dark:bg-zinc-900/20 p-6 overflow-y-auto font-sans">
            {/* ── TAB 1: SUBSCRIPTION & LICENSE ──────────────────────────────────── */}
            {activeTab === 'license' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Subscription & Academic Seat Token
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Cryptographically authenticated license tokens verify high-throughput inference quotas and pre-submission defense tools.
                  </p>
                </div>

                {/* License Certificate Card */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Active Tier</div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                        {isPro ? 'Researcher Pro (Annual License)' : 'Free Starter Evaluation'}
                      </div>
                    </div>
                    <span className={cn(
                      'text-[11px] font-semibold px-2.5 py-0.5 rounded-full border',
                      isPro
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    )}>
                      {isPro ? '● Active · Verified' : 'Trial Quota'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-0.5">
                      <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Valid Until</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {isPro ? 'August 30, 2027 (Annual)' : '2 Free Verifications'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-0.5">
                      <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">Verification Mesh</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Lock size={11} /> 256-bit TLS 1.3
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 leading-relaxed border-t border-zinc-200 dark:border-zinc-800">
                    Seat tokens are cryptographically signed with HMAC-SHA256 and bind to your manuscript audit session without transmitting source drafts.
                  </div>
                </div>

                {/* Activate License Input */}
                <div className="space-y-3">
                  <label className={labelCls}>Activate License Key or Checkout Token</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value)}
                      placeholder="Paste your license key or access token..."
                      className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-2xs"
                    />
                    <button
                      onClick={handleVerifyLicense}
                      disabled={isVerifyingLicense || !licenseInput.trim()}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw size={12} className={cn(isVerifyingLicense && 'animate-spin text-emerald-500')} />
                      <span>{isVerifyingLicense ? 'Verifying...' : 'Activate'}</span>
                    </button>
                  </div>
                </div>

                {/* Upgrade Banner */}
                {!isPro && (
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-emerald-500" />
                        <span>Unlock Unlimited Manuscript Audits</span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        Upgrade to Researcher Pro ($49/yr with promo code) for unlimited chapters and multi-file projects.
                      </p>
                    </div>
                    <Link
                      href="/pricing"
                      target="_blank"
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                    >
                      <span>View Plans</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: PREFERENCES ─────────────────────────────────────────────── */}
            {activeTab === 'preferences' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    Editor & Verification Sensitivity
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Tune NLI strictness threshold and mathematical equation boundary quarantining.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      <span>Audit Sensitivity Threshold</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{sensitivity}% Strict</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(Number(e.target.value))}
                      className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                      <span>Balanced (Standard Pre-Submission)</span>
                      <span>Maximum Strictness (Zero-Tolerance)</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">KaTeX Display Math Isolation</span>
                        <span className="text-[11px] text-zinc-500">Atomic quarantining of \[...\] and equation environments</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        Active
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Retraction Radar Autocheck</span>
                        <span className="text-[11px] text-zinc-500">Instant cross-referencing against retraction registries</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: PRIVACY & DATA ─────────────────────────────────────────── */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                    Zero-Retention Architecture & Local Storage
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Your unreleased research drafts never touch remote databases or model training queues.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database size={15} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Client-Side IndexedDB Storage</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">
                        Local Only
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Manuscripts and citation caches are held strictly inside your browser&apos;s sandboxed memory. No draft content is ever logged to disk or external servers.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Purge Local Manuscript Cache</span>
                      <span className="text-zinc-500 text-[11px]">Deletes all cached citation matches and temporary tokens</span>
                    </div>
                    <button
                      onClick={() => {
                        openConfirm(
                          'Purge Local Cache?',
                          'This will clear all locally cached citation resolutions and reset local IndexedDB.',
                          () => {
                            addToast('Local cache purged successfully', 'success');
                          }
                        );
                      }}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs transition-colors font-semibold cursor-pointer"
                    >
                      Purge Cache
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-12 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                <CheckCircle2 size={13} />
                Preferences Applied
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 text-white dark:bg-emerald-600 dark:text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-emerald-500 transition-all shadow-2xs cursor-pointer"
            >
              <CheckCircle2 size={12} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavTabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left font-medium cursor-pointer',
        active
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-700 shadow-2xs'
          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
      )}
    >
      <span className={cn(active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500')}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
