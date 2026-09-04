'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  FileText,
  Lock,
  Mail,
  AlertTriangle,
  Scale,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  Cookie,
  Database,
  HelpCircle,
  Building,
} from 'lucide-react';

export type LegalTab = 'terms' | 'privacy' | 'cookies' | 'disclaimer' | 'contact';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(text);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#090d18] via-[#070a12] to-[#04060b] border border-white/[0.12] w-full max-w-4xl h-[90vh] rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden text-zinc-100 flex flex-col font-sans relative backdrop-blur-2xl">
        
        {/* Multi-spectral ambient liquid glows */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-36 bg-gradient-to-tr from-emerald-500/20 via-teal-400/15 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-0 right-1/4 w-96 h-36 bg-gradient-to-bl from-indigo-500/20 via-violet-500/15 to-transparent blur-3xl pointer-events-none rounded-full" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/[0.08] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2 font-sans">
                <span>Recite<span className="text-teal-400 font-semibold">Web</span></span>
                <span className="text-xs font-medium text-zinc-400 font-mono">/ Legal Center</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Terms of Service, Privacy Governance, AI Disclaimers & Contact Protocols
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-full transition-colors cursor-pointer border border-transparent hover:border-white/10"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto relative z-10 scrollbar-none">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'terms'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-teal-200 border border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <FileText size={14} />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'privacy'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-teal-200 border border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Lock size={14} />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'cookies'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-teal-200 border border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Cookie size={14} />
            <span>Cookie Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('disclaimer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'disclaimer'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-teal-200 border border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <AlertTriangle size={14} />
            <span>AI & Academic Disclaimer</span>
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'contact'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-teal-200 border border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <Mail size={14} />
            <span>Contact & Inquiries</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-xs text-zinc-300 leading-relaxed font-sans relative z-10 select-text">
          
          {/* ──────────────── TAB 1: TERMS OF SERVICE ──────────────── */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h3 className="text-base font-extrabold text-white">Terms of Service</h3>
                <p className="text-[11px] text-teal-400 font-mono mt-0.5">
                  Last Updated: August 29, 2026 · Effective Immediately
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">1. Acceptance of Terms & Eligibility</h4>
                <p>
                  By accessing, browsing, registering for, or using ReciteWeb (the &ldquo;Service&rdquo;, &ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you (&ldquo;User&rdquo;, &ldquo;Researcher&rdquo;, or &ldquo;Licensee&rdquo;) confirm that you have read, understood, and agreed to be legally bound by these Terms of Service. If you are using the Service on behalf of a university, laboratory, research institute, or corporation, you represent and warrant that you possess the full legal authority to bind said entity to these terms. If you do not agree to these terms, you must immediately cease all access and usage of the Platform.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">2. Intellectual Property Rights & Ownership</h4>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                  <p>
                    <strong className="text-white">User Manuscript Ownership:</strong> You retain 100% full, unencumbered intellectual property rights, copyright, and title to all academic manuscripts, LaTeX source code, bibliographies, mathematical theorems, data files, and research notes processed through ReciteWeb. We claim zero ownership or rights over your scientific discoveries.
                  </p>
                  <p>
                    <strong className="text-white">Platform Proprietary Rights:</strong> All proprietary software, mathematical AST parsers, coordinate drift algorithms, deterministic audit engines, user interface designs, logos, trade secrets, and documentation comprising ReciteWeb are the exclusive intellectual property of ReciteWeb Technologies, Inc. and its licensors.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">3. Strict Anti-Scraping, Anti-Reverse-Engineering & Prohibited Conduct</h4>
                <p>
                  You agree that you shall NOT, directly or indirectly:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li>Decompile, disassemble, reverse engineer, decrypt, or attempt to extract the source code or underlying trade secrets of our AST parsers, edge functions, or binary WebAssembly modules;</li>
                  <li>Use automated bots, spiders, crawlers, scrapers, or scripts to harvest data, audit endpoints, or programmatic responses without express written authorization;</li>
                  <li>Circumvent, bypass, disable, or tamper with any digital rights management, cryptographic license keys, rate limits, or paywall boundaries;</li>
                  <li>Inject malicious LaTeX macros, fork bombs, buffer overflows, command injections, or malicious code designed to degrade or compromise our infrastructure or other users;</li>
                  <li>Share, resell, lease, sublicense, or distribute individual seat licenses or access tokens across unauthorized multi-user pools.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">4. Absolute Disclaimer of Warranties (&ldquo;AS IS&rdquo;)</h4>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 space-y-1.5">
                  <p className="font-semibold text-white uppercase tracking-wider text-[11px]">
                    Comprehensive Commercial & Academic Disclaimer
                  </p>
                  <p>
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED AVAILABILITY.
                  </p>
                  <p>
                    WE DO NOT WARRANT OR GUARANTEE THAT USE OF THE SERVICE WILL ENSURE MANUSCRIPT ACCEPTANCE, PEER REVIEW CLEARANCE, GRANT APPROVAL, TENURE CONFERRAL, SCIENTIFIC CONSENSUS, OR ERROR-FREE CITATION COMPLIANCE.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">5. Limitation of Liability</h4>
                <p>
                  IN NO EVENT SHALL RECITEWEB TECHNOLOGIES, INC., ITS DIRECTORS, OFFICERS, EMPLOYEES, AFFILIATES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF SCIENTIFIC REPUTATION, RETRACTED PUBLICATIONS, MISSED SUBMISSION DEADLINES, REJECTED GRANTS, OR LOSS OF REVENUE OR PROFITS, ARISING OUT OF OR IN CONNECTION WITH THE USE OR INABILITY TO USE THE SERVICE.
                </p>
                <p>
                  IN ALL CIRCUMSTANCES, OUR TOTAL AGGREGATE LIABILITY UNDER THESE TERMS SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO RECITEWEB IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">6. Indemnification</h4>
                <p>
                  You agree to defend, indemnify, and hold harmless ReciteWeb and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, settlements, judgments, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your manuscript contents or intellectual property; (b) your violation of these Terms; or (c) your violation of any academic integrity policies, copyright laws, or rights of any third party.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">7. Governing Law & Mandatory Binding Arbitration</h4>
                <p>
                  These Terms shall be governed by and construed in accordance with applicable laws without regard to conflict of law principles. Any dispute, controversy, or claim arising out of or relating to these Terms shall be resolved exclusively through confidential, final, and binding individual arbitration administered under standard arbitration rules, rather than in court. You explicitly waive any right to participate in a class-action lawsuit or class-wide arbitration.
                </p>
              </section>
            </div>
          )}

          {/* ──────────────── TAB 2: PRIVACY POLICY ──────────────── */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h3 className="text-base font-extrabold text-white">Privacy Policy & Data Protection Governance</h3>
                <p className="text-[11px] text-teal-400 font-mono mt-0.5">
                  GDPR, CCPA & Academic Non-Disclosure Compliant · Effective: August 29, 2026
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">1. Local-First & Zero-Retention Architecture</h4>
                <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-200/90 space-y-1.5">
                  <p className="font-semibold text-white">
                    🔒 Air-Gapped Academic Safety Guarantee
                  </p>
                  <p>
                    ReciteWeb is engineered around a strict <strong>Zero Data Retention (ZDR)</strong> model for research drafts. By default, LaTeX parsing, AST tokenization, math equation quarantining, and bibliography indexation execute directly inside your browser&apos;s WebAssembly / Web Worker memory. Your raw draft text is never logged, stored in persistent disk databases, sold to data brokers, or used to train foundational AI models.
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">2. Information We Collect</h4>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li><strong>Account & Identity Data:</strong> When logging in via Google, Microsoft, or GitHub OAuth, we receive your email address, verified name, and profile identifier to authenticate your account and sync license keys.</li>
                  <li><strong>Billing & License Records:</strong> Cryptographic license key hashes, subscription tier, and expiration dates. We do NOT store full credit card numbers; all payment transactions are handled securely by PCI-DSS certified payment processors.</li>
                  <li><strong>Operational & Telemetry Metrics:</strong> Anonymous aggregated performance metrics (e.g., AST parse latency, HTTP status codes, error rates) to maintain edge server health.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">3. Third-Party AI Semantic Inferences & Upstream Infrastructure</h4>
                <p>
                  When you explicitly trigger a Deep Semantic Verification or NLI Claim Entailment audit, isolated sentence pairs (the claim sentence and candidate citation abstract) are transmitted over TLS 1.3 encrypted channels to enterprise inference endpoints solely to compute factual entailment scores. These payloads are processed ephemerally in volatile memory under commercial API agreements that prohibit customer data retention for model training.
                </p>
                <p className="text-zinc-400 text-[11px]">
                  ReciteWeb does not own or operate third-party model inference hardware. Users acknowledge that third-party model providers operate under their respective enterprise service terms, and ReciteWeb disclaims all liability for independent data transmission, upstream network handling, or third-party infrastructure availability.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">4. Cookies & Local Storage</h4>
                <p>
                  We only utilize essential functional cookies and browser LocalStorage items necessary for session authentication, user interface preferences (e.g., citation formatting standards), and local manuscript recovery caching. We do not deploy third-party advertising tracking cookies.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">5. Your Data Rights (GDPR / CCPA)</h4>
                <p>
                  Regardless of your geographical location, you have the right to:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li>Request a full export of your account metadata and license records;</li>
                  <li>Request immediate and permanent deletion of your account and associated license keys (&ldquo;Right to be Forgotten&rdquo;);</li>
                  <li>Rectify inaccurate account profile data;</li>
                  <li>Opt-out of any non-essential telemetry or email communications.</li>
                </ul>
                <p className="pt-1">
                  To exercise any of these rights, use the self-serve <strong>Account Deletion & Data Portability</strong> controls in your <a href="/settings" className="text-teal-300 font-bold underline underline-offset-2">Account Settings</a> or submit an inquiry through our <a href="/contact" className="text-teal-300 font-bold underline underline-offset-2">Contact Portal</a>.
                </p>
              </section>
            </div>
          )}

          {/* ──────────────── TAB: COOKIE POLICY ──────────────── */}
          {activeTab === 'cookies' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Cookie size={18} className="text-teal-400" />
                  <span>Cookie & Local Storage Policy</span>
                </h3>
                <p className="text-[11px] text-teal-400 font-mono mt-0.5">
                  Effective August 29, 2026 · Strictly Essential & Functional Only
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">1. Strictly Essential Cookies & Local Storage</h4>
                <p>
                  ReciteWeb utilizes strictly essential cookies and client-side browser storage (IndexedDB & LocalStorage) required for application performance, session security, and air-gapped manuscript editing.
                </p>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 mt-2">
                  <p className="font-mono text-[11px] text-teal-300">Active Storage Keys & Lifetime:</p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-400 text-[11px]">
                    <li><strong className="text-zinc-200">better-auth.session_token</strong> (HTTP Cookie, 30 days): Authenticated session persistence.</li>
                    <li><strong className="text-zinc-200">recite_free_audits</strong> (HTTP Cookie, 24 hours): Ephemeral rate-limiting counter for free tier.</li>
                    <li><strong className="text-zinc-200">reciteweb_workspace_files</strong> (IndexedDB, Persistent): Local air-gapped manuscript draft storage.</li>
                    <li><strong className="text-zinc-200">reciteweb_pro_token</strong> (LocalStorage, Persistent): Ed25519 seat license cryptographic signature.</li>
                    <li><strong className="text-zinc-200">recite-theme</strong> (LocalStorage, Persistent): UI dark/light theme preference.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">2. Zero Third-Party Tracking</h4>
                <p>
                  We do not deploy marketing trackers, advertising cookies (e.g. Meta Pixel, Google Ads Remarketing), or cross-site behavioral tracking cookies.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white">3. User Controls</h4>
                <p>
                  You can purge all local browser storage, tokens, and IndexedDB drafts at any time through our dedicated <a href="/cookies" className="text-teal-300 font-bold underline underline-offset-2">Cookie Policy Page</a> or <a href="/settings" className="text-teal-300 font-bold underline underline-offset-2">Account Settings</a>.
                </p>
              </section>
            </div>
          )}

          {/* ──────────────── TAB 3: DISCLAIMER ──────────────── */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-400" />
                  AI & Academic Integrity Disclaimer
                </h3>
                <p className="text-[11px] text-teal-400 font-mono mt-0.5">
                  Pre-Submission Audit Transparency & Human Oversight Notice
                </p>
              </div>

              <section className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                <h4 className="text-sm font-bold text-white">1. Decision Support, Not Automated Authorship</h4>
                <p>
                  ReciteWeb provides deterministic and neural decision support designed to highlight potential citation discrepancies, retraction notices, and empirical assertion misalignments in scholarly manuscripts. It does not replace the authorial judgment or peer-review responsibilities of human researchers.
                </p>
              </section>

              <section className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                <h4 className="text-sm font-bold text-white">2. Sole Authorial Responsibility</h4>
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2 text-zinc-300">
                  <p>
                    <strong>Final Verification Rests with the Author:</strong> Machine learning algorithms and citation databases may occasionally produce false positives, outdated retraction flags, or incomplete bibliography matches. Authors remain solely responsible for reviewing all suggested BibTeX replacements and claim grounding findings before final submission.
                  </p>
                  <p>
                    <strong>No Editorial Endorsement:</strong> The generation of a ReciteWeb Compliance Dossier does not constitute an endorsement or certification of scientific validity by any publisher or conference.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ──────────────── TAB 4: CONTACT & SUPPORT DIRECTORY ──────────────── */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Mail size={18} className="text-teal-400" />
                  Direct Inquiries & Support Portal
                </h3>
                <p className="text-[11px] text-teal-400 font-mono mt-0.5">
                  Web-First Communication Channels & Service Notices
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Channel 1: General & User Support */}
                <a
                  href="/contact?type=support"
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-teal-500/30 space-y-2 backdrop-blur-md transition-all block group"
                >
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 group-hover:text-teal-300 transition-colors">
                    <HelpCircle size={14} className="text-teal-400" />
                    Workbench & Citation Support
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Questions regarding workbench usage, license keys, or technical bug reports.
                  </p>
                  <span className="text-[10px] font-mono text-teal-400 font-semibold block pt-1">
                    Open Support Desk →
                  </span>
                </a>

                {/* Channel 2: Grants & Departmental */}
                <a
                  href="/contact?type=enterprise"
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-indigo-500/30 space-y-2 backdrop-blur-md transition-all block group"
                >
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 group-hover:text-indigo-300 transition-colors">
                    <Building size={14} className="text-indigo-400" />
                    Lab Grants & University POs
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Official quotations, W-9 vendor forms, and campus-wide licensing packages.
                  </p>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold block pt-1">
                    Request Quote →
                  </span>
                </a>

                {/* Channel 3: Privacy & Data Protection */}
                <a
                  href="/contact?type=privacy"
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-emerald-500/30 space-y-2 backdrop-blur-md transition-all block group"
                >
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 group-hover:text-emerald-300 transition-colors">
                    <Lock size={14} className="text-emerald-400" />
                    Privacy & Data Requests
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    GDPR / CCPA data subject access requests and zero retention assurances.
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold block pt-1">
                    Open Privacy Portal →
                  </span>
                </a>

                {/* Channel 4: Security & Vulnerability Disclosures */}
                <a
                  href="/contact?type=security"
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-cyan-500/30 space-y-2 backdrop-blur-md transition-all block group"
                >
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 group-hover:text-cyan-300 transition-colors">
                    <Shield size={14} className="text-cyan-400" />
                    Security & Responsible Disclosure
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Coordinated vulnerability reporting and cryptographic token architecture.
                  </p>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold block pt-1">
                    Submit Disclosure →
                  </span>
                </a>
              </div>

              {/* Mailing Address & Entity Details */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5 text-zinc-400 text-[11px]">
                <p className="font-semibold text-white">Direct Maintainer & Founder Channel</p>
                <p className="text-zinc-500">All submissions are monitored and triaged within 24 hours.</p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-black/40 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400 px-6 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-teal-400" />
            <span>Encrypted Legal Compliance Framework</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
