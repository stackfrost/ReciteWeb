/**
 * src/app/api/audit/__tests__/entailment-gemini.test.ts
 *
 * Unit tests for the Gemini-powered NLI entailment and baseline-detection route.
 * Gemini calls are mocked via vi.mock so tests run without a live API key.
 *
 * Vitest mock notes:
 * - vi.mock() is hoisted above all imports, so static imports of the mocked
 *   module receive the mock, not the real implementation.
 * - Constructor mocks must use regular `function` syntax (not arrow functions)
 *   because arrow functions cannot be called with `new`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';   // receives the mock (hoisting)
import { signToken } from '@/lib/auth-token';

// ─── Mock @google/genai ───────────────────────────────────────────────────────
// Factory uses regular `function` so Vitest can call it with `new GoogleGenAI()`.

vi.mock('@google/genai', () => ({
  // eslint-disable-next-line object-shorthand
  GoogleGenAI: vi.fn(function (this: Record<string, unknown>) {
    this.models = { generateContentStream: vi.fn() };
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function makeAuthToken(tier: 'annual_pro' | 'emergency_pass' = 'annual_pro') {
  return signToken({ email: 'test@uni.edu', tier, expiresAt: Date.now() + 3_600_000 });
}

function makeRequest(body: object, token?: string) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (token) headers.set('authorization', `Bearer ${token}`);
  return new Request('http://localhost/api/audit/entailment', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

async function* makeAsyncGen(text: string) {
  yield { text };
}

let mockGenerateContentStream = vi.fn();

/** Updates what `new GoogleGenAI()` returns for the duration of one test. */
function setupGeminiMock(responseJson: object): void {
  mockGenerateContentStream = vi.fn().mockReturnValue(makeAsyncGen(JSON.stringify(responseJson)));
  (GoogleGenAI as ReturnType<typeof vi.fn>).mockImplementation(function (this: Record<string, unknown>) {
    this.models = {
      generateContentStream: mockGenerateContentStream,
    };
  });
}

/** Makes `generateContentStream` throw synchronously. */
function setupGeminiThrow(errorMsg: string): void {
  mockGenerateContentStream = vi.fn().mockImplementation(function () {
    throw new Error(errorMsg);
  });
  (GoogleGenAI as ReturnType<typeof vi.fn>).mockImplementation(function (this: Record<string, unknown>) {
    this.models = {
      generateContentStream: mockGenerateContentStream,
    };
  });
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe('POST /api/audit/entailment — auth', () => {
  it('returns 401 when no auth token is provided', async () => {
    const { POST } = await import('../entailment/route');
    const res = await POST(makeRequest({ claimText: 'x' }) as any);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const { POST } = await import('../entailment/route');
    const res = await POST(makeRequest({ claimText: 'x' }, 'invalid.token.here') as any);
    expect(res.status).toBe(401);
  });
});

// ─── Entailment mode ──────────────────────────────────────────────────────────

describe('POST /api/audit/entailment — entailment mode', () => {
  const ABSTRACT = 'We propose a novel transformer achieving 95% accuracy on benchmark tasks.';

  beforeEach(() => {
    (process.env as Record<string, string>).GEMINI_API_KEY = 'test-key-active';
  });

  afterEach(() => {
    delete (process.env as Record<string, string | undefined>).GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  it('returns SUPPORTED classification from Gemini (using gemini-3.7-flash)', async () => {
    setupGeminiMock({ classification: 'SUPPORTED', confidence: 0.92, reasoning: 'Direct support.' });
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const req = makeRequest({
      claimText: 'The proposed method achieves 95% accuracy.',
      citedPaperTitle: 'Novel Transformer',
      citedAbstract: ABSTRACT,
    }, token);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.classification).toBe('SUPPORTED');
    expect(json.confidence).toBeGreaterThan(0.8);
    expect(json.fallback).toBeUndefined();
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.7-flash' })
    );
  });

  it('returns HALLUCINATED when Gemini says so (using gemini-3.7-flash)', async () => {
    setupGeminiMock({
      classification: 'HALLUCINATED', confidence: 0.91,
      reasoning: 'No topic match.', suggestedRevision: 'Remove this citation.',
    });
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const req = makeRequest({
      claimText: 'This proves quantum entanglement in graph theory.',
      citedPaperTitle: 'Novel Transformer', citedAbstract: ABSTRACT,
    }, token);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.classification).toBe('HALLUCINATED');
    expect(json.suggestedRevision).toBeTruthy();
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.7-flash' })
    );
  });

  it('returns UNVERIFIED_SOURCE when no abstract is available', async () => {
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const res = await POST(makeRequest({ claimText: 'Claim without any abstract.' }, token) as any);
    expect(res.status).toBe(200);
    expect((await res.json()).classification).toBe('UNVERIFIED_SOURCE');
  });

  it('falls back to keyword-overlap when Gemini throws', async () => {
    setupGeminiThrow('Gemini API down');
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const res = await POST(makeRequest({
      claimText: 'transformer architecture accuracy benchmark tasks',
      citedAbstract: ABSTRACT, citedPaperTitle: 'Novel Transformer',
    }, token) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fallback).toBe(true);
    expect(['SUPPORTED', 'MISALIGNED', 'HALLUCINATED']).toContain(json.classification);
  });

  it('falls back to keyword-overlap when GEMINI_API_KEY is absent', async () => {
    delete (process.env as Record<string, string | undefined>).GEMINI_API_KEY;
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const res = await POST(makeRequest({
      claimText: 'transformer architecture accuracy',
      citedAbstract: ABSTRACT, citedPaperTitle: 'Novel Transformer',
    }, token) as any);
    expect(res.status).toBe(200);
    expect((await res.json()).fallback).toBe(true);
  });

  it('returns 400 when claimText is empty', async () => {
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const res = await POST(makeRequest({ claimText: '' }, token) as any);
    expect(res.status).toBe(400);
  });
});

// ─── Baseline detection mode ──────────────────────────────────────────────────

describe('POST /api/audit/entailment — baseline-detection mode', () => {
  beforeEach(() => {
    (process.env as Record<string, string>).GEMINI_API_KEY = 'test-key-active';
  });

  afterEach(() => {
    delete (process.env as Record<string, string | undefined>).GEMINI_API_KEY;
    vi.clearAllMocks();
  });

  it('returns missingBaselines array from Gemini (using gemini-3.7-flash)', async () => {
    setupGeminiMock({
      missingBaselines: ['GPT-4', 'BERT-large', 'T5-XXL'],
      severity: 'Critical',
      canonicalSuggestions: ['Compare against GPT-4', 'Add BERT-large as lower bound'],
    });
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const req = makeRequest({
      mode: 'baseline-detection',
      manuscriptAbstract: 'We propose a new LLM that outperforms existing approaches...',
      researchField: 'NLP / language generation',
    }, token);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.mode).toBe('baseline-detection');
    expect(json.missingBaselines).toEqual(['GPT-4', 'BERT-large', 'T5-XXL']);
    expect(json.severity).toBe('Critical');
    expect(json.canonicalSuggestions).toHaveLength(2);
    expect(json.fallback).toBeUndefined();
    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3.7-flash' })
    );
  });

  it('returns 400 when manuscriptAbstract is missing', async () => {
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const res = await POST(makeRequest({ mode: 'baseline-detection' }, token) as any);
    expect(res.status).toBe(400);
  });

  it('returns empty baselines with fallback when Gemini key is absent', async () => {
    delete (process.env as Record<string, string | undefined>).GEMINI_API_KEY;
    const { POST } = await import('../entailment/route');
    const token = await makeAuthToken();
    const res = await POST(makeRequest({
      mode: 'baseline-detection',
      manuscriptAbstract: 'We propose a novel method...',
    }, token) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fallback).toBe(true);
    expect(json.missingBaselines).toEqual([]);
  });
});
