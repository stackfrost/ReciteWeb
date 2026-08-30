'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Shield,
  Zap,
  Sparkles,
  Cpu,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Upload,
  BookOpen,
  Lock,
  Layers,
  Search,
  ExternalLink,
  ChevronDown,
  Terminal,
  Activity,
  Users,
  Code2,
  FileCheck2,
  Mail,
  Copy,
  Check,
  Award,
  Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReciteStore } from '@/lib/store';
import PaywallModal from '@/components/modals/PaywallModal';
import { LegalModal, LegalTab } from '@/components/modals/LegalModal';

interface LandingPageProps {
  onOpenWorkspace: () => void;
  onLoadDemo: () => void;
  onFileUpload: (file: File) => void;
}

export default function LandingPage({
  onOpenWorkspace,
  onLoadDemo,
  onFileUpload,
}: LandingPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');
  const [activePillar, setActivePillar] = useState<number>(0);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [sandboxScenario, setSandboxScenario] = useState<'retraction' | 'broken' | 'grounding'>('retraction');

  const openLegal = (tab: LegalTab) => {
    setLegalModalTab(tab);
    setLegalModalOpen(true);
  };

  const { license } = useReciteStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopyEmail = () => {
    const emailSample = `Subject: Pre-Flight Citation & Peer-Review Verification: [Manuscript Title]

Dear Professor / Co-Authors,

Ahead of our journal submission, I ran our manuscript through ReciteWeb's pre-flight audit agent:

• Peer-Review Defense Score: 98/100 (Submission Ready)
• Citations Scanned: 42 across 18 pages
• Retraction Dragnet: 0 retracted papers detected
• Broken / Dead DOIs: 0 unresolvable links
• AI Claim Grounding: 42/42 claims empirically supported
• Canonical Baselines: Verified against current venue literature

Full SHA-256 verified compliance dossier is attached.`;
    navigator.clipboard.writeText(emailSample);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const pillars = [
    {
      id: 0,
      badge: 'INTEGRITY DRAGNET',
      title: 'Retraction & Dead DOI Radar',
      tagline: 'Never let a retracted paper compromise your peer review',
      description:
        'Cross-matches your BibTeX references against CrossRef DOI registries, OpenAlex scholarly indexes, and curated retraction datasets in real time. Flags unresolvable links, withdrawn manuscripts, and hallucinated citations instantly.',
      visual: (
        <div className="rounded-2xl bg-[#090d16]/90 border border-white/10 p-5 font-mono text-xs space-y-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <span className="text-zinc-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Reference Integrity Radar
            </span>
            <span className="text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
              Live Edge Verified
            </span>
          </div>
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 flex items-start gap-2.5 backdrop-blur-sm">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-red-200 font-semibold">{"\\cite{wakayama2014stimulus}"} (Nature)</div>
              <div className="text-red-300/80 text-[11px] mt-0.5">CRITICAL: Formally retracted by Nature Editorial Office due to falsified imagery.</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-2.5 backdrop-blur-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-emerald-200 font-semibold">{"\\cite{vaswani2017attention}"} (NeurIPS)</div>
              <div className="text-zinc-400 text-[11px] mt-0.5">DOI: 10.48550/arXiv.1706.03762 — Active, 142,000+ citations verified.</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 1,
      badge: 'AI SEMANTIC REASONING',
      title: 'AI-Assisted Claim & Evidence Grounding',
      tagline: 'Empirical verification that cited literature substantiates your statements',
      description:
        'Retrieves cited paper abstracts and runs semantic NLI reasoning to evaluate whether cited findings substantiate your statements. Categorizes claims into SUPPORTED, MISALIGNED, or UNGROUNDED before submission.',
      visual: (
        <div className="rounded-2xl bg-[#090d16]/90 border border-white/10 p-5 font-mono text-xs space-y-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <span className="text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> AI Agent Semantic Reasoning Stream
            </span>
            <span className="text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
              Deep Grounding
            </span>
          </div>
          <div className="text-zinc-200 bg-white/[0.03] p-3 rounded-xl border border-white/[0.08]">
            <span className="text-zinc-400 font-semibold">Claim: </span>
            {"\"Recent transformers achieve 99.4% zero-shot accuracy across all bio-imaging datasets \\cite{smith2023transformers}.\""}
          </div>
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1 backdrop-blur-sm">
            <div className="text-amber-200 font-semibold flex items-center gap-1.5">
              <span>⚠️ Status: MISALIGNED (Confidence: 89%)</span>
            </div>
            <div className="text-zinc-300 text-[11px]">
              Smith et al. only benchmarked chest X-rays (92.1%). Rephrase to avoid desk rejection for over-generalization.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      badge: 'PEER REVIEW DEFENSE',
      title: 'Reviewer Blindspot Baseline Radar',
      tagline: 'Catch missing seminal baselines before Reviewer #2 does',
      description:
        'Analyzes your manuscript topic concepts against canonical research literature to detect seminal baselines and standard comparison benchmarks expected by peer reviewers.',
      visual: (
        <div className="rounded-2xl bg-[#090d16]/90 border border-white/10 p-5 font-mono text-xs space-y-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <span className="text-zinc-300 flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" /> Canonical Baseline Radar
            </span>
            <span className="text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
              Venue Calibration
            </span>
          </div>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
              <span className="text-zinc-200 font-medium">Missing Baseline: DeepLabV3+ (CVPR)</span>
              <span className="text-amber-400 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">HIGH SEVERITY</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
              <span className="text-zinc-200 font-medium">Missing Baseline: Swin-UNet (ICCV)</span>
              <span className="text-emerald-400 text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">SUGGESTED</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      badge: 'VERIFICATION DOSSIER',
      title: '1-Click PI Compliance Briefing',
      tagline: 'Instant compliance certificate and copyable briefing for Co-Authors & PIs',
      description:
        'Generate self-contained, XSS-hardened Markdown, HTML, and JSON audit dossiers with a single click, complete with a pre-formatted email summary ready for your Principal Investigator.',
      visual: (
        <div className="rounded-2xl bg-[#090d16]/90 border border-white/10 p-5 font-mono text-xs space-y-3 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
            <span className="text-zinc-300 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-teal-400" /> PI Compliance Handoff
            </span>
            <button
              onClick={handleCopyEmail}
              className="text-xs bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-zinc-950 font-bold px-3 py-1.5 rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_12px_rgba(20,184,166,0.3)] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedEmail ? 'Copied to Clipboard!' : 'Copy PI Email'}
            </button>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-zinc-300 line-clamp-3 leading-relaxed">
            Subject: Pre-Flight Citation & Peer-Review Verification: Quantum Spin Dynamics.tex
            <br />
            • Peer-Review Defense Score: 98/100 (SUBMISSION READY)
            <br />
            • SHA-256 Digest: e3b0c44298fc1c149afbf4c8996fb924...
          </div>
        </div>
      ),
    },
  ];

  const faqs = [
    {
      q: 'Are my unpublished preprints and draft manuscripts kept confidential?',
      a: 'Yes. ReciteWeb utilizes a privacy-first parsing architecture. LaTeX syntax processing, mathematical formula isolation, and document coordinate tracking execute locally in your browser session. For semantic claim verification, isolated sentence pairs and public metadata are processed ephemerally over encrypted TLS with zero server disk persistence.',
    },
    {
      q: 'Do you train AI models on submitted research manuscripts?',
      a: 'No. We strictly enforce commercial Zero Data Retention (ZDR). Neither ReciteWeb nor our upstream enterprise inference infrastructure stores, indexes, or utilizes your manuscript drafts, equations, or bibliographies for AI model training or continuous learning.',
    },
    {
      q: 'Does ReciteWeb guarantee manuscript acceptance or error-free peer review?',
      a: 'ReciteWeb provides automated pre-flight auditing and reference heuristics to help authors identify retracted literature, ungrounded claims, and formatting anomalies prior to submission. However, automated verification is strictly an advisory aid and does not guarantee journal acceptance or peer-review outcomes. Authors maintain full responsibility for verifying all citations and scientific claims.',
    },
    {
      q: 'How does the academic citation verification mesh work?',
      a: 'ReciteWeb cross-references cited DOIs and titles against authoritative scholarly registries and partner academic metadata feeds spanning over 250M+ research records. For claim grounding, our inference pipeline evaluates manuscript statements against published literature abstracts to highlight potential misalignments or over-generalizations.',
    },
    {
      q: 'Can I import and export directly from Overleaf and standard LaTeX setups?',
      a: 'Yes. You can upload your project archive (.zip), .tex, .bib, or .docx files. ReciteWeb isolates math environments and custom macros during parsing, ensuring that repaired citations and BibTeX entries integrate smoothly back into your LaTeX pipeline without formula corruption or coordinate drift.',
    },
    {
      q: 'What are the licensing options for individual researchers, labs, and departments?',
      a: 'Free Starter provides basic syntax audits (up to 5 pages). Researcher Pro ($59/yr, or $49/yr with promo code) unlocks unlimited manuscripts and deep AI claim verification. Lab Multi-Seat ($299/yr for 6 seats) includes grant invoicing and shared bibliographies. For department-wide seat pools and custom model routing, our enterprise team can be reached at sales@reciteweb.com.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black overflow-hidden">
      {/* ─── Liquid Mesh Texture & Multi-Spectral Atmosphere ─────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Fine Texture Dot Matrix Overlay */}
        <div className="absolute inset-0 liquid-grid-overlay opacity-60" />

        {/* Ambient Multi-Spectral Liquid Plasma Orbs with GPU Compositing */}
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-cyan-500/0 rounded-full blur-[140px] animate-liquid-orb transform-gpu will-change-transform pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[650px] h-[500px] bg-gradient-to-bl from-indigo-500/20 via-violet-500/15 to-purple-600/0 rounded-full blur-[150px] animate-liquid-orb transform-gpu will-change-transform pointer-events-none" style={{ animationDelay: '4s' }} />
        <div className="absolute top-[800px] left-1/3 w-[550px] h-[400px] bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/0 rounded-full blur-[140px] transform-gpu pointer-events-none" />
        <div className="absolute top-[1600px] right-1/3 w-[600px] h-[450px] bg-gradient-to-br from-indigo-500/15 via-violet-600/10 to-teal-500/5 rounded-full blur-[150px] transform-gpu pointer-events-none" />
      </div>

      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".tex,.latex,.docx,.txt,.md,.pdf,.bib"
        onChange={handleFileChange}
      />

      {/* Paywall Modal */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* ─── 1. Top Liquid Glass Navigation Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-[#05070d]/70 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-left cursor-pointer group"
              title="ReciteWeb"
            >
              <span className="font-extrabold text-xl tracking-tight text-white font-sans transition-opacity group-hover:opacity-90">
                Recite<span className="text-teal-400 font-semibold">Web</span>
              </span>
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, 'features')}
              className="hover:text-teal-300 transition-colors"
            >
              Features
            </a>
            <a
              href="#privacy"
              onClick={(e) => scrollToSection(e, 'privacy')}
              className="hover:text-teal-300 transition-colors"
            >
              Privacy & Security
            </a>
            <a
              href="#benchmarks"
              onClick={(e) => scrollToSection(e, 'benchmarks')}
              className="hover:text-teal-300 transition-colors"
            >
              Benchmarks
            </a>
            <Link
              href="/pricing"
              className="hover:text-teal-300 transition-colors"
            >
              Pricing
            </Link>
            <a
              href="#faq"
              onClick={(e) => scrollToSection(e, 'faq')}
              className="hover:text-teal-300 transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="text-xs font-medium text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.09] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all"
            >
              Settings & Auth
            </Link>
            <button
              onClick={onOpenWorkspace}
              className="group relative text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_0_20px_rgba(20,184,166,0.35)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_0_30px_rgba(20,184,166,0.55)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Launch Workbench</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. Hero Section ────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-28 overflow-hidden z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8">
          {/* Dual-Tone Liquid Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-teal-400/30 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 backdrop-blur-2xl shadow-[0_0_25px_rgba(20,184,166,0.15)] ring-1 ring-white/10">
            <Shield className="w-3.5 h-3.5 text-teal-300" />
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-indigo-300 bg-clip-text text-transparent text-xs font-semibold tracking-wide">
              Pre-Submission Reference Integrity &amp; Citation Defense
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          </div>

          {/* Dual-Tone Liquid Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
            Autonomous Citation Defense &amp; <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-200 via-emerald-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(45,212,191,0.25)]">
              AI Peer-Review Intelligence
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
            The pre-flight verification platform for PhD candidates, postdocs, and research labs. Powered by ReciteWeb&apos;s proprietary multi-source academic citation mesh — scanning 250M+ scholarly records across CrossRef registries, OpenAlex scholarly indexes, and partner metadata feeds to ground citations and eliminate desk-rejection hazards with 100% zero-drift LaTeX ASTs.
          </p>

          {/* Action CTAs — Liquid Glass Aesthetics */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenWorkspace}
              className="w-full sm:w-auto px-7 py-4 rounded-xl text-zinc-950 font-extrabold text-sm bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_30px_-5px_rgba(20,184,166,0.5)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_15px_35px_-5px_rgba(20,184,166,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
              <span>Launch Web Workbench</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onLoadDemo}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-100 font-semibold text-sm backdrop-blur-2xl border border-white/[0.12] hover:border-teal-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-teal-300" />
              <span>Load IEEE 2-Column Demo</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white font-medium text-sm backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload .tex / .bib</span>
            </button>
          </div>

          {/* ── Interactive Live 3-Second Citation Defense Sandbox Widget ── */}
          <div className="pt-6 max-w-4xl mx-auto text-left font-sans">
            <div className="rounded-2xl bg-[#090d16]/95 border border-teal-500/30 p-5 shadow-[0_0_50px_rgba(20,184,166,0.15),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl space-y-4 ring-1 ring-white/10">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-zinc-300 ml-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-teal-400" />
                    <span>Interactive Pre-Submission Defense Simulator</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-lg border border-white/[0.06] text-xs font-mono">
                  <button
                    onClick={() => setSandboxScenario('retraction')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-medium',
                      sandboxScenario === 'retraction'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    1. Retraction Radar
                  </button>
                  <button
                    onClick={() => setSandboxScenario('broken')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-medium',
                      sandboxScenario === 'broken'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    2. Dead DOI
                  </button>
                  <button
                    onClick={() => setSandboxScenario('grounding')}
                    className={cn(
                      'px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] font-medium',
                      sandboxScenario === 'grounding'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    3. Claim Grounding
                  </button>
                </div>
              </div>

              {/* Sandbox Scenario Payload */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Left: Input LaTeX snippet */}
                <div className="md:col-span-7 space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Manuscript Source Excerpt (.tex)</span>
                    <span className="text-teal-400 font-semibold">AST Line 42</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] font-mono text-xs text-zinc-200 leading-relaxed overflow-x-auto shadow-inner">
                    {sandboxScenario === 'retraction' && (
                      <div>
                        <span className="text-indigo-300">Stimulus-triggered acquisition of pluripotency</span>
                        <span className="text-zinc-400"> was demonstrated in adult somatic cells </span>
                        <span className="text-rose-400 font-bold bg-rose-950/60 px-1 py-0.5 rounded border border-rose-500/40">{"\\cite{wakayama2014stimulus}"}</span>
                        <span className="text-zinc-400"> under low pH stress.</span>
                      </div>
                    )}
                    {sandboxScenario === 'broken' && (
                      <div>
                        <span className="text-zinc-300">Room-temperature ambient superconductivity in modified lead-apatite </span>
                        <span className="text-amber-400 font-bold bg-amber-950/60 px-1 py-0.5 rounded border border-amber-500/40">{"\\cite{lee2023lk99reproducibility}"}</span>
                        <span className="text-zinc-400"> exhibits zero electrical resistance.</span>
                      </div>
                    )}
                    {sandboxScenario === 'grounding' && (
                      <div>
                        <span className="text-zinc-300">The multi-head self-attention mechanism replaces recurrent layers </span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-500/40">{"\\cite{vaswani2017attention}"}</span>
                        <span className="text-zinc-400"> achieving parallelizable sequence modeling.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Verification Output */}
                <div className="md:col-span-5 space-y-2">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    <span>Autonomous Radar Verdict</span>
                  </div>
                  {sandboxScenario === 'retraction' && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-1.5 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>CRITICAL: FORMAL RETRACTION</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                          Nature (2014)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Withdrawn by Nature Editorial Board due to manipulated figure data. Replace citation to eliminate desk rejection risk.
                      </p>
                    </div>
                  )}

                  {sandboxScenario === 'broken' && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>UNRESOLVED BIBTEX KEY</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                          Dead DOI
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        DOI missing from CrossRef &amp; OpenAlex index. Canonical published rebuttal identified in Nature (2023).
                      </p>
                    </div>
                  )}

                  {sandboxScenario === 'grounding' && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5 font-sans">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>EMPIRICALLY SUPPORTED</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          NeurIPS (99.4%)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Claim is 100% verified against Vaswani et al. Section 3.2. 142,000+ citations verified across OpenAlex.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Sandbox Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/[0.06] text-xs">
                <span className="text-zinc-400 text-[11px]">
                  ⚡ Real-time evaluation across 250M+ scholarly records with zero server data retention.
                </span>
                <button
                  onClick={onOpenWorkspace}
                  className="shrink-0 flex items-center gap-1 text-teal-400 hover:text-teal-300 font-semibold cursor-pointer transition-colors"
                >
                  <span>Open Full Workbench &rarr;</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Client-Side Privacy Sandbox
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> 183+ Verified Reliability Tests
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Zero Server Data Retention
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Overleaf &amp; LaTeX Compatible
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Core Pillars & Interactive Showcase ────────────────────────── */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold font-mono tracking-wider text-teal-400 uppercase bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Four Pillars of Peer-Review Citation Defense
            </h2>
            <p className="text-sm text-zinc-400">
              Designed specifically for researchers preparing high-impact manuscripts for IEEE, Nature, ACM, NeurIPS, and Springer.
            </p>
          </div>

          {/* Interactive Pillar Selector Grid — Liquid Glass Slabs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
            {pillars.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActivePillar(idx)}
                className={`p-5 rounded-2xl text-left backdrop-blur-2xl transition-all duration-200 cursor-pointer ${
                  activePillar === idx
                    ? 'bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-indigo-500/10 border border-teal-400/50 shadow-[0_0_30px_rgba(20,184,166,0.2),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-teal-400/30'
                    : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.07] hover:border-white/[0.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                }`}
              >
                <span className="text-[10px] font-mono font-bold text-teal-300 block mb-1.5 tracking-wide">
                  {p.badge}
                </span>
                <div className="text-sm font-bold text-zinc-100 mb-1">{p.title}</div>
                <div className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{p.tagline}</div>
              </button>
            ))}
          </div>

          {/* Active Pillar Spotlight Card */}
          <div className="p-7 sm:p-10 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_50px_rgba(0,0,0,0.6)] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center backdrop-blur-2xl">
            <div className="space-y-5">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 inline-block shadow-sm">
                {pillars[activePillar].badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {pillars[activePillar].title}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {pillars[activePillar].description}
              </p>
              <div className="pt-2">
                <button
                  onClick={onOpenWorkspace}
                  className="text-xs font-bold text-teal-300 hover:text-teal-200 flex items-center gap-1.5 group transition cursor-pointer"
                >
                  <span>Test on your manuscript in the Workbench</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div>
              {pillars[activePillar].visual}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. Zero-Knowledge Privacy Architecture ─────────────────────────── */}
      <section id="privacy" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold font-mono tracking-wider text-cyan-300 uppercase bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
              Zero-Data Retention & Privacy
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Client-Side AST Parsing with Zero Server Data Retention
            </h2>
            <p className="text-sm text-zinc-400">
              LaTeX AST tokenization, math formula isolation, and BibTeX indexing execute locally inside your browser memory. Deep semantic claim verification processes isolated claim sentences over encrypted TLS with zero disk logging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-2xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent hover:from-white/[0.08] hover:via-white/[0.04] border border-white/[0.09] hover:border-teal-400/40 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_15px_35px_-10px_rgba(0,0,0,0.6)] hover:shadow-[0_0_30px_rgba(20,184,166,0.15)] space-y-4 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-400/30 flex items-center justify-center text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Client-Side AST Parsing Engine</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Spatial coordinate mapping, BibTeX sanitization, and AST math isolation run inside dedicated browser worker threads with zero UI blocking.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent hover:from-white/[0.08] hover:via-white/[0.04] border border-white/[0.09] hover:border-indigo-400/40 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_15px_35px_-10px_rgba(0,0,0,0.6)] hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] space-y-4 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Stateless Ephemeral Audits</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                No draft manuscripts, LaTeX files, or personal research archives are ever saved to cloud databases. Real-time verification is ephemeral and stateless.
              </p>
            </div>

            <div className="p-7 rounded-2xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent hover:from-white/[0.08] hover:via-white/[0.04] border border-white/[0.09] hover:border-cyan-400/40 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_15px_35px_-10px_rgba(0,0,0,0.6)] hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] space-y-4 transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Institutional Confidentiality</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                100% compliant with university IP and confidentiality standards. Safe for patent-pending research and sensitive preprints.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Academic Benchmarks & Empirical Proof ───────────────────────── */}
      <section id="benchmarks" className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] border border-white/[0.1] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200 font-mono">183+</div>
              <div className="text-xs text-teal-300 font-semibold">Reliability Tests Passing</div>
              <div className="text-[11px] text-zinc-400">Zero Math AST Coordinate Drift</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-200 font-mono">0 ms</div>
              <div className="text-xs text-cyan-300 font-semibold">Cloud Storage</div>
              <div className="text-[11px] text-zinc-400">Zero Preprint Data Retention</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-300 font-mono">&lt;50 ms</div>
              <div className="text-xs text-indigo-300 font-semibold">Instant Edge Latency</div>
              <div className="text-[11px] text-zinc-400">Deterministic Citation Lookup</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-200 font-mono">99.4%</div>
              <div className="text-xs text-teal-300 font-semibold">Automated Syntax Recovery</div>
              <div className="text-[11px] text-zinc-400">Preserves Math Macros</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. Commercial 3-Tier Pricing Matrix ─────────────────────────────── */}
      <section id="pricing" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold font-mono tracking-wider text-teal-400 uppercase bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Invest in Your Paper Before Peer Review
            </h2>
            <p className="text-sm text-zinc-400">
              One desk-rejection costs months of research delay. Secure your citations with autonomous pre-flight verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto items-stretch">
            {/* Free Starter */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.04] via-white/[0.02] to-transparent hover:from-white/[0.06] border border-white/[0.09] hover:border-white/[0.18] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.5)] space-y-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-300">Free Starter</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/[0.06] text-zinc-300 border border-white/10">
                    $0 / forever
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white font-mono">$0</div>
                <p className="text-xs text-zinc-400 leading-relaxed">Essential automated syntax audits for individual research drafts.</p>
                <div className="border-t border-white/[0.08] pt-4 space-y-2.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 5 Manuscript Pages
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Missing BibTeX Detection
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Retraction Notice Matching
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span className="w-3.5 text-center">&times;</span> No AI Semantic Grounding
                  </div>
                </div>
              </div>
              <button
                onClick={onOpenWorkspace}
                className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-xl border border-white/10 hover:border-white/20 text-xs font-bold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all cursor-pointer"
              >
                Use Free Starter
              </button>
            </div>

            {/* Researcher Pro (Featured Dual-Tone Glass Prism) */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-teal-500/20 via-emerald-950/40 to-indigo-950/30 border-2 border-teal-400/70 shadow-[0_0_50px_rgba(20,184,166,0.25),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-2xl space-y-6 flex flex-col justify-between relative ring-1 ring-teal-400/40">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-400 to-teal-300 text-zinc-950 uppercase tracking-wide shadow-md shadow-teal-500/30 whitespace-nowrap">
                Most Popular
              </div>
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-teal-300">Researcher Pro</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-teal-500/15 text-teal-200 border border-teal-500/30">
                    1 User
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-white font-mono">$59</span>
                  <span className="text-xs text-zinc-300">/ year</span>
                  <span className="text-[10px] text-teal-300 font-mono">($49 w/ code)</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">Deep AI claim verification & canonical baseline radar for serious submissions.</p>
                <div className="border-t border-white/[0.1] pt-4 space-y-2.5 text-xs text-zinc-200">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-300 shrink-0 font-bold" /> Unlimited Pages & Chapters
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-300 shrink-0 font-bold" /> AI Semantic Claim Grounding
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-300 shrink-0 font-bold" /> Reviewer Blindspot Radar
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-300 shrink-0 font-bold" /> 1-Click PI Compliance Dossier
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPaywall(true)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 hover:from-emerald-300 hover:to-cyan-200 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_10px_25px_rgba(20,184,166,0.45)] hover:shadow-[0_12px_30px_rgba(20,184,166,0.6)] transition-all cursor-pointer"
              >
                Upgrade to Pro ($59/yr)
              </button>
            </div>

            {/* Lab Multi-Seat */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.04] via-white/[0.02] to-transparent hover:from-white/[0.06] border border-white/[0.09] hover:border-white/[0.18] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_20px_40px_rgba(0,0,0,0.5)] space-y-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-300">Lab Multi-Seat</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-200 border border-cyan-500/30">
                    6 Seats (~$49/ea)
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white font-mono">$299</span>
                  <span className="text-xs text-zinc-400">/ year</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">For research labs, grant consortia, and collaborative groups.</p>
                <div className="border-t border-white/[0.08] pt-4 space-y-2.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> 6 Lab Member License Seats
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Centralized PI Compliance Hub
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Shared Zotero & Custom BibTeX
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" /> Direct Grant & Lab Invoicing
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPaywall(true)}
                className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-xl border border-white/10 hover:border-white/20 text-xs font-bold text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all cursor-pointer"
              >
                Get Lab Pass ($299)
              </button>
            </div>

            {/* Department & Institution */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/30 via-white/[0.02] to-transparent hover:from-indigo-950/45 border border-indigo-400/30 hover:border-indigo-400/60 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_rgba(0,0,0,0.5)] space-y-6 flex flex-col justify-between transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-indigo-300">Department</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/40">
                    Enterprise
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white font-mono">Custom</span>
                  <span className="text-xs text-zinc-400">/ annual contract</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">For university departments, research institutes, and campus-wide licensing.</p>
                <div className="border-t border-white/[0.08] pt-4 space-y-2.5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Department-Wide Seat Allocation
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Dedicated Model Routing & Privacy
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Journal & Venue Compliance Presets
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Custom DPA & University Procurement
                  </div>
                </div>
              </div>
              <a
                href="mailto:sales@reciteweb.com?subject=ReciteWeb%20Departmental%20%26%20Institutional%20Inquiry"
                className="w-full py-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 hover:border-indigo-400/60 backdrop-blur-xl text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <span>Contact Enterprise Sales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Dedicated Pricing Page Banner */}
          <div className="pt-2 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-xs text-teal-300 hover:text-teal-200 font-semibold px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-teal-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all cursor-pointer"
            >
              <Sparkles size={13} className="text-teal-300" />
              <span>Open Dedicated Pricing & Grant Invoicing Breakdown</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 7. Academic Integrity FAQ ──────────────────────────────────────── */}
      <section id="faq" className="py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold font-mono tracking-wider text-teal-400 uppercase bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Academic Integrity & Workflow Questions
            </h2>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:from-white/[0.06] border border-white/[0.08] hover:border-white/[0.15] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-5 text-left font-semibold text-sm text-zinc-200 flex items-center justify-between hover:text-white transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180 text-teal-400' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-zinc-300 leading-relaxed border-t border-white/[0.06] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. Bottom CTA & Footer ─────────────────────────────────────────── */}
      <section className="py-24 relative text-center z-10">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Verify Your Manuscript?
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Open the workbench, drop in your .tex and .bib files, and get your Peer-Review Defense Score in seconds.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={onOpenWorkspace}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_30px_rgba(20,184,166,0.5)] hover:shadow-[0_15px_40px_rgba(20,184,166,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Open Manuscript Workbench</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── COMPREHENSIVE ENTERPRISE LEGAL & COMPLIANCE FOOTER ───────────── */}
      <footer className="bg-[#030508]/95 backdrop-blur-2xl text-zinc-400 text-xs border-t border-white/[0.08] relative z-10 pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Top 5-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 lg:gap-10 pb-12 border-b border-white/[0.08]">
            
            {/* Column 1: Brand & Academic Mission (Spans 2 cols on tablet/desktop) */}
            <div className="sm:col-span-2 space-y-4">
              <div className="flex items-center">
                <span className="font-extrabold text-xl text-white tracking-tight font-sans">
                  Recite<span className="text-teal-400 font-semibold">Web</span>
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm">
                The algorithmic pre-submission defense layer for academic researchers. Air-gapped local AST parsing, AI claim grounding, and continuous retraction protection.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] font-semibold">
                  <Shield size={11} />
                  Zero Data Retention
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                  <Lock size={11} />
                  100% Author IP Protected
                </span>
              </div>
            </div>

            {/* Column 2: Product & Capabilities */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Capabilities
              </h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>
                  <button onClick={onOpenWorkspace} className="hover:text-teal-300 transition-colors text-left cursor-pointer">
                    Manuscript Workbench
                  </button>
                </li>
                <li>
                  <a href="#radar" onClick={(e) => scrollToSection(e, 'radar')} className="hover:text-teal-300 transition-colors cursor-pointer">
                    Retraction Dragnet
                  </a>
                </li>
                <li>
                  <a href="#nli" onClick={(e) => scrollToSection(e, 'nli')} className="hover:text-teal-300 transition-colors cursor-pointer">
                    AI Claim Grounding
                  </a>
                </li>
                <li>
                  <a href="#math" onClick={(e) => scrollToSection(e, 'math')} className="hover:text-teal-300 transition-colors cursor-pointer">
                    LaTeX Math Quarantine
                  </a>
                </li>
                <li>
                  <a href="#dossier" onClick={(e) => scrollToSection(e, 'dossier')} className="hover:text-teal-300 transition-colors cursor-pointer">
                    Co-Author Dossier Export
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal & Governance */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Scale size={13} className="text-teal-400" />
                Legal & Privacy
              </h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>
                  <button onClick={() => openLegal('terms')} className="hover:text-teal-300 transition-colors text-left cursor-pointer">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button onClick={() => openLegal('privacy')} className="hover:text-teal-300 transition-colors text-left cursor-pointer">
                    Privacy Policy (GDPR/CCPA)
                  </button>
                </li>
                <li>
                  <button onClick={() => openLegal('disclaimer')} className="hover:text-teal-300 transition-colors text-left cursor-pointer">
                    Academic AI Disclaimer
                  </button>
                </li>
                <li>
                  <button onClick={() => openLegal('terms')} className="hover:text-teal-300 transition-colors text-left cursor-pointer">
                    IP & Anti-Scraping Protection
                  </button>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-teal-300 transition-colors">
                    Standard Contract Formality
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Contact & Inquiries */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <Mail size={13} className="text-teal-400" />
                Contact Channels
              </h4>
              <ul className="space-y-2 text-zinc-400 text-xs">
                <li>
                  <a href="mailto:support@reciteweb.com" className="hover:text-teal-300 transition-colors font-mono text-[11px] block">
                    support@reciteweb.com
                  </a>
                </li>
                <li>
                  <a href="mailto:legal@reciteweb.com" className="hover:text-teal-300 transition-colors font-mono text-[11px] block">
                    legal@reciteweb.com
                  </a>
                </li>
                <li>
                  <a href="mailto:privacy@reciteweb.com" className="hover:text-teal-300 transition-colors font-mono text-[11px] block">
                    privacy@reciteweb.com
                  </a>
                </li>
                <li>
                  <a href="mailto:security@reciteweb.com" className="hover:text-teal-300 transition-colors font-mono text-[11px] block">
                    security@reciteweb.com
                  </a>
                </li>
                <li>
                  <button onClick={() => openLegal('contact')} className="text-teal-300 hover:text-teal-200 transition-colors font-semibold text-left cursor-pointer pt-0.5">
                    Open Contact Directory →
                  </button>
                </li>
              </ul>
            </div>

          </div>

          {/* Legal Disclaimers & Regulatory Protection Banner */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3 text-[11px] text-zinc-400 leading-relaxed">
            <div className="flex items-center gap-2 text-zinc-200 font-bold">
              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
              <span>Academic Integrity & Non-Liability Notice</span>
            </div>
            <p>
              ReciteWeb is an algorithmic pre-submission discovery and reference verification aid. All manuscript intellectual property, mathematical proofs, experimental data, and final scholarly assertions remain solely and exclusively the property of the submitting author(s). ReciteWeb does not warrant or guarantee that its audits will ensure manuscript acceptance by any journal, publisher, conference, or granting agency. ReciteWeb disclaims all liability for peer-review decisions, editorial retractions, or scholarly outcomes.
            </p>
          </div>

          {/* Bottom Bar: Copyright & Quick Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 pt-2">
            <div className="flex items-center gap-2 flex-wrap text-center sm:text-left">
              <span>&copy; {new Date().getFullYear()} ReciteWeb. All rights reserved.</span>
              <span className="hidden sm:inline text-zinc-700">·</span>
              <span>Placeholder for future modification</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={() => openLegal('terms')} className="hover:text-zinc-300 transition-colors cursor-pointer">
                Terms of Use
              </button>
              <button onClick={() => openLegal('privacy')} className="hover:text-zinc-300 transition-colors cursor-pointer">
                Privacy
              </button>
              <button onClick={() => openLegal('disclaimer')} className="hover:text-zinc-300 transition-colors cursor-pointer">
                AI Disclaimer
              </button>
              <Link href="/api/health" className="hover:text-zinc-300 transition-colors">
                System Status
              </Link>
            </div>
          </div>

        </div>
      </footer>

      {/* ─── INTERACTIVE LEGAL MODAL ────────────────────────────────────── */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}
