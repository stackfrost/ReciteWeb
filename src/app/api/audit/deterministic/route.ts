import { NextRequest, NextResponse } from 'next/server';
import { BibTeXParser } from '@/services/bibtex-parser';
import { sanitizeBibTeX } from '@/services/bibtex-sanitizer';

export interface RedFlag {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'RETRACTION' | 'DEAD_DOI' | 'MISSING_BIB' | 'ORPHAN_ENTRY' | 'SYNTAX_ERROR';
  title: string;
  detail: string;
  citeKey?: string;
  doi?: string;
  line?: number;
  suggestedFix?: string;
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bibtex = typeof body.bibtex === 'string' ? body.bibtex : '';
    const manuscriptText = typeof body.manuscriptText === 'string' ? body.manuscriptText : '';
    const inTextCitations: Array<{ key: string; line?: number; context?: string; claimText?: string }> = 
      Array.isArray(body.inTextCitations) ? body.inTextCitations : [];

    // 1. Extract in-text citation keys and compute deterministic claim hashes
    const citedKeys = new Set<string>();
    const cachedVerdicts: Record<string, { verdict: string; confidence: number; fromCache: boolean }> = {};
    const d1 = (globalThis as any).__D1_DB || (globalThis as any).DB;

    if (inTextCitations.length > 0) {
      for (const c of inTextCitations) {
        const key = c.key.trim();
        if (key) {
          citedKeys.add(key);
          const claimSentence = c.claimText || c.context || key;
          const claimHash = await sha256Hex(`${claimSentence}::${key}`);

          // D1 Cache Check
          if (d1?.prepare) {
            try {
              const cached = await d1
                .prepare('SELECT verified_payload, status FROM citation_cache WHERE claim_hash = ? LIMIT 1')
                .bind(claimHash)
                .first();
              if (cached) {
                const parsed = typeof cached.verified_payload === 'string' ? JSON.parse(cached.verified_payload) : cached.verified_payload;
                if ((parsed.confidence ?? 1) >= 0.90) {
                  cachedVerdicts[key] = {
                    verdict: cached.status === 'verified' ? 'VERIFIED' : 'FLAGGED',
                    confidence: parsed.confidence ?? 0.95,
                    fromCache: true,
                  };
                }
              }
            } catch (err) {
              // Non-blocking cache read failure
            }
          }
        }
      }
    }
    if (manuscriptText) {
      const citeRegex = /\\cite(?:[a-zA-Z*]*)?\{([^}]+)\}/g;
      let m;
      while ((m = citeRegex.exec(manuscriptText)) !== null) {
        const rawKeys = m[1].split(',');
        rawKeys.forEach(k => {
          const cleanKey = k.trim();
          if (cleanKey) citedKeys.add(cleanKey);
        });
      }
    }

    // 2. Parse BibTeX
    const parsedBibMap = BibTeXParser.parse(bibtex);
    const bibKeys = new Set(parsedBibMap.keys());

    const redFlags: RedFlag[] = [];
    let brokenDois = 0;
    let retractions = 0;
    let missingCites = 0;
    let orphanCites = 0;

    // 3. Find Missing Citations (cited in text, missing from .bib)
    for (const citedKey of citedKeys) {
      if (!bibKeys.has(citedKey)) {
        missingCites++;
        redFlags.push({
          severity: 'critical',
          category: 'MISSING_BIB',
          title: `Unresolved Citation: \\cite{${citedKey}}`,
          detail: `Cited in manuscript text but missing from bibliography database (.bib). This will cause LaTeX compilation failure or [?] marks in review.`,
          citeKey: citedKey,
          suggestedFix: `Add @article{${citedKey}, ...} to references.bib or correct the citation key.`,
        });
      }
    }

    // 4. Find Orphan Citations (in .bib, never cited in text)
    if (citedKeys.size > 0) {
      for (const bibKey of bibKeys) {
        if (!citedKeys.has(bibKey)) {
          orphanCites++;
          redFlags.push({
            severity: 'low',
            category: 'ORPHAN_ENTRY',
            title: `Unused Bibliography Entry: '${bibKey}'`,
            detail: `Entry exists in references.bib but is never cited in the manuscript text.`,
            citeKey: bibKey,
            suggestedFix: `Remove unused entry or add \\cite{${bibKey}} where relevant.`,
          });
        }
      }
    }

    // 5. Validate DOIs against CrossRef & check for retractions (rate-limited / batch-chunked)
    const entries = Array.from(parsedBibMap.values()).slice(0, 25); // Cap to 25 DOIs per audit payload
    const batchSize = 10;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const doiChecks = batch.map(async (entry) => {
        const doiMatch = entry.raw.match(/doi\s*=\s*(?:\{|"|)(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)(?:\}|"|,|\n|$)/i);
        if (!doiMatch) return;

        const doi = doiMatch[1].trim();
        const cleanTitle = entry.title.toLowerCase();

        // Check title for known retraction flags
        if (cleanTitle.includes('retracted') || cleanTitle.includes('retraction of') || cleanTitle.includes('withdrawn')) {
          retractions++;
          redFlags.push({
            severity: 'critical',
            category: 'RETRACTION',
            title: `Retracted Literature Detected: '${entry.key}'`,
            detail: `Paper '${entry.title}' appears to be retracted or withdrawn. Citing retracted works triggers immediate peer-review rejection and credibility loss.`,
            citeKey: entry.key,
            doi,
            suggestedFix: `Replace citation with updated literature or reference the retraction notice explicitly if analyzing research misconduct.`,
          });
          return;
        }

        // Query CrossRef
        try {
          const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
            headers: { 'User-Agent': 'ReciteWeb/1.0 (mailto:verify@reciteweb.com)' },
            signal: AbortSignal.timeout(4000),
          });

          if (res.status === 404) {
            brokenDois++;
            redFlags.push({
              severity: 'high',
              category: 'DEAD_DOI',
              title: `Invalid/Dead DOI: ${doi}`,
              detail: `The DOI for '${entry.key}' could not be resolved in CrossRef. This may be a hallucinated citation or typo.`,
              citeKey: entry.key,
              doi,
              suggestedFix: `Verify and update the DOI link.`,
            });
          } else if (res.ok) {
            const data = await res.json();
            const item = data.message;
            if (item?.['update-to']) {
              const updates = item['update-to'];
              const isRetracted = updates.some((u: any) => u.type?.toLowerCase().includes('retraction'));
              if (isRetracted) {
                retractions++;
                redFlags.push({
                  severity: 'critical',
                  category: 'RETRACTION',
                  title: `Retracted Paper in CrossRef: '${entry.key}'`,
                  detail: `CrossRef records indicate '${entry.title}' has been retracted.`,
                  citeKey: entry.key,
                  doi,
                });
              }
            }
          }
        } catch (e) {
          // Network timeout or non-blocking external failure
        }
      });
      await Promise.all(doiChecks);
    }

    // 6. Sanitize BibTeX
    const sanitized = bibtex ? sanitizeBibTeX(bibtex) : { sanitizedContent: '', injectedDois: 0, healedSyntaxErrors: 0, protectedTitles: 0 };

    // 7. Calculate Desk-Rejection Risk Score (0 - 100)
    let score = 100;
    score -= retractions * 25;
    score -= brokenDois * 15;
    score -= missingCites * 10;
    score -= Math.min(10, orphanCites * 2);
    if (sanitized.healedSyntaxErrors > 0) score -= Math.min(5, sanitized.healedSyntaxErrors * 2);
    const riskScore = Math.max(0, Math.min(100, score));

    return NextResponse.json({
      status: 'success',
      riskScore,
      metrics: {
        totalCitedInText: citedKeys.size,
        totalBibEntries: bibKeys.size,
        retractions,
        brokenDois,
        missingCites,
        orphanCites,
        syntaxErrorsHealed: sanitized.healedSyntaxErrors,
      },
      redFlags,
      cachedVerdicts,
      cleanBibtex: sanitized.sanitizedContent,
    });
  } catch (err: any) {
    console.error('[API /audit/deterministic] Error:', err);
    return NextResponse.json(
      { status: 'error', message: err.message || 'Internal deterministic audit error' },
      { status: 500 }
    );
  }
}
