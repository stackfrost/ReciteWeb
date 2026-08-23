export interface CrossrefResult {
  doi: string;
  title: string;
  authors: string[];
  year: string;
  raw: any;
}

export async function fetchLiteratureRecommendations(query: string): Promise<CrossrefResult[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&select=DOI,title,author,issued,type&rows=3`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ReciteAI/1.0 (mailto:admin@recite.ai)'
    }
  });

  if (response.status === 429) throw new Error('RATE_LIMITED');
  if (!response.ok) throw new Error('API_ERROR');
  
  const data = await response.json();
  return (data.message?.items || []).map((item: any) => ({
    doi: item.DOI || '',
    title: item.title?.[0] || 'Unknown Title',
    authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean) || ['Unknown Author'],
    year: item.issued?.['date-parts']?.[0]?.[0]?.toString() || 'Unknown Year',
    raw: item
  }));
}

export async function fetchOfficialBibtex(doi: string): Promise<string | null> {
  if (!doi) return null;
  try {
    const response = await fetch(`https://doi.org/${doi}`, {
      headers: {
        'Accept': 'application/x-bibtex',
        'User-Agent': 'ReciteAI/1.0'
      }
    });
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error(`[DOI Negotiation] Failed for ${doi}:`, error);
    return null;
  }
}
