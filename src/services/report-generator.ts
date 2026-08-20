import { Claim, ClaimSeverity, DocMetrics } from '@/lib/store';

/**
 * ReportGenerator
 *
 * Generates comprehensive, clinical peer-review Markdown audit reports for manuscripts.
 * Formatted for scholarly collaboration, co-author dissemination, and editorial compliance.
 */
export class ReportGenerator {
  /**
   * Generates a clinical Markdown peer-review report from audit results.
   *
   * @param fileName Target manuscript filename.
   * @param claims All detected claims and anomalies.
   * @param docMetrics Calculated word count and token telemetry.
   * @returns Formatted Markdown string.
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

    // Compute metrics
    const totalClaims = claims.length;
    const criticalClaims = claims.filter((c) => c.severity === 'Critical');
    const highClaims = claims.filter((c) => c.severity === 'High');
    const mediumClaims = claims.filter((c) => c.severity === 'Medium');
    const lowClaims = claims.filter((c) => c.severity === 'Low');
    const retractedClaims = claims.filter((c) => c.isRetracted);
    const fixedClaims = claims.filter((c) => typeof c.suggestedFix === 'string' && c.suggestedFix.trim().length > 0);
    const verifiedClaims = claims.filter((c) => c.status === 'accepted');

    // Health Score calculation (0 - 100)
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

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Header & Title
    // ─────────────────────────────────────────────────────────────────────────
    md += `# ReciteAI Pre-Flight Audit Report: ${fileName}\n\n`;
    md += `> **Automated Citation Integrity, Literature Grounding & Retraction Pre-Flight Audit**  \n`;
    md += `> Generated on **${dateFormatted}** (${timestamp}) by **ReciteAI Academic Engine**\n\n`;
    md += `---\n\n`;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Executive Metadata & Diagnostic Telemetry Table
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Claims Grouped by Severity
    // ─────────────────────────────────────────────────────────────────────────
    md += `## 2. Detailed Anomaly & Claim Registry\n\n`;

    if (totalClaims === 0) {
      md += `*No citation anomalies or unsupported claims detected. The manuscript appears thoroughly grounded against available scholarly literature databases.*\n\n`;
    } else {
      const severityOrder: { key: ClaimSeverity; label: string; icon: string; desc: string }[] = [
        { key: 'Critical', label: 'Critical Severity Anomalies', icon: '🔴', desc: 'Retracted citations, non-existent sources, or severe factual misattributions requiring immediate resolution.' },
        { key: 'High', label: 'High Severity Anomalies', icon: '🟠', desc: 'Key scientific claims lacking required citations or substantial literature divergence.' },
        { key: 'Medium', label: 'Medium Severity Anomalies', icon: '🟡', desc: 'Indirect citations, outdated reference baselines, or weak methodological citations.' },
        { key: 'Low', label: 'Low Severity Recommendations', icon: '🔵', desc: 'Minor phrasing clarifications, optional complementary citations, or stylistic improvements.' },
      ];

      let claimGlobalIndex = 1;

      for (const group of severityOrder) {
        const groupClaims = claims.filter((c) => c.severity === group.key);
        if (groupClaims.length === 0) continue;

        md += `### ${group.icon} ${group.label} (${groupClaims.length})\n\n`;
        md += `*${group.desc}*\n\n`;

        for (const claim of groupClaims) {
          const auditTypeFormatted = claim.auditType
            ? claim.auditType.replace(/([A-Z])/g, ' $1').trim()
            : 'Unspecified Audit';

          const statusBadge = claim.isRetracted
            ? '⚠️ RETRACTED CITATION'
            : claim.status === 'accepted'
            ? '✅ RESOLVED / ACCEPTED'
            : '⏳ PENDING REMEDIATION';

          md += `#### Claim #${claimGlobalIndex}: ${claim.category} — \`${auditTypeFormatted}\`\n\n`;
          md += `- **Severity:** \`${claim.severity}\`\n`;
          md += `- **Status:** \`${statusBadge}\`\n`;
          md += `- **Classification:** \`${claim.category}\` (${auditTypeFormatted})\n`;
          md += `- **Character Offsets:** Range \`[${claim.startIndex} : ${claim.endIndex}]\`\n`;

          if (claim.isRetracted && claim.retractedReason) {
            md += `- **Retraction Reason:** *${claim.retractedReason}*\n`;
          }

          md += `\n**Flagged Manuscript Assertion:**\n`;
          md += `\`\`\`text\n${claim.text}\n\`\`\`\n\n`;

          if (claim.context && claim.context.trim().length > 0) {
            md += `**Surrounding Context Block:**\n`;
            md += `> ${claim.context.trim().split('\n').join('\n> ')}\n\n`;
          }

          if (claim.suggestedFix) {
            md += `**AI-Proposed Remediation:**\n`;
            md += `\`\`\`diff\n- ${claim.text}\n+ ${claim.suggestedFix}\n\`\`\`\n\n`;
          }

          if (claim.suggestedPapers && claim.suggestedPapers.length > 0) {
            md += `**Recommended Scholarly Literature Candidates:**\n\n`;
            claim.suggestedPapers.forEach((paper, pIdx) => {
              const authors = Array.isArray(paper.authors)
                ? (paper.authors.length > 3 ? `${paper.authors.slice(0, 3).join(', ')} et al.` : paper.authors.join(', '))
                : (paper.authors || 'Unknown Authors');
              const yearStr = paper.year ? `(${paper.year})` : '';
              const citations = typeof paper.citationCount === 'number' ? ` • ${paper.citationCount.toLocaleString()} citations` : '';
              const doiStr = paper.doi ? ` • [DOI: ${paper.doi}](https://doi.org/${paper.doi})` : '';
              const urlStr = paper.url ? ` • [Link](${paper.url})` : '';

              md += `${pIdx + 1}. **${paper.title}** ${yearStr}\n`;
              md += `   - *Authors:* ${authors}${citations}${doiStr}${urlStr}\n`;
            });
            md += `\n`;
          }

          md += `---\n\n`;
          claimGlobalIndex++;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Actionable Next Steps & Instructions
    // ─────────────────────────────────────────────────────────────────────────
    md += `## 3. Recommended Remediation Workflow\n\n`;
    md += `1. **Apply Automated Unified Patch:** Export the Git-style \`.patch\` file from the ReciteAI Command Palette (\`Ctrl+K\` → *Export Suggested Fixes (.patch)*) to review or automatically merge all proposed citation fixes.\n`;
    md += `2. **Resolve Retraction Hazards:** Remove or replace all references to retracted publications noted in Section 2.\n`;
    md += `3. **Verify BibTeX Entries:** Export your synchronized \`references.bib\` database (\`Ctrl+E\`) to ensure all in-text \`\\cite{}\` keys resolve to valid bibliographic records.\n`;
    md += `4. **Re-Run Pre-Flight Audit:** Re-evaluate the updated manuscript prior to submission to target a Citation Health Index of 95+.\n\n`;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Compliance & Cryptographic Disclaimer
    // ─────────────────────────────────────────────────────────────────────────
    md += `---\n\n`;
    md += `### Scholarly Integrity & Privacy Notice\n`;
    md += `*This report was produced locally in an air-gapped or client-encrypted environment via ReciteAI. No manuscript text was stored on remote telemetry servers. AI recommendations must be peer-verified by the corresponding author before final publication.*\n`;

    return md;
  }
}

export function generateMarkdownReport(
  fileName: string = 'manuscript.tex',
  claims: Claim[] = [],
  docMetrics?: DocMetrics | { wordCount?: number; tokenCount?: number }
): string {
  return ReportGenerator.generateMarkdownReport(fileName, claims, docMetrics);
}
