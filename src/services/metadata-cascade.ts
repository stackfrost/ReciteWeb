import { ProviderRateLimiter } from './rate-limiter';
import { useReciteStore } from '../lib/store';
import { saveCitationMetadata, getCitationMetadata } from './indexed-db';

export interface ValidationResult {
  query: string;
  status: 'verified' | 'unresolved' | 'retracted' | 'error';
  verified: boolean;
  doi?: string;
  title?: string;
  authors?: string[];
  journal?: string;
  venue?: string;
  year?: number;
  citationCount?: number;
  isRetracted?: boolean;
  retractionUrl?: string;
  publishedVersion?: {
    doi: string;
    journal: string;
    year: number;
  };
  primarySource?: 'cache' | 'crossref' | 'openalex' | 'semantic_scholar' | 'semanticscholar';
  message?: string;
  rawResponse?: unknown;
  provider?: 'crossref' | 'semanticscholar' | 'openalex';
  lastAccessed?: number;
}

const metadataCache = new Map<string, ValidationResult>();

const crossrefLimiter = new ProviderRateLimiter(30, 999999);
const semanticScholarLimiter = new ProviderRateLimiter(100, 999999);
const openAlexLimiter = new ProviderRateLimiter(600, 999999);

/**
 * Validates a citation key/query across local cache and external providers.
 * Guaranteed to NEVER throw fatal exceptions — returns graceful 'unresolved' states.
 */
export async function validateCitation(queryKey: string): Promise<ValidationResult> {
  const normalizedKey = queryKey.trim();
  if (!normalizedKey) {
    return {
      query: queryKey,
      status: 'unresolved',
      verified: false,
      message: 'Empty citation key provided.',
    };
  }

  const cacheKey = normalizedKey.toLowerCase();

  // 1. Check RAM Cache
  if (metadataCache.has(cacheKey)) {
    const cached = metadataCache.get(cacheKey)!;
    cached.lastAccessed = Date.now();
    return cached;
  }

  // 1b. Check Disk (IndexedDB)
  try {
    const cachedDbResult = await getCitationMetadata(cacheKey);
    if (cachedDbResult) {
      cachedDbResult.lastAccessed = Date.now();
      metadataCache.set(cacheKey, cachedDbResult);
      saveCitationMetadata(cacheKey, cachedDbResult).catch(e => console.error(e));
      return cachedDbResult;
    }
  } catch {
    // Ignore IndexedDB read errors
  }

  // 2. Fail-Fast Check for Raw Slugs / Internal Keys
  // If the query is a single token without spaces, colons, or standard DOI prefix (10.),
  // it is likely an internal bib key (e.g. "Prada2020") missing its .bib definition.
  const isLikelyRawSlug = !normalizedKey.includes(' ') && 
                          !normalizedKey.includes('/') && 
                          !normalizedKey.startsWith('10.');

  // If it's a raw slug, limit timeout to 1200ms and allow 0 retries
  const maxRetries = isLikelyRawSlug ? 0 : 1;
  const timeoutMs = isLikelyRawSlug ? 1200 : 3500;

  try {
    // 3. Attempt cascade waterfall with strict timeout
    const result = await Promise.race([
      executeProviderCascade(normalizedKey, maxRetries),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Cascade timeout exceeded')), timeoutMs)
      ),
    ]);

    if (result) {
      result.lastAccessed = Date.now();
      metadataCache.set(cacheKey, result);
      saveCitationMetadata(cacheKey, result).catch(e => console.error(e));
      return result;
    }
  } catch {
    // Network or timeout failure — fallback gracefully
  }

  // 4. Return graceful unresolved diagnostic object instead of throwing
  const fallbackResult: ValidationResult = {
    query: normalizedKey,
    status: 'unresolved',
    verified: false,
    message: isLikelyRawSlug
      ? `Citation key '${normalizedKey}' not resolved. (Missing definition in .bib?)`
      : `No matching record found across Crossref, OpenAlex, or Semantic Scholar.`,
  };

  metadataCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Executes polite-pool requests through Crossref -> Semantic Scholar -> OpenAlex
 */
async function executeProviderCascade(query: string, retries: number): Promise<ValidationResult | null> {
  try {
    const crossrefResult = await queryCrossref(query, retries);
    if (crossrefResult) return crossrefResult;
  } catch {
    // Fallthrough
  }

  try {
    const semanticScholarResult = await querySemanticScholar(query, retries);
    if (semanticScholarResult) return semanticScholarResult;
  } catch {
    // Fallthrough
  }

  try {
    const openAlexResult = await queryOpenAlex(query, retries);
    if (openAlexResult) return openAlexResult;
  } catch {
    // Fallthrough
  }

  return null;
}

async function queryCrossref(query: string, _retries: number): Promise<ValidationResult | null> {
  await crossrefLimiter.acquire(1);

  const adminEmail = process.env.NEXT_PUBLIC_RECITE_ADMIN_EMAIL || 'admin@recite.ai';
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=1&mailto=${encodeURIComponent(adminEmail)}`;
  
  const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) return null;

  const data = await res.json();
  const item = data.message?.items?.[0];
  if (!item) return null;

  return {
    query,
    status: 'verified',
    verified: true,
    doi: item.DOI,
    title: Array.isArray(item.title) ? item.title[0] : item.title,
    authors: item.author?.map((a: { given?: string; family?: string }) => `${a.given || ''} ${a.family || ''}`.trim()),
    journal: Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'],
    venue: Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'],
    year: item.issued?.['date-parts']?.[0]?.[0],
    citationCount: item['is-referenced-by-count'],
    primarySource: 'crossref',
    provider: 'crossref',
  };
}

async function querySemanticScholar(query: string, _retries: number): Promise<ValidationResult | null> {
  await semanticScholarLimiter.acquire(1);

  const key = useReciteStore.getState().semanticScholarKey;
  const headers: Record<string, string> = {};
  if (key) {
    headers['x-api-key'] = key;
  }

  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=1&fields=title,authors,year,externalIds,venue,citationCount`;
  
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(2000) });
  if (!response.ok) return null;

  const data = await response.json();
  const items = data?.data;
  if (!items || items.length === 0) return null;

  const item = items[0];
  
  return {
    query,
    status: 'verified',
    verified: true,
    title: item.title,
    authors: item.authors?.map((a: any) => a.name) || [],
    year: item.year,
    doi: item.externalIds?.DOI,
    venue: item.venue,
    journal: item.venue,
    citationCount: item.citationCount,
    primarySource: 'semanticscholar',
    provider: 'semanticscholar',
  };
}

async function queryOpenAlex(query: string, _retries: number): Promise<ValidationResult | null> {
  await openAlexLimiter.acquire(1);

  const adminEmail = process.env.NEXT_PUBLIC_RECITE_ADMIN_EMAIL || 'admin@recite.ai';
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=1&mailto=${encodeURIComponent(adminEmail)}`;
  
  const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!res.ok) return null;

  const data = await res.json();
  const item = data.results?.[0];
  if (!item) return null;

  return {
    query,
    status: 'verified',
    verified: true,
    doi: item.doi ? item.doi.replace('https://doi.org/', '') : undefined,
    title: item.display_name || item.title,
    authors: item.authorships?.map((a: { author?: { display_name?: string } }) => a.author?.display_name || ''),
    journal: item.primary_location?.source?.display_name,
    venue: item.primary_location?.source?.display_name,
    year: item.publication_year,
    citationCount: item.cited_by_count,
    primarySource: 'openalex',
    provider: 'openalex',
  };
}
