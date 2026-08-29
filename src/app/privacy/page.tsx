'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Lock, Shield, CheckCircle2, ArrowRight } from 'lucide-react';

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Link href="/terms" className="text-zinc-400 hover:text-teal-300 transition-colors">
              Terms of Service
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
              <Shield size={14} />
              <span>GDPR, CCPA & Academic Zero Data Retention</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ReciteWeb Privacy Policy
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Last Revised: August 29, 2026 · Global Data Protection Framework
            </p>
          </div>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              1. Our Foundational Zero Data Retention (ZDR) Pledge
            </h3>
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-200/90 space-y-2">
              <p className="font-bold text-white">
                🛡️ Complete Manuscript Confidentiality
              </p>
              <p>
                ReciteWeb is designed from first principles for academic research protection. We operate under a strict <strong>Zero Data Retention policy</strong> for all manuscript source code, formulas, and draft contents. LaTeX AST parsing, equation quarantining, and syntax evaluation occur locally in your browser memory or ephemerally in edge execution sandboxes without persistent logging.
              </p>
              <p>
                <strong>We never use your unpublished manuscripts, theories, or citations to train AI models.</strong>
              </p>
            </div>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              2. Categories of Information We Process
            </h3>
            <div className="space-y-2">
              <p>We only collect and process the minimum information necessary to deliver and bill for our service:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
                <li><strong className="text-white">Account Identification:</strong> Email address, verified name, and OAuth provider identifier (Google, Microsoft, GitHub) to secure your account and sync license keys.</li>
                <li><strong className="text-white">Licensing & Billing Records:</strong> Cryptographic license key hashes, subscription tier, and payment verification status. All financial card details are processed directly by certified PCI-DSS Level 1 compliant processors; we never store your payment cards.</li>
                <li><strong className="text-white">Diagnostic & Performance Telemetry:</strong> Aggregated, non-personally identifiable metrics (e.g. edge worker response latency, error codes, and rate limits) used strictly for platform maintenance.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              3. Deep Semantic Inference & Third-Party AI Infrastructure
            </h3>
            <p>
              When a user explicitly triggers an AI-assisted claim verification or missing baseline radar, isolated sentence snippets and prospective citation metadata are transmitted over TLS 1.3 encrypted connections to enterprise AI inference endpoints. These inferences are executed ephemerally under commercial API terms prohibiting customer data retention for model training.
            </p>
            <p className="text-zinc-400 text-[11px]">
              ReciteWeb does not own or operate third-party model inference hardware. Third-party model providers operate under their own enterprise policies, and ReciteWeb disclaims all liability for independent data transmission, upstream network handling, or third-party infrastructure availability.
            </p>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              4. Cookies, Session Tokens & Storage
            </h3>
            <p>
              We use strictly necessary session cookies and browser LocalStorage items to maintain your logged-in state, keep your workbench preferences, and enable air-gapped local draft caching. We do not participate in cross-site ad networks, data brokers, or behavioral advertising trackers.
            </p>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              5. Global Privacy Rights (GDPR / CCPA / PIPEDA)
            </h3>
            <p>
              Under international privacy frameworks, you have full legal control over your personal data:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-zinc-400">
              <li><strong>Right of Access:</strong> Request a complete machine-readable copy of your personal data;</li>
              <li><strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> Permanently delete your account, session logs, and associated license keys;</li>
              <li><strong>Right to Rectification:</strong> Correct any inaccurate identity profile information;</li>
              <li><strong>Right to Restrict Processing:</strong> Opt out of telemetry or optional communication channels.</li>
            </ul>
          </section>

          <section className="space-y-3 text-xs text-zinc-300 leading-relaxed">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-teal-300">
              6. Data Security Safeguards
            </h3>
            <p>
              All data in transit is encrypted using TLS 1.3 with Perfect Forward Secrecy. Data at rest (such as cryptographic license hashes) is secured using AES-256 encryption. Our infrastructure is hosted on globally distributed Cloudflare edge networks with enterprise DDoS mitigation and Web Application Firewall (WAF) protection.
            </p>
          </section>

          <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
            <span>To exercise your privacy rights or request data erasure:</span>
            <a
              href="mailto:privacy@reciteweb.com"
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-teal-300 rounded-xl font-bold transition-all border border-white/10 flex items-center gap-1.5"
            >
              <span>privacy@reciteweb.com</span>
              <ArrowRight size={13} />
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}
