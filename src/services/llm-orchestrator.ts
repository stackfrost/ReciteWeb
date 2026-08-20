import type { LLMProvider } from '@/lib/store';
import type { ExtractedClaim } from './latex-parser';
import type { BibTeXEntry } from './bibtex-parser';

// ─────────────────────────────────────────────────────────────────────────────
// § SYSTEM PROMPT — Post-doctoral peer-review audit persona
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a post-doctoral peer reviewer and experimental physics expert. Your task is to audit extracted manuscript claims against their cited BibTeX entries.

You MUST be highly rigorous and clinical. For each claim:
1. Check if the cited BibTeX entries adequately support the claim.
2. Identify missing citations, weak citations, hallucinated claims, or misattributions.
3. If a claim references a citation key that does not exist in the BibTeX database, flag it as MissingCitation.
4. If a claim makes a strong empirical assertion but the cited reference is only tangentially related, flag it as WeakCitation.
5. If a claim presents a fact that appears fabricated or unsupported by any provided reference, flag it as Hallucination.
6. If a claim attributes a result to the wrong paper, flag it as Misattribution.

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
// § LLM ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export class LLMOrchestrator {
  /**
   * Executes the citation pre-flight audit via the Anthropic Messages API.
   *
   * Uses Tool Use (function calling) to enforce structured JSON output.
   * The model is forced to call `report_audit_findings` which returns
   * a validated array of AuditClaim objects.
   */
  static async executePreFlightAudit(
    extractedClaims: ExtractedClaim[],
    bibtexMap: Map<string, BibTeXEntry>,
    provider: string,
    apiKey: string,
    model?: string
  ): Promise<AuditResult> {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error(
        'No API key configured. Open Settings (Ctrl+,) and enter your Anthropic API key.'
      );
    }

    console.log(`[LLMOrchestrator] Executing audit with ${provider} (model: ${model})...`);

    // ── Serialize the manuscript data for the LLM ────────────────────────
    // JSON.stringify naturally handles LaTeX backslash escaping
    const bibtexEntries = Object.fromEntries(bibtexMap.entries());
    const userPayload = [
      '## Extracted Claims from Manuscript\n',
      '```json',
      JSON.stringify(extractedClaims, null, 2),
      '```\n',
      '## Available BibTeX References\n',
      '```json',
      JSON.stringify(bibtexEntries, null, 2),
      '```\n',
      'Audit every claim above against the BibTeX references. Report ALL findings using the report_audit_findings tool.',
    ].join('\n');

    // ── Build the API request body ───────────────────────────────────────
    const resolvedModel = model || 'claude-sonnet-4-20250514';

    const requestBody = {
      model: resolvedModel,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [AUDIT_TOOL],
      tool_choice: { type: 'tool' as const, name: 'report_audit_findings' },
      messages: [
        {
          role: 'user' as const,
          content: userPayload,
        },
      ],
    };

    // ── Execute the fetch ────────────────────────────────────────────────
    const t0 = performance.now();

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (networkError: any) {
      throw new Error(
        `Network error connecting to Anthropic API: ${networkError.message}. Check your internet connection.`
      );
    }

    const latencyMs = Math.round(performance.now() - t0);

    // ── Handle HTTP errors ───────────────────────────────────────────────
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');

      if (response.status === 401) {
        throw new Error(
          'Invalid API key. Check your Anthropic key in Settings (Ctrl+,).'
        );
      }
      if (response.status === 429) {
        throw new Error(
          'Rate limit exceeded. Please wait a moment and try again.'
        );
      }
      if (response.status === 400) {
        // Often indicates malformed request or model issues
        const detail = tryParseErrorDetail(errorBody);
        throw new Error(
          `Anthropic API error (400): ${detail || 'Bad request. Check model configuration.'}`
        );
      }
      if (response.status === 529) {
        throw new Error(
          'Anthropic API is temporarily overloaded. Please try again in a few moments.'
        );
      }

      throw new Error(
        `Anthropic API error (${response.status}): ${errorBody.substring(0, 200) || 'Unknown error'}`
      );
    }

    // ── Parse the response ───────────────────────────────────────────────
    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      throw new Error('Failed to parse API response as JSON.');
    }

    console.log('[LLMOrchestrator] API Response received:', {
      id: responseData.id,
      model: responseData.model,
      stopReason: responseData.stop_reason,
      latencyMs,
    });

    // ── Extract tool use results ─────────────────────────────────────────
    const toolUseBlock = responseData.content?.find(
      (block: any) => block.type === 'tool_use' && block.name === 'report_audit_findings'
    );

    if (!toolUseBlock) {
      console.error('[LLMOrchestrator] No tool_use block found in response:', responseData);
      throw new Error(
        'Failed to parse audit results from LLM response. The model did not return structured findings.'
      );
    }

    const findings: AuditClaim[] = validateFindings(toolUseBlock.input?.findings);

    console.log(`[LLMOrchestrator] Audit complete: ${findings.length} findings in ${latencyMs}ms`);

    return { claims: findings, latencyMs };
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
 * Attempts to extract a human-readable error detail from an Anthropic error response body.
 */
function tryParseErrorDetail(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || null;
  } catch {
    return null;
  }
}
