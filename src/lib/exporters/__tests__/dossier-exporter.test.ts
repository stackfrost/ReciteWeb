import { describe, it, expect } from 'vitest';
import { generatePreFlightDossier, type DossierMetadata, type DossierAuditFinding } from '../dossier-exporter';

describe('dossier-exporter: Pre-Flight Dossier Generator', () => {
  const mockMeta: DossierMetadata = {
    manuscriptTitle: 'Quantum Spin Liquid Ground States.tex',
    authorEmail: 'pi.researcher@mit.edu',
    auditTimestamp: '2026-08-28T00:00:00.000Z',
    deskRejectionScore: 92,
    totalCitations: 24,
    verifiedCount: 22,
    retractionCount: 0,
    brokenDoiCount: 0,
    missingBibCount: 0,
  };

  const mockFindings: DossierAuditFinding[] = [
    {
      id: 'f-1',
      line: 42,
      type: 'Case Drift',
      severity: 'Low',
      claim: '\\cite{shimizu2003}',
      context: 'Measured thermal excitations \\cite{shimizu2003}.',
      suggestedFix: '\\cite{Shimizu2003gapless}',
    },
  ];

  it('generates formatted Markdown report with metadata & table', () => {
    const { markdown } = generatePreFlightDossier(mockMeta, mockFindings);

    expect(markdown).toContain('# CiteAssist AI: Pre-Flight Citation Dossier');
    expect(markdown).toContain('Quantum Spin Liquid Ground States.tex');
    expect(markdown).toContain('92/100');
    expect(markdown).toContain('PASS READY');
    expect(markdown).toContain('| L42 | **Low** | Case Drift |');
  });

  it('generates self-contained HTML report with risk badges and styling', () => {
    const { html } = generatePreFlightDossier(mockMeta, mockFindings);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Pre-Flight Dossier: Quantum Spin Liquid Ground States.tex');
    expect(html).toContain('92/100 PASS READY (Low Risk)');
    expect(html).toContain('L42');
  });

  it('generates valid JSON report matching metadata & findings', () => {
    const { json } = generatePreFlightDossier(mockMeta, mockFindings);
    const parsed = JSON.parse(json);

    expect(parsed.metadata.deskRejectionScore).toBe(92);
    expect(parsed.findings).toHaveLength(1);
    expect(parsed.findings[0].id).toBe('f-1');
  });

  it('correctly labels high-risk hazard scores below 70', () => {
    const hazardMeta: DossierMetadata = {
      ...mockMeta,
      deskRejectionScore: 45,
      retractionCount: 1,
      brokenDoiCount: 2,
    };

    const { markdown, html } = generatePreFlightDossier(hazardMeta, mockFindings);

    expect(markdown).toContain('DESK-REJECTION HAZARD');
    expect(html).toContain('DESK-REJECTION HAZARD');
  });

  it('sanitizes malicious script tags and event handlers to prevent Stored XSS', () => {
    const xssMeta: DossierMetadata = {
      ...mockMeta,
      manuscriptTitle: '<script>alert("pwned")</script>Quantum Paper',
    };

    const xssFindings: DossierAuditFinding[] = [
      {
        id: 'f-xss1',
        line: 1,
        type: '<img src=x onerror=alert(1)>',
        severity: 'Critical',
        claim: '<svg onload=alert(2)>',
        suggestedFix: '"><script>alert(3)</script>',
      },
      {
        id: 'f-xss2',
        line: 2,
        type: 'Missing Cite',
        severity: 'High',
        context: '<iframe src="evil.com"></iframe>',
      },
    ];

    const { html } = generatePreFlightDossier(xssMeta, xssFindings);

    expect(html).not.toContain('<script>alert("pwned")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<svg onload=alert(2)>');
    expect(html).toContain('&lt;svg onload=alert(2)&gt;');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('&lt;iframe');
  });
});
