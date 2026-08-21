/**
 * src/services/text-chunker.ts
 *
 * High-speed, local text chunker for converting raw extracted PDF content
 * into bounded, sentence-preserving chunks suitable for local vector embedding.
 */

/**
 * Estimates the token count of a given string using the standard
 * subword heuristic (~4 characters per token for scientific text).
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.trim().length / 4);
}

/**
 * Splits raw text into clean, atomic sentence/paragraph segments
 * using regex boundary detection.
 */
export function splitIntoSentences(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize newlines and collapse excess horizontal whitespace
  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Split on double newlines (paragraphs) or sentence terminal punctuation (. ? !)
  // followed by whitespace and a capital letter / start of new token.
  const rawSegments = normalized.split(/(?<=[.!?])\s+|\n\s*\n+/);

  const sentences: string[] = [];

  for (const segment of rawSegments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    // If a single segment is unusually large (e.g. table data, unpunctuated block),
    // sub-split it by single newlines or clause boundaries so sentences stay manageable.
    if (estimateTokens(trimmed) > 200) {
      const subParts = trimmed.split(/\n+|(?<=;)\s+/);
      for (const part of subParts) {
        const cleanPart = part.trim();
        if (cleanPart) sentences.push(cleanPart);
      }
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

/**
 * Chunks a raw text string into segments of at most `maxTokens` with a sliding
 * `overlap` window, preserving sentence boundaries wherever possible.
 *
 * @param rawText    The unformatted, extracted raw PDF text.
 * @param maxTokens  Maximum approximate tokens per chunk (default: 250).
 * @param overlap    Approximate token overlap between consecutive chunks (default: 50).
 * @returns          Array of bounded, coherent text chunks.
 */
export function chunkText(
  rawText: string,
  maxTokens: number = 250,
  overlap: number = 50
): string[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  const sentences = splitIntoSentences(rawText);
  if (sentences.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let sentenceIdx = 0;

  while (sentenceIdx < sentences.length) {
    const currentChunkSentences: string[] = [];
    let currentTokens = 0;
    let endIdx = sentenceIdx;

    // Greedily accumulate sentences until hitting maxTokens
    while (endIdx < sentences.length) {
      const sentence = sentences[endIdx];
      const sentenceTokens = estimateTokens(sentence);

      // If this single sentence is larger than maxTokens, we must add it as its own chunk
      if (currentChunkSentences.length === 0 && sentenceTokens >= maxTokens) {
        currentChunkSentences.push(sentence);
        endIdx++;
        break;
      }

      if (currentTokens + sentenceTokens > maxTokens) {
        break;
      }

      currentChunkSentences.push(sentence);
      currentTokens += sentenceTokens;
      endIdx++;
    }

    if (currentChunkSentences.length > 0) {
      chunks.push(currentChunkSentences.join(' '));
    }

    // Determine the starting index for the next chunk using the overlap budget
    if (endIdx >= sentences.length) {
      break; // Reached end of document
    }

    if (overlap <= 0) {
      sentenceIdx = endIdx;
    } else {
      // Step backwards from endIdx to collect sentences within the overlap budget
      let overlapTokens = 0;
      let nextStartIdx = endIdx;

      for (let backIdx = endIdx - 1; backIdx >= sentenceIdx; backIdx--) {
        const tokens = estimateTokens(sentences[backIdx]);
        if (overlapTokens + tokens <= overlap) {
          overlapTokens += tokens;
          nextStartIdx = backIdx;
        } else {
          break;
        }
      }

      // Guarantee strict forward progression to prevent infinite loops
      if (nextStartIdx <= sentenceIdx) {
        sentenceIdx = sentenceIdx + 1;
      } else {
        sentenceIdx = nextStartIdx;
      }
    }
  }

  return chunks;
}
