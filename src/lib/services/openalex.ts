export interface VerifiedCitation {
  id: string; // e.g., 'W2122143123'
  doi?: string;
  title: string;
  authors: string[];
  publicationYear: number;
  venue: string;
}

export interface ICitationCache {
  get(query: string): VerifiedCitation[] | undefined;
  set(query: string, data: VerifiedCitation[]): void;
}

/**
 * In-memory Least Recently Used Cache.
 * Built strictly for isomorphic environments (Tauri/Next.js).
 */
export class LRUCache implements ICitationCache {
  private cache = new Map<string, VerifiedCitation[]>();
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  public get(query: string): VerifiedCitation[] | undefined {
    if (!this.cache.has(query)) return undefined;
    
    // Move to end of Map to mark as most recently used
    const data = this.cache.get(query)!;
    this.cache.delete(query);
    this.cache.set(query, data);
    return data;
  }

  public set(query: string, data: VerifiedCitation[]): void {
    if (this.cache.has(query)) {
      this.cache.delete(query);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first item in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(query, data);
  }
  
  public clear(): void {
    this.cache.clear();
  }
}

// Global cache instance to persist across requests in a single runtime
export const citationCache = new LRUCache();

/**
 * Strictly queries the OpenAlex API and normalizes the results into VerifiedCitation.
 * Employs aggressive local caching to bypass redundant network latency.
 */
export async function fetchFromOpenAlex(query: string): Promise<VerifiedCitation[]> {
  const cached = citationCache.get(query);
  if (cached) {
    return cached;
  }

  const endpoint = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&mailto=hello@reciteai.com`;
  
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAlex API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (data.results || []).map((work: any) => {
      // Extract ID suffix (e.g. https://openalex.org/W1234 -> W1234)
      const id = typeof work.id === 'string' ? work.id.replace('https://openalex.org/', '') : 'unknown';
      const doi = typeof work.doi === 'string' ? work.doi : undefined;
      const title = typeof work.title === 'string' ? work.title : 'Untitled';
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authors = Array.isArray(work.authorships) 
        ? work.authorships
            .map((a: any) => a.author?.display_name)
            .filter((name: unknown) => typeof name === 'string')
        : [];
        
      const publicationYear = typeof work.publication_year === 'number' ? work.publication_year : 0;
      
      let venue = 'Unknown Venue';
      if (work.primary_location?.source?.display_name) {
        venue = work.primary_location.source.display_name;
      }

      return {
        id,
        doi,
        title,
        authors,
        publicationYear,
        venue
      } as VerifiedCitation;
    });

    citationCache.set(query, results);
    return results;
  } catch (error) {
    console.error('Failed to fetch from OpenAlex:', error);
    return [];
  }
}