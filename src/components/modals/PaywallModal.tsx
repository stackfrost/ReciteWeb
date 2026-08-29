'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Check,
  CheckCircle2,
  X,
  Sparkles,
  Lock,
  ArrowRight,
  Clock,
  Award,
  Users,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanTier = 'free' | 'researcher_pro' | 'lab_multiseat' | 'departmental';

export interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerReason?: string;
  onSuccess?: (token: string, tier: PlanTier) => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  triggerReason = 'Unlock 1-Click Citation Auto-Healing & NLI Entailment',
  onSuccess,
}) => {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('researcher_pro');
  const [discountCode, setDiscountCode] = useState('');
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<{ plan: PlanTier; token: string } | null>(null);

  if (!isOpen) return null;

  const validPromoCodes = new Set(['PHD2026', 'NEURIPS', 'STUDENT10', 'ICML2026', 'RESEARCHER']);

  const handleApplyDiscount = () => {
    if (selectedPlan !== 'researcher_pro') {
      setDiscountError('Promo codes apply exclusively to Researcher Pro individual licenses.');
      return;
    }

    const code = discountCode.trim().toUpperCase();
    if (validPromoCodes.has(code) || code === 'PHD2026') {
      setIsDiscountApplied(true);
      setDiscountError(null);
    } else {
      setDiscountError('Invalid code. Try "PHD2026"');
      setIsDiscountApplied(false);
    }
  };

  const handleCheckout = async (plan: PlanTier) => {
    if (plan === 'free') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('citeassist_pro_tier', 'free');
      }
      if (onSuccess) onSuccess('free_token', 'free');
      setCheckoutSuccess({ plan: 'free', token: 'free_token_active' });
      return;
    }

    if (plan === 'departmental') {
      if (typeof window !== 'undefined') {
        window.location.href =
          'mailto:sales@reciteweb.com?subject=ReciteWeb%20Departmental%20%26%20Institutional%20Inquiry';
      }
      onClose();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          discountCode: plan === 'researcher_pro' && isDiscountApplied ? discountCode || 'PHD2026' : undefined,
          returnUrl: `${window.location.origin}/workbench?payment_success=1`,
        }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        if (data.mode === 'sandbox_dev' && data.checkoutUrl) {
          const claimRes = await fetch(data.checkoutUrl);
          const claimData = await claimRes.json();
          if (claimData.token) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('citeassist_pro_token', claimData.token);
              localStorage.setItem('citeassist_pro_tier', plan);
            }
            if (onSuccess) onSuccess(claimData.token, plan);
            setIsLoading(false);
            setCheckoutSuccess({ plan, token: claimData.token });
            return;
          }
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }

      throw new Error(data.message || 'Failed to initialize Dodo Payments checkout session');
    } catch (err: any) {
      console.error('[PaywallModal] Checkout error:', err);
      setErrorMsg(err.message || 'Payment processing failed. Please try again.');
      setIsLoading(false);
    }
  };

  const proPrice = isDiscountApplied && selectedPlan === 'researcher_pro' ? 49 : 59;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#090d18] via-[#070a12] to-[#04060b] border border-white/[0.12] w-full max-w-5xl rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden text-zinc-100 flex flex-col font-sans relative max-h-[92vh] overflow-y-auto backdrop-blur-2xl">
        {/* Multi-spectral ambient liquid glows */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-36 bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-0 right-1/4 w-96 h-36 bg-gradient-to-bl from-indigo-500/20 via-violet-500/15 to-transparent blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] rounded-full transition-colors z-10 cursor-pointer border border-transparent hover:border-white/10"
        >
          <X size={18} />
        </button>

        {checkoutSuccess ? (
          /* Checkout Success & Activation View */
          <div className="p-8 sm:p-12 text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.35)]">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {checkoutSuccess.plan === 'researcher_pro' ? 'Researcher Pro Activated' : 'Workspace Ready'}
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your cryptographic session token has been securely verified. Unlimited manuscript AST parsing, AI claim grounding, and PI dossier exports are now active.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 max-w-md mx-auto text-left font-mono text-xs space-y-2 text-zinc-300 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs border-b border-white/[0.06] pb-2">
                <span className="text-zinc-400">Subscription Tier:</span>
                <span className="text-teal-300 font-bold uppercase tracking-wider">
                  {checkoutSuccess.plan.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-zinc-500">Security Verification:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={12} /> Ed25519 Verified
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  router.push('/workbench');
                }}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_10px_25px_rgba(20,184,166,0.45)] hover:shadow-[0_12px_30px_rgba(20,184,166,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Launch Manuscript Workbench</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Pricing Matrix Selection */
          <>
            {/* Modal Header */}
            <div className="p-6 pb-3 text-center space-y-2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold shadow-sm">
                <ShieldCheck size={14} className="text-teal-300" />
                <span>Pre-Submission Defense & Citation Radar</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Immunize Your Manuscript from Desk Rejection
              </h2>

              <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
                {triggerReason}. Reviewer 2 checks citations. Catch retracted papers, dead DOIs, and missing baselines before submission.
              </p>
            </div>

            {/* 4-Tier Pricing Cards Grid */}
            <div className="px-6 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 relative z-10">
              {/* Tier 1: Free Starter ($0) */}
              <div
                onClick={() => setSelectedPlan('free')}
                className={cn(
                  'p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative backdrop-blur-xl',
                  selectedPlan === 'free'
                    ? 'bg-white/[0.06] border-white/30 shadow-[0_0_25px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-white/20'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18]'
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Free Starter
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 font-mono border border-white/10">
                      Preview
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white font-mono">$0</span>
                    <span className="text-[11px] text-zinc-400">/ forever</span>
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-normal">
                    Basic citation exploration for small preprints.
                  </p>

                  <ul className="space-y-1.5 text-[10px] text-zinc-300 pt-1">
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-zinc-500 shrink-0" />
                      <span>5 pages per document</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-zinc-500 shrink-0" />
                      <span>Retraction matching</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-zinc-500 shrink-0" />
                      <span>Basic AST syntax parsing</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckout('free');
                  }}
                  className="mt-3 w-full py-2 px-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 rounded-xl text-[11px] font-bold transition-all border border-white/10 flex items-center justify-center gap-1 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <span>Current Plan ($0)</span>
                </button>
              </div>

              {/* Tier 2: Researcher Pro ($59 / $49 with code) - Featured */}
              <div
                onClick={() => setSelectedPlan('researcher_pro')}
                className={cn(
                  'p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative backdrop-blur-2xl',
                  selectedPlan === 'researcher_pro'
                    ? 'bg-gradient-to-b from-teal-500/20 via-emerald-950/40 to-indigo-950/30 border-teal-400 shadow-[0_0_35px_rgba(20,184,166,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] ring-1 ring-teal-400/40'
                    : 'bg-white/[0.03] border-teal-500/40 hover:border-teal-400/70'
                )}
              >
                {/* Most Popular Badge */}
                <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-gradient-to-r from-emerald-400 to-teal-300 text-zinc-950 font-extrabold text-[8px] uppercase tracking-wider rounded-full shadow-md">
                  Most Popular
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-teal-300 flex items-center gap-1">
                      <Sparkles size={11} />
                      Pro
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 font-mono border border-teal-500/30">
                      1 User
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white font-mono">${proPrice}</span>
                    <span className="text-[11px] text-zinc-300">/ year</span>
                    {isDiscountApplied && (
                      <span className="text-[10px] line-through text-zinc-500 font-mono ml-0.5">$59</span>
                    )}
                  </div>

                  <p className="text-[10px] text-zinc-300 leading-normal">
                    1 Individual seat, unlimited AI claim audits.
                  </p>

                  <ul className="space-y-1.5 text-[10px] text-zinc-200 pt-1">
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-teal-300 shrink-0 font-bold" />
                      <span className="font-semibold text-white">Unlimited Manuscripts</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-teal-300 shrink-0 font-bold" />
                      <span>AI Claim Entailment</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-teal-300 shrink-0 font-bold" />
                      <span>Reviewer Baseline Radar</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-teal-300 shrink-0 font-bold" />
                      <span>PI Dossier Export</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckout('researcher_pro');
                  }}
                  disabled={isLoading}
                  className="mt-3 w-full py-2 px-2.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 rounded-xl text-[11px] font-extrabold transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_20px_rgba(20,184,166,0.45)] hover:shadow-[0_10px_25px_rgba(20,184,166,0.6)] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Activating License...</span>
                  ) : (
                    <>
                      <span>Unlock Pro (${proPrice})</span>
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>
              </div>

              {/* Tier 3: Lab Multi-Seat ($299/yr, 6 seats) */}
              <div
                onClick={() => setSelectedPlan('lab_multiseat')}
                className={cn(
                  'p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative backdrop-blur-xl',
                  selectedPlan === 'lab_multiseat'
                    ? 'bg-white/[0.06] border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-cyan-400/40'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18]'
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                      <Users size={11} />
                      Lab Pass
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-mono border border-cyan-500/30">
                      6 Seats
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white font-mono">$299</span>
                    <span className="text-[11px] text-zinc-400">/ year</span>
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-normal">
                    6 Seats (~$49/ea), for research labs & grant groups.
                  </p>

                  <ul className="space-y-1.5 text-[10px] text-zinc-300 pt-1">
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-cyan-400 shrink-0" />
                      <span className="font-semibold text-white">6 Lab Member Seats</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-cyan-400 shrink-0" />
                      <span>Centralized PI Hub</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-cyan-400 shrink-0" />
                      <span>Shared Zotero Sync</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-cyan-400 shrink-0" />
                      <span>Grant Invoicing</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckout('lab_multiseat');
                  }}
                  disabled={isLoading}
                  className="mt-3 w-full py-2 px-2.5 bg-white/[0.08] hover:bg-white/[0.15] text-white rounded-xl text-[11px] font-bold transition-all border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span>Get Lab Pass ($299)</span>
                  <ArrowRight size={12} />
                </button>
              </div>

              {/* Tier 4: Department & Enterprise */}
              <div
                onClick={() => setSelectedPlan('departmental')}
                className={cn(
                  'p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative backdrop-blur-xl',
                  selectedPlan === 'departmental'
                    ? 'bg-indigo-950/40 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-indigo-400/40'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18]'
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                      <Award size={11} />
                      Enterprise
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-mono border border-indigo-500/30">
                      Custom
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-white font-mono">Custom</span>
                    <span className="text-[11px] text-zinc-400">/ annual</span>
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-normal">
                    For departments, institutes, & campus licensing.
                  </p>

                  <ul className="space-y-1.5 text-[10px] text-zinc-300 pt-1">
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-indigo-400 shrink-0" />
                      <span className="font-semibold text-white">Campus Seat Pool</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-indigo-400 shrink-0" />
                      <span>Dedicated Model Routing</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-indigo-400 shrink-0" />
                      <span>Custom Venue Presets</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check size={12} className="text-indigo-400 shrink-0" />
                      <span>Custom DPA & SLA</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCheckout('departmental');
                  }}
                  className="mt-3 w-full py-2 px-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl text-[11px] font-bold transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Contact Sales</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Discount Code Section — Exclusively active for Researcher Pro individual license */}
            {selectedPlan === 'researcher_pro' ? (
              <div className="px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white/[0.02] border-y border-white/[0.08] my-2 backdrop-blur-md">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Tag size={13} className="text-amber-400" />
                  <span>Have a student or conference promo code? (e.g. <b>PHD2026</b>)</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Promo Code"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="px-3 py-1 bg-white/[0.04] border border-white/[0.12] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-400 uppercase font-mono w-28 text-center"
                  />
                  <button
                    onClick={handleApplyDiscount}
                    className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 rounded-lg text-xs font-bold transition-all border border-white/10 cursor-pointer"
                  >
                    Apply
                  </button>
                  {isDiscountApplied && (
                    <span className="text-[11px] text-teal-300 font-semibold flex items-center gap-1">
                      <Check size={12} /> -$10 Applied!
                    </span>
                  )}
                  {discountError && (
                    <span className="text-[11px] text-rose-400">{discountError}</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-6 py-2.5 flex items-center justify-between text-[11px] bg-white/[0.02] border-y border-white/[0.08] my-2 text-zinc-400">
                <div className="flex items-center gap-2">
                  <Tag size={12} className="text-zinc-500" />
                  <span>Promo codes (e.g. <b>PHD2026</b>) apply exclusively to <b>Researcher Pro</b> individual licenses.</span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Individual Tier Only</span>
              </div>
            )}

            {errorMsg && (
              <div className="mx-6 p-2 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            {/* Footer Guarantee & Trust Badges */}
            <div className="p-4 bg-black/40 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400 px-6 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Lock size={12} className="text-teal-400" />
                <span>256-Bit Encrypted Direct Checkout</span>
              </div>
              <span className="text-zinc-500">Instant Access · No Account Password Needed</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaywallModal;
