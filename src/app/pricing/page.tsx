'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Zap,
  Check,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowRight,
  ChevronLeft,
  Users,
  Award,
  Tag,
  HelpCircle,
  Building,
  Mail,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanTier = 'free' | 'researcher_pro' | 'lab_multiseat' | 'departmental';

export default function PricingPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('researcher_pro');
  const [discountCode, setDiscountCode] = useState('');
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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
      router.push('/workbench');
      return;
    }

    if (plan === 'departmental') {
      if (typeof window !== 'undefined') {
        window.location.href =
          'mailto:sales@reciteweb.com?subject=ReciteWeb%20Departmental%20%26%20Campus%20Inquiry';
      }
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
          // Claim dev session token
          const claimRes = await fetch(data.checkoutUrl);
          const claimData = await claimRes.json();
          if (claimData.token) {
            localStorage.setItem('citeassist_pro_token', claimData.token);
            localStorage.setItem('citeassist_pro_tier', plan);
            router.push('/workbench?activation=success');
            return;
          }
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }

      throw new Error(data.message || 'Unable to initiate payment checkout');
    } catch (err: any) {
      console.error('[PricingPage] Checkout error:', err);
      setErrorMsg(err.message || 'Payment initiation failed. Please try again.');
      setIsLoading(false);
    }
  };

  const proPrice = isDiscountApplied ? 49 : 59;

  const faqs = [
    {
      q: 'How does the Researcher Pro single-seat license work?',
      a: 'Researcher Pro is an annual individual license for 1 researcher. It unlocks unlimited LaTeX manuscript audits, deep NLI claim grounding, and PI dossier exports with 100% zero server data retention.',
    },
    {
      q: 'How is the Lab Multi-Seat ($299/yr) administered?',
      a: 'The Lab Pass provides 6 individual researcher seats (~$49/seat). It includes a centralized PI compliance overview, shared Zotero group synchronization, and direct university grant / PO invoicing.',
    },
    {
      q: 'Can university research grants pay for ReciteWeb?',
      a: 'Yes. Both Researcher Pro and Lab Multi-Seat qualify as standard scientific computing and pre-submission research expenses under NSF, NIH, Horizon Europe, and university discretionary grant budgets.',
    },
    {
      q: 'Does ReciteWeb retain or train on our unpublished papers?',
      a: 'No. ReciteWeb operates under a strict Commercial Zero Data Retention (ZDR) architecture. Your manuscript text and math equations are processed ephemerally in volatile memory over encrypted TLS 1.3 and never written to disk or used for AI training.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#04060b] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-hidden">
      {/* ── Multi-spectral ambient liquid glows ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-40" />
        <div className="absolute top-0 left-1/3 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent blur-[140px] rounded-full transform-gpu will-change-transform" />
        <div className="absolute top-32 right-1/4 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-500/15 via-violet-500/10 to-transparent blur-[150px] rounded-full transform-gpu will-change-transform" />
      </div>

      {/* ── Top Header Navigation ── */}
      <header className="sticky top-0 z-40 bg-[#04060b]/80 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] transition-all"
            >
              <ChevronLeft size={16} />
              <span>Back to Home</span>
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
              Pricing & Plans
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/workbench"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_0_20px_rgba(20,184,166,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>Launch Workbench</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Hero Section ── */}
      <main className="max-w-6xl mx-auto px-4 py-12 sm:py-16 relative z-10 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-300 text-xs font-semibold shadow-sm">
            <ShieldCheck size={14} className="text-teal-300" />
            <span>Transparent Academic Licensing · No Per-Token Surprises</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Pre-Submission Reference Integrity & Citation Defense
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Immunize your manuscripts from desk rejection. Catch retracted literature, dead DOIs, and missing baseline comparisons before peer review.
          </p>
        </div>

        {/* ── 4-Tier Pricing Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {/* TIER 1: FREE STARTER */}
          <div
            onClick={() => setSelectedPlan('free')}
            className={cn(
              'p-6 rounded-3xl border transition-all flex flex-col justify-between backdrop-blur-2xl cursor-pointer relative',
              selectedPlan === 'free'
                ? 'bg-white/[0.06] border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-white/20'
                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18]'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Free Starter
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 font-mono border border-white/10">
                  Preview
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">$0</span>
                <span className="text-xs text-zinc-400">/ forever</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Basic citation exploration for small preprints and short drafts.
              </p>

              <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-zinc-500 shrink-0" />
                  <span>5 pages per document</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-zinc-500 shrink-0" />
                  <span>Retraction matching</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-zinc-500 shrink-0" />
                  <span>Basic AST syntax parsing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-zinc-500 shrink-0" />
                  <span>Local client-side execution</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout('free');
              }}
              className="mt-6 w-full py-3 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              <span>Launch Free Workspace</span>
            </button>
          </div>

          {/* TIER 2: RESEARCHER PRO (FEATURED) */}
          <div
            onClick={() => setSelectedPlan('researcher_pro')}
            className={cn(
              'p-6 rounded-3xl border-2 transition-all flex flex-col justify-between backdrop-blur-2xl cursor-pointer relative',
              selectedPlan === 'researcher_pro'
                ? 'bg-gradient-to-b from-teal-500/20 via-emerald-950/40 to-indigo-950/30 border-teal-400 shadow-[0_0_40px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] ring-1 ring-teal-400/40'
                : 'bg-white/[0.03] border-teal-500/40 hover:border-teal-400/70'
            )}
          >
            {/* Most Popular Badge */}
            <div className="absolute -top-3 right-4 px-3 py-1 bg-gradient-to-r from-emerald-400 to-teal-300 text-zinc-950 font-extrabold text-[9px] uppercase tracking-wider rounded-full shadow-md">
              Most Popular
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Researcher Pro
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-200 font-mono border border-teal-500/30">
                  1 Seat
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-white font-mono">${proPrice}</span>
                <span className="text-xs text-zinc-300">/ year</span>
                {isDiscountApplied && (
                  <span className="text-xs line-through text-zinc-500 font-mono ml-1">$59</span>
                )}
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                1 Individual seat with unlimited pre-submission claim audits.
              </p>

              {/* Promo Code Input (Strictly on Researcher Pro) */}
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-300">
                  <span className="flex items-center gap-1">
                    <Tag size={12} className="text-amber-400" /> Promo Code
                  </span>
                  {isDiscountApplied && (
                    <span className="text-teal-300 font-bold">-$10 Applied</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="e.g. PHD2026"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="flex-1 px-2.5 py-1 bg-black/40 border border-white/15 rounded-lg text-xs text-white uppercase font-mono placeholder-zinc-500 focus:outline-none focus:border-teal-400"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyDiscount();
                    }}
                    className="px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {discountError && (
                  <p className="text-[10px] text-rose-400">{discountError}</p>
                )}
              </div>

              <div className="pt-2 border-t border-white/[0.08] space-y-2 text-xs text-zinc-200">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-teal-300 shrink-0 font-bold" />
                  <span className="font-semibold text-white">Unlimited Manuscripts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-teal-300 shrink-0 font-bold" />
                  <span>AI Claim Entailment Reasoning</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-teal-300 shrink-0 font-bold" />
                  <span>Reviewer Baseline Radar</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-teal-300 shrink-0 font-bold" />
                  <span>PI Compliance Dossier Export</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout('researcher_pro');
              }}
              disabled={isLoading}
              className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 rounded-xl text-xs font-extrabold transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_20px_rgba(20,184,166,0.45)] hover:shadow-[0_10px_25px_rgba(20,184,166,0.6)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Connecting to Gateway...</span>
              ) : (
                <>
                  <span>Unlock Researcher Pro (${proPrice})</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>

          {/* TIER 3: LAB MULTI-SEAT ($299 / 6 SEATS) */}
          <div
            onClick={() => setSelectedPlan('lab_multiseat')}
            className={cn(
              'p-6 rounded-3xl border transition-all flex flex-col justify-between backdrop-blur-2xl cursor-pointer relative',
              selectedPlan === 'lab_multiseat'
                ? 'bg-white/[0.06] border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-cyan-400/40'
                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18]'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Users size={13} />
                  Lab Multi-Seat
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-mono border border-cyan-500/30">
                  6 Seats
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">$299</span>
                <span className="text-xs text-zinc-400">/ year</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                6 Member seats (~$49/seat). Built for university research groups and grant billing.
              </p>

              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-zinc-400 flex items-center gap-2">
                <Tag size={12} className="text-zinc-500 shrink-0" />
                <span>Bulk discounted package (no promo code required).</span>
              </div>

              <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span className="font-semibold text-white">6 Full Member Seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span>Centralized PI Audit Hub</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span>Shared Zotero Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span>Direct Grant PO & Invoicing</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout('lab_multiseat');
              }}
              disabled={isLoading}
              className="mt-6 w-full py-3 bg-white/[0.08] hover:bg-white/[0.15] text-white rounded-xl text-xs font-bold transition-all border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Get Lab Pass ($299)</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* TIER 4: DEPARTMENTAL & INSTITUTIONAL */}
          <div
            onClick={() => setSelectedPlan('departmental')}
            className={cn(
              'p-6 rounded-3xl border transition-all flex flex-col justify-between backdrop-blur-2xl cursor-pointer relative',
              selectedPlan === 'departmental'
                ? 'bg-indigo-950/40 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] ring-1 ring-indigo-400/40'
                : 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.18]'
            )}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Award size={13} />
                  Enterprise
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-mono border border-indigo-500/30">
                  Custom
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">Custom</span>
                <span className="text-xs text-zinc-400">/ annual</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                For departments, national laboratories, and campus-wide licensing.
              </p>

              <div className="pt-2 border-t border-white/[0.06] space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span className="font-semibold text-white">Campus Seat Pool</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>Dedicated Model VPC Routing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>Custom Venue Presets</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-indigo-400 shrink-0" />
                  <span>Institutional DPA & SLA</span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCheckout('departmental');
              }}
              className="mt-6 w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl text-xs font-bold transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Contact Sales</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* ── Comprehensive Feature Comparison Matrix ── */}
        <section className="pt-14 border-t border-white/[0.08] space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-wider text-teal-400 uppercase bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
              Detailed Plan Matrix
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Compare Capabilities by Plan
            </h2>
            <p className="text-xs text-zinc-400 max-w-xl mx-auto">
              Transparent, predictable academic pricing with zero hidden computation fees.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#070a12]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    <th className="p-4 font-semibold text-zinc-300 w-2/5">Capability / Feature</th>
                    <th className="p-4 font-semibold text-zinc-400 text-center w-1/5">Free Starter</th>
                    <th className="p-4 font-bold text-teal-300 text-center w-1/5 bg-teal-500/5 border-x border-white/[0.06]">Researcher Pro</th>
                    <th className="p-4 font-semibold text-indigo-300 text-center w-1/5">Lab Multi-Seat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-zinc-300 font-mono text-[11px]">
                  {/* Category: Verification & Ingestion */}
                  <tr className="bg-white/[0.01]">
                    <td colSpan={4} className="px-4 py-2 text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono">
                      Ingestion &amp; AST Analysis
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">Manuscript Volume / Page Limit</td>
                    <td className="p-4 text-center text-zinc-400">Up to 5 Pages (15k chars)</td>
                    <td className="p-4 text-center text-emerald-400 font-bold bg-teal-500/5 border-x border-white/[0.06]">Unlimited Pages</td>
                    <td className="p-4 text-center text-indigo-300 font-bold">Unlimited Multi-File</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">Math Isolation &amp; Zero-Drift AST Engine</td>
                    <td className="p-4 text-center text-zinc-400">Standard Regex</td>
                    <td className="p-4 text-center text-emerald-400 bg-teal-500/5 border-x border-white/[0.06]">Full AST Quarantine</td>
                    <td className="p-4 text-center text-indigo-300">WASM AST Ledger</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">Overleaf &amp; LaTeX Compiler (.tex/.bib) Ingestion</td>
                    <td className="p-4 text-center text-emerald-400">✓</td>
                    <td className="p-4 text-center text-emerald-400 bg-teal-500/5 border-x border-white/[0.06]">✓</td>
                    <td className="p-4 text-center text-indigo-300">✓ (Multi-Archive)</td>
                  </tr>

                  {/* Category: Peer Review Defense */}
                  <tr className="bg-white/[0.01]">
                    <td colSpan={4} className="px-4 py-2 text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono">
                      Peer-Review Defense &amp; Scholarly Mesh
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">Retraction &amp; Withdrawn Paper Radar</td>
                    <td className="p-4 text-center text-zinc-500">Top 50 Lookup</td>
                    <td className="p-4 text-center text-emerald-400 font-bold bg-teal-500/5 border-x border-white/[0.06]">Full 250M+ Database</td>
                    <td className="p-4 text-center text-indigo-300 font-bold">Continuous Monitoring</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">AI Claim Semantic Grounding &amp; NLI Check</td>
                    <td className="p-4 text-center text-zinc-500">2 Trial Claims</td>
                    <td className="p-4 text-center text-emerald-400 font-bold bg-teal-500/5 border-x border-white/[0.06]">Unlimited Deep NLI</td>
                    <td className="p-4 text-center text-indigo-300 font-bold">Priority GPU Cluster</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">Missing Reviewer Baseline Radar</td>
                    <td className="p-4 text-center text-zinc-500">—</td>
                    <td className="p-4 text-center text-emerald-400 bg-teal-500/5 border-x border-white/[0.06]">✓</td>
                    <td className="p-4 text-center text-indigo-300">✓ (Venue Calibration)</td>
                  </tr>

                  {/* Category: Compliance & Billing */}
                  <tr className="bg-white/[0.01]">
                    <td colSpan={4} className="px-4 py-2 text-[10px] font-bold text-teal-400 uppercase tracking-wider font-mono">
                      Compliance, Privacy &amp; Grant Support
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">Zero Server Data Retention (ZDR Guarantee)</td>
                    <td className="p-4 text-center text-emerald-400">✓</td>
                    <td className="p-4 text-center text-emerald-400 font-bold bg-teal-500/5 border-x border-white/[0.06]">✓ (Formal DPA)</td>
                    <td className="p-4 text-center text-indigo-300 font-bold">✓ (Custom Institutional SLA)</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">PI Compliance Handoff Dossier (.md / .html / .json)</td>
                    <td className="p-4 text-center text-zinc-500">Markdown Only</td>
                    <td className="p-4 text-center text-emerald-400 bg-teal-500/5 border-x border-white/[0.06]">Full SHA-256 Package</td>
                    <td className="p-4 text-center text-indigo-300">Lab-Wide Reports</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-sans text-zinc-200">Grant Billing / University Invoice / W-9 Support</td>
                    <td className="p-4 text-center text-zinc-500">—</td>
                    <td className="p-4 text-center text-zinc-300 bg-teal-500/5 border-x border-white/[0.06]">Itemized Receipt</td>
                    <td className="p-4 text-center text-indigo-300 font-bold">Direct PO / Net-30 Invoicing</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── University Grant Funding Callout ── */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-950/30 via-emerald-950/20 to-indigo-950/30 border border-teal-500/30 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-1 text-left">
            <div className="text-xs font-mono font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building size={14} />
              <span>Paying with University Research Funds or Grant Budgets?</span>
            </div>
            <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
              ReciteWeb licenses qualify under standard research computing, software tools, and publication budget categories for <strong>NSF, NIH, DOE, ERC, Horizon Europe, and UKRI</strong> grants. Need an official vendor quotation or W-9 form?
            </p>
          </div>
          <a
            href="mailto:sales@reciteweb.com?subject=ReciteWeb%20Grant%20Purchase%20Order%20%2F%20Quote%20Request"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Mail size={13} />
            <span>Request Grant Quote</span>
          </a>
        </div>

        {/* ── FAQ Section ── */}
        <section className="pt-10 border-t border-white/[0.08] space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-zinc-400">
              Everything you need to know about licensing, grant billing, and security.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs font-semibold text-zinc-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  <span className="text-zinc-500 text-sm font-mono ml-2">
                    {activeFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="p-4 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Security Footer ── */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-teal-400" />
            <span>256-bit Encrypted Transaction Processing · Dodo Payments PCI-DSS Tier 1</span>
          </div>
          <span className="text-zinc-500 font-mono text-[11px]">Zero Server Data Retention Guarantee</span>
        </div>
      </main>
    </div>
  );
}
