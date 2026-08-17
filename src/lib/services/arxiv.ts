import { SuggestedPaper } from '../store';

const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';

export interface ArxivPaper {
  arxivId: string;
  title: string;
  year: number;
  authors: string[];
  doi?: string;
  url: string;
  pdfUrl?: string;
  summary?: string;
}

/**
 * Clean raw text from XML/Atom fields (strips newlines, extra spaces, and LaTeX linebreaks)
 */
function cleanXmlText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Lightweight, dependency-free Atom XML parser for arXiv entry blocks
 */
function parseArxivAtomFeed(xmlText: string): ArxivPaper[] {
  const papers: ArxivPaper[] = [];

  // Match each <entry>...</entry> block in the Atom feed
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let entryMatch: RegExpExecArray | null;

  while ((entryMatch = entryRegex.exec(xmlText)) !== null) {
    const entryXml = entryMatch[1];

    // 1. Extract Title
    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : 'Untitled arXiv Preprint';
    const title = cleanXmlText(rawTitle);

    // 2. Extract Authors
    const authors: string[] = [];
    const authorRegex = /<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/gi;
    let authorMatch: RegExpExecArray | null;
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      authors.push(cleanXmlText(authorMatch[1]));
    }

    // 3. Extract Published Date & Year
    const publishedMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/i);
    const publishedStr = publishedMatch ? publishedMatch[1].trim() : '';
    const year = publishedStr ? new Date(publishedStr).getFullYear() : new Date().getFullYear();

    // 4. Extract arXiv ID and Abstract URL
    const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/i);
    const rawIdUrl = idMatch ? idMatch[1].trim() : '';
    // Extract arXiv ID string (e.g. "2304.12345v1" from "http://arxiv.org/abs/2304.12345v1")
    const arxivIdMatch = rawIdUrl.match(/abs\/([^\s\/]+)/i);
    const arxivId = arxivIdMatch ? arxivIdMatch[1] : rawIdUrl;

    // 5. Extract PDF Link
    const pdfMatch = entryXml.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/i);
    const pdfUrl = pdfMatch ? pdfMatch[1] : `https://arxiv.org/pdf/${arxivId}.pdf`;

    // 6. Extract DOI if assigned
    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/i);
    const doi = doiMatch ? cleanXmlText(doiMatch[1]) : undefined;

    // 7. Extract Summary / Abstract
    const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/i);
    const summary = summaryMatch ? cleanXmlText(summaryMatch[1]) : undefined;

    papers.push({
      arxivId,
      title,
      year,
      authors: authors.length > 0 ? authors : ['arXiv Author'],
      doi,
      url: rawIdUrl || `https://arxiv.org/abs/${arxivId}`,
      pdfUrl,
      summary,
    });
  }

  return papers;
}

/**
 * Searches arXiv for physical science preprints matching a prose claim string
 */
export async function searchArxiv(
  query: string,
  limit = 5
): Promise<SuggestedPaper[]> {
  try {
    // Strip inline math placeholder tokens like [[MATH_BLOCK_0]]
    const cleanQuery = query.replace(/\[\[MATH_BLOCK_\d+\]\]/g, '').trim();

    if (!cleanQuery || cleanQuery.length < 10) {
      return [];
    }

    // Truncate search query to first 150 characters to prevent arXiv HTTP 400 Bad Request errors
    const sanitizedQuery = encodeURIComponent(cleanQuery.slice(0, 150));

    const params = new URLSearchParams({
      search_query: `all:${sanitizedQuery}`,
      start: '0',
      max_results: limit.toString(),
      sortBy: 'relevance',
      sortOrder: 'descending',
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s Abort Timeout

    const response = await fetch(`${ARXIV_API_BASE}?${params.toString()}`, {
      signal: controller.signal,
      next: { revalidate: 86400 }, // Cache arXiv queries for 24 hours
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[arXiv API Error] Status: ${response.status}`);
      return [];
    }

    const xmlText = await response.text();
    const parsedPapers = parseArxivAtomFeed(xmlText);

    // Map arXiv papers into our standardized SuggestedPaper structure
    return parsedPapers.map((paper) => ({
      paperId: `arxiv:${paper.arxivId}`,
      title: paper.title,
      year: paper.year,
      authors: paper.authors,
      doi: paper.doi,
      citationCount: 0, // arXiv API does not track citation counts natively
      influentialCitationCount: 0,
      url: paper.url,
    }));
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('[arXiv Service Timeout]: Request took longer than 5s, degrading gracefully.');
    } else {
      console.error('[arXiv Search Service Failed]:', error);
    }
    return [];
  }
}