'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Check,
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

export type PlanTier = 'free' | 'researcher_pro' | 'lab_multiseat';

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
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('researcher_pro');
  const [discountCode, setDiscountCode] = useState('');
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validPromoCodes = new Set(['PHD2026', 'NEURIPS', 'STUDENT10', 'ICML2026', 'RESEARCHER']);

  const handleApplyDiscount = () => {
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
      onClose();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const mockPaymentId = `dodo_dev_${plan}_${Date.now()}`;
      const res = await fetch(`/api/payments/claim-session?payment_id=${mockPaymentId}`);
      const data = await res.json();

      if (data.status === 'success' && data.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('citeassist_pro_token', data.token);
          localStorage.setItem('citeassist_pro_tier', plan);
        }
        if (onSuccess) {
          onSuccess(data.token, plan);
        }
        setIsLoading(false);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to initialize checkout session');
      }
    } catch (err: any) {
      console.error('[PaywallModal] Checkout error:', err);
      setErrorMsg(err.message || 'Payment processing failed. Please try again.');
      setIsLoading(false);
    }
  };

  const proPrice = isDiscountApplied ? 49 : 59;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0D1015] border border-zinc-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col font-sans relative max-h-[92vh] overflow-y-auto">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-full transition-colors z-10 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-3 text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck size={14} />
            <span>Pre-Submission Defense & Citation Radar</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Immunize Your Manuscript from Desk Rejection
          </h2>

          <p className="text-xs text-zinc-400 max-w-xl mx-auto">
            {triggerReason}. Reviewer 2 checks citations. Catch retracted papers, dead DOIs, and missing baselines before submission.
          </p>
        </div>

        {/* 3-Tier Pricing Cards Grid */}
        <div className="px-6 py-2 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {/* Tier 1: Free Starter ($0) */}
          <div
            onClick={() => setSelectedPlan('free')}
            className={cn(
              'p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative',
              selectedPlan === 'free'
                ? 'bg-zinc-900/90 border-zinc-500 shadow-[0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-zinc-500/40'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Free Starter
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  Preview
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">$0</span>
                <span className="text-xs text-zinc-500">/ forever</span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-normal">
                Basic citation exploration for small preprints and short drafts.
              </p>

              <ul className="space-y-1.5 text-[11px] text-zinc-300 pt-1">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-zinc-500 shrink-0" />
                  <span>Max 5 pages per document</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-zinc-500 shrink-0" />
                  <span>2 trial audits / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-zinc-500 shrink-0" />
                  <span>Basic AST syntax parsing</span>
                </li>
              </ul>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout('free');
              }}
              className="mt-4 w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Current Plan ($0)</span>
            </button>
          </div>

          {/* Tier 2: Researcher Pro ($59 / $49 with code) - Featured */}
          <div
            onClick={() => setSelectedPlan('researcher_pro')}
            className={cn(
              'p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative',
              selectedPlan === 'researcher_pro'
                ? 'bg-zinc-900/90 border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            )}
          >
            {/* Best Value Badge */}
            <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-extrabold text-[9px] uppercase tracking-wider rounded-full shadow-sm">
              Best Value · PhD Choice
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles size={12} />
                  Researcher Pro
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  1 Year Access
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">${proPrice}</span>
                <span className="text-xs text-zinc-400">/ year</span>
                {isDiscountApplied && (
                  <span className="text-xs line-through text-zinc-500 font-mono ml-1">$59</span>
                )}
              </div>

              <p className="text-[11px] text-zinc-400 leading-normal">
                1 Individual seat, unlimited audits & NLI claim verification.
              </p>

              <ul className="space-y-1.5 text-[11px] text-zinc-300 pt-1">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">Unlimited Papers & Revisions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  <span>NLI Claim Entailment Radar</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  <span>Retraction Radar & Dead DOIs</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400 shrink-0" />
                  <span>Co-Author PI Dossier Export</span>
                </li>
              </ul>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout('researcher_pro');
              }}
              disabled={isLoading}
              className="mt-4 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Unlock Researcher Pro (${proPrice}/yr)</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Tier 3: Lab Multi-Seat ($149/yr) */}
          <div
            onClick={() => setSelectedPlan('lab_multiseat')}
            className={cn(
              'p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative',
              selectedPlan === 'lab_multiseat'
                ? 'bg-zinc-900/90 border-teal-500/80 shadow-[0_0_20px_rgba(20,184,166,0.15)] ring-1 ring-teal-500/50'
                : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                  <Users size={12} />
                  Lab Multi-Seat
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
                  3 Seats
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">$149</span>
                <span className="text-xs text-zinc-400">/ year</span>
              </div>

              <p className="text-[11px] text-zinc-400 leading-normal">
                3 Seats, shared manuscript drawers & priority GPU queue.
              </p>

              <ul className="space-y-1.5 text-[11px] text-zinc-300 pt-1">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-teal-400 shrink-0" />
                  <span className="font-semibold text-white">3 Team Seats Included</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-teal-400 shrink-0" />
                  <span>Shared Manuscript Drawers</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-teal-400 shrink-0" />
                  <span>Priority GPU Queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-teal-400 shrink-0" />
                  <span>Team Compliance Reporting</span>
                </li>
              </ul>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout('lab_multiseat');
              }}
              disabled={isLoading}
              className="mt-4 w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Get Lab Multi-Seat ($149)</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Discount Code Input Section */}
        <div className="px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-zinc-950/40 border-y border-zinc-800/60 my-2">
          <div className="flex items-center gap-2 text-zinc-400">
            <Tag size={13} className="text-amber-400" />
            <span>Have a student or conference promo code? (e.g. <b>PHD2026</b>)</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Promo Code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 uppercase font-mono w-28 text-center"
            />
            <button
              onClick={handleApplyDiscount}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-medium transition-colors cursor-pointer"
            >
              Apply
            </button>
            {isDiscountApplied && (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={12} /> -$10 Applied!
              </span>
            )}
            {discountError && (
              <span className="text-[11px] text-rose-400">{discountError}</span>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 p-2 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs rounded text-center">
            {errorMsg}
          </div>
        )}

        {/* Footer Guarantee & Trust Badges */}
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 px-6">
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-emerald-400" />
            <span>256-Bit Encrypted Direct Checkout</span>
          </div>
          <span className="text-zinc-500">Instant Access · No Account Password Needed</span>
        </div>
      </div>
    </div>
  );
};
