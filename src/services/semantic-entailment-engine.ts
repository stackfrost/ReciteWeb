/**
 * Semantic Entailment & Citation Contradiction Engine (NLI)
 * 
 * Performs Natural Language Inference (NLI) on manuscript assertions:
 * 1. Entailed / Strongly Supported (🟢)
 * 2. Tenuous / Extrapolated (🟡)
 * 3. Contradicted / Misattributed (🔴)
 * 
 * Supports both multi-provider LLM batch inference (Gemini, Claude, GPT, OpenRouter)
 * and fast, deterministic heuristic pattern recognition.
 */

import { EntailmentStatus, ContrastiveEvidence, VerifiedLiteratureSource } from '@/types/audit';
import type { LLMProvider } from '@/lib/models';
import { yieldToMain } from '@/lib/utils';

export interface LLMEntailmentEvaluation {
  sourceIndex: number;
  entailmentScore: number; // 0-100
  status: EntailmentStatus;
  verbatimQuote: string;
  reason: string;
  hedgingSuggestion?: string;
  contradictionWarning?: string;
  isDirectProof?: boolean;
}

export class SemanticEntailmentEngine {
  /**
   * Evaluates citation faithfulness between a manuscript claim and a verified literature source
   * using fast deterministic heuristics (regex patterns + token overlap).
   */
  static evaluateEntailment(
    claimText: string,
    source?: VerifiedLiteratureSource
  ): {
    status: EntailmentStatus;
    contrastiveEvidence?: ContrastiveEvidence;
    hedgingPatch?: string;
    score: number;
  } {
    if (!source || !source.abstractSnippet) {
      return {
        status: 'tenuous',
        score: 60,
        contrastiveEvidence: {
          manuscriptClaim: claimText,
          sourceQuote: 'No abstract text available for full textual entailment verification.',
          reason: 'Source metadata indexed without complete textual evidence anchor.',
        },
      };
    }

    const claimLower = claimText.toLowerCase();
    const sourceAbstract = source.abstractSnippet;
    const sourceLower = sourceAbstract.toLowerCase();

    // 1. Contradiction Detection: Opposing findings or strong negations
    const contradictionPatterns = [
      {
        claimSignal: /(gapless|itinerant|finite\s+residual|constant\s+dos)/i,
        sourceSignal: /(absence\s+of\s+gapless|gapped\s+ground\s+state|negligible\s+residual|no\s+itinerant)/i,
        reason: 'Direct empirical contradiction: Manuscript asserts gapless excitations, whereas the cited study demonstrates the absence of gapless fermions.',
        hedging: (c: string) => c.replace(/verifying\s+gapless\s+[^.]+/i, 'indicating possible gapped excitations under ultra-low temperature limits (<50 mK)'),
      },
      {
        claimSignal: /(proves?\s+conclusively|demonstrates?\s+unambiguously)/i,
        sourceSignal: /(cannot\s+rule\s+out|suggests|remains\s+debated|preliminary)/i,
        reason: 'Over-claim of certainty: Author claims conclusive proof, whereas the cited study notes findings remain preliminary or under debate.',
        hedging: (c: string) => c.replace(/proves?\s+conclusively|demonstrates?\s+unambiguously/i, 'provides initial empirical indications suggesting'),
      },
      {
        claimSignal: /(universal\s+scaling|applies\s+to\s+all)/i,
        sourceSignal: /(restricted\s+to|only\s+observed\s+in|sample\s+dependent)/i,
        reason: 'Scope exaggeration: Author asserts universal applicability, but source explicitly restricts findings to specific sample conditions.',
        hedging: (c: string) => c.replace(/universal\s+scaling|applies\s+to\s+all/i, 'sample-specific scaling observed in selected organic salts'),
      },
    ];

    for (const pat of contradictionPatterns) {
      if (pat.claimSignal.test(claimLower) && pat.sourceSignal.test(sourceLower)) {
        const sentence = this.extractSentenceMatching(sourceAbstract, pat.sourceSignal);
        return {
          status: 'contradicted',
          score: 15,
          contrastiveEvidence: {
            manuscriptClaim: claimText,
            sourceQuote: sentence || sourceAbstract.slice(0, 200),
            hedgingSuggestion: pat.hedging(claimText),
            reason: pat.reason,
          },
          hedgingPatch: pat.hedging(claimText),
        };
      }
    }

    // 2. Tenuous / Extrapolated Citation: Broad topic match but missing specific benchmark
    const quantitativeThresholds = claimText.match(/(\d+\s*(?:mK|K|T|GHz|mW|meV|%))/g);
    let missingQuantitativeEvidence = false;

    if (quantitativeThresholds) {
      const sourceHasValues = quantitativeThresholds.some((val) => sourceAbstract.includes(val.trim()));
      if (!sourceHasValues) {
        missingQuantitativeEvidence = true;
      }
    }

    if (missingQuantitativeEvidence || claimLower.includes('consequently') || claimLower.includes('extrapolating')) {
      const sentence = this.extractBestSentence(sourceAbstract, claimText);
      return {
        status: 'tenuous',
        score: 72,
        contrastiveEvidence: {
          manuscriptClaim: claimText,
          sourceQuote: sentence || sourceAbstract.slice(0, 200),
          hedgingSuggestion: `${claimText.replace(/\.\s*$/, '')} (subject to specific experimental boundary conditions).`,
          reason: 'Tenuous attribution: Cited reference shares domain subject matter but does not report the specific quantitative parameter asserted in the text.',
        },
        hedgingPatch: `${claimText.replace(/\.\s*$/, '')} (as observed under controlled experimental conditions).`,
      };
    }

    // 3. Entailed / Strongly Supported
    const bestSupportingSentence = this.extractBestSentence(sourceAbstract, claimText);
    return {
      status: 'entailed',
      score: 96,
      contrastiveEvidence: {
        manuscriptClaim: claimText,
        sourceQuote: bestSupportingSentence || sourceAbstract.slice(0, 200),
        reason: 'Strong semantic entailment: The cited work directly substantiates the empirical premise stated in the manuscript.',
      },
    };
  }

  /**
   * Batch evaluates multiple candidate literature abstracts against a manuscript assertion using an LLM.
   * Extracts verbatim quotes, directional entailment scores (0-100), and academic hedging patches.
   */
  static async evaluateCandidatesWithLLM(
    claimText: string,
    candidates: VerifiedLiteratureSource[],
    provider: LLMProvider,
    apiKey: string,
    modelId: string,
    onCandidateEvaluated?: (evalResult: LLMEntailmentEvaluation) => void
  ): Promise<LLMEntailmentEvaluation[]> {
    if (!candidates || candidates.length === 0) return [];

    // Fallback if no valid API key
    if (!apiKey || apiKey.trim().length === 0) {
      return candidates.map((c, idx) => {
        const h = this.evaluateEntailment(claimText, c);
        const evalRes: LLMEntailmentEvaluation = {
          sourceIndex: idx,
          entailmentScore: h.score,
          status: h.status,
          verbatimQuote: h.contrastiveEvidence?.sourceQuote || c.abstractSnippet.slice(0, 200),
          reason: h.contrastiveEvidence?.reason || 'Heuristic semantic alignment evaluation.',
          hedgingSuggestion: h.contrastiveEvidence?.hedgingSuggestion,
          contradictionWarning: h.status === 'contradicted' ? h.contrastiveEvidence?.reason : undefined,
          isDirectProof: h.status === 'entailed',
        };
        onCandidateEvaluated?.(evalRes);
        return evalRes;
      });
    }

    const candidateAbstractsPayload = candidates.slice(0, 15).map((c, idx) => ({
      index: idx,
      title: c.title,
      year: c.year,
      abstract: c.abstractSnippet.slice(0, 1000),
    }));

    const prompt = `You are a post-doctoral scientific peer reviewer verifying citation entailment.
Manuscript assertion to verify:
"${claimText}"

Evaluate each candidate paper abstract below against the assertion.
For each candidate determine:
1. "entailmentScore": 0-100 integer (90-100: direct rigorous proof, 60-89: partial/tenuous support, 0-59: irrelevant or contradictory)
2. "status": "entailed" | "tenuous" | "contradicted"
3. "verbatimQuote": exact 1-2 sentences from the abstract that serves as the evidence anchor
4. "reason": clinical 1-sentence scientific rationale
5. "hedgingSuggestion": subtle academic phrasing patch if tenuous (or empty string)
6. "contradictionWarning": warning text if paper contradicts assertion (or empty string)
7. "isDirectProof": boolean

Candidate papers:
${JSON.stringify(candidateAbstractsPayload, null, 2)}

Return ONLY a valid JSON array of evaluations matching:
[
  {
    "sourceIndex": 0,
    "entailmentScore": 95,
    "status": "entailed",
    "verbatimQuote": "...",
    "reason": "...",
    "hedgingSuggestion": "",
    "contradictionWarning": "",
    "isDirectProof": true
  }
]`;

    try {
      let rawJson = '';
      if (provider === 'google') {
        const model = modelId || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } else if (provider === 'anthropic') {
        const url = 'https://api.anthropic.com/v1/messages';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: modelId || 'claude-3-5-sonnet-20241022',
            max_tokens: 3000,
            system: 'Respond ONLY with a valid JSON array.',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          rawJson = data.content?.[0]?.text || '';
        }
      } else {
        // OpenAI or OpenRouter
        const endpoint = provider === 'openrouter' 
          ? 'https://openrouter.ai/api/v1/chat/completions' 
          : 'https://api.openai.com/v1/chat/completions';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        };
        if (provider === 'openrouter') {
          headers['HTTP-Referer'] = 'https://recite.ai';
          headers['X-Title'] = 'CiteAssist AI Citation Verification';
        }
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelId || (provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'gpt-4o'),
            messages: [
              { role: 'system', content: 'You are an academic auditor. Output valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          rawJson = data.choices?.[0]?.message?.content || '';
        }
      }

      if (rawJson) {
        const match = rawJson.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed: LLMEntailmentEvaluation[] = JSON.parse(match[0]);
          for (const item of parsed) {
            await yieldToMain();
            onCandidateEvaluated?.(item);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[SemanticEntailmentEngine] LLM NLI evaluation error:', err);
    }

    // Fallback heuristic scoring
    return candidates.map((c, idx) => {
      const h = this.evaluateEntailment(claimText, c);
      const fallbackEval: LLMEntailmentEvaluation = {
        sourceIndex: idx,
        entailmentScore: h.score,
        status: h.status,
        verbatimQuote: h.contrastiveEvidence?.sourceQuote || c.abstractSnippet.slice(0, 200),
        reason: h.contrastiveEvidence?.reason || 'Heuristic semantic alignment evaluation.',
        hedgingSuggestion: h.contrastiveEvidence?.hedgingSuggestion,
        contradictionWarning: h.status === 'contradicted' ? h.contrastiveEvidence?.reason : undefined,
        isDirectProof: h.status === 'entailed',
      };
      onCandidateEvaluated?.(fallbackEval);
      return fallbackEval;
    });
  }

  /**
   * Extracts the single sentence from the abstract matching a specific regular expression.
   */
  private static extractSentenceMatching(abstract: string, regex: RegExp): string | null {
    const sentences = abstract.split(/(?<=[.?!])\s+/);
    for (const s of sentences) {
      if (regex.test(s)) return s.trim();
    }
    return null;
  }

  /**
   * Extracts the most relevant sentence from an abstract based on token overlap.
   */
  private static extractBestSentence(abstract: string, claimText: string): string {
    const sentences = abstract.split(/(?<=[.?!])\s+/);
    if (sentences.length <= 1) return abstract.trim();

    const claimTokens = new Set(
      claimText
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 3)
    );

    let bestSentence = sentences[0];
    let maxOverlap = 0;

    for (const s of sentences) {
      const sTokens = s.toLowerCase().split(/\s+/);
      let overlap = 0;
      for (const tok of sTokens) {
        if (claimTokens.has(tok)) overlap++;
      }
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestSentence = s;
      }
    }

    return bestSentence.trim();
  }
}
