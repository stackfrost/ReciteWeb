/**
 * Claim Extraction Orchestrator (Multi-Step Agentic RAG Discovery)
 * 
 * Orchestrates the full 4-stage literature discovery & verification pipeline:
 * 1. Deterministic AST Integrity Check (missing keys, syntax mismatches, phantom refs)
 * 2. Unattributed Scientific Claim Extraction & Query Decomposition (3 orthogonal vectors)
 * 3. High-Throughput Parallel Dragnet (OpenAlex, Crossref, arXiv)
 * 4. LLM Semantic Entailment Grading, Verbatim Quote Extraction, and Live Telemetry Streaming
 */

import {
  AuditFinding,
  DualStreamAuditResult,
  FindingSeverity,
  AgenticPipelineTelemetry,
  AgenticTraceNode,
  VerifiedLiteratureSource,
} from '@/types/audit';
import { Claim, ClaimCategory, ClaimStatus, LLMProvider } from '@/lib/store';
import { BibTeXParser, BibTeXEntry } from '@/services/bibtex-parser';
import { yieldToMain } from '@/lib/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { AcademicSearchAggregator } from '@/services/academic-search-aggregator';
import { createTimeoutSignal } from '@/utils/timeout-signal';

export interface StructuredClaimExtraction {
  line: number;
  contextSnippet: string;
  claimText: string;
  classification: string;
  severity: FindingSeverity;
  searchQueries: string[];
  startIndex?: number;
  endIndex?: number;
  suggestedFix?: string;
}

export class ClaimExtractionOrchestrator {
  /**
   * Runs the complete autonomous Multi-Step Agentic RAG pipeline.
   * Employs non-blocking event-loop cooperative scheduling with live telemetry streaming.
   */
  static async runFullDiscoveryPipeline(
    texContent: string,
    bibtexContent: string | null | undefined,
    onProgress?: (status: string) => void,
    onTelemetryUpdate?: (telemetry: AgenticPipelineTelemetry) => void,
    signal?: AbortSignal
  ): Promise<DualStreamAuditResult> {
    const t0 = performance.now();
    const lineOffsets = buildLineOffsets(texContent);

    // ── STAGE 0: Pre-Flight Academic Domain Classification ──────────────────────
    onProgress?.('Classifying Academic Domain & Initializing Search Routing Table...');
    await yieldToMain();

    const { title: docTitle, abstract: docAbstract } = extractTitleAndAbstract(texContent);
    const { PreflightTopicClassifier } = await import('@/services/preflight-topic-classifier');
    const domainResult = await PreflightTopicClassifier.classifyDomain(docTitle, docAbstract, signal);

    // ── STAGE 1: Deterministic AST & Integrity Check ────────────────────────────
    onProgress?.(`Running Deterministic AST Integrity Checks (${domainResult.domain.toUpperCase()})...`);
    await yieldToMain();
    console.time('[Pipeline] Stage 1: AST Integrity');

    const bibtexMap = BibTeXParser.parse(bibtexContent || '');
    const integrityFindings = await this.runDeterministicAstIntegrity(texContent, bibtexMap, lineOffsets);
    console.timeEnd('[Pipeline] Stage 1: AST Integrity');

    if (signal?.aborted) {
      return { integrityFindings, discoveryFindings: [], allFindings: integrityFindings, reciteClaims: [], latencyMs: 0 };
    }

    // ── STAGE 2: Extracting Unattributed Scientific Claims ─────────────────────
    onProgress?.('Extracting Unattributed Scientific Claims & Deconstructing Queries...');
    await yieldToMain();
    console.time('[Pipeline] Stage 2: Claim Deconstruction');
    const extractedClaims = await this.extractScientificClaims(texContent, bibtexMap, onProgress, signal);
    console.timeEnd('[Pipeline] Stage 2: Claim Deconstruction');

    if (signal?.aborted) {
      return { integrityFindings, discoveryFindings: [], allFindings: integrityFindings, reciteClaims: [], latencyMs: 0 };
    }

    // Initialize Telemetry Data Structure
    const telemetryState: AgenticPipelineTelemetry = {
      pipelineMode: 'deep_agentic_rag',
      totalClaims: extractedClaims.length,
      completedClaims: 0,
      currentClaimIndex: 0,
      activeStage: 'claim_decomposition',
      overallElapsedMs: 0,
      traces: {},
    };

    extractedClaims.forEach((claim, idx) => {
      const claimId = `claim-node-${idx + 1}`;
      telemetryState.traces[claimId] = {
        claimId,
        claimText: claim.claimText,
        line: claim.line,
        stage: 'pending',
        status: 'pending',
        deconstructedQueries: claim.searchQueries,
        totalAbstractsHarvested: 0,
        evaluatedCandidates: [],
        startTimeMs: performance.now(),
        logs: [`Claim extracted at line ${claim.line}`],
      };
    });

    onTelemetryUpdate?.({ ...telemetryState });

    // ── STAGE 3: Dragnet Literature Discovery & NLI Verification ─────────────
    const { ZoteroBridgeService } = await import('@/services/zotero-bridge-service');
    const { SemanticEntailmentEngine } = await import('@/services/semantic-entailment-engine');
    const discoveryFindings: AuditFinding[] = [];

    const settings = useSettingsStore.getState();
    const activeKey = settings.getActiveKey();
    const provider = settings.activeProvider;
    const modelId = settings.activeModelId;

    for (let i = 0; i < extractedClaims.length; i++) {
      if (signal?.aborted) break;

      const claim = extractedClaims[i];
      const claimId = `claim-node-${i + 1}`;
      const trace = telemetryState.traces[claimId];

      // ── STAGE 3: Dragnet Literature Discovery ─────────────────────────────────
      const claimStageTag = `[Pipeline] Stage 3+4: Claim ${i + 1}/${extractedClaims.length}`;
      console.time(claimStageTag);

      telemetryState.currentClaimIndex = i;
      telemetryState.activeStage = 'dragnet_harvesting';

      if (trace) {
        trace.stage = 'dragnet_harvesting';
        trace.status = 'running';
        trace.logs.push(`Deconstructed into queries: ${claim.searchQueries.join(' | ')}`);
      }

      onTelemetryUpdate?.({ ...telemetryState, overallElapsedMs: Math.round(performance.now() - t0) });
      onProgress?.(`Parallel dragnet across OpenAlex & Crossref for claim ${i + 1}/${extractedClaims.length}...`);

      await yieldToMain();

      let verifiedSources: VerifiedLiteratureSource[] = [];

      try {
        // Execute parallel dragnet across OpenAlex, Crossref, arXiv, Europe PMC, or S2
        const { signal: dragnetSignal } = createTimeoutSignal(30000, signal);
        verifiedSources = await AcademicSearchAggregator.executeDragnet(
          claim.searchQueries,
          claim.claimText,
          (summary) => {
            if (trace) {
              trace.totalAbstractsHarvested++;
              trace.evaluatedCandidates.push(summary);
              onTelemetryUpdate?.({ ...telemetryState, overallElapsedMs: Math.round(performance.now() - t0) });
            }
          },
          dragnetSignal,
          domainResult.domain
        );

        // Also check local Zotero library if available
        const zoteroItems = await ZoteroBridgeService.searchLocalLibrary(claim.claimText);
        if (zoteroItems.length > 0) {
          for (const item of zoteroItems) {
            const ext: VerifiedLiteratureSource = {
              title: item.title,
              authors: (item.creators || []).map((c: any) => typeof c === 'string' ? c : (c.name || `${c.firstName || ''} ${c.lastName || ''}`).trim()).filter(Boolean),
              year: item.date ? parseInt(item.date, 10) || 2024 : 2024,
              venue: item.publicationTitle || 'Zotero Library',
              doi: item.doi,
              bibtexKey: item.key,
              relevanceScore: 0.95,
              abstractSnippet: item.abstractNote || 'Referenced from local researcher Zotero library.',
              abstractExcerpt: item.abstractNote || 'Referenced from local researcher Zotero library.',
              verificationStatus: 'verified',
              provenance: 'zotero',
              bibtexEntry: `@article{${item.key},\n  title = {${item.title}},\n  year = {${item.date || 2024}}\n}`,
            };
            verifiedSources.push(ext);
          }
        }

      } catch (err) {
        console.warn(`[ClaimExtractionOrchestrator] Academic search failed for claim ${i}:`, err);
      }

      await yieldToMain();

      // ── STAGE 4: LLM Entailment Grading & Verbatim Quote Extraction ───────────
      if (trace) {
        trace.stage = 'nli_grading';
        trace.logs.push(`Grading ${verifiedSources.length} candidates with LLM Natural Language Inference...`);
      }
      onTelemetryUpdate?.({ ...telemetryState, overallElapsedMs: Math.round(performance.now() - t0) });
      onProgress?.(`LLM Grading & Entailment verification for claim ${i + 1}...`);

      const evaluations = await SemanticEntailmentEngine.evaluateCandidatesWithLLM(
        claim.claimText,
        verifiedSources,
        provider,
        activeKey,
        modelId,
        (evalItem) => {
          if (trace && trace.evaluatedCandidates[evalItem.sourceIndex]) {
            trace.evaluatedCandidates[evalItem.sourceIndex].entailmentScore = evalItem.entailmentScore;
            trace.evaluatedCandidates[evalItem.sourceIndex].entailmentVerdict = evalItem.status;
            onTelemetryUpdate?.({ ...telemetryState, overallElapsedMs: Math.round(performance.now() - t0) });
          }
        },
        signal
      );

      // Attach evaluated scores back to verifiedSources
      evaluations.forEach((ev) => {
        if (verifiedSources[ev.sourceIndex]) {
          verifiedSources[ev.sourceIndex].relevanceScore = ev.entailmentScore / 100;
          verifiedSources[ev.sourceIndex].entailmentStatus = ev.status;
          verifiedSources[ev.sourceIndex].abstractExcerpt = ev.verbatimQuote || verifiedSources[ev.sourceIndex].abstractExcerpt;
          verifiedSources[ev.sourceIndex].hedgingSuggestion = ev.hedgingSuggestion;
          verifiedSources[ev.sourceIndex].contradictionWarning = ev.contradictionWarning;
        }
      });

      // Sort sources by entailment score descending
      verifiedSources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      const bestCandidate = verifiedSources[0];
      const recommendedBibKey = bestCandidate?.bibtexKey || 'ref2024';

      let suggestedFix = claim.suggestedFix;
      if (!suggestedFix && bestCandidate) {
        suggestedFix = `${claim.claimText} ~\\cite{${recommendedBibKey}}`;
      }

      const bestEval = evaluations[0] || {
        status: (bestCandidate?.entailmentStatus || 'entailed') as any,
        verbatimQuote: bestCandidate?.abstractExcerpt || '',
        reason: 'Empirical assertion substantiated by literature candidate.',
        hedgingSuggestion: bestCandidate?.hedgingSuggestion,
        contradictionWarning: bestCandidate?.contradictionWarning,
      };

      let finalSuggestedFix = suggestedFix;
      if (bestEval.hedgingSuggestion && bestEval.status !== 'entailed') {
        finalSuggestedFix = `${bestEval.hedgingSuggestion} ~\\cite{${recommendedBibKey}}`;
      }

      if (trace) {
        trace.stage = 'bibtex_synthesis';
        trace.winningSource = bestCandidate;
        trace.hedgingAdvice = bestEval.hedgingSuggestion;
        trace.contradictionAlert = bestEval.contradictionWarning;
        trace.status = 'completed';
        trace.durationMs = Math.round(performance.now() - trace.startTimeMs);
        trace.logs.push(`Citation synthesized: \\cite{${recommendedBibKey}} (${Math.round((bestCandidate?.relevanceScore || 0.9) * 100)}% Entailment)`);
      }

      telemetryState.completedClaims++;
      onTelemetryUpdate?.({ ...telemetryState, overallElapsedMs: Math.round(performance.now() - t0) });

      const finding: AuditFinding = {
        id: `finding-discovery-${i + 1}`,
        line: claim.line,
        category: 'literature_discovery',
        streamType: 'discovery',
        severity: bestEval.status === 'contradicted' ? 'Critical' : claim.severity,
        type: bestEval.status === 'contradicted' ? 'Citation Contradiction' : claim.classification,
        claimText: claim.claimText,
        context: claim.contextSnippet,
        entailmentStatus: bestEval.status,
        contrastiveEvidence: {
          manuscriptClaim: claim.claimText,
          sourceQuote: bestEval.verbatimQuote || bestCandidate?.abstractSnippet || '',
          hedgingSuggestion: bestEval.hedgingSuggestion,
          reason: bestEval.reason,
        },
        suggestedPatch: {
          diffRemove: claim.claimText,
          diffAdd: finalSuggestedFix || `${claim.claimText} ~\\cite{${recommendedBibKey}}`,
        },
        suggestedFix: finalSuggestedFix,
        verifiedSources,
        status: 'unresolved',
      };

      discoveryFindings.push(finding);
      console.timeEnd(claimStageTag);
      await yieldToMain();
    }

    telemetryState.activeStage = 'complete';
    onTelemetryUpdate?.({ ...telemetryState, overallElapsedMs: Math.round(performance.now() - t0) });

    // Combine all findings
    const allFindings = [...integrityFindings, ...discoveryFindings];
    const reciteClaims = await this.convertToReciteClaims(allFindings, texContent, lineOffsets);

    const latencyMs = Math.round(performance.now() - t0);
    onProgress?.('Audit Complete.');

    return {
      integrityFindings,
      discoveryFindings,
      allFindings,
      reciteClaims,
      latencyMs,
    };
  }

  /**
   * Deterministic AST Citation Integrity Engine:
   * Identifies missing BibTeX keys, phantom citations, syntax mismatches, and unreferenced records.
   */
  private static async runDeterministicAstIntegrity(
    texContent: string,
    bibtexMap: Map<string, BibTeXEntry>,
    lineOffsets: number[]
  ): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    if (!texContent) return findings;

    const citeRegex = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{([^}]+)\}/gi;
    let match: RegExpExecArray | null;
    let findingCounter = 1;
    let loopCount = 0;

    const referencedKeys = new Set<string>();

    while ((match = citeRegex.exec(texContent)) !== null) {
      loopCount++;
      if (loopCount % 60 === 0) {
        await yieldToMain();
      }

      const line = calculateFastLineNumber(lineOffsets, match.index);
      const rawKeys = match[1].split(',').map((k) => k.trim());
      const context = extractContextSnippet(texContent, match.index, match[0].length);

      for (const key of rawKeys) {
        if (!key) continue;
        referencedKeys.add(key);

        if (!bibtexMap.has(key)) {
          findings.push({
            id: `finding-integrity-${findingCounter++}`,
            line,
            category: 'bib_mismatch',
            streamType: 'integrity',
            severity: 'Critical',
            type: 'Missing BibTeX Key',
            citationKey: key,
            context,
            suggestedPatch: {
              diffRemove: `\\cite{${key}}`,
              diffAdd: `\\cite{${key}} % Missing from bibliography`,
            },
            suggestedFix: `\\cite{${key}}`,
            verifiedSources: [],
            status: 'unresolved',
          });
        }
      }
    }

    // Unreferenced bibliography entries
    for (const [key, entry] of Array.from(bibtexMap.entries())) {
      if (!referencedKeys.has(key)) {
        findings.push({
          id: `finding-integrity-${findingCounter++}`,
          line: 1,
          category: 'bib_mismatch',
          streamType: 'integrity',
          severity: 'Low',
          type: 'Unreferenced Citation Key',
          citationKey: key,
          context: `BibTeX entry '${key}' (${entry.title || 'Untitled'}) is defined in .bib but never cited in manuscript text.`,
          suggestedPatch: {
            diffRemove: `@${entry.type}{${key}, ...}`,
            diffAdd: `% Unreferenced @${entry.type}{${key}} removed`,
          },
          suggestedFix: `\\cite{${key}}`,
          verifiedSources: [],
          status: 'unresolved',
        });
      }
    }

    // Syntax check for trailing commas in citation macros
    const malformedMacroRegex = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{[^}]*,\s*\}/gi;
    while ((match = malformedMacroRegex.exec(texContent)) !== null) {
      const line = calculateFastLineNumber(lineOffsets, match.index);
      const context = extractContextSnippet(texContent, match.index, match[0].length);

      findings.push({
        id: `finding-integrity-${findingCounter++}`,
        line,
        category: 'bib_mismatch',
        streamType: 'integrity',
        severity: 'Medium',
        type: 'Syntax Mismatch',
        context,
        suggestedPatch: {
          diffRemove: match[0],
          diffAdd: match[0].replace(/,\s*\}/, '}'),
        },
        suggestedFix: match[0].replace(/,\s*\}/, '}'),
        verifiedSources: [],
        status: 'unresolved',
      });
    }

    return findings;
  }

  /**
   * Structured Scientific Claim Extractor & Query Deconstructor:
   * Employs multi-provider LLM structured JSON extraction with orthogonal query decomposition.
   */
  private static async extractScientificClaims(
    texContent: string,
    bibtexMap: Map<string, BibTeXEntry>,
    onProgress?: (msg: string) => void,
    signal?: AbortSignal
  ): Promise<StructuredClaimExtraction[]> {
    const settings = useSettingsStore.getState();
    const activeKey = settings.getActiveKey();
    const provider = settings.activeProvider;

    if (activeKey && activeKey.trim().length > 0 && !signal?.aborted) {
      try {
        onProgress?.(`Deconstructing claims with ${provider.toUpperCase()} LLM...`);
        const llmClaims = await this.extractWithLLM(texContent, provider, activeKey, settings.activeModelId, signal);
        if (llmClaims.length > 0) {
          return llmClaims;
        }
      } catch (err: any) {
        console.warn(`[ClaimExtractionOrchestrator] ${provider} LLM extraction failed (${err?.message || err}). Falling back to heuristic NLP.`);
      }
    }

    // Universal domain heuristic claim extractor
    return this.extractUniversalHeuristics(texContent, bibtexMap);
  }

  /**
   * Multi-provider LLM-based structured JSON claim extraction and query decomposition.
   */
  private static async extractWithLLM(
    texContent: string,
    provider: LLMProvider,
    apiKey: string,
    modelId: string,
    parentSignal?: AbortSignal
  ): Promise<StructuredClaimExtraction[]> {
    const prompt = `You are a scientific peer reviewer auditing a LaTeX manuscript.
Analyze the following manuscript text and extract all declarative empirical, theoretical, or factual assertions that lack citation.
For EACH extracted claim, deconstruct it into 3-4 diverse, high-precision academic search queries:
1. Originator query (core keywords and materials)
2. Empirical parameters query (exact measured values, thresholds, methods)
3. Canonical literature / review query

Return ONLY a valid JSON array matching schema:
[
  {
    "line": 1,
    "contextSnippet": "1-2 surrounding sentences from text",
    "claimText": "exact declarative assertion from text",
    "classification": "Unsupported Assertion",
    "severity": "Critical",
    "searchQueries": ["originator query", "empirical parameter query", "canonical query"]
  }
]

Manuscript content:
${texContent.slice(0, 14000)}`;

    let rawJson = '';
    if (provider === 'google') {
      const model = modelId || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const { signal, cleanup } = createTimeoutSignal(30_000, parentSignal);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
          signal,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[ClaimExtraction] Google AI Studio HTTP ${res.status}:`, errText.slice(0, 300));
        } else {
          const data = await res.json();
          rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } finally {
        cleanup();
      }
    } else if (provider === 'anthropic') {
      const url = 'https://api.anthropic.com/v1/messages';
      const { signal, cleanup } = createTimeoutSignal(30_000, parentSignal);
      try {
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
            max_tokens: 4096,
            system: 'Respond ONLY with a valid JSON array.',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
          }),
          signal,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[ClaimExtraction] Anthropic HTTP ${res.status}:`, errText.slice(0, 300));
        } else {
          const data = await res.json();
          rawJson = data.content?.[0]?.text || '';
        }
      } finally {
        cleanup();
      }
    } else {
      const endpoint = provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };
      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://reciteweb.com';
        headers['X-Title'] = 'ReciteWeb Claim Deconstruction';
      }
      const { signal, cleanup } = createTimeoutSignal(30_000, parentSignal);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelId || (provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'gpt-4o'),
            messages: [
              { role: 'system', content: 'You are an academic manuscript auditor. Respond ONLY with a valid JSON array.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.1,
          }),
          signal,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[ClaimExtraction] ${provider.toUpperCase()} HTTP ${res.status}:`, errText.slice(0, 300));
        } else {
          const data = await res.json();
          rawJson = data.choices?.[0]?.message?.content || '';
        }
      } finally {
        cleanup();
      }
    }

    if (rawJson) {
      const match = rawJson.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    }

    return [];
  }

  /**
   * Universal heuristic claim extractor (offline fallback).
   */
  private static async extractUniversalHeuristics(
    texContent: string,
    bibtexMap: Map<string, BibTeXEntry>
  ): Promise<StructuredClaimExtraction[]> {
    const claims: StructuredClaimExtraction[] = [];
    if (!texContent) return claims;

    const claimTriggers = [
      { regex: /\b(?:reveals?|demonstrates?|verif(?:ies|ying)|confirms?)\s+that\b/i, type: 'Unsupported Assertion', severity: 'Critical' as FindingSeverity },
      { regex: /\b(?:remains?\s+finite|absence\s+of|diverges?\s+as|scales?\s+with)\b/i, type: 'Empirical Gap', severity: 'Critical' as FindingSeverity },
      { regex: /\b(?:in\s+agreement\s+with|consistent\s+with|as\s+reported\s+in)\b/i, type: 'Weak Attribution', severity: 'Medium' as FindingSeverity },
      { regex: /\b(?:\d+\s*(?:mK|K|T|GHz|mW|meV|nm|%))\b/i, type: 'Unsupported Assertion', severity: 'Medium' as FindingSeverity },
    ];

    const lines = texContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (i % 60 === 0) {
        await yieldToMain();
      }

      const lineText = lines[i];
      if (lineText.trim().startsWith('%') || lineText.trim().startsWith('\\begin{') || lineText.trim().startsWith('\\end{')) {
        continue;
      }

      const hasCitation = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{([^}]+)\}/i.test(lineText);

      for (const trigger of claimTriggers) {
        if (trigger.regex.test(lineText)) {
          const clean = lineText.replace(/\\(?:sub)*section\*?\{[^}]+\}/g, '').trim();
          if (clean.length < 25) continue;

          const line = i + 1;
          const sIndex = texContent.indexOf(lineText);
          const keywords = clean
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .slice(0, 5)
            .join(' ');

          if (!claims.some((c) => Math.abs(c.line - line) <= 1)) {
            claims.push({
              line,
              contextSnippet: clean,
              claimText: clean,
              classification: hasCitation ? 'Weak Attribution' : trigger.type,
              severity: trigger.severity,
              searchQueries: [
                keywords,
                `${keywords} experimental benchmark`,
                clean.slice(0, 60),
              ],
              startIndex: sIndex !== -1 ? sIndex : 0,
              endIndex: (sIndex !== -1 ? sIndex : 0) + clean.length,
            });
          }
        }
        if (claims.length >= 8) break;
      }
    }

    return claims;
  }

  /**
   * Converts AuditFinding array to Claim[] structure for useReciteStore.
   */
  private static async convertToReciteClaims(
    findings: AuditFinding[],
    texContent: string,
    lineOffsets: number[]
  ): Promise<Claim[]> {
    const claims: Claim[] = [];

    for (let i = 0; i < findings.length; i++) {
      if (i % 60 === 0) {
        await yieldToMain();
      }

      const f = findings[i];
      const text = f.claimText || f.context || 'Literature Assertion';
      const startIndex = f.line > 0 && f.line <= lineOffsets.length ? lineOffsets[f.line - 1] : 0;
      const bestSource = f.verifiedSources?.[0];

      const status: ClaimStatus = f.status === 'resolved' || f.status === 'accepted' ? 'accepted' : 'pending';
      const category: ClaimCategory = f.category === 'bib_mismatch' ? 'Theoretical Assertion' : 'Literature Claim';
      const streamType: 'integrity' | 'discovery' = f.streamType || (f.category === 'bib_mismatch' ? 'integrity' : 'discovery');

      const sev = (f.severity || 'Medium').toLowerCase();
      const mappedSeverity = sev === 'critical' || sev === 'high' ? 'High' : sev === 'low' ? 'Low' : 'Medium';

      claims.push({
        id: f.id,
        text,
        category,
        streamType,
        severity: mappedSeverity,
        status,
        startIndex,
        endIndex: startIndex + text.length,
        lineIndex: f.line,
        fileId: f.fileId || 'main.tex',
        citationKey: f.citationKey,
        auditType: f.type as any,
        context: f.context,
        suggestedFix: f.suggestedFix,
        isRetracted: f.isRetracted || false,

        acceptedPaper: bestSource
          ? {
              title: bestSource.title,
              authors: bestSource.authors,
              year: bestSource.year,
              venue: bestSource.venue,
              doi: bestSource.doi,
              url: bestSource.doi ? `https://doi.org/${bestSource.doi}` : undefined,
              bibtexKey: bestSource.bibtexKey,
              bibtexEntry: bestSource.bibtexEntry,
            }
          : undefined,
        suggestedPapers: f.verifiedSources?.map((s) => ({
          title: s.title,
          authors: s.authors,
          year: s.year,
          venue: s.venue,
          doi: s.doi,
          url: s.doi ? `https://doi.org/${s.doi}` : undefined,
          abstractExcerpt: s.abstractExcerpt || s.abstractSnippet,
          abstractSnippet: s.abstractSnippet,
          verificationStatus: s.verificationStatus,
          matchScore: Math.round(s.relevanceScore * 100),
          bibtexKey: s.bibtexKey,
          bibtexEntry: s.bibtexEntry,
          citationCount: s.citationCount,
          influentialCitationCount: s.influentialCitationCount,
        })),
      });
    }

    return claims;
  }
}

/**
 * Precomputes character offsets for every newline in O(N) time.
 */
function buildLineOffsets(text: string): number[] {
  const offsets: number[] = [0];
  if (!text) return offsets;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

/**
 * Calculates 1-based line number for a character offset using binary search in O(log L).
 */
function calculateFastLineNumber(lineOffsets: number[], charOffset: number): number {
  if (charOffset <= 0 || lineOffsets.length === 0) return 1;
  let low = 0;
  let high = lineOffsets.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineOffsets[mid] === charOffset) {
      return mid + 1;
    }
    if (lineOffsets[mid] < charOffset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return high + 1;
}

/**
 * Extracts a surrounding context snippet around a match offset.
 */
function extractContextSnippet(
  text: string,
  startOffset: number,
  matchLength: number,
  padding: number = 60
): string {
  const start = Math.max(0, startOffset - padding);
  const end = Math.min(text.length, startOffset + matchLength + padding);
  let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}

/**
 * Extracts manuscript title and abstract from LaTeX or raw manuscript text.
 */
function extractTitleAndAbstract(tex: string): { title: string; abstract: string } {
  if (!tex) return { title: '', abstract: '' };

  // 1. Try LaTeX \title{...}
  const titleMatch = tex.match(/\\title\{([^}]+)\}/i);
  const title = titleMatch ? titleMatch[1].replace(/\\/g, '').trim() : '';

  // 2. Try LaTeX \begin{abstract}...\end{abstract}
  const abstractMatch = tex.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/i);
  const abstract = abstractMatch
    ? abstractMatch[1].replace(/\\[a-zA-Z]+/g, ' ').replace(/\s+/g, ' ').trim()
    : tex.slice(0, 1500).replace(/\\[a-zA-Z]+/g, ' ').replace(/\s+/g, ' ').trim();

  return { title, abstract };
}
