'use client';

/**
 * VaultUnlockModal
 *
 * Rendered at the shell level when `isVaultUnlocked === false`.
 * Prompts the user for their local PIN to unlock the Stronghold vault.
 *
 * In browser/dev mode, the SecurityVault.unlockVault() call is a no-op
 * and the modal resolves immediately so development flow is unblocked.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { SecurityVault } from '@/services/security-vault';
import { useReciteStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function VaultUnlockModal() {
  const { setVaultUnlocked } = useReciteStore();

  const [pin, setPin]             = useState('');
  const [showPin, setShowPin]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      await SecurityVault.unlockVault(pin);
      setVaultUnlocked(true);
    } catch (err: any) {
      setError(
        err?.message?.includes('Wrong')
          ? 'Incorrect PIN. The vault could not be decrypted.'
          : `Vault error: ${err?.message || 'Unknown error.'}`
      );
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/95 backdrop-blur-md">
      <div className="w-full max-w-sm mx-4">
        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100 font-sans">Secure Vault</div>
                <div className="text-[11px] text-zinc-500 font-sans">Stronghold Encrypted Store</div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              LLM API keys are stored in an OS-level encrypted vault.
              Enter your local PIN to unlock for this session.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="px-6 py-5 space-y-4">
            {/* PIN field */}
            <div className="space-y-1.5">
              <label
                htmlFor="vault-pin"
                className="text-xs font-sans font-medium text-zinc-400"
              >
                Vault PIN
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <input
                  ref={inputRef}
                  id="vault-pin"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter PIN..."
                  autoComplete="current-password"
                  disabled={loading}
                  className={cn(
                    'w-full pl-9 pr-10 py-2 bg-zinc-950 border rounded text-sm font-sans text-zinc-100',
                    'placeholder:text-zinc-700 focus:outline-none focus:ring-1 transition-colors',
                    error
                      ? 'border-rose-500/60 focus:ring-rose-500/40'
                      : 'border-zinc-700 focus:border-emerald-500/60 focus:ring-emerald-500/30'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((p) => !p)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-300 font-sans leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!pin.trim() || loading}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 rounded text-sm font-medium font-sans transition-all cursor-pointer',
                'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking Vault...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Unlock Vault</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-6 pb-4 text-[11px] font-sans text-zinc-500 text-center">
            Keys are never transmitted to ReciteAI servers.
            <br />
            Vault: Stronghold / Argon2id-KDF / XSalsa20-Poly1305
          </div>
        </div>
      </div>
    </div>
  );
}
