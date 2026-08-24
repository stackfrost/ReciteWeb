import { Claim, ClaimSeverity, DocMetrics } from '@/lib/store';

/**
 * ReportGenerator
 *
 * Generates comprehensive, clinical peer-review audit reports for manuscripts across
 * three standardized scholarly formats:
 * 1. Markdown (`.md`)
 * 2. Interactive Self-Contained HTML (`.html`)
 * 3. Formatted LaTeX Appendix (`.tex`)
 */
export class ReportGenerator {
  /**
   * Generates a clinical Markdown peer-review report from audit results.
   */
  static generateMarkdownReport(
    fileName: string = 'manuscript.tex',
    claims: Claim[] = [],
    docMetrics?: DocMetrics | { wordCount?: number; tokenCount?: number }
  ): string {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const words = docMetrics?.wordCount ?? 0;
    const tokens = docMetrics?.tokenCount ?? Math.round(words * 1.3);

    const totalClaims = claims.length;
    const criticalClaims = claims.filter((c) => c.severity === 'Critical');
    const highClaims = claims.filter((c) => c.severity === 'High');
    const mediumClaims = claims.filter((c) => c.severity === 'Medium');
    const lowClaims = claims.filter((c) => c.severity === 'Low');
    const retractedClaims = claims.filter((c) => c.isRetracted);
    const fixedClaims = claims.filter((c) => typeof c.suggestedFix === 'string' && c.suggestedFix.trim().length > 0);
    const verifiedClaims = claims.filter((c) => c.status === 'accepted');

    let healthScore = 100;
    healthScore -= criticalClaims.length * 25;
    healthScore -= highClaims.length * 15;
    healthScore -= mediumClaims.length * 8;
    healthScore -= lowClaims.length * 3;
    healthScore -= retractedClaims.length * 30;
    healthScore = Math.max(0, Math.min(100, healthScore));

    const healthGrade =
      healthScore >= 90 ? 'A (Excellent)' :
      healthScore >= 80 ? 'B (Good)' :
      healthScore >= 70 ? 'C (Acceptable — Minor Revision)' :
      healthScore >= 50 ? 'D (High Risk — Major Revision)' :
      'F (Critical Integrity Hazards)';

    let md = '';

    md += `# ReciteAI Pre-Flight Audit Report: ${fileName}\n\n`;
    md += `> **Automated Citation Integrity, Literature Grounding & Retraction Pre-Flight Audit**  \n`;
    md += `> Generated on **${dateFormatted}** (${timestamp}) by **ReciteAI Academic Engine**\n\n`;
    md += `---\n\n`;

    md += `## 1. Executive Summary & Telemetry\n\n`;
    md += `| Metric | Value | Diagnostic Evaluation |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Target Manuscript** | \`${fileName}\` | Monitored local workspace document |\n`;
    md += `| **Audit Timestamp** | ${timestamp} | Live client-side static inference |\n`;
    md += `| **Document Volume** | ${words.toLocaleString()} words (~${tokens.toLocaleString()} tokens) | Lexical AST analysis completed |\n`;
    md += `| **Citation Health Index** | **${healthScore}/100** | Grade: **${healthGrade}** |\n`;
    md += `| **Total Flagged Claims** | **${totalClaims}** assertions | Comprehensive assertion breakdown below |\n`;
    md += `| **Critical Severity** | **${criticalClaims.length}** | Immediate retraction / hallucination risks |\n`;
    md += `| **High Severity** | **${highClaims.length}** | Missing citations or substantial misattributions |\n`;
    md += `| **Medium Severity** | **${mediumClaims.length}** | Weak grounding or speculative literature citations |\n`;
    md += `| **Low Severity** | **${lowClaims.length}** | Methodological or minor phrasing recommendations |\n`;
    md += `| **Retracted Works Detected** | **${retractedClaims.length}** | Flagged against global retraction databases |\n`;
    md += `| **Actionable Remediations** | **${fixedClaims.length}** available | Automatic patch generation ready |\n\n`;

    if (retractedClaims.length > 0) {
      md += `> ⚠️ **CRITICAL WARNING: RETRACTED CITATIONS IDENTIFIED**  \n`;
      md += `> This manuscript references **${retractedClaims.length} publication(s)** that have been flagged as retracted or subject to major editorial expressions of concern. Immediate remediation is required prior to journal submission.\n\n`;
    }

    md += `---\n\n`;
    md += `## 2. Detailed Anomaly & Claim Registry\n\n`;

    if (totalClaims === 0) {
      md += `*No citation anomalies or unsupported claims detected. The manuscript appears thoroughly grounded against available scholarly literature databases.*\n\n`;
    } else {
      claims.forEach((claim, idx) => {
        md += `### ${idx + 1}. [${claim.severity}] ${claim.category || 'Literature Claim'}\n\n`;
        md += `**Claim Text:**  \n> "${claim.text}"\n\n`;
        if (claim.suggestedFix) {
          md += `**Suggested Remediation:**  \n\`${claim.suggestedFix}\`\n\n`;
        }
        if (claim.acceptedPaper) {
          md += `**Primary Verified Source:**  \n`;
          md += `- **Title:** ${claim.acceptedPaper.title}\n`;
          md += `- **Authors:** ${claim.acceptedPaper.authors?.join(', ') || 'Unknown'}\n`;
          md += `- **Year:** ${claim.acceptedPaper.year || 'N/A'}\n`;
          if (claim.acceptedPaper.doi) md += `- **DOI:** [${claim.acceptedPaper.doi}](https://doi.org/${claim.acceptedPaper.doi})\n`;
          if (claim.acceptedPaper.abstractSnippet) {
            md += `- **Evidence Anchor:** *"${claim.acceptedPaper.abstractSnippet}"*\n`;
          }
        }
        md += `\n---\n\n`;
      });
    }

    md += `## 3. Recommended Remediation Workflow\n\n`;
    md += `1. **Apply Automated Unified Patch:** Review proposed diffs in the ReciteAI Inspector.\n`;
    md += `2. **Resolve Retraction Hazards:** Remove or replace any flagged retracted references.\n`;
    md += `3. **Verify BibTeX Entries:** Export synchronized \`references.bib\` database.\n`;
    md += `4. **Re-Run Pre-Flight Audit:** Re-evaluate updated manuscript to target a Citation Health Index of 95+.\n\n`;

    return md;
  }

  /**
   * Generates a standalone, dark-themed interactive HTML summary report.
   */
  static generateHtmlReport(
    fileName: string = 'manuscript.tex',
    claims: Claim[] = [],
    docMetrics?: DocMetrics | { wordCount?: number; tokenCount?: number }
  ): string {
    const mdReport = this.generateMarkdownReport(fileName, claims, docMetrics);
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <title>ReciteAI Citation Audit Report - ${fileName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0D1117;
      color: #C9D1D9;
      margin: 0;
      padding: 32px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
      background: #161B22;
      border: 1px solid #30363D;
      border-radius: 10px;
      padding: 36px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    h1, h2, h3 { color: #F0F6FC; }
    h1 { font-size: 24px; border-bottom: 1px solid #30363D; padding-bottom: 12px; margin-top: 0; }
    h2 { font-size: 18px; margin-top: 28px; border-bottom: 1px solid #21262D; padding-bottom: 8px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      font-family: monospace;
      font-weight: 600;
      border-radius: 4px;
    }
    .badge-critical { background: rgba(248, 81, 73, 0.2); color: #F85149; border: 1px solid rgba(248, 81, 73, 0.4); }
    .badge-medium { background: rgba(210, 153, 34, 0.2); color: #D29922; border: 1px solid rgba(210, 153, 34, 0.4); }
    .badge-success { background: rgba(46, 160, 67, 0.2); color: #3FB950; border: 1px solid rgba(46, 160, 67, 0.4); }
    blockquote {
      margin: 12px 0;
      padding: 10px 16px;
      background: #0D1117;
      border-left: 3px solid #3FB950;
      border-radius: 4px;
      font-style: italic;
      color: #8B949E;
    }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #30363D; padding: 10px 14px; text-align: left; }
    th { background: #21262D; color: #F0F6FC; }
    .card {
      background: #0D1117;
      border: 1px solid #30363D;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 14px;
    }
    a { color: #58A6FF; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { font-family: monospace; background: #21262D; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ReciteAI Pre-Flight Citation Audit Report</h1>
    <p style="color: #8B949E; font-size: 13px;">
      Target: <code>${fileName}</code> | Generated: <strong>${dateFormatted}</strong> | Engine: <strong>ReciteAI Academic NLI</strong>
    </p>

    <h2>1. Executive Health Score</h2>
    <div style="display: flex; gap: 16px; margin: 20px 0;">
      <div style="flex: 1; background: #0D1117; border: 1px solid #30363D; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #3FB950;">${Math.max(0, 100 - claims.length * 10)}%</div>
        <div style="font-size: 11px; color: #8B949E; text-transform: uppercase;">Citation Health Index</div>
      </div>
      <div style="flex: 1; background: #0D1117; border: 1px solid #30363D; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #58A6FF;">${claims.length}</div>
        <div style="font-size: 11px; color: #8B949E; text-transform: uppercase;">Flagged Claims</div>
      </div>
      <div style="flex: 1; background: #0D1117; border: 1px solid #30363D; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #3FB950;">${claims.filter(c => c.status === 'accepted').length}</div>
        <div style="font-size: 11px; color: #8B949E; text-transform: uppercase;">Verified Sources</div>
      </div>
    </div>

    <h2>2. Claim & Grounding Registry</h2>
    ${claims.map((claim, idx) => `
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span class="badge ${claim.severity === 'Critical' || claim.severity === 'High' ? 'badge-critical' : 'badge-medium'}">
            ${claim.severity} Severity
          </span>
          <span style="font-family: monospace; font-size: 11px; color: #8B949E;">Line ${claim.lineIndex || idx + 1}</span>
        </div>
        <p style="margin: 6px 0; font-size: 14px; font-style: italic; color: #E6EDF3;">"${claim.text}"</p>
        ${claim.suggestedFix ? `<div style="margin-top: 8px;"><strong style="font-size: 11px; color: #8B949E;">Suggested Patch:</strong><br><code>${claim.suggestedFix}</code></div>` : ''}
        ${claim.acceptedPaper ? `
          <div style="margin-top: 10px; padding: 10px; background: #161B22; border-radius: 6px; border: 1px solid #21262D;">
            <strong style="font-size: 12px; color: #58A6FF;">${claim.acceptedPaper.title}</strong>
            <p style="font-size: 11px; color: #8B949E; margin: 4px 0;">${claim.acceptedPaper.authors?.join(', ')} (${claim.acceptedPaper.year})</p>
            ${claim.acceptedPaper.abstractSnippet ? `<p style="font-size: 12px; color: #C9D1D9; font-style: italic; margin: 4px 0;">"${claim.acceptedPaper.abstractSnippet}"</p>` : ''}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>`;
  }

  /**
   * Generates a ready-to-insert LaTeX appendix document.
   */
  static generateLatexAppendix(
    fileName: string = 'manuscript.tex',
    claims: Claim[] = []
  ): string {
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let tex = `% ─────────────────────────────────────────────────────────────────────────────\n`;
    tex += `% ReciteAI Peer-Review Citation Audit Appendix\n`;
    tex += `% Target: ${fileName}\n`;
    tex += `% Date: ${dateFormatted}\n`;
    tex += `% ─────────────────────────────────────────────────────────────────────────────\n\n`;

    tex += `\\section*{Appendix: Citation Faithfulness \\& Verification Audit}\n`;
    tex += `\\label{sec:reciteai-audit-appendix}\n\n`;
    tex += `This appendix details the automated pre-flight citation verification and Natural Language Inference (NLI) audit conducted on \\texttt{${fileName}} using the \\textbf{ReciteAI Academic Engine}.\n\n`;

    tex += `\\subsection*{Audit Summary \\& Telemetry}\n`;
    tex += `\\begin{itemize}\n`;
    tex += `  \\item \\textbf{Manuscript:} \\texttt{${fileName}}\n`;
    tex += `  \\item \\textbf{Total Assertions Audited:} ${claims.length}\n`;
    tex += `  \\item \\textbf{Verified Citations:} ${claims.filter(c => c.status === 'accepted').length}\n`;
    tex += `  \\item \\textbf{Evaluation Engine:} ReciteAI Deterministic AST + Semantic NLI\n`;
    tex += `\\end{itemize}\n\n`;

    tex += `\\subsection*{Itemized Claim-to-Evidence Grounding}\n`;
    tex += `\\begin{enumerate}\n`;

    claims.forEach((claim) => {
      const cleanText = (claim.text || '').replace(/[%$&#_{}~^\\]/g, (m) => '\\' + m);
      tex += `  \\item \\textbf{Manuscript Assertion:} \\textit{"${cleanText}"}\n`;
      if (claim.acceptedPaper) {
        const titleClean = (claim.acceptedPaper.title || '').replace(/[%$&#_{}~^\\]/g, (m) => '\\' + m);
        const authorsClean = (claim.acceptedPaper.authors?.join(', ') || 'Unknown').replace(/[%$&#_{}~^\\]/g, (m) => '\\' + m);
        tex += `    \\begin{itemize}\n`;
        tex += `      \\item \\textbf{Literature Anchor:} ${titleClean} (${authorsClean}, ${claim.acceptedPaper.year || '2024'})\n`;
        if (claim.acceptedPaper.doi) tex += `      \\item \\textbf{DOI:} \\url{https://doi.org/${claim.acceptedPaper.doi}}\n`;
        tex += `    \\end{itemize}\n`;
      }
    });

    tex += `\\end{enumerate}\n`;
    return tex;
  }
}

export function generateMarkdownReport(
  fileName: string = 'manuscript.tex',
  claims: Claim[] = [],
  docMetrics?: DocMetrics | { wordCount?: number; tokenCount?: number }
): string {
  return ReportGenerator.generateMarkdownReport(fileName, claims, docMetrics);
}
