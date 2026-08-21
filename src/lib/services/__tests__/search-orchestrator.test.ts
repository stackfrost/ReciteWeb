import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchOrchestrator } from '../search-orchestrator';
import { citationCache } from '../openalex';

describe('Deterministic Grounding Engine', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    citationCache.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Test 1: Cache Hit correctly bypasses network layer', async () => {
    // Mock fetch response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'https://openalex.org/W123',
            title: 'Exact Target Paper',
            authorships: [{ author: { display_name: 'John Doe' } }]
          }
        ]
      })
    });

    const orchestrator = new SearchOrchestrator();
    
    // First query hits network
    const result1 = await orchestrator.verifyCitationClaim('Exact Target Paper', ['John Doe']);
    expect(result1?.id).toBe('W123');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second identical query should hit cache (query string is deterministic)
    const result2 = await orchestrator.verifyCitationClaim('Exact Target Paper', ['John Doe']);
    expect(result2?.id).toBe('W123');
    expect(global.fetch).toHaveBeenCalledTimes(1); // Network strike count MUST remain 1
  });

  it('Test 2: Verification Success (Fuzzy matcher resolves minor misspellings)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'https://openalex.org/W999',
            title: 'Attention is All You Need',
            authorships: [
              { author: { display_name: 'Ashish Vaswani' } },
              { author: { display_name: 'Noam Shazeer' } }
            ]
          }
        ]
      })
    });

    const orchestrator = new SearchOrchestrator();

    // Minor typo in title ("U" instead of "You"), partial author list
    const result = await orchestrator.verifyCitationClaim('Attention is All U Need', ['Vaswani']);
    
    // Should exceed 85% confidence and lock onto the canonical paper
    expect(result).not.toBeNull();
    expect(result?.title).toBe('Attention is All You Need');
  });

  it('Test 3: Hallucination Catch (Fails 85% confidence check)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            id: 'https://openalex.org/W000',
            title: 'Some Unrelated Biology Paper',
            authorships: [
              { author: { display_name: 'Alan Turing' } }
            ]
          }
        ]
      })
    });

    const orchestrator = new SearchOrchestrator();

    // Entirely hallucinated paper, OpenAlex returns fallback/unrelated search results
    const result = await orchestrator.verifyCitationClaim('The Quantum Dynamics of LLM Hallucinations', ['Fake Author']);
    
    // Confidence is extremely low, engine flags as hallucination (returns null)
    expect(result).toBeNull();
  });
});
