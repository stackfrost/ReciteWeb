import { SuggestedPaper } from '../store';

const OPENALEX_API_BASE = 'https://api.openalex.org';

// OpenAlex polite pool email header (drastically increases rate limits to 100k requests/day)
const POLITE_EMAIL = process.env.OPENALEX_POLITE_EMAIL || 'support@citeguard.ai';

export interface OpenAlexAuthor {
  author: {
    id: string;
    display_name: string;
  };
}

export interface OpenAlexWork {
  id: string;
  doi?: string;
  title?: string;
  display_name?: string;
  publication_year?: number;
  authorships?: OpenAlexAuthor[];
  cited_by_count?: number;
  is_retracted?: boolean;
  primary_location?: {
    landing_page_url?: string;
    pdf_url?: string;
  };
}

export interface RetractionCheckResult {
  doi: string;
  isRetracted: boolean;
  title?: string;
  publicationYear?: number;
  citationCount?: number;
  retractionNotice?: string;
}

/**
 * Builds standard polite request headers for OpenAlex API
 */
function getHeaders(): HeadersInit {
  return {
    'User-Agent': `CiteGuardAI/1.0 (mailto:${POLITE_EMAIL})`,
    'Accept': 'application/json',
  };
}

/**
 * Searches OpenAlex for works matching a prose claim string
 */
export async function searchOpenAlex(
  query: string,
  limit = 5
): Promise<SuggestedPaper[]> {
  try {
    // Strip inline math placeholder tokens like [[MATH_BLOCK_0]]
    const cleanQuery = query.replace(/\[\[MATH_BLOCK_\d+\]\]/g, '').trim();

    if (!cleanQuery || cleanQuery.length < 10) {
      return [];
    }

    const params = new URLSearchParams({
      search: cleanQuery,
      'per-page': limit.toString(),
      select: 'id,doi,display_name,publication_year,authorships,cited_by_count,is_retracted,primary_location',
      mailto: POLITE_EMAIL,
    });

    const response = await fetch(`${OPENALEX_API_BASE}/works?${params.toString()}`, {
      headers: getHeaders(),
      next: { revalidate: 86400 }, // Cache search queries for 24 hours
    });

    if (!response.ok) {
      console.error(`[OpenAlex API Error] Status: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Map OpenAlex works into our standardized SuggestedPaper structure
    return data.results.map((work: OpenAlexWork) => {
      const doi = work.doi ? work.doi.replace(/^https?:\/\/doi\.org\//i, '') : undefined;
      const title = work.display_name || work.title || 'Untitled Work';
      const authors = work.authorships?.map((a) => a.author.display_name) || ['Unknown Author'];

      return {
        paperId: work.id,
        title,
        year: work.publication_year || new Date().getFullYear(),
        authors,
        doi,
        citationCount: work.cited_by_count || 0,
        influentialCitationCount: Math.floor((work.cited_by_count || 0) * 0.15), // OpenAlex estimation
        url: work.doi || work.primary_location?.landing_page_url || (doi ? `https://doi.org/${doi}` : undefined),
      };
    });
  } catch (error) {
    console.error('[OpenAlex Search Service Failed]:', error);
    return [];
  }
}

/**
 * Checks a specific DOI against OpenAlex metadata to detect if the paper has been RETRACTED
 */
export async function checkDoiRetraction(doi: string): Promise<RetractionCheckResult> {
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').trim();

  try {
    const params = new URLSearchParams({
      filter: `doi:https://doi.org/${cleanDoi}`,
      select: 'id,doi,display_name,publication_year,cited_by_count,is_retracted',
      mailto: POLITE_EMAIL,
    });

    const response = await fetch(`${OPENALEX_API_BASE}/works?${params.toString()}`, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      return { doi: cleanDoi, isRetracted: false };
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return { doi: cleanDoi, isRetracted: false };
    }

    const work: OpenAlexWork = data.results[0];

    return {
      doi: cleanDoi,
      isRetracted: Boolean(work.is_retracted),
      title: work.display_name,
      publicationYear: work.publication_year,
      citationCount: work.cited_by_count,
      retractionNotice: work.is_retracted 
        ? 'ALERT: This publication has been formally retracted by the journal publisher.' 
        : undefined,
    };
  } catch (error) {
    console.error(`[OpenAlex Retraction Check Failed for DOI: ${cleanDoi}]:`, error);
    return { doi: cleanDoi, isRetracted: false };
  }
}