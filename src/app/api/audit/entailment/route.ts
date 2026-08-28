/**
 * src/app/api/audit/entailment/route.ts
 *
 * CiteAssist AI — NLI Entailment + Reviewer Blindspot Baseline Detection.
 *
 * Powered by Gemini 3.7 Flash (streaming, buffered JSON output).
 * Falls back to lexical keyword-overlap when GEMINI_API_KEY is absent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Request body:
 *   mode: 'entailment' (default) | 'baseline-detection'
 *
 *   Entailment mode fields:
 *     claimText: string          — in-text sentence to verify
 *     citedPaperTitle?: string
 *     citedDoi?: string
 *     citedAbstract?: string     — pre-fetched abstract (optional)
 *
 *   Baseline-detection mode fields:
 *     manuscriptAbstract: string — researcher's own abstract/methods section
 *     researchField?: string     — e.g. "object detection", "NLP generation"
 *     claimText?: string         — unused in this mode, accepted for compatibility
 *
 * Response (entailment):
 *   { classification, confidence, reasoning, suggestedRevision?, tier, fallback? }
 *
 * Response (baseline-detection):
 *   { missingBaselines: string[], severity, canonicalSuggestions: string[], tier, fallback? }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-token';
import { GoogleGenAI } from '@google/genai';

const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB limit

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function recordCacheAndTelemetry(
  d1: any,
  params: {
    claimText: string;
    citedPaperTitle: string;
    citedDoi: string;
    result: { classification: string; confidence: number; reasoning: string; suggestedRevision?: string };
    userId?: string;
  }
) {
  if (!d1?.prepare) return;
  try {
    const claimHash = await sha256Hex(`${params.claimText}::${params.citedPaperTitle || params.citedDoi}`);
    const cacheId = `cache_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await d1
      .prepare(
        `INSERT OR REPLACE INTO citation_cache (id, claim_hash, cited_doi, cited_title, verified_payload, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        cacheId,
        claimHash,
        params.citedDoi || null,
        params.citedPaperTitle || null,
        JSON.stringify(params.result),
        params.result.classification === 'SUPPORTED' ? 'verified' : 'flagged',
        Date.now()
      )
      .run();

    const telemetryId = `telemetry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await d1
      .prepare(
        `INSERT INTO audit_telemetry (id, user_id, manuscript_pages, claims_extracted, desk_rejection_score, retractions_found, broken_dois_found, hallucinated_claims_found, duration_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        telemetryId,
        params.userId || null,
        1,
        1,
        100,
        0,
        0,
        params.result.classification === 'HALLUCINATED' ? 1 : 0,
        250,
        Date.now()
      )
      .run();
  } catch {
    // Non-blocking background write
  }
}

// ─── Gemini client factory ────────────────────────────────────────────────────
// No module-level cache: GoogleGenAI is a stateless HTTP wrapper (cheap to
// instantiate) and caching it breaks vi.mock isolation in tests — the cached
// instance retains the first test's mock, not the current test's.
function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your-gemini-api-key-here') return null;
  return new GoogleGenAI({ apiKey: key });
}

// ─── Keyword-overlap fallback (Phase 2 heuristic) ────────────────────────────
function keywordOverlapFallback(
  claimText: string,
  citedAbstract: string,
  citedPaperTitle: string
): {
  classification: 'SUPPORTED' | 'MISALIGNED' | 'HALLUCINATED';
  confidence: number;
  reasoning: string;
  suggestedRevision?: string;
  fallback: true;
} {
  const claimLower = claimText.toLowerCase();
  const abstractLower = citedAbstract.toLowerCase();
  const claimWords = claimLower
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);

  let hits = 0;
  for (const word of claimWords) {
    if (abstractLower.includes(word)) hits++;
  }
  const overlapRatio = claimWords.length > 0 ? hits / claimWords.length : 0;

  if (overlapRatio >= 0.45) {
    return {
      classification: 'SUPPORTED',
      confidence: Math.min(0.98, 0.70 + overlapRatio * 0.3),
      reasoning: 'The cited literature abstract directly substantiates the key claims mentioned in your manuscript.',
      fallback: true,
    };
  } else if (overlapRatio >= 0.20) {
    return {
      classification: 'MISALIGNED',
      confidence: 0.78,
      reasoning: 'The cited paper discusses related concepts, but the specific claim may be over-generalized compared to the paper\'s primary conclusions.',
      suggestedRevision: 'Rephrase to temper the claim or cite a more direct experimental source.',
      fallback: true,
    };
  } else {
    return {
      classification: 'HALLUCINATED',
      confidence: 0.88,
      reasoning: `High risk of citation mismatch: The cited work ('${citedPaperTitle}') does not appear to substantiate the core thesis of this in-text statement.`,
      suggestedRevision: 'Remove citation or replace with relevant literature in this subfield.',
      fallback: true,
    };
  }
}

// ─── Gemini streaming helper ─────────────────────────────────────────────────
async function callGeminiStream(ai: GoogleGenAI, prompt: string): Promise<string> {
  const stream = await ai.models.generateContentStream({
    model: 'gemini-3.7-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,  // Low temperature for deterministic NLI classification
      maxOutputTokens: 1024,
    },
  });

  let text = '';
  for await (const chunk of stream) {
    text += chunk.text ?? '';
  }
  return text.trim();
}

// ─── NLI Entailment via Gemini ────────────────────────────────────────────────
async function geminiNLIEntailment(
  ai: GoogleGenAI,
  params: { claimText: string; citedAbstract: string; citedPaperTitle: string }
): Promise<{
  classification: 'SUPPORTED' | 'MISALIGNED' | 'HALLUCINATED';
  confidence: number;
  reasoning: string;
  suggestedRevision?: string;
}> {
  const prompt = `You are a rigorous academic peer reviewer specializing in citation accuracy and research integrity.

Your task: Determine whether the in-text CLAIM is supported by the ABSTRACT of the cited paper.

CLAIM (from manuscript):
"${params.claimText}"

CITED PAPER: "${params.citedPaperTitle}"
ABSTRACT:
${params.citedAbstract}

Classify the relationship and respond ONLY with valid JSON matching this schema:
{
  "classification": "SUPPORTED" | "MISALIGNED" | "HALLUCINATED",
  "confidence": <float 0.0–1.0>,
  "reasoning": "<1–2 sentence plain-English explanation for the researcher>",
  "suggestedRevision": "<optional: how to fix the claim if MISALIGNED or HALLUCINATED>"
}

Classification rules:
- SUPPORTED: The abstract clearly provides evidence or directly supports the claim's core assertion.
- MISALIGNED: The abstract is topically related but the claim over-generalizes, misattributes, or is only tangentially supported.
- HALLUCINATED: The abstract does not discuss or substantiate the claim at all — likely a wrong citation.`;

  const raw = await callGeminiStream(ai, prompt);
  // Strip any markdown code fences if Gemini wraps the JSON
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  const result = JSON.parse(cleaned);

  const classification = ['SUPPORTED', 'MISALIGNED', 'HALLUCINATED'].includes(result.classification)
    ? result.classification
    : 'MISALIGNED';

  return {
    classification,
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.75)),
    reasoning: String(result.reasoning || ''),
    suggestedRevision: result.suggestedRevision ? String(result.suggestedRevision) : undefined,
  };
}

// ─── Reviewer Blindspot Baseline Detection via Gemini ─────────────────────────
async function geminiBaselineDetection(
  ai: GoogleGenAI,
  params: { manuscriptAbstract: string; researchField: string }
): Promise<{
  missingBaselines: string[];
  severity: 'Critical' | 'High' | 'Medium';
  canonicalSuggestions: string[];
}> {
  const prompt = `You are an expert academic reviewer identifying missing baseline comparisons that would cause desk rejection.

Research field: ${params.researchField || 'general machine learning / computer science'}

Manuscript abstract / methods section:
${params.manuscriptAbstract}

Task: Identify canonical baselines and state-of-the-art comparisons that are MISSING from this work and would be required by reviewers in top-tier venues (NeurIPS, ICML, ICLR, ACL, CVPR, Nature, Science).

Respond ONLY with valid JSON matching this schema:
{
  "missingBaselines": ["<baseline name or method>", ...],
  "severity": "Critical" | "High" | "Medium",
  "canonicalSuggestions": ["<specific suggestion e.g. compare against GPT-4 / ResNet-50 / BERT baseline>", ...]
}

Rules:
- severity = Critical if 3+ major baselines are missing
- severity = High if 1–2 major baselines are missing  
- severity = Medium if the paper has most baselines but misses emerging comparisons
- If all standard baselines appear to be present, return empty arrays and severity = "Medium"
- Be specific: name the exact methods/models that should be compared, not generic categories`;

  const raw = await callGeminiStream(ai, prompt);
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  const result = JSON.parse(cleaned);

  return {
    missingBaselines: Array.isArray(result.missingBaselines) ? result.missingBaselines.map(String) : [],
    severity: ['Critical', 'High', 'Medium'].includes(result.severity) ? result.severity : 'Medium',
    canonicalSuggestions: Array.isArray(result.canonicalSuggestions) ? result.canonicalSuggestions.map(String) : [],
  };
}

// ─── Main Route Handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Guard
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        {
          status: 'error',
          message:
            'Missing Authorization Bearer token. Upgrade to Pro ($49/yr) or use an Emergency Pass to unlock deep semantic claim verification.',
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid or expired Pro session token. Please restore your access link or renew subscription.',
        },
        { status: 401 }
      );
    }

    const rawText = await req.text();
    if (new TextEncoder().encode(rawText).length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { status: 'error', message: 'Payload Too Large: Maximum allowed audit payload is 64KB' },
        { status: 413 }
      );
    }

    let body: any = {};
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ status: 'error', message: 'Invalid JSON body' }, { status: 400 });
    }

    const mode: 'entailment' | 'baseline-detection' =
      body.mode === 'baseline-detection' ? 'baseline-detection' : 'entailment';

    // ── Baseline Detection Mode ──────────────────────────────────────────────
    if (mode === 'baseline-detection') {
      const manuscriptAbstract = typeof body.manuscriptAbstract === 'string'
        ? body.manuscriptAbstract.trim()
        : '';
      const researchField = typeof body.researchField === 'string'
        ? body.researchField.trim()
        : '';

      if (!manuscriptAbstract) {
        return NextResponse.json(
          { status: 'error', message: 'manuscriptAbstract is required for baseline-detection mode' },
          { status: 400 }
        );
      }

      const ai = getAI();
      if (!ai) {
        // Fallback: return empty (no keyword overlap available for baseline detection)
        return NextResponse.json({
          status: 'success',
          tier: payload.tier,
          mode: 'baseline-detection',
          missingBaselines: [],
          severity: 'Medium',
          canonicalSuggestions: ['Set GEMINI_API_KEY to enable AI-powered baseline detection.'],
          fallback: true,
        });
      }

      try {
        const result = await geminiBaselineDetection(ai, { manuscriptAbstract, researchField });
        return NextResponse.json({ status: 'success', tier: payload.tier, mode: 'baseline-detection', ...result });
      } catch (geminiErr) {
        console.error('[entailment/baseline-detection] Gemini error:', geminiErr);
        return NextResponse.json({
          status: 'success',
          tier: payload.tier,
          mode: 'baseline-detection',
          missingBaselines: [],
          severity: 'Medium',
          canonicalSuggestions: ['Gemini analysis unavailable. Please retry or check your API key.'],
          fallback: true,
        });
      }
    }

    // ── Entailment Mode (default) ────────────────────────────────────────────
    const claimText = typeof body.claimText === 'string' ? body.claimText.trim() : '';
    const citedPaperTitle = typeof body.citedPaperTitle === 'string' ? body.citedPaperTitle.trim() : '';
    const citedDoi = typeof body.citedDoi === 'string' ? body.citedDoi.trim() : '';
    let citedAbstract = typeof body.citedAbstract === 'string' ? body.citedAbstract.trim() : '';

    if (!claimText) {
      return NextResponse.json(
        { status: 'error', message: 'claimText is required' },
        { status: 400 }
      );
    }

    // 2. Fetch abstract via OpenAlex if not provided
    if (!citedAbstract && (citedDoi || citedPaperTitle)) {
      try {
        const query = citedDoi
          ? `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(citedDoi)}`
          : `https://api.openalex.org/works?search=${encodeURIComponent(citedPaperTitle)}&per-page=1`;

        const res = await fetch(query, {
          headers: { 'User-Agent': 'CiteAssist/1.0 (mailto:verify@citeassist.ai)' },
          signal: AbortSignal.timeout(4000),
        });

        if (res.ok) {
          const data = await res.json();
          const item = citedDoi ? data : data.results?.[0];
          if (item?.abstract_inverted_index) {
            const words: string[] = [];
            for (const [word, positions] of Object.entries(
              item.abstract_inverted_index as Record<string, number[]>
            )) {
              for (const pos of positions) {
                words[pos] = word;
              }
            }
            citedAbstract = words.filter(Boolean).join(' ');
          }
        }
      } catch {
        // Graceful degradation — fall through to UNVERIFIED_SOURCE
      }
    }

    // 3. No abstract available
    if (!citedAbstract) {
      return NextResponse.json({
        status: 'success',
        tier: payload.tier,
        mode: 'entailment',
        classification: 'UNVERIFIED_SOURCE',
        confidence: 0.5,
        reasoning: `Source abstract could not be automatically indexed. Manual verification recommended for: '${citedPaperTitle || citedDoi}'.`,
        claimText,
        citedPaperTitle,
      });
    }

    const d1 = (globalThis as any).__D1_DB || (globalThis as any).DB;

    // 4. Gemini NLI entailment
    const ai = getAI();
    if (ai) {
      try {
        const result = await geminiNLIEntailment(ai, { claimText, citedAbstract, citedPaperTitle });
        recordCacheAndTelemetry(d1, {
          claimText,
          citedPaperTitle,
          citedDoi,
          result,
          userId: (payload as any).userId,
        });

        return NextResponse.json({
          status: 'success',
          tier: payload.tier,
          mode: 'entailment',
          ...result,
          claimText,
          citedPaperTitle,
          abstractSnippet: citedAbstract.slice(0, 300) + '...',
        });
      } catch (geminiErr) {
        console.error('[entailment] Gemini error — falling back to keyword overlap:', geminiErr);
        // Fall through to keyword overlap
      }
    }

    // 5. Keyword-overlap fallback (no Gemini key or Gemini error)
    const fallbackResult = keywordOverlapFallback(claimText, citedAbstract, citedPaperTitle);
    recordCacheAndTelemetry(d1, {
      claimText,
      citedPaperTitle,
      citedDoi,
      result: fallbackResult,
      userId: (payload as any).userId,
    });

    return NextResponse.json({
      status: 'success',
      tier: payload.tier,
      mode: 'entailment',
      ...fallbackResult,
      claimText,
      citedPaperTitle,
      abstractSnippet: citedAbstract.slice(0, 300) + '...',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal entailment verification error';
    console.error('[API /audit/entailment] Error:', err);
    return NextResponse.json({ status: 'error', message: msg }, { status: 500 });
  }
}
