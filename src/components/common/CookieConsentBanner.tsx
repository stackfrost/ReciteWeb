'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, Lock, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'recite_cookie_consent';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Show after a brief delay for smooth entry
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable or restricted
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie & Storage Notice"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 select-none"
    >
      <div className="p-5 rounded-3xl bg-[#080d1a]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15)] text-xs space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-teal-300 font-bold">
            <Cookie size={16} className="text-teal-400 shrink-0" />
            <span>Essential Cookie & Storage Notice</span>
          </div>

          <button
            onClick={handleAccept}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -mr-1 -mt-1 cursor-pointer"
            title="Dismiss notice"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-zinc-300 text-[11px] leading-relaxed">
          ReciteWeb uses <strong>strictly essential functional cookies</strong> and local browser storage (IndexedDB) to maintain session authentication, store air-gapped manuscript drafts, and keep your editor preferences. 
          <span className="block text-zinc-400 mt-1">
            We do not deploy third-party advertising, analytics, or behavioral tracking cookies.
          </span>
        </p>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.08]">
          <Link
            href="/cookies"
            className="text-zinc-400 hover:text-teal-300 text-[11px] underline underline-offset-2 transition-colors font-medium"
          >
            Read Cookie Policy
          </Link>

          <button
            onClick={handleAccept}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_12px_rgba(20,184,166,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            Accept Essential Cookies
          </button>
        </div>
      </div>
    </div>
  );
}
