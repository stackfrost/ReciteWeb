import { SuggestedPaper } from '../store';
import { searchSemanticScholar } from './semantic-scholar';
import { searchOpenAlex } from './openalex';
import { searchArxiv } from './arxiv';

/**
 * Normalizes a DOI string for accurate deduplication comparison.
 * Extracts just the "10.XXXX/..." portion.
 */
function normalizeDoi(doi?: string): string | undefined {
  if (!doi) return undefined;
  const match = doi.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  return match ? match[0].toLowerCase() : undefined;
}

/**
 * Normalizes a title for deduplication comparison by stripping
 * all non-alphanumeric characters and lowercasing.
 */
function normalizeTitle(title?: string): string {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Orchestrates a unified search across multiple scientific graph providers.
 * Executes concurrently, deduplicates results, and degrades gracefully.
 */
export async function orchestratedSearch(
  query: string,
  limit = 5
): Promise<SuggestedPaper[]> {
  // 1. Fire all API requests concurrently
  // Using allSettled guarantees one failing API doesn't crash the whole search.
  const results = await Promise.allSettled([
    searchSemanticScholar(query, limit),
    searchOpenAlex(query, limit),
    searchArxiv(query, limit),
  ]);

  // Extract successful responses, defaulting to empty arrays for failed ones
  const s2Papers = results[0].status === 'fulfilled' ? results[0].value : [];
  const oaPapers = results[1].status === 'fulfilled' ? results[1].value : [];
  const arxivPapers = results[2].status === 'fulfilled' ? results[2].value : [];

  const mergedResults: SuggestedPaper[] = [];
  const seenDois = new Set<string>();
  const seenTitles = new Set<string>();

  // 2. Helper function to safely add unique papers
  const addPaperIfUnique = (paper: SuggestedPaper) => {
    const cleanDoi = normalizeDoi(paper.doi);
    const cleanTitle = normalizeTitle(paper.title);

    // If it has a DOI we've seen, skip it
    if (cleanDoi && seenDois.has(cleanDoi)) return;
    
    // If it has a title we've seen (catching preprints vs published), skip it
    if (cleanTitle && seenTitles.has(cleanTitle)) return;

    // Track it as seen
    if (cleanDoi) seenDois.add(cleanDoi);
    if (cleanTitle) seenTitles.add(cleanTitle);

    mergedResults.push(paper);
  };

  // 3. Merge Strategy: Interleave results to ensure provider diversity,
  // but prioritize Semantic Scholar since it possesses the `influentialCitationCount`.
  
  const maxLoops = Math.max(s2Papers.length, oaPapers.length, arxivPapers.length);

  for (let i = 0; i < maxLoops; i++) {
    if (mergedResults.length >= limit) break; // Stop early if we hit the limit

    if (i < s2Papers.length) addPaperIfUnique(s2Papers[i]);
    
    if (mergedResults.length >= limit) break;
    
    if (i < oaPapers.length) addPaperIfUnique(oaPapers[i]);
    
    if (mergedResults.length >= limit) break;
    
    if (i < arxivPapers.length) addPaperIfUnique(arxivPapers[i]);
  }

  // 4. Return exactly the number of requested papers
  return mergedResults.slice(0, limit);
}