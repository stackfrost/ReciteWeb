import { NextRequest, NextResponse } from 'next/server';
import { orchestratedSearch } from '@/lib/services/search-orchestrator';
import { withCache } from '@/lib/redis';
import { hashString } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '5', 10);
  
  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }
  
  try {
    // Generate a unique, safe cache key using the hashing utility we built
    const cacheKey = `search:query:${hashString(query)}:limit:${limit}`;

    // 1. Fetch from Redis Cache OR run the Orchestrated Search (S2 + OpenAlex + arXiv)
    const papers = await withCache(
      cacheKey,
      () => orchestratedSearch(query, limit),
      86400 // Cache for 24 hours
    );
    
    // 2. Dev-mode fallback: If APIs return nothing and we are testing locally
    if (papers.length === 0 && process.env.NODE_ENV === 'development') {
      console.log('[Dev Mode] APIs returned 0 results. Injecting mock papers.');
      return NextResponse.json({ 
        papers: getMockPapers(query) 
      });
    }
    
    return NextResponse.json({ papers });
    
  } catch (error) {
    console.error('[Search API Error]:', error);

    // Provide graceful degradation
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ papers: getMockPapers(query) });
    }
    
    // In production, return an empty array rather than fake data on failure
    return NextResponse.json({ papers: [] }, { status: 500 });
  }
}

/**
 * Fallback mock data strictly for local UI development when APIs fail/rate-limit
 */
function getMockPapers(query: string) {
  const cleanQuery = query.replace(/\[\[MATH_BLOCK_\d+\]\]/g, '').trim();
  
  return [
    {
      paperId: 'mock-1',
      title: `Related work on ${cleanQuery.slice(0, 30)}...`,
      year: 2023,
      authors: ['A. Smith', 'B. Johnson', 'C. Lee'],
      citationCount: 145,
      influentialCitationCount: 23,
      doi: '10.1038/s41586-023-00000-0',
      url: 'https://doi.org/10.1038/s41586-023-00000-0'
    },
    {
      paperId: 'mock-2',
      title: `Advances in ${cleanQuery.slice(0, 25)}...`,
      year: 2021,
      authors: ['D. Wang', 'E. Brown'],
      citationCount: 89,
      influentialCitationCount: 15,
      doi: '10.1126/science.abc1234',
      url: 'https://doi.org/10.1126/science.abc1234'
    },
    {
      paperId: 'mock-3',
      title: `Methodology for ${cleanQuery.slice(0, 28)}...`,
      year: 2022,
      authors: ['F. Garcia', 'G. Miller', 'H. Davis', 'I. Wilson'],
      citationCount: 234,
      influentialCitationCount: 45,
      doi: '10.1103/PhysRevLett.128.000000',
      url: 'https://doi.org/10.1103/PhysRevLett.128.000000'
    },
  ];
}