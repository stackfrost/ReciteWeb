import { fetchFromOpenAlex, VerifiedCitation } from './openalex';

/**
 * Normalizes a string by converting to lowercase and stripping non-alphanumeric characters.
 * Essential for accurate mathematical fuzzy matching.
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Calculates the Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Returns a confidence score between 0.0 and 1.0
 */
export function levenshteinConfidence(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return (maxLength - dist) / maxLength;
}

export class SearchOrchestrator {
  private readonly CONFIDENCE_THRESHOLD = 0.85;

  /**
   * Calculates a composite confidence score (0.0 to 1.0).
   * Title carries 80% weight, Author matching carries 20% weight.
   */
  private calculateMatchScore(canonical: VerifiedCitation, llmTitle: string, llmAuthors: string[]): number {
    const normLlmTitle = normalizeString(llmTitle);
    const normCanonTitle = normalizeString(canonical.title);
    
    const titleConf = levenshteinConfidence(normLlmTitle, normCanonTitle);
    
    let authorConf = 0;
    if (llmAuthors.length > 0 && canonical.authors.length > 0) {
      let maxAuthorMatch = 0;
      for (const llmAuthor of llmAuthors) {
        const normLlmAuthor = normalizeString(llmAuthor);
        for (const canonAuthor of canonical.authors) {
          // Compare against full name
          const normCanon = normalizeString(canonAuthor);
          let conf = levenshteinConfidence(normLlmAuthor, normCanon);
          if (conf > maxAuthorMatch) maxAuthorMatch = conf;
          
          // Compare against individual parts (e.g., last name)
          const canonParts = canonAuthor.split(' ');
          for (const part of canonParts) {
             const normPart = normalizeString(part);
             if (normPart.length > 0) {
                const partConf = levenshteinConfidence(normLlmAuthor, normPart);
                if (partConf > maxAuthorMatch) maxAuthorMatch = partConf;
             }
          }
        }
      }
      authorConf = maxAuthorMatch;
    } else if (llmAuthors.length === 0) {
      authorConf = 1.0; // Don't penalize if no authors provided by LLM
    }

    return (titleConf * 0.8) + (authorConf * 0.2);
  }

  /**
   * Verifies an LLM's citation claim against the OpenAlex canonical database.
   * Returns the canonical VerifiedCitation if confidence > 85%, else null (hallucination).
   */
  public async verifyCitationClaim(llmTitle: string, llmAuthors: string[] = []): Promise<VerifiedCitation | null> {
    // 1. Construct a targeted search query
    const primaryAuthor = llmAuthors.length > 0 ? ` ${llmAuthors[0]}` : '';
    const query = `${llmTitle}${primaryAuthor}`.trim();
    
    if (query.length === 0) return null;

    // 2. Fetch candidates (auto-cached)
    const candidates = await fetchFromOpenAlex(query);
    if (candidates.length === 0) {
      return null;
    }

    // 3. Score all candidates to find the best mathematical match
    let bestCandidate: VerifiedCitation | null = null;
    let highestScore = 0;

    for (const candidate of candidates) {
      const score = this.calculateMatchScore(candidate, llmTitle, llmAuthors);
      if (score > highestScore) {
        highestScore = score;
        bestCandidate = candidate;
      }
    }

    // 4. Threshold Evaluation
    if (highestScore >= this.CONFIDENCE_THRESHOLD && bestCandidate !== null) {
      return bestCandidate;
    }

    return null; // Confidence too low, classify as hallucination
  }
}