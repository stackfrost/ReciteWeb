import { describe, it, expect, vi, afterEach } from 'vitest';
import { chunkText, splitIntoSentences, estimateTokens } from '../text-chunker';
import { cosineSimilarity, searchPdfContext } from '../vector-search';
import { LocalEmbeddingEngine, getEmbedding } from '../embedding-engine';

describe('Local RAG Pipeline & Semantic Claim Verification', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('Text Chunker (src/services/text-chunker.ts)', () => {
    it('accurately estimates token count based on character heuristic', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('Hello world')).toBe(3); // 11 chars -> ceil(11/4) = 3
    });

    it('splits text into coherent sentences on punctuation and paragraph boundaries', () => {
      const text = `Albert Einstein developed the theory of relativity. It revolutionized theoretical physics! Furthermore, gravity is curvature of spacetime.\n\nQuantum mechanics describes the microscopic world.`;
      const sentences = splitIntoSentences(text);

      expect(sentences.length).toBe(4);
      expect(sentences[0]).toBe('Albert Einstein developed the theory of relativity.');
      expect(sentences[1]).toBe('It revolutionized theoretical physics!');
      expect(sentences[2]).toBe('Furthermore, gravity is curvature of spacetime.');
      expect(sentences[3]).toBe('Quantum mechanics describes the microscopic world.');
    });

    it('chunks text into bounded segments with overlap while keeping sentences intact', () => {
      const rawText = [
        'Sentence one discusses superconductor thermodynamics.',
        'Sentence two establishes the critical magnetic field limit.',
        'Sentence three details high-frequency microwave cavity measurements.',
        'Sentence four provides the final experimental error bounds.',
      ].join(' ');

      // maxTokens: 30 tokens (~120 chars), overlap: 15 tokens (~60 chars)
      const chunks = chunkText(rawText, 30, 15);

      expect(chunks.length).toBeGreaterThan(1);
      // All chunks should be non-empty strings
      for (const chunk of chunks) {
        expect(typeof chunk).toBe('string');
        expect(chunk.length).toBeGreaterThan(0);
        // Each chunk should contain at least one complete sentence
        expect(chunk).toMatch(/\.\s*$/);
      }
    });

    it('gracefully handles empty strings and single short paragraphs', () => {
      expect(chunkText('')).toEqual([]);
      expect(chunkText('   ')).toEqual([]);

      const short = 'Single short sentence.';
      expect(chunkText(short, 250, 50)).toEqual([short]);
    });
  });

  describe('Vector Search & Cosine Similarity (src/services/vector-search.ts)', () => {
    it('computes exact cosine similarity for identical, orthogonal, and opposite vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [1, 0, 0];
      const vecOrthogonal = [0, 1, 0];
      const vecOpposite = [-1, 0, 0];

      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
      expect(cosineSimilarity(vecA, vecOrthogonal)).toBeCloseTo(0.0, 5);
      expect(cosineSimilarity(vecA, vecOpposite)).toBeCloseTo(-1.0, 5);
    });

    it('returns 0 for degenerate zero vectors or dimension mismatches', () => {
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('ranks candidate chunks by semantic similarity against the claim', async () => {
      // Mock LocalEmbeddingEngine embeddings to return deterministic vectors
      vi.spyOn(LocalEmbeddingEngine, 'getEmbedding').mockImplementation(async (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes('quantum')) return [1, 0, 0];
        if (lower.includes('relativity')) return [0, 1, 0];
        return [0, 0, 1];
      });

      vi.spyOn(LocalEmbeddingEngine, 'getEmbeddings').mockImplementation(async (texts: string[]) => {
        return Promise.all(texts.map((t) => LocalEmbeddingEngine.getEmbedding(t)));
      });

      const claim = 'We measure quantum entanglement states.';
      const pdfChunks = [
        'General relativity predicts gravitational lensing around black holes.',
        'Quantum entanglement demonstrates non-local correlations across photon pairs.',
        'Biological cellular respiration occurs primarily in the mitochondria.',
      ];

      const topResults = await searchPdfContext(claim, pdfChunks, 2);

      expect(topResults.length).toBe(2);
      // The quantum chunk should be ranked #1
      expect(topResults[0]).toContain('Quantum entanglement demonstrates');
    });
  });

  describe('Local Embedding Engine (src/services/embedding-engine.ts)', () => {
    it('returns zero vector for empty input strings', async () => {
      const emptyVec = await getEmbedding('');
      expect(emptyVec.length).toBe(384);
      expect(emptyVec.every((v) => v === 0)).toBe(true);
    });
  });
});
