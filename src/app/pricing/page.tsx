'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Users,
  Building,
  HelpCircle,
  Mail,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlanTier = 'free' | 'researcher_pro' | 'lab_multiseat' | 'departmental';

export default function PricingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.18] transition-all flex flex-col justify-between backdrop-blur-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Starter
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-mono">
                  Single File
                </span>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">$0</span>
                <span className="text-xs text-zinc-400">/ forever</span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Core syntax hygiene and local BibTeX integrity for standalone LaTeX drafts.
              </p>

              <div className="pt-2 border-t border-white/[0.08] space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-teal-400 shrink-0" />
                  <span>Up to 3 Editor Pages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-teal-400 shrink-0" />
                  <span>Fast BibTeX Syntax Linter</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-teal-400 shrink-0" />
                  <span>Local CrossRef Parsing</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-500">
                  <span className="w-3.5 text-center">&times;</span>
                  <span>No Neural NLI Grounding</span>
                </div>
              </div>
            </div>

            <Link
              href="/workbench"
              className="mt-6 w-full py-3 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] text-center"
            >
              <span>Launch Free Workspace</span>
            </Link>
          </div>

          {/* TIER 2: RESEARCHER PRO (FEATURED) */}
          <div className="p-6 rounded-3xl border-2 bg-gradient-to-b from-teal-500/20 via-emerald-950/40 to-indigo-950/30 border-teal-400 shadow-[0_0_40px_rgba(20,184,166,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] ring-1 ring-teal-400/40 transition-all flex flex-col justify-between backdrop-blur-2xl relative">
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
                <span className="text-3xl font-extrabold text-white font-mono">$59</span>
                <span className="text-xs text-zinc-300">/ year</span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                1 Individual seat with unlimited pre-submission claim audits.
              </p>

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

            <Link
              href="/checkout?plan=researcher_pro"
              className="mt-6 w-full py-3.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 hover:from-emerald-300 hover:to-cyan-200 text-zinc-950 rounded-xl text-xs font-extrabold transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_20px_rgba(20,184,166,0.45)] hover:shadow-[0_10px_25px_rgba(20,184,166,0.6)] flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <span>Unlock Researcher Pro</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* TIER 3: LAB MULTI-SEAT ($299 / 6 SEATS) */}
          <div className="p-6 rounded-3xl border bg-white/[0.03] border-white/[0.09] hover:border-white/[0.18] transition-all flex flex-col justify-between backdrop-blur-2xl relative">
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
                6 Team seats for research labs, postdocs, and grant consortia.
              </p>

              <div className="pt-2 border-t border-white/[0.08] space-y-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span>6 Researcher Pro Seats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span>Centralized PI Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span>Shared Zotero Library</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-cyan-400 shrink-0" />
                  <span>Grant / PO Invoicing</span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout?plan=lab_multiseat"
              className="mt-6 w-full py-3 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] text-center"
            >
              <span>Unlock Lab Pass ($299)</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* TIER 4: DEPARTMENTAL / ENTERPRISE */}
          <div className="p-6 rounded-3xl border bg-indigo-950/20 border-indigo-400/30 hover:border-indigo-400/60 transition-all flex flex-col justify-between backdrop-blur-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Building size={13} />
                  Department
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 font-mono border border-indigo-500/40">
                  Site License
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

            <Link
              href="/contact?type=enterprise"
              className="mt-6 w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-xl text-xs font-bold transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <span>Contact Enterprise Sales</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

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
          <Link
            href="/contact?type=enterprise"
            className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Mail size={13} />
            <span>Request Grant Quote</span>
          </Link>
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
