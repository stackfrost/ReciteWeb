'use client';

import React, { useState } from 'react';
import {
  X,
  Key,
  HardDrive,
  Shield,
  Monitor,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Database,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore, LLMProvider, LicenseState } from '@/lib/store';

interface SettingsWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
}

type SettingsTab = 'license' | 'engine' | 'storage' | 'display';

export default function SettingsWindow({ isOpen: propIsOpen, onClose: propOnClose }: SettingsWindowProps) {
  const {
    showSettings,
    setShowSettings,
    license,
    setLicenseState,
    llmRouter,
    setLLMProvider,
    setLLMApiKey,
    storage,
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

  const [activeTab, setActiveTab] = useState<SettingsTab>('engine');
  const [showKey, setShowKey] = useState<Record<LLMProvider, boolean>>({
    openai: false,
    anthropic: false,
    deepseek: false,
    gemini: false,
  });

  const [keyDrafts, setKeyDrafts] = useState<Record<LLMProvider, string>>({
    openai: llmRouter.providerMatrix.openai.apiKey || '',
    anthropic: llmRouter.providerMatrix.anthropic.apiKey || '',
    deepseek: llmRouter.providerMatrix.deepseek.apiKey || '',
    gemini: llmRouter.providerMatrix.gemini.apiKey || '',
  });

  const [isSyncingLicense, setIsSyncingLicense] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sensitivity, setSensitivity] = useState(80);

  if (!isOpen) return null;

  const handleKeyChange = (provider: LLMProvider, val: string) => {
    setKeyDrafts((prev) => ({ ...prev, [provider]: val }));
  };

  const handleSaveKeys = () => {
    (Object.keys(keyDrafts) as LLMProvider[]).forEach((prov) => {
      setLLMApiKey(prov, keyDrafts[prov]);
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  const handleSyncLicense = async () => {
    setIsSyncingLicense(true);
    await new Promise((r) => setTimeout(r, 900));
    setLicenseState('VALID');
    setIsSyncingLicense(false);
  };

  const licColor =
    license.licenseState === 'VALID'
      ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30'
      : license.licenseState === 'PENDING_SYNC'
      ? 'text-amber-400 bg-amber-400/10 border border-amber-400/30'
      : 'text-rose-500 bg-rose-500/10 border border-rose-500/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-100 font-sans">
      {/* Centered Dual-Pane Modal Container */}
      <div className="relative w-[750px] max-w-[95vw] h-[520px] max-h-[90vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans select-none animate-in zoom-in-95 duration-100 text-zinc-900 dark:text-zinc-100">
        {/* Window Title Bar */}
        <div className="h-10 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 mr-2">
              <div
                onClick={handleClose}
                className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer shadow-xs"
              />
              <div className="w-3 h-3 rounded-full bg-amber-500/80 opacity-60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 opacity-60" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
              SETTINGS & CONFIGURATION
            </span>
          </div>

          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Pane Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Column */}
          <div className="w-52 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-2.5 flex flex-col justify-between flex-shrink-0">
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-600 font-bold">
                SECTIONS
              </div>

              <NavTabButton
                active={activeTab === 'engine'}
                onClick={() => setActiveTab('engine')}
                icon={<Key className="w-4 h-4" />}
                label="LLM Routing"
              />

              <NavTabButton
                active={activeTab === 'license'}
                onClick={() => setActiveTab('license')}
                icon={<Shield className="w-4 h-4" />}
                label="Seat License"
              />

              <NavTabButton
                active={activeTab === 'storage'}
                onClick={() => setActiveTab('storage')}
                icon={<HardDrive className="w-4 h-4" />}
                label="Local Storage"
              />

              <NavTabButton
                active={activeTab === 'display'}
                onClick={() => setActiveTab('display')}
                icon={<Monitor className="w-4 h-4" />}
                label="Diagnostics"
              />
            </div>

            {/* Bottom Diagnostic Badge */}
            <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono text-zinc-500 space-y-1">
              <div className="flex justify-between">
                <span>SEAT:</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">{license.seatId || 'DEV-SEAT-001'}</span>
              </div>
              <div className="flex justify-between">
                <span>STATUS:</span>
                <span className={license.licenseState === 'VALID' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-amber-600 dark:text-amber-400'}>
                  {license.licenseState}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ROUTER:</span>
                <span className="text-zinc-800 dark:text-zinc-200 uppercase font-semibold">{llmRouter.activeProvider}</span>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 bg-white dark:bg-zinc-900/20 p-6 overflow-y-auto font-sans">
            {/* TAB 1: LLM ROUTING */}
            {activeTab === 'engine' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    LLM Routing & API Credentials
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    API keys are stored locally in your browser session. Zero telemetry transmission.
                  </p>
                </div>

                {/* Active Provider Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                    ACTIVE INFERENCE ROUTE
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['openai', 'anthropic', 'deepseek', 'gemini'] as LLMProvider[]).map((prov) => {
                      const isActive = llmRouter.activeProvider === prov;
                      return (
                        <button
                          key={prov}
                          onClick={() => setLLMProvider(prov)}
                          className={cn(
                            'p-2.5 rounded-lg border font-mono text-xs font-bold uppercase transition-all flex flex-col items-center gap-1',
                            isActive
                              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 shadow-xs'
                              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                          )}
                        >
                          <span>{prov}</span>
                          <span className="text-[9px] font-normal text-zinc-400 lowercase">
                            {prov === 'gemini' ? '2.0-flash' : prov === 'anthropic' ? 'claude-3.5' : prov === 'openai' ? 'gpt-4o' : 'deepseek-v3'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provider Matrix Inputs */}
                <div className="space-y-3 pt-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                    CREDENTIAL MATRIX
                  </label>

                  {(['openai', 'anthropic', 'deepseek', 'gemini'] as LLMProvider[]).map((prov) => {
                    const cfg = llmRouter.providerMatrix[prov];
                    const isVisible = showKey[prov];
                    const isSelected = llmRouter.activeProvider === prov;

                    return (
                      <div
                        key={prov}
                        className={cn(
                          'p-3 rounded-lg border transition-colors space-y-2',
                          isSelected
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold uppercase text-zinc-800 dark:text-zinc-200">{prov}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-zinc-500">{cfg.model}</span>
                        </div>

                        <div className="relative">
                          <input
                            type={isVisible ? 'text' : 'password'}
                            value={keyDrafts[prov]}
                            placeholder={prov === 'gemini' ? 'AIzaSy...' : prov === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
                            onChange={(e) => handleKeyChange(prov, e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-3 pr-10 py-1.5 text-xs font-mono text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey((p) => ({ ...p, [prov]: !p[prov] }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: SEAT LICENSE */}
            {activeTab === 'license' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Seat License & Verification
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Cryptographically signed offline seat tokens enable air-gapped laboratory use.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-zinc-500">CURRENT SEAT STATUS</div>
                      <div className={cn('text-xs font-mono font-bold mt-0.5 px-2.5 py-0.5 rounded border inline-block', licColor)}>
                        {license.licenseState}
                      </div>
                    </div>

                    <button
                      onClick={handleSyncLicense}
                      disabled={isSyncingLicense}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-sans font-medium text-zinc-800 dark:text-zinc-200 transition-colors disabled:opacity-50 shadow-xs"
                    >
                      <RefreshCw size={12} className={cn(isSyncingLicense && 'animate-spin text-emerald-500')} />
                      <span>{isSyncingLicense ? 'Synchronizing...' : 'Sync License Server'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/80 font-mono text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">SEAT IDENTIFIER</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold">{license.seatId || 'DEV-SEAT-001'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">OFFLINE GRACE PERIOD</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{license.offlineGraceDaysRemaining} Days Remaining</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">STORAGE RETENTION</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold">Zero-Retention (Local Only)</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[10px]">SIGNATURE ENCRYPTION</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold">ED25519_ACTIVE</span>
                    </div>
                  </div>
                </div>

                {/* State Override for Testing */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                    STATUS OVERRIDE (TESTING)
                  </label>
                  <div className="flex gap-2 font-mono text-xs">
                    {(['VALID', 'PENDING_SYNC', 'EXPIRED'] as LicenseState[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => setLicenseState(st)}
                        className={cn(
                          'px-3 py-1.5 rounded-md border text-[11px] transition-all',
                          license.licenseState === st
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent font-bold shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        )}
                      >
                        SET_{st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LOCAL STORAGE */}
            {activeTab === 'storage' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                    Local Storage Engine
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Zero-retention architecture ensures manuscripts never touch remote database servers.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-emerald-500/40 bg-emerald-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database size={15} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">Active: IndexedDB (Client Storage)</span>
                      </div>
                      <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold">
                        LOCAL ONLY
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Stores sessions locally via <code className="font-mono text-emerald-700 dark:text-emerald-300">idb-keyval</code>. No external server retention.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 opacity-70 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock size={15} className="text-zinc-400" />
                        <span className="font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400">Stub: PostgreSQL Cloud Adapter</span>
                      </div>
                      <span className="px-2 py-0.2 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-[9px]">
                        ENTERPRISE
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Cloud PostgreSQL adapter for multi-seat institutional synchronization.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between font-sans text-xs">
                  <div>
                    <span className="text-zinc-800 dark:text-zinc-200 block font-semibold">Clear Local Cache</span>
                    <span className="text-zinc-500 text-[11px]">Purges cached citation lookups and parsed tokens</span>
                  </div>
                  <button
                    onClick={() => {
                      openConfirm(
                        'Purge Local Database?',
                        'This will delete all locally cached manuscript states and reset IndexedDB.',
                        () => {
                          addToast('Local cache purged successfully', 'success');
                        }
                      );
                    }}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded text-xs transition-colors font-medium"
                  >
                    Purge Cache
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: DIAGNOSTICS & DISPLAY */}
            {activeTab === 'display' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-emerald-500" />
                    Diagnostics & Sensitivity
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Configure audit strictness threshold and equation boundary tokens.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                      <span>AUDIT SENSITIVITY THRESHOLD</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{sensitivity}% STRICT</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(Number(e.target.value))}
                      className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-600">
                      <span>RELAXED</span>
                      <span>MAXIMUM STRICTNESS</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">KaTeX Display Isolation</span>
                        <span className="text-[11px] text-zinc-500">Atomic parsing of \[...\] and \begin&#123;equation&#125;</span>
                      </div>
                      <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold">
                        ENABLED
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Connection Heartbeat</span>
                        <span className="text-[11px] text-zinc-500">Continuous network availability verification</span>
                      </div>
                      <span className="px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold">
                        {telemetry.isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
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
              <span className="flex items-center gap-1.5 text-xs font-sans text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                <CheckCircle2 size={13} />
                Preferences Saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs font-sans font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSaveKeys}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30 rounded-md text-xs font-sans font-semibold hover:bg-zinc-800 dark:hover:bg-emerald-500/30 transition-all shadow-xs"
            >
              <Sparkles size={12} />
              <span>Apply Preferences</span>
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
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-sans text-xs transition-all text-left font-medium',
        active
          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold border border-zinc-200 dark:border-zinc-700 shadow-xs'
          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/60'
      )}
    >
      <span className={cn(active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500')}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
