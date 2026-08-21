/**
 * src/services/vector-search.ts
 *
 * In-memory vector search and cosine similarity calculator for local RAG retrieval.
 * Ranks PDF chunks against empirical claims strictly on the local machine.
 */

import { LocalEmbeddingEngine, getEmbedding } from './embedding-engine';

/**
 * Calculates the cosine similarity between two vector representations.
 * Formula: (A · B) / (||A|| * ||B||)
 *
 * @param vecA First vector.
 * @param vecB Second vector.
 * @returns Similarity score between -1.0 and 1.0 (or 0.0 for degenerate inputs).
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  if (vecA.length !== vecB.length) {
    console.warn(
      `[VectorSearch] Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`
    );
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

export interface ScoredChunk {
  chunk: string;
  score: number;
  index: number;
}

/**
 * Performs semantic search over an array of PDF chunks against a target claim.
 *
 * @param claim      The empirical assertion or manuscript claim text.
 * @param pdfChunks  The array of bounded chunks extracted from the source PDF.
 * @param topK       Number of top scoring paragraphs to return (default: 3).
 * @returns          The top-K most semantically relevant PDF paragraphs.
 */
export async function searchPdfContext(
  claim: string,
  pdfChunks: string[],
  topK: number = 3
): Promise<string[]> {
  if (!claim || !claim.trim() || !pdfChunks || pdfChunks.length === 0) {
    return [];
  }

  // If total chunks are fewer than or equal to topK, return all non-empty chunks
  if (pdfChunks.length <= topK) {
    return pdfChunks.filter((c) => c.trim().length > 0);
  }

  // 1. Embed the claim
  const claimEmbedding = await LocalEmbeddingEngine.getEmbedding(claim);

  // 2. Embed all PDF chunks
  const chunkEmbeddings = await LocalEmbeddingEngine.getEmbeddings(pdfChunks);

  // 3. Compute cosine similarity scores
  const scoredChunks: ScoredChunk[] = [];

  for (let i = 0; i < pdfChunks.length; i++) {
    const chunk = pdfChunks[i];
    const embedding = chunkEmbeddings[i];
    if (!embedding) continue;

    const score = cosineSimilarity(claimEmbedding, embedding);
    scoredChunks.push({
      chunk,
      score,
      index: i,
    });
  }

  // 4. Sort descending by similarity score
  scoredChunks.sort((a, b) => b.score - a.score);

  // 5. Return the top-K chunks
  return scoredChunks.slice(0, topK).map((item) => item.chunk);
}
