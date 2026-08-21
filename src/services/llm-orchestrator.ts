import type { LLMProvider } from '@/lib/models';
import type { ExtractedClaim } from './latex-parser';
import type { BibTeXEntry } from './bibtex-parser';
import { chunkClaims, pruneBibTeXForChunk } from './latex-parser';
import { resolvePdfContext } from './pdf-bridge';
import { chunkText } from './text-chunker';
import { searchPdfContext } from './vector-search';
import { ProviderRateLimiter } from './rate-limiter';
import { useReciteStore } from '../lib/store';
import { validateCitation } from './metadata-cascade';

// ─────────────────────────────────────────────────────────────────────────────
// § SYSTEM PROMPT — Post-doctoral peer-review audit persona
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a post-doctoral peer reviewer and experimental physics expert. Your task is to audit extracted manuscript claims against their cited BibTeX entries and verified source context from local PDFs.

You MUST be highly rigorous and clinical. For each claim:
1. Check if the cited BibTeX entries and any provided "Verified Source Context" (extracted directly from canonical source PDFs) adequately support the claim.
2. If "Verified Source Context" is provided for a claim, treat it as ground truth from the cited paper to confirm or dispute empirical assertions.
3. Identify missing citations, weak citations, hallucinated claims, or misattributions.
4. If a claim references a citation key that does not exist in the BibTeX database, flag it as MissingCitation.
5. If a claim makes a strong empirical assertion but the cited reference or verified source context is only tangentially related or contradicts the claim, flag it as WeakCitation.
6. If a claim presents a fact that appears fabricated or unsupported by any provided reference or verified source context, flag it as Hallucination.
7. If a claim attributes a result to the wrong paper, flag it as Misattribution.

For each finding, provide:
- A unique ID (e.g., "audit-1", "audit-2")
- Severity: "Critical", "High", "Medium", or "Low"
- Type: "MissingCitation", "WeakCitation", "Hallucination", or "Misattribution"
- The exact claim text from the manuscript
- Surrounding context (1-2 sentences around the claim)
- A suggested fix (e.g., a corrected LaTeX string, a recommended citation, or a reworded sentence)

Use the report_audit_findings tool to submit your findings.`;

// ─────────────────────────────────────────────────────────────────────────────
// § TOOL DEFINITION — Anthropic Tool Use schema for structured output
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_TOOL = {
  name: 'report_audit_findings',
  description:
    'Report the structured audit findings for all claims that have citation issues. Each finding includes severity, type, the claim text, surrounding context, and a suggested fix.',
  input_schema: {
    type: 'object' as const,
    properties: {
      findings: {
        type: 'array' as const,
        description: 'Array of audit findings for claims with citation issues.',
        items: {
          type: 'object' as const,
          properties: {
            id: {
              type: 'string' as const,
              description: 'Unique identifier for this finding (e.g., "audit-1").',
            },
            severity: {
              type: 'string' as const,
              enum: ['Critical', 'High', 'Medium', 'Low'],
              description: 'Severity level of the citation issue.',
            },
            type: {
              type: 'string' as const,
              enum: ['MissingCitation', 'WeakCitation', 'Hallucination', 'Misattribution'],
              description: 'Category of the citation issue.',
            },
            text: {
              type: 'string' as const,
              description:
                'The exact claim text from the manuscript that has the citation issue.',
            },
            context: {
              type: 'string' as const,
              description:
                'Surrounding context (1-2 sentences around the claim) for reviewer orientation.',
            },
            suggestedFix: {
              type: 'string' as const,
              description:
                'A suggested correction: a corrected LaTeX string, recommended citation key, or reworded sentence.',
            },
          },
          required: ['id', 'severity', 'type', 'text', 'context', 'suggestedFix'],
        },
      },
    },
    required: ['findings'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// § TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditClaim {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  type: 'MissingCitation' | 'WeakCitation' | 'Hallucination' | 'Misattribution';
  text: string;
  context: string;
  suggestedFix?: string;
}

export interface AuditResult {
  claims: AuditClaim[];
  latencyMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// § LLM ORCHESTRATOR — Multi-Call Parallel Architecture
// ─────────────────────────────────────────────────────────────────────────────

const rateLimiter = new ProviderRateLimiter(4000, 400000);

export class LLMOrchestrator {
  /**
   * Executes the citation pre-flight audit using a 4-chunk parallel
   * processing architecture. Claims are split into balanced chunks,
   * each with a pruned BibTeX subset, and audited concurrently via
   * Promise.allSettled to ensure partial results on rate-limit failures.
   *
   * @param onProgress Optional callback for progressive telemetry updates.
   */
  static async executePreFlightAudit(
    extractedClaims: ExtractedClaim[],
    bibtexMap: Map<string, BibTeXEntry>,
    provider: LLMProvider,
    apiKey: string,
    model?: string,
    onProgress?: (msg: string) => void,
    ollamaEndpoint?: string
  ): Promise<AuditResult> {
    // For providers that require an API key, validate it is present
    const noKeyProviders: LLMProvider[] = ['ollama', 'openrouter'];
    const isFreeRouter = provider === 'openrouter' && model === 'openrouter/free';
    if (!isFreeRouter && !noKeyProviders.includes(provider) && (!apiKey || apiKey.trim().length === 0)) {
      throw new Error(
        'No API key configured. Open Settings (Ctrl+,) and enter your API key.'
      );
    }

    // ── Phase 1: Validate Metadata (Parallel Dispatch) ───────────────────────
    onProgress?.('Validating citations across federated cascade...');
    const uniqueKeys = Array.from(new Set(extractedClaims.flatMap(c => c.citations || [])));
    if (uniqueKeys.length > 0) {
      await Promise.allSettled(uniqueKeys.map(key => validateCitation(key)));
    }

    // ── Phase 1.5: Enrich claims with local PDF context via Semantic RAG ─────
    onProgress?.('Locating Zotero PDFs & extracting semantic context...');
    const enrichedClaims = await this.enrichClaimsWithPdfContext(extractedClaims, onProgress);

    // ── Phase 2: Chunk the AST ─────────────────────────────────────────────
    onProgress?.('Chunking AST...');
    const chunks = chunkClaims(enrichedClaims, 4);
    const totalChunks = chunks.length;

    if (totalChunks === 0) {
      onProgress?.(null as unknown as string);
      return { claims: [], latencyMs: 0 };
    }

    console.log(`[LLMOrchestrator] Split ${enrichedClaims.length} claims into ${totalChunks} chunks`);

    // ── Phase 3: Build per-chunk promises ──────────────────────────────────
    const resolvedModel = model || resolveDefaultModel(provider);
    const t0 = performance.now();
    let completedCount = 0;

    const chunkPromises = chunks.map((chunk, idx) => {
      const prunedBib = pruneBibTeXForChunk(chunk, bibtexMap);

      return this.auditSingleChunk(
        chunk,
        prunedBib,
        provider,
        apiKey,
        resolvedModel,
        idx,
        totalChunks,
        ollamaEndpoint
      ).then((findings) => {
        completedCount++;
        onProgress?.(`Auditing section ${completedCount} of ${totalChunks}...`);
        return findings;
      });
    });

    // ── Phase 4: Execute all in parallel with graceful degradation ────────
    onProgress?.(`Auditing section 1 of ${totalChunks}...`);
    const results = await Promise.allSettled(chunkPromises);

    const latencyMs = Math.round(performance.now() - t0);

    // ── Phase 5: Aggregate results ─────────────────────────────────────────
    const allFindings: AuditClaim[] = [];
    let globalIdCounter = 1;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        // Re-ID findings to ensure global uniqueness across chunks
        for (const finding of result.value) {
          allFindings.push({
            ...finding,
            id: `audit-${globalIdCounter++}`,
          });
        }
      } else {
        console.error(
          `[LLMOrchestrator] Chunk ${i + 1}/${totalChunks} failed:`,
          result.reason?.message || result.reason
        );
      }
    }

    const failedCount = results.filter((r) => r.status === 'rejected').length;
    if (failedCount > 0 && failedCount < totalChunks) {
      console.warn(
        `[LLMOrchestrator] ${failedCount}/${totalChunks} chunks failed. Returning partial results.`
      );
    } else if (failedCount === totalChunks) {
      // All chunks failed — surface the first error
      const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      throw new Error(firstError.reason?.message || 'All audit chunks failed.');
    }

    console.log(
      `[LLMOrchestrator] Audit complete: ${allFindings.length} findings across ${totalChunks} chunks in ${latencyMs}ms`
    );

    onProgress?.(null as unknown as string);
    return { claims: allFindings, latencyMs };
  }

  /**
   * Enriches claims with local PDF context via the Zotero bridge, text chunker,
   * and local in-memory semantic vector search.
   */
  private static async enrichClaimsWithPdfContext(
    claims: ExtractedClaim[],
    onProgress?: (msg: string) => void
  ): Promise<ExtractedClaim[]> {
    const pdfTextCache = new Map<string, string>();
    const pdfChunksCache = new Map<string, string[]>();
    const enriched: ExtractedClaim[] = [];

    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const sourceContexts: string[] = [];

      if (claim.citations && claim.citations.length > 0) {
        for (const key of claim.citations) {
          try {
            let chunks = pdfChunksCache.get(key);

            if (!chunks) {
              let pdfText = pdfTextCache.get(key);
              if (!pdfText) {
                const resolved = await resolvePdfContext(key);
                if (resolved && resolved.trim()) {
                  pdfText = resolved;
                  pdfTextCache.set(key, pdfText);
                }
              }

              if (pdfText) {
                chunks = chunkText(pdfText, 250, 50);
                pdfChunksCache.set(key, chunks);
              }
            }

            if (chunks && chunks.length > 0) {
              onProgress?.(`Semantic search in PDF context for [${key}]...`);
              const topPassages = await searchPdfContext(claim.rawText, chunks, 3);
              if (topPassages.length > 0) {
                sourceContexts.push(...topPassages);
              }
            }
          } catch (err) {
            console.warn(`[LLMOrchestrator] Error extracting PDF context for "${key}":`, err);
          }
        }
      }

      enriched.push({
        ...claim,
        verifiedSourceContext: sourceContexts.length > 0 ? sourceContexts : undefined,
      });
    }

    return enriched;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // § SINGLE CHUNK AUDITOR — Isolated fetch for one claim chunk
  // ─────────────────────────────────────────────────────────────────────────

  private static async auditSingleChunk(
    chunk: ExtractedClaim[],
    prunedBib: Map<string, BibTeXEntry>,
    provider: LLMProvider,
    apiKey: string,
    model: string,
    chunkIndex: number,
    totalChunks: number,
    ollamaEndpoint?: string
  ): Promise<AuditClaim[]> {
    const bibtexEntries = Object.fromEntries(prunedBib.entries());

    const userPayloadParts: string[] = [
      `## Extracted Claims from Manuscript (Section ${chunkIndex + 1} of ${totalChunks})\n`,
      '```json',
      JSON.stringify(chunk, null, 2),
      '```\n',
      '## Available BibTeX References (Pruned for this section)\n',
      '```json',
      JSON.stringify(bibtexEntries, null, 2),
      '```\n',
    ];

    const claimsWithContext = chunk.filter(
      (c) => c.verifiedSourceContext && c.verifiedSourceContext.length > 0
    );
    if (claimsWithContext.length > 0) {
      userPayloadParts.push(
        '## Verified Source Context (Locally Extracted from Zotero PDFs)\n',
        claimsWithContext
          .map((c) => {
            const passages = c.verifiedSourceContext!
              .map((p, idx) => `[Passage ${idx + 1}]\n${p}`)
              .join('\n\n');
            return `### Claim ${c.id}: "${c.rawText}"\nCitations: [${c.citations.join(', ')}]\n${passages}`;
          })
          .join('\n\n---\n\n'),
        '\n'
      );
    }

    userPayloadParts.push(
      'Audit every claim above against the BibTeX references and any Verified Source Context. Report ALL findings using the report_audit_findings tool.'
    );

    const userPayload = userPayloadParts.join('\n');

    let response: Response;
    try {
      const { url, headers, body } = buildProviderRequest(
        provider,
        model,
        apiKey,
        SYSTEM_PROMPT,
        AUDIT_TOOL,
        userPayload,
        chunkIndex,
        totalChunks,
        ollamaEndpoint
      );

      const estimatedTokens = Math.ceil(userPayload.length / 4);
      await rateLimiter.acquire(estimatedTokens);
      
      useReciteStore.getState().updateTelemetry({ 
        tokenPressure: rateLimiter.getCurrentTokens() 
      });

      response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    } catch (networkError: any) {
      throw new Error(
        `Network error on chunk ${chunkIndex + 1}: ${networkError.message}`
      );
    }

    // ── Handle HTTP errors ─────────────────────────────────────────────────
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');

      if (response.status === 401) {
        throw new Error(
          'Invalid API key. Check your credentials in Settings (Ctrl+,).'
        );
      }
      if (response.status === 429) {
        throw new Error(
          `Rate limit exceeded on chunk ${chunkIndex + 1}. Partial results may be available.`
        );
      }
      if (response.status === 400) {
        const detail = tryParseErrorDetail(errorBody);
        throw new Error(
          `API error (400) on chunk ${chunkIndex + 1}: ${detail || 'Bad request.'}`
        );
      }
      if (response.status === 529) {
        throw new Error(
          `API overloaded on chunk ${chunkIndex + 1}. Try again shortly.`
        );
      }

      throw new Error(
        `API error (${response.status}) on chunk ${chunkIndex + 1}: ${errorBody.substring(0, 200) || 'Unknown error'}`
      );
    }

    // ── Parse response ─────────────────────────────────────────────────────
    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      throw new Error(`Failed to parse JSON response for chunk ${chunkIndex + 1}.`);
    }

    console.log(`[LLMOrchestrator] Chunk ${chunkIndex + 1}/${totalChunks} response:`, {
      id: responseData.id,
      model: responseData.model,
      stopReason: responseData.stop_reason,
    });

    // ── Extract tool use results — support both Anthropic and OpenAI formats ──
    const toolUseBlock =
      // Anthropic format
      responseData.content?.find(
        (block: any) => block.type === 'tool_use' && block.name === 'report_audit_findings'
      ) ||
      // OpenAI / OpenRouter format
      responseData.choices?.[0]?.message?.tool_calls?.find(
        (tc: any) => tc.function?.name === 'report_audit_findings'
      );

    if (!toolUseBlock) {
      console.error(`[LLMOrchestrator] No tool_use block in chunk ${chunkIndex + 1}:`, responseData);
      throw new Error(
        `Chunk ${chunkIndex + 1}: model did not return structured findings.`
      );
    }

    // Parse findings from either Anthropic (input) or OpenAI (function.arguments) format
    let rawFindings;
    if (toolUseBlock.input?.findings) {
      rawFindings = toolUseBlock.input.findings;
    } else {
      const rawArgs = toolUseBlock.function?.arguments ?? '{}';
      // Preserve raw LaTeX backslashes from JSON.parse collapse (e.g. \text -> ext)
      // Double escape all backslashes except for JSON structure quotes
      const safeArgs = rawArgs.replace(/\\/g, '\\\\').replace(/\\\\"/g, '\\"');
      try {
        rawFindings = JSON.parse(safeArgs)?.findings;
      } catch {
        // Fallback if double escaping broke valid JSON escapes
        rawFindings = JSON.parse(rawArgs)?.findings;
      }
    }

    return validateFindings(rawFindings);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates and sanitizes the findings array from the tool use response.
 * Ensures each finding conforms to the AuditClaim interface.
 */
function validateFindings(rawFindings: any): AuditClaim[] {
  if (!Array.isArray(rawFindings)) {
    console.warn('[LLMOrchestrator] Findings is not an array:', rawFindings);
    return [];
  }

  const validSeverities = new Set(['Critical', 'High', 'Medium', 'Low']);
  const validTypes = new Set([
    'MissingCitation',
    'WeakCitation',
    'Hallucination',
    'Misattribution',
  ]);

  return rawFindings
    .filter((f: any) => f && typeof f === 'object')
    .map((f: any, idx: number) => ({
      id: typeof f.id === 'string' ? f.id : `audit-${idx + 1}`,
      severity: validSeverities.has(f.severity) ? f.severity : 'Medium',
      type: validTypes.has(f.type) ? f.type : 'WeakCitation',
      text: typeof f.text === 'string' ? f.text : '',
      context: typeof f.context === 'string' ? f.context : '',
      suggestedFix: typeof f.suggestedFix === 'string' ? f.suggestedFix : undefined,
    }));
}

/**
 * Attempts to extract a human-readable error detail from an API error response body.
 */
function tryParseErrorDetail(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || null;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// § PROVIDER ROUTING — Dynamic API endpoint & header builder
// ──────────────────────────────────────────────────────────────────────────────

function resolveDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'anthropic':  return 'claude-5-sonnet';
    case 'openai':     return 'gpt-5.6-sol';
    case 'google':     return 'gemini-3.7-flash';
    case 'openrouter': return 'openrouter/auto';
    case 'ollama':     return 'llama3.3';
  }
}

interface ProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

function buildProviderRequest(
  provider: LLMProvider,
  model: string,
  apiKey: string,
  systemPrompt: string,
  auditTool: typeof AUDIT_TOOL,
  userPayload: string,
  chunkIndex: number,
  totalChunks: number,
  ollamaEndpoint?: string
): ProviderRequest {
  switch (provider) {
    // ─── Anthropic ────────────────────────────────────────────────────────
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: {
          model,
          max_tokens: 4096,
          system: systemPrompt,
          tools: [auditTool],
          tool_choice: { type: 'tool', name: 'report_audit_findings' },
          messages: [{ role: 'user', content: userPayload }],
        },
      };

    // ─── OpenAI ─────────────────────────────────────────────────────────
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: buildOpenAIBody(model, systemPrompt, auditTool, userPayload),
      };

    // ─── Google Gemini (via OpenAI-compatible endpoint) ───────────────────
    case 'google':
      return {
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: buildOpenAIBody(model, systemPrompt, auditTool, userPayload),
      };

    // ─── OpenRouter ─────────────────────────────────────────────────────
    case 'openrouter': {
      const resolvedModel = model === 'openrouter/free' ? 'openrouter/auto' : model;
      return {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://reciteai.app',
          'X-Title': 'ReciteAI Citation Auditor',
          'content-type': 'application/json',
        },
        body: buildOpenAIBody(resolvedModel, systemPrompt, auditTool, userPayload),
      };
    }

    // ─── Ollama (local, air-gapped) ───────────────────────────────────────
    case 'ollama': {
      const base = (ollamaEndpoint || 'http://127.0.0.1:11434').replace(/\/$/, '');
      return {
        url: `${base}/v1/chat/completions`,
        headers: { 'content-type': 'application/json' },
        body: buildOpenAIBody(model, systemPrompt, auditTool, userPayload),
      };
    }
  }
}

/**
 * Build an OpenAI-compatible chat completion body with tool calling.
 * Used by OpenAI, Google (via OpenAI-compatible shim), OpenRouter, and Ollama.
 */
function buildOpenAIBody(
  model: string,
  systemPrompt: string,
  auditTool: typeof AUDIT_TOOL,
  userPayload: string
) {
  // Convert Anthropic tool schema to OpenAI function calling format
  return {
    model,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPayload   },
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: auditTool.name,
          description: auditTool.description,
          parameters: auditTool.input_schema,
        },
      },
    ],
    tool_choice: { type: 'function', function: { name: auditTool.name } },
  };
}
