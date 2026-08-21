import { ProviderRateLimiter } from './rate-limiter';
import { useReciteStore } from '../lib/store';
import { saveCitationMetadata, getCitationMetadata } from './indexed-db';

export interface ValidationResult {
  title?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  venue?: string;
  citationCount?: number;
  provider: 'crossref' | 'semanticscholar' | 'openalex';
}

const metadataCache = new Map<string, ValidationResult>();

// Define rate limiters (maxRPM, maxTPM - we use large maxTPM since we don't track tokens)
const crossrefLimiter = new ProviderRateLimiter(30, 999999);
const semanticScholarLimiter = new ProviderRateLimiter(100, 999999); // Assuming key is present. If no key, we might hit 429s but it will fallback.
const openAlexLimiter = new ProviderRateLimiter(600, 999999);

async function withExponentialBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= maxRetries) {
        throw error;
      }
      
      const status = error.status;
      // If it's not a rate limit (429) or server error (5xx), we shouldn't back off.
      // E.g. a 404 means the citation isn't found.
      if (status && status !== 429 && status < 500) {
        throw error;
      }

      let waitMs = 0;
      const retryAfter = error.retryAfter; // Assuming custom error or parsed headers
      
      if (retryAfter && !isNaN(parseInt(retryAfter, 10))) {
        waitMs = parseInt(retryAfter, 10) * 1000;
      } else {
        const jitter = Math.random() * 500;
        waitMs = Math.pow(2, attempt) * 1000 + jitter;
      }

      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt++;
    }
  }
}

async function doFetchCrossref(query: string): Promise<ValidationResult> {
  await crossrefLimiter.acquire(1);

  const adminEmail = process.env.NEXT_PUBLIC_RECITE_ADMIN_EMAIL || 'admin@recite.ai';
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&select=title,author,issued,DOI,container-title,is-referenced-by-count&rows=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': `ReciteAI/1.0 (mailto:${adminEmail})`
    }
  });

  if (!response.ok) {
    const error: any = new Error(`Crossref API failed with status: ${response.status}`);
    error.status = response.status;
    error.retryAfter = response.headers.get('Retry-After');
    throw error;
  }

  const data = await response.json();
  const items = data?.message?.items;
  
  if (!items || items.length === 0) {
    throw new Error('No results found from Crossref');
  }

  const item = items[0];
  const year = item.issued?.['date-parts']?.[0]?.[0];
  const authors = item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || [];

  return {
    title: item.title?.[0],
    authors,
    year,
    doi: item.DOI,
    venue: item['container-title']?.[0],
    citationCount: item['is-referenced-by-count'],
    provider: 'crossref'
  };
}

async function fetchCrossref(query: string): Promise<ValidationResult> {
  return withExponentialBackoff(() => doFetchCrossref(query));
}

async function doFetchSemanticScholar(query: string): Promise<ValidationResult> {
  await semanticScholarLimiter.acquire(1);

  const key = useReciteStore.getState().semanticScholarKey;
  const headers: Record<string, string> = {};
  if (key) {
    headers['x-api-key'] = key;
  }

  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=1&fields=title,authors,year,externalIds,venue,citationCount`;
  
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error: any = new Error(`Semantic Scholar API failed with status: ${response.status}`);
    error.status = response.status;
    error.retryAfter = response.headers.get('Retry-After');
    throw error;
  }

  const data = await response.json();
  const items = data?.data;

  if (!items || items.length === 0) {
    throw new Error('No results found from Semantic Scholar');
  }

  const item = items[0];
  const authors = item.authors?.map((a: any) => a.name) || [];

  return {
    title: item.title,
    authors,
    year: item.year,
    doi: item.externalIds?.DOI,
    venue: item.venue,
    citationCount: item.citationCount,
    provider: 'semanticscholar'
  };
}

async function fetchSemanticScholar(query: string): Promise<ValidationResult> {
  return withExponentialBackoff(() => doFetchSemanticScholar(query));
}

async function doFetchOpenAlex(query: string): Promise<ValidationResult> {
  await openAlexLimiter.acquire(1);

  const adminEmail = process.env.NEXT_PUBLIC_RECITE_ADMIN_EMAIL || 'admin@recite.ai';
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&select=title,authorships,publication_year,doi,primary_location,cited_by_count&per-page=1&mailto=${adminEmail}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    const error: any = new Error(`OpenAlex API failed with status: ${response.status}`);
    error.status = response.status;
    error.retryAfter = response.headers.get('Retry-After');
    throw error;
  }

  const data = await response.json();
  const items = data?.results;

  if (!items || items.length === 0) {
    throw new Error('No results found from OpenAlex');
  }

  const item = items[0];
  const authors = item.authorships?.map((a: any) => a.author?.display_name) || [];
  const doi = item.doi ? item.doi.replace('https://doi.org/', '') : undefined;
  const venue = item.primary_location?.source?.display_name;

  return {
    title: item.title,
    authors,
    year: item.publication_year,
    doi,
    venue,
    citationCount: item.cited_by_count,
    provider: 'openalex'
  };
}

async function fetchOpenAlex(query: string): Promise<ValidationResult> {
  return withExponentialBackoff(() => doFetchOpenAlex(query));
}

export async function validateCitation(query: string): Promise<ValidationResult> {
  const cacheKey = query.trim().toLowerCase();
  
  // Level 0: Check RAM Cache
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  // Level 1: Check Disk (IndexedDB)
  const cachedDbResult = await getCitationMetadata(cacheKey);
  if (cachedDbResult) {
    metadataCache.set(cacheKey, cachedDbResult);
    return cachedDbResult;
  }

  // Level 2: Execute Federated Cascade
  let result: ValidationResult | null = null;

  try {
    result = await fetchCrossref(query);
  } catch (error) {
    console.warn('Crossref failed, falling back to Semantic Scholar:', error);
    try {
      result = await fetchSemanticScholar(query);
    } catch (error) {
      console.warn('Semantic Scholar failed, falling back to OpenAlex:', error);
      try {
        result = await fetchOpenAlex(query);
      } catch (error) {
        console.error('All validation providers failed for query:', query);
        throw new Error('Federated Validation Cascade Exhausted: All providers failed or returned 404.');
      }
    }
  }

  if (result) {
    metadataCache.set(cacheKey, result);
    // Asynchronously save to IndexedDB
    saveCitationMetadata(cacheKey, result).catch(e => console.error(e));
    return result;
  }

  throw new Error('Unexpected validation failure');
}
