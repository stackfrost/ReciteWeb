'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  FileCheck2,
  Download,
  Sparkles,
  RefreshCw,
  Zap,
  BookX,
  Mail,
  Check,
} from 'lucide-react';
import { useAuditStore } from '@/store/useAuditStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { generatePreFlightDossier } from '@/lib/exporters/dossier-exporter';
import { PaywallModal } from '@/components/modals/PaywallModal';

export const DeskRejectionHUD: React.FC = () => {
  const { findings, isAuditing, runAudit } = useAuditStore();
  const { activeTexContent, activeTexPath } = useWorkspaceStore();
  const [emailCopied, setEmailCopied] = useState(false);

  // Compute metrics from findings
  const criticalFindings = findings.filter(
    (f) => (f.severity?.toLowerCase() === 'critical' || f.severity?.toLowerCase() === 'high') && f.status === 'unresolved'
  );
  const mediumFindings = findings.filter(
    (f) => f.severity?.toLowerCase() === 'medium' && f.status === 'unresolved'
  );

  const retractions = findings.filter((f) => f.type?.toLowerCase().includes('retract')).length;
  const brokenDois = findings.filter((f) => f.type?.toLowerCase().includes('doi')).length;
  const missingBibs = findings.filter((f) => f.type?.toLowerCase().includes('missing')).length;
  const missingBaselines = findings.filter((f) => f.type?.toLowerCase().includes('baseline')).length;
  const verifiedCount = Math.max(0, findings.length - criticalFindings.length - mediumFindings.length);

  // Compute citation health score (0 to 100)
  let score = 100;
  score -= retractions * 25;
  score -= brokenDois * 15;
  score -= missingBibs * 10;
  score -= missingBaselines * 8;
  score -= mediumFindings.length * 3;
  if (findings.length === 0 && !activeTexContent) score = 100;
  const riskScore = Math.max(0, Math.min(100, score));

  const isHealthy = riskScore >= 85;
  const isWarning = riskScore >= 60 && riskScore < 85;

  const scoreColor = isHealthy ? 'text-emerald-400' : isWarning ? 'text-amber-400' : 'text-rose-400';
  const scoreBorderColor = isHealthy ? 'border-emerald-500/30' : isWarning ? 'border-amber-500/30' : 'border-rose-500/30';
  const scoreBgGlow = isHealthy ? 'bg-emerald-950/20' : isWarning ? 'bg-amber-950/20' : 'bg-rose-950/20';

  const handleExportDossier = () => {
    const meta = {
      manuscriptTitle: activeTexPath?.split(/[/\\]/).pop() || 'manuscript.tex',
      auditTimestamp: new Date().toISOString(),
      deskRejectionScore: riskScore,
      totalCitations: findings.length || 1,
      verifiedCount,
      retractionCount: retractions,
      brokenDoiCount: brokenDois,
      missingBibCount: missingBibs,
      missingBaselineCount: missingBaselines,
    };

    const dossier = generatePreFlightDossier(
      meta,
      findings.map((f) => ({
        id: f.id,
        line: f.line,
        type: f.type,
        severity: f.severity,
        claim: (f as any).claim,
        context: f.context,
        suggestedFix: f.suggestedFix,
      }))
    );

    dossier.downloadAs('html');
  };

  const handleCopyPIEmail = () => {
    const meta = {
      manuscriptTitle: activeTexPath?.split(/[/\\]/).pop() || 'manuscript.tex',
      auditTimestamp: new Date().toISOString(),
      deskRejectionScore: riskScore,
      totalCitations: findings.length || 1,
      verifiedCount,
      retractionCount: retractions,
      brokenDoiCount: brokenDois,
      missingBibCount: missingBibs,
      missingBaselineCount: missingBaselines,
    };
    const dossier = generatePreFlightDossier(meta, []);
    const emailText = dossier.copyPIHandoffEmail();
    navigator.clipboard.writeText(emailText).then(() => {
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }).catch(() => {
      prompt('Copy Audit Summary:', emailText);
    });
  };

  return (
    <div className="h-8 w-full bg-zinc-950 border-b border-zinc-800/80 px-3 flex items-center justify-between select-none shrink-0 font-sans z-30 text-xs">
      {/* Left: Health Score & Issues Summary */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${scoreBorderColor} ${scoreBgGlow}`}>
          <span className={`text-[11px] font-mono font-bold ${scoreColor}`}>
            {riskScore}%
          </span>
          <span className="text-[10px] text-zinc-400 font-medium">
            {isHealthy ? 'Clean' : isWarning ? 'Warnings' : 'Issues Found'}
          </span>
        </div>

        {/* Issue Count Badges */}
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {retractions > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[10px]">
              <AlertOctagon size={11} className="text-rose-400" />
              {retractions} Retracted
            </span>
          )}
          {brokenDois > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[10px]">
              <AlertTriangle size={11} className="text-amber-400" />
              {brokenDois} Dead DOIs
            </span>
          )}
          {missingBibs > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-sky-950/40 border border-sky-500/30 text-sky-300 text-[10px]">
              {missingBibs} Missing \cite
            </span>
          )}
          {missingBaselines > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-[10px]">
              <BookX size={11} className="text-indigo-400" />
              {missingBaselines} Missing Baseline{missingBaselines > 1 ? 's' : ''}
            </span>
          )}
          {retractions === 0 && brokenDois === 0 && missingBibs === 0 && missingBaselines === 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-[10px]">
              <FileCheck2 size={11} className="text-emerald-400" />
              Citations Verified
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleExportDossier}
          className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 text-[11px] font-medium transition-colors cursor-pointer"
          title="Export HTML Summary Report"
        >
          <Download size={11} />
          <span>Export Summary</span>
        </button>

        <button
          onClick={handleCopyPIEmail}
          className="flex items-center gap-1 px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded border border-zinc-800 text-[11px] font-medium transition-colors cursor-pointer"
          title="Copy report summary to clipboard"
        >
          {emailCopied ? (
            <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
          ) : (
            <><Mail size={11} /><span>Copy Summary</span></>
          )}
        </button>
      </div>
    </div>
  );
};
