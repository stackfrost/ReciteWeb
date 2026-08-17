import { SuggestedPaper } from '../store';

const S2_API_BASE = 'https://api.semanticscholar.org/graph/v1';

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  year: number;
  authors: { name: string }[];
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
  };
  citationCount?: number;
  influentialCitationCount?: number;
  url?: string;
  abstract?: string;
}

interface S2SearchResponse {
  total: number;
  offset: number;
  data: SemanticScholarPaper[];
}

/**
 * Executes a fetch request with exponential backoff on HTTP 429 (Rate Limit)
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 429 && retries > 0) {
      console.warn(`[Semantic Scholar] Rate limited (429). Retrying in ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`[Semantic Scholar] Network error. Retrying in ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

/**
 * Searches Semantic Scholar for candidate papers supporting a prose claim string
 */
export async function searchSemanticScholar(
  query: string,
  limit = 5
): Promise<SuggestedPaper[]> {
  try {
    // Clean query: strip inline math placeholder tokens like [[MATH_BLOCK_0]]
    const cleanQuery = query.replace(/\[\[MATH_BLOCK_\d+\]\]/g, '').trim();

    if (!cleanQuery || cleanQuery.length < 10) {
      return [];
    }

    const params = new URLSearchParams({
      query: cleanQuery,
      limit: limit.toString(),
      fields: 'title,year,authors,externalIds,citationCount,influentialCitationCount,url,abstract',
    });

    const response = await fetchWithRetry(`${S2_API_BASE}/paper/search?${params.toString()}`);

    if (!response.ok) {
      console.error(`[Semantic Scholar API Error] Status: ${response.status}`);
      return [];
    }

    const data: S2SearchResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      return [];
    }

    // Map S2 payload into our standardized SuggestedPaper format
    return data.data.map((paper) => {
      const doi = paper.externalIds?.DOI 
        ? `10.${paper.externalIds.DOI.replace(/^10\./, '')}` 
        : undefined;

      return {
        paperId: paper.paperId,
        title: paper.title,
        year: paper.year || new Date().getFullYear(),
        authors: paper.authors?.map((a) => a.name) || ['Unknown Author'],
        doi,
        citationCount: paper.citationCount || 0,
        influentialCitationCount: paper.influentialCitationCount || 0,
        url: paper.url || (doi ? `https://doi.org/${doi}` : undefined),
      };
    });
  } catch (error) {
    console.error('[Semantic Scholar Service Failed]:', error);
    return []; // Return empty array so app degrades gracefully instead of crashing
  }
}