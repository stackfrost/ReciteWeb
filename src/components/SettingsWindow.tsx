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
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore, type LLMProvider, type LicenseStatus } from '@/lib/store';
import {
  MODEL_REGISTRY,
  getModelsForProvider,
  getDefaultModel,
  type ProviderDescriptor,
} from '@/lib/models';
import { useSettingsStore } from '@/store/useSettingsStore';

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
    setLicenseStatus,
    activateLicense,
    llmRouter,
    setLLMProvider,
    setLLMApiKey,
    setLLMModel,
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
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sensitivity, setSensitivity] = useState(80);
  const [licenseInput, setLicenseInput] = useState(license.key || '');
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);

  // ── Per-provider key drafts (session-memory only, never persisted) ──────────
  const [keyDrafts, setKeyDrafts] = useState<Record<LLMProvider, string>>({
    anthropic:  llmRouter.providerMatrix.anthropic?.apiKey  || '',
    openai:     llmRouter.providerMatrix.openai?.apiKey     || '',
    google:     llmRouter.providerMatrix.google?.apiKey     || '',
    openrouter: llmRouter.providerMatrix.openrouter?.apiKey || '',
    ollama:     '',
  });

  // ── Local UI state for provider / model dropdowns ──────────────────────────
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(
    llmRouter.activeProvider
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    llmRouter.providerMatrix[llmRouter.activeProvider]?.model ||
    getDefaultModel(llmRouter.activeProvider)
  );

  // Sync state whenever the settings window opens or the active provider changes
  React.useEffect(() => {
    if (isOpen) {
      const activeProv = llmRouter.activeProvider;
      setSelectedProvider(activeProv);
      setSelectedModel(
        llmRouter.providerMatrix[activeProv]?.model || getDefaultModel(activeProv)
      );
      setKeyDrafts({
        anthropic:  llmRouter.providerMatrix.anthropic?.apiKey  || '',
        openai:     llmRouter.providerMatrix.openai?.apiKey     || '',
        google:     llmRouter.providerMatrix.google?.apiKey     || '',
        openrouter: llmRouter.providerMatrix.openrouter?.apiKey || '',
        ollama:     '',
      });
    }
  }, [isOpen, llmRouter.activeProvider, llmRouter.providerMatrix]);

  const providerDescriptor: ProviderDescriptor | undefined = MODEL_REGISTRY.find(
    (p) => p.id === selectedProvider
  );
  const isOllama       = selectedProvider === 'ollama';
  const isFreeRouter   = selectedProvider === 'openrouter' && selectedModel === 'openrouter/free';
  const needsApiKey    = !isOllama;

  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://127.0.0.1:11434');

  if (!isOpen) return null;

  // ── Provider switch: update local state + store active provider ────────────
  const handleProviderChange = (prov: LLMProvider) => {
    setSelectedProvider(prov);
    const defaultModel = getDefaultModel(prov);
    setSelectedModel(defaultModel);
    setLLMProvider(prov);
    setLLMModel(prov, defaultModel);
    useSettingsStore.getState().setActiveEngine(prov, defaultModel);
    setShowKey(false);
  };

  // ── Model switch: update local state + store model ────────────────────────
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setLLMModel(selectedProvider, model);
    useSettingsStore.getState().setActiveEngine(selectedProvider, model);
  };

  // ── Apply credentials: writes key to in-memory store & settings store ────
  const handleApply = () => {
    if (!isOllama) {
      const draft = keyDrafts[selectedProvider] || '';
      setLLMApiKey(selectedProvider, draft);
      const settings = useSettingsStore.getState();
      if (selectedProvider === 'openrouter') {
        settings.setKeys({ openRouterApiKey: draft });
      } else if (selectedProvider === 'google') {
        settings.setKeys({ googleApiKey: draft });
      } else if (selectedProvider === 'anthropic') {
        settings.setKeys({ anthropicApiKey: draft });
      } else if (selectedProvider === 'openai') {
        settings.setKeys({ openaiApiKey: draft });
      }
      settings.setActiveEngine(selectedProvider, selectedModel);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  const handleVerifyLicense = async () => {
    setIsVerifyingLicense(true);
    await activateLicense(licenseInput);
    setIsVerifyingLicense(false);
  };

  const licColor =
    license.status === 'ACTIVE'
      ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/30'
      : license.status === 'EXPIRED'
      ? 'text-rose-500 bg-rose-500/10 border border-rose-500/30'
      : 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30';

  // ── Shared <select> class ──────────────────────────────────────────────────
  const selectCls =
    'w-full appearance-none bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 ' +
    'rounded px-3 py-1.5 text-[13px] font-sans text-zinc-800 dark:text-zinc-200 ' +
    'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 ' +
    'transition-all cursor-pointer';

  const labelCls = 'block text-[11px] font-sans font-medium text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide';

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
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 opacity-60" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80 opacity-60" />
            </div>
            <span className="text-sm font-sans font-semibold text-zinc-900 dark:text-zinc-100">
              Settings & Configuration
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
              <div className="px-2 py-1 text-xs font-sans text-zinc-500 dark:text-zinc-400 font-medium">
                Sections
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
            <div className="p-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/40 text-xs font-sans text-zinc-500 space-y-1.5">
              <div className="flex justify-between items-center">
                <span>Seat:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{license.key ? license.key.substring(0, 12) + '...' : 'DEV-SEAT-001'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <span className={license.status === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-yellow-600 dark:text-yellow-400 font-medium'}>
                  {license.status === 'ACTIVE' ? 'Active' : 'Unverified'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Engine:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  {MODEL_REGISTRY.find((p) => p.id === llmRouter.activeProvider)?.label ?? llmRouter.activeProvider}
                </span>
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 bg-white dark:bg-zinc-900/20 p-6 overflow-y-auto font-sans">

            {/* ── TAB 1: LLM ROUTING ─────────────────────────────────────────────── */}
            {activeTab === 'engine' && (
              <div className="space-y-5 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    AI Engine & Model Selection
                  </h3>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Credentials are stored in session memory only and never written to disk or transmitted to ReciteAI servers.
                  </p>
                </div>

                {/* ── Provider Dropdown ──────────────────────────────────────────── */}
                <div>
                  <label className={labelCls}>Provider</label>
                  <div className="relative">
                    <select
                      value={selectedProvider}
                      onChange={(e) => handleProviderChange(e.target.value as LLMProvider)}
                      className={selectCls}
                    >
                      {MODEL_REGISTRY.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* ── Model Dropdown ─────────────────────────────────────────────── */}
                <div>
                  <label className={labelCls}>Model</label>
                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className={selectCls}
                    >
                      {getModelsForProvider(selectedProvider).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}{m.contextWindow ? ` — ${m.contextWindow}` : ''}{m.note ? ` (${m.note})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* ── Credential Area ────────────────────────────────────────────── */}
                {isOllama ? (
                  <div>
                    <label className={labelCls}>Ollama Local Endpoint</label>
                    <input
                      type="text"
                      value={ollamaEndpoint}
                      onChange={(e) => setOllamaEndpoint(e.target.value)}
                      className={cn(selectCls, 'pr-3')}
                      placeholder="http://127.0.0.1:11434"
                    />
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1.5">
                      Fully air-gapped. No API key required. Ensure Ollama is running locally.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {isFreeRouter && (
                      <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
                        <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                          OpenRouter requires an API key to authenticate requests, even for free-tier models. Usage is free, but standard rate limits apply.
                        </p>
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>
                        {providerDescriptor?.label} API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={keyDrafts[selectedProvider]}
                          onChange={(e) =>
                            setKeyDrafts((prev) => ({ ...prev, [selectedProvider]: e.target.value }))
                          }
                          placeholder={providerDescriptor?.keyPlaceholder ?? 'API key...'}
                          className={cn(selectCls, 'pr-10 font-mono text-[12px]')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1.5">
                        Stored in session memory only. Never synced to cloud or written to disk.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Context Window Advisory ────────────────────────────────────── */}
                <p className="text-[10px] text-zinc-500 font-sans border-t border-zinc-200 dark:border-zinc-800 pt-3 leading-relaxed">
                  Note: Manuscript auditing requires extensive context retention. It is highly recommended to select flagship models (e.g., Claude 5 Opus, Gemini 3.1 Pro, GPT-5.6 Sol) with context windows exceeding 128k tokens. Using legacy or heavily quantized local models may result in hallucinated citation keys or truncated analysis.
                </p>
              </div>
            )}

            {/* ── TAB 2: SEAT LICENSE ────────────────────────────────────────────── */}
            {activeTab === 'license' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Seat License & Verification
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Cryptographically signed offline seat tokens enable air-gapped laboratory use.
                  </p>
                </div>

                <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-sans text-zinc-500">Current Seat Status</div>
                      <div className={cn('text-xs font-sans font-medium mt-0.5 px-2.5 py-0.5 rounded border inline-block', licColor)}>
                        {license.status === 'ACTIVE' ? 'Active' : license.status === 'UNVERIFIED' ? 'Unverified' : 'Expired'}
                      </div>
                    </div>

                    <button
                      onClick={handleVerifyLicense}
                      disabled={isVerifyingLicense || !licenseInput}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-sans font-medium text-zinc-700 dark:text-zinc-300 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                      <RefreshCw size={12} className={cn(isVerifyingLicense && 'animate-spin text-emerald-500')} />
                      <span>{isVerifyingLicense ? 'Verifying...' : 'Verify License'}</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className={labelCls}>License Key</label>
                    <input
                      type="text"
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value)}
                      placeholder="Enter License Key..."
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all shadow-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/80 font-sans text-xs">
                    <div>
                      <span className="text-zinc-500 block text-[11px] mb-0.5">Last Checked</span>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{license.lastChecked ? new Date(license.lastChecked).toLocaleString() : 'Never'}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[11px] mb-0.5">Verification Engine</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Lemon Squeezy API</span>
                    </div>
                  </div>
                </div>

                {/* State Override for Testing */}
                <div className="space-y-2 pt-2">
                  <label className={labelCls}>Status Override (Testing)</label>
                  <div className="flex gap-2 font-sans text-xs">
                    {(['ACTIVE', 'UNVERIFIED', 'EXPIRED'] as LicenseStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => setLicenseStatus(st)}
                        className={cn(
                          'px-3 py-1.5 rounded border text-xs font-medium transition-all cursor-pointer',
                          license.status === st
                            ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 border-transparent shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                        )}
                      >
                        {st === 'ACTIVE' ? 'Set Active' : st === 'UNVERIFIED' ? 'Set Unverified' : 'Set Expired'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 3: LOCAL STORAGE ───────────────────────────────────────────── */}
            {activeTab === 'storage' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                    Local Storage Engine
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Zero-retention architecture ensures manuscripts never touch remote database servers.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database size={15} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="font-sans text-xs font-medium text-zinc-900 dark:text-zinc-100">Active: IndexedDB (Client Storage)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-sans text-[10px] font-medium">
                        Local Only
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      Stores sessions locally via <code className="font-mono text-[10px] bg-emerald-500/10 px-1 py-0.5 rounded">idb-keyval</code>. API keys excluded from persistence. No external server retention.
                    </p>
                  </div>

                  <div className="p-3.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 opacity-80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock size={15} className="text-zinc-400" />
                        <span className="font-sans text-xs font-medium text-zinc-600 dark:text-zinc-400">Stub: PostgreSQL Cloud Adapter</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-sans text-[10px] font-medium">
                        Enterprise
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Cloud PostgreSQL adapter for multi-seat institutional synchronization. API keys are never included in cloud sync payloads.
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

            {/* ── TAB 4: DIAGNOSTICS ─────────────────────────────────────────────── */}
            {activeTab === 'display' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-emerald-500" />
                    Diagnostics & Sensitivity
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Configure audit strictness threshold and equation boundary tokens.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-sans text-zinc-600 dark:text-zinc-400 font-medium">
                      <span>Audit Sensitivity Threshold</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{sensitivity}% Strict</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[11px] font-sans text-zinc-400 dark:text-zinc-500">
                      <span>Relaxed</span>
                      <span>Maximum Strictness</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">KaTeX Display Isolation</span>
                        <span className="text-[11px] text-zinc-500">Atomic parsing of \[...\] and \begin&#123;equation&#125;</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-sans text-[10px] font-medium">
                        Enabled
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Connection Heartbeat</span>
                        <span className="text-[11px] text-zinc-500">Continuous network availability verification</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded border font-sans text-[10px] font-medium",
                        telemetry.isOnline
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                      )}>
                        {telemetry.isOnline ? 'Online' : 'Offline'}
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
                Preferences Applied
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
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30 rounded-md text-xs font-sans font-semibold hover:bg-zinc-800 dark:hover:bg-emerald-500/30 transition-all shadow-xs"
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
