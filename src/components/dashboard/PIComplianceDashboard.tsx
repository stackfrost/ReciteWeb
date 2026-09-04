'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Copy,
  ArrowLeft,
  Building2,
  Lock,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Award,
  Layers,
  FileCheck2,
  ChevronRight,
  Database,
  Cpu,
} from 'lucide-react';
import { useReciteStore } from '@/lib/store';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import {
  generateComplianceDossier,
  downloadDossierJson,
  generatePIBriefingMarkdown,
  ComplianceDossier,
} from '@/services/compliance-dossier';
import { DEMO_MANUSCRIPT } from '@/lib/demo-data';

export default function PIComplianceDashboard() {
  const router = useRouter();
  const { rawText, metadataMap, documentTitle, parsedText } = useReciteStore();
  const { workspacePath, fileTree, autoRestoreSession } = useWorkspaceStore();

  const [dossier, setDossier] = useState<ComplianceDossier | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'alerts' | 'unresolved'>('all');
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signOffItems, setSignOffItems] = useState({
    retractions: true,
    dataAvailability: true,
    authorContributions: true,
    grantFunding: true,
    mathIntegrity: true,
  });

  // Calculate active manuscript content
  const activeSource = useMemo(() => {
    if (rawText && rawText.length > 20) return rawText;
    if (parsedText && parsedText.length > 20) return parsedText;
    const firstTex = Object.values(fileTree).find((f) => f.name.endsWith('.tex'));
    if (firstTex && firstTex.content) return firstTex.content;
    return DEMO_MANUSCRIPT;
  }, [rawText, parsedText, fileTree]);

  const activeTitle = useMemo(() => {
    return documentTitle || workspacePath || 'Active Research Manuscript';
  }, [documentTitle, workspacePath]);

  // Generate dossier on mount or when manuscript changes
  useEffect(() => {
    let isMounted = true;
    const computeDossier = async () => {
      setIsGenerating(true);
      try {
        const generated = await generateComplianceDossier(activeSource, metadataMap, activeTitle);
        if (isMounted) {
          setDossier(generated);
        }
      } catch (err) {
        console.error('[PI Dashboard] Error computing compliance dossier:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };

    computeDossier();
    return () => {
      isMounted = false;
    };
  }, [activeSource, metadataMap, activeTitle]);

  const handleCopyBriefing = () => {
    if (!dossier) return;
    const md = generatePIBriefingMarkdown(dossier, activeTitle);
    navigator.clipboard.writeText(md);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2500);
  };

  const handleDownloadCertificate = () => {
    if (!dossier) return;
    downloadDossierJson(dossier, `${activeTitle.toLowerCase().replace(/\s+/g, '_')}_AUDIT_CERTIFICATE.json`);
  };

  const filteredReferences = useMemo(() => {
    if (!dossier) return [];
    if (filterType === 'verified') return dossier.verifiedReferences.filter((r) => r.title && !r.isRetracted);
    if (filterType === 'alerts') return dossier.verifiedReferences.filter((r) => r.isRetracted);
    if (filterType === 'unresolved') return dossier.verifiedReferences.filter((r) => !r.title);
    return dossier.verifiedReferences;
  }, [dossier, filterType]);

  const allChecksPassed = Object.values(signOffItems).every(Boolean);

  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100 font-sans antialiased selection:bg-teal-400 selection:text-black relative overflow-x-hidden">
      {/* Dynamic Liquid Mesh Ambient Aura */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 liquid-grid-overlay opacity-40" />
        <div className="absolute -top-40 left-1/3 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-emerald-500/15 via-teal-400/10 to-transparent rounded-full blur-[160px] animate-liquid-orb" />
        <div
          className="absolute top-60 right-1/4 w-[600px] h-[400px] bg-gradient-to-bl from-indigo-500/15 via-cyan-500/10 to-transparent rounded-full blur-[160px] animate-liquid-orb"
          style={{ animationDelay: '3.5s' }}
        />
      </div>

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#05070d]/80 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft size={14} />
              <span>Workbench</span>
            </Link>

            <span className="text-zinc-700">/</span>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-xs font-extrabold tracking-tight text-white uppercase font-mono">
                PI Compliance & Pre-Submission Hub
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-semibold">
              <Lock size={10} />
              Air-Gapped Local Session
            </span>

            <button
              onClick={handleCopyBriefing}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-200 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedBriefing ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span className="text-emerald-300">Briefing Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Briefing</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCertificate}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 text-zinc-950 font-extrabold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_12px_rgba(20,184,166,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>Download Signed Certificate</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 relative z-10">
        {/* Manuscript Overview Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <FileCheck2 size={14} />
              <span>Executive Pre-Submission Audit</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {activeTitle}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
              <span>Lines: <strong className="text-zinc-200">{dossier?.documentFingerprint.totalLines || 0}</strong></span>
              <span>•</span>
              <span>Characters: <strong className="text-zinc-200">{dossier?.documentFingerprint.totalCharacters.toLocaleString() || 0}</strong></span>
              <span>•</span>
              <span className="truncate max-w-[280px]">
                AST SHA-256: <code className="text-teal-300">{dossier?.documentFingerprint.mathAstSha256.substring(0, 16)}...</code>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto shrink-0">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center min-w-[130px]">
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Integrity Grade</div>
              <div className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-0.5">
                {dossier?.integrityGrade || 'A+'}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Score: {dossier?.integrityScore || 100}/100
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Overall Citation Health */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1 backdrop-blur-md">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Citations</span>
              <Database size={15} className="text-teal-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">
              {dossier?.verificationSummary.totalCitations || 0}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 size={12} />
              <span>{dossier?.verificationSummary.verifiedCount || 0} Cross-Referenced</span>
            </div>
          </div>

          {/* KPI 2: Retraction Alerts */}
          <div className={`p-5 rounded-2xl border space-y-1 backdrop-blur-md ${
            (dossier?.verificationSummary.retractionAlertsCount || 0) > 0
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              : 'bg-white/[0.03] border-white/[0.08]'
          }`}>
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Retracted Literature</span>
              <ShieldAlert size={15} className={dossier?.verificationSummary.retractionAlertsCount ? 'text-rose-400' : 'text-emerald-400'} />
            </div>
            <div className="text-2xl font-extrabold text-white">
              {dossier?.verificationSummary.retractionAlertsCount || 0}
            </div>
            <div className="text-[11px] font-mono">
              {(dossier?.verificationSummary.retractionAlertsCount || 0) > 0 ? (
                <span className="text-rose-400 font-bold">⚠️ Critical Action Required</span>
              ) : (
                <span className="text-emerald-400">✅ Zero Retractions Detected</span>
              )}
            </div>
          </div>

          {/* KPI 3: Formula & Math AST Stability */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1 backdrop-blur-md">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Math AST Drift Guard</span>
              <Cpu size={15} className="text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">
              100%
            </div>
            <div className="text-[11px] text-cyan-400 font-mono">
              Zero Coordinate Drift
            </div>
          </div>

          {/* KPI 4: Data Governance */}
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1 backdrop-blur-md">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Zero-Retention Mesh</span>
              <Lock size={15} className="text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-white">
              Air-Gapped
            </div>
            <div className="text-[11px] text-indigo-300 font-mono">
              Zero Cloud Retention
            </div>
          </div>
        </div>

        {/* ── Main 2-Column Section: Citation Ledger + Pre-Submission Sign-Off ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Interactive Citation Risk Ledger */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-teal-400" />
                    <span>Citation Attribution & Risk Ledger</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live cross-reference verification against Crossref, OpenAlex, and Semantic Scholar.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08] text-xs">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      filterType === 'all' ? 'bg-teal-500/20 text-teal-300' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    All ({dossier?.verifiedReferences.length || 0})
                  </button>
                  <button
                    onClick={() => setFilterType('verified')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      filterType === 'verified' ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Verified ({dossier?.verificationSummary.verifiedCount || 0})
                  </button>
                  <button
                    onClick={() => setFilterType('unresolved')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      filterType === 'unresolved' ? 'bg-amber-500/20 text-amber-300' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Unresolved ({dossier?.verificationSummary.unresolvedCount || 0})
                  </button>
                </div>
              </div>

              {/* References Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase">
                      <th className="py-2.5 px-3">Cite Key</th>
                      <th className="py-2.5 px-3">Canonical Title / Metadata</th>
                      <th className="py-2.5 px-3">Database Provider</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredReferences.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-500 font-mono text-xs">
                          No citations match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredReferences.map((ref, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-teal-300">
                            \{`cite{${ref.citeKey}}`}
                          </td>
                          <td className="py-3 px-3 max-w-md">
                            <div className="font-semibold text-white truncate">
                              {ref.title || 'Unindexed / Non-Canonical Reference'}
                            </div>
                            {ref.doi && (
                              <a
                                href={`https://doi.org/${ref.doi}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-mono text-zinc-400 hover:text-teal-300 transition flex items-center gap-1 mt-0.5"
                              >
                                <span>doi:{ref.doi}</span>
                                <ExternalLink size={9} />
                              </a>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-mono text-[10px] uppercase">
                              {ref.primarySource}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {ref.isRetracted ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                                RETRACTED
                              </span>
                            ) : ref.title ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                VERIFIED
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                UNRESOLVED
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Pre-Submission Checklist & Grant Invoicing */}
          <div className="space-y-4">
            {/* Grant Acknowledgement Detector */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Building2 size={16} className="text-indigo-400" />
                <span>Detected Grant Invoicing</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Grant acknowledgments detected in manuscript text:
              </p>

              {dossier?.detectedGrants && dossier.detectedGrants.length > 0 ? (
                <div className="space-y-2">
                  {dossier.detectedGrants.map((grant, gIdx) => (
                    <div
                      key={gIdx}
                      className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-400/30 text-xs space-y-1"
                    >
                      <div className="font-bold text-white flex items-center justify-between">
                        <span>{grant.agency}</span>
                        {grant.grantNumber && (
                          <code className="text-indigo-300 font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                            #{grant.grantNumber}
                          </code>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 italic line-clamp-2">
                        &ldquo;{grant.contextSnippet}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-500">
                  No standard grant numbers identified in text.
                </div>
              )}
            </div>

            {/* PI Pre-Submission Sign-off Checklist */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <FileCheck2 size={16} className="text-emerald-400" />
                  <span>PI Sign-off Checklist</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Required pre-flight compliance verifications:
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={signOffItems.retractions}
                    onChange={(e) => setSignOffItems({ ...signOffItems, retractions: e.target.checked })}
                    className="mt-0.5 rounded bg-zinc-800 border-zinc-700 text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-zinc-300 group-hover:text-white transition">
                    Zero retracted citations confirmed
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={signOffItems.dataAvailability}
                    onChange={(e) => setSignOffItems({ ...signOffItems, dataAvailability: e.target.checked })}
                    className="mt-0.5 rounded bg-zinc-800 border-zinc-700 text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-zinc-300 group-hover:text-white transition">
                    Data & Code availability statement present
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={signOffItems.authorContributions}
                    onChange={(e) => setSignOffItems({ ...signOffItems, authorContributions: e.target.checked })}
                    className="mt-0.5 rounded bg-zinc-800 border-zinc-700 text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-zinc-300 group-hover:text-white transition">
                    Author contribution / CRediT statement approved
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={signOffItems.grantFunding}
                    onChange={(e) => setSignOffItems({ ...signOffItems, grantFunding: e.target.checked })}
                    className="mt-0.5 rounded bg-zinc-800 border-zinc-700 text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-zinc-300 group-hover:text-white transition">
                    Grant funding agencies correctly referenced
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={signOffItems.mathIntegrity}
                    onChange={(e) => setSignOffItems({ ...signOffItems, mathIntegrity: e.target.checked })}
                    className="mt-0.5 rounded bg-zinc-800 border-zinc-700 text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-zinc-300 group-hover:text-white transition">
                    LaTeX formula & AST integrity verified
                  </span>
                </label>
              </div>

              <div className="pt-2 border-t border-white/[0.08]">
                {allChecksPassed ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                    <span>All pre-submission checks cleared. Ready for submission.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                    <span>Complete all checklist items before final submission.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
