'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, FileText, Scale, Shield, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-hidden">
      {/* Liquid Mesh Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-50" />
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-[140px] animate-liquid-orb" />
        <div className="absolute top-40 right-1/4 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-500/15 via-violet-500/10 to-transparent rounded-full blur-[150px] animate-liquid-orb" style={{ animationDelay: '3s' }} />
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#05070d]/70 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-extrabold text-lg tracking-tight text-white font-sans hover:opacity-90 transition cursor-pointer"
              title="ReciteWeb Home"
            >
              Recite<span className="text-teal-400 font-semibold">Web</span>
            </Link>

            <span className="text-zinc-700">/</span>

            <h1 className="text-xs font-semibold text-zinc-300 tracking-tight">
              Terms of Service
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link href="/privacy" className="text-zinc-400 hover:text-teal-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/contact" className="text-zinc-400 hover:text-teal-300 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8 relative z-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-8">
          
          <div className="border-b border-white/[0.08] pb-6 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <Scale size={14} />
              <span>Legal Agreement & User Contract</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ReciteWeb Terms of Service
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Effective Date: August 29, 2026 · Version 2.4-Enterprise
            </p>
          </div>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              1. Preamble & Scope of Agreement
            </h3>
            <p>
              Welcome to ReciteWeb (the &ldquo;Platform&rdquo;, &ldquo;Service&rdquo;, &ldquo;Software&rdquo;), operated by ReciteWeb (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). These Terms of Service (&ldquo;Terms&rdquo;) constitute an agreement between you (&ldquo;User&rdquo;, &ldquo;Researcher&rdquo;, &ldquo;Institution&rdquo;) and ReciteWeb regarding your access to and use of our web platform, WebAssembly modules, AST parsing services, and related APIs.
            </p>
            <p>
              By accessing or using the Service, you signify your acceptance of these Terms. If you do not agree, you must immediately terminate all sessions and delete any cached application data.
            </p>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              2. Intellectual Property & Anti-Theft Covenants
            </h3>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
              <p>
                <strong className="text-white">A. Researcher Manuscript Ownership:</strong> You retain 100% full, exclusive, and unencumbered intellectual property rights, copyright, and patent ownership to all manuscripts, LaTeX files, mathematical proofs, experimental data, figures, and bibliography files uploaded or parsed through ReciteWeb. ReciteWeb does not claim, nor shall it ever acquire, any ownership rights or licensing interests in your scientific discoveries.
              </p>
              <p>
                <strong className="text-white">B. Company Platform Rights:</strong> All proprietary codebases, zero-drift coordinate trackers, AST mathematical tokenizers, UI designs, trademarks, domain names, and algorithms are the exclusive intellectual property of the Company. You are granted only a revocable, non-exclusive, non-transferable personal license to use the Platform strictly in accordance with these Terms.
              </p>
              <p>
                <strong className="text-white">C. Anti-Scraping & Reverse Engineering Prohibition:</strong> You agree not to decompile, reverse engineer, disassemble, extract source code, benchmark for competitive intelligence, or systematically scrape any part of the Platform or its API responses.
              </p>
            </div>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              3. Comprehensive Warranty Disclaimers
            </h3>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 space-y-2">
              <p className="font-bold text-white uppercase tracking-wider text-xs">
                &ldquo;AS IS&rdquo; & &ldquo;AS AVAILABLE&rdquo; OPERATIONAL STIPULATION
              </p>
              <p>
                TO THE FULLEST EXTENT PERMISSIBLE UNDER APPLICABLE LAW, RECITEWEB IS PROVIDED STRICTLY &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR ACADEMIC OR COMMERCIAL PURPOSE, OR NON-INFRINGEMENT.
              </p>
              <p>
                WE MAKE NO GUARANTEES THAT OUR AUDITS WILL RESULT IN ACCEPTANCE BY ANY SPECIFIC JOURNAL, CONFERENCE, EDITORIAL BOARD, OR GRANTING AGENCY. CITATION RADAR OUTPUTS AND NLI ENTAILMENT SCORES ARE ALGORITHMIC ASSISTANCE ESTIMATES AND DO NOT REPLACE INDEPENDENT HUMAN SCHOLARLY REVIEW.
              </p>
            </div>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              4. Strict Limitation of Liability
            </h3>
            <p>
              IN NO EVENT SHALL RECITEWEB TECHNOLOGIES, INC., ITS OFFICERS, DIRECTORS, SHAREHOLDERS, EMPLOYEES, AFFILIATES, OR LICENSORS BE LIABLE FOR ANY INDIRECT, CONSEQUENTIAL, INCIDENTAL, SPECIAL, EXEMPLARY, OR PUNITIVE DAMAGES, INCLUDING DAMAGES FOR LOST SCIENTIFIC REPUTATION, MISSED DEADLINES, REJECTED MANUSCRIPTS, OR LOSS OF RESEARCH DATA.
            </p>
            <p>
              OUR MAXIMUM AGGREGATE LIABILITY ARISING FROM OR RELATED TO THESE TERMS OR YOUR USE OF THE SERVICE SHALL BE STRICTLY CAPPED AT THE TOTAL AMOUNT PAID BY YOU TO RECITEWEB IN THE TWELVE (12) MONTHS PRIOR TO THE OCCURRENCE OF THE EVENT GIVING RISE TO LIABILITY.
            </p>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              5. User Indemnification
            </h3>
            <p>
              You agree to defend, indemnify, and hold harmless ReciteWeb and its subsidiaries from and against any third-party claims, liabilities, damages, and legal expenses (including reasonable attorneys&apos; fees) arising from: (1) your manuscript contents and citations; (2) your breach of academic integrity standards or third-party copyright; or (3) your violation of these Terms.
            </p>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              6. Dispute Resolution, Governing Law & Class Action Waiver
            </h3>
            <p>
              These Terms are governed by applicable laws without regard to conflict of law principles. Any dispute arising out of these Terms shall be resolved via confidential, binding individual arbitration. You agree that any dispute resolution proceedings will be conducted solely on an individual basis and not in a class, consolidated, or representative action.
            </p>
          </section>

          <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
            <span>Questions regarding our legal terms?</span>
            <Link
              href="/contact"
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-white rounded-xl font-bold transition-all border border-white/10 flex items-center gap-1.5"
            >
              <span>Contact Legal Counsel</span>
              <ArrowRight size={13} />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
