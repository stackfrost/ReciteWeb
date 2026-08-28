/**
 * src/workers/wasm-parser.worker.ts
 *
 * Dedicated Web Worker for zero-UI-lock spatial and AST document parsing.
 * Implements client-side tier gating:
 *   - FREE tier: Truncates PDF/manuscript to pages[0..5], max 6 claims.
 *   - PRO/LAB tier: Full document processing, up to 50 claims.
 *
 * Extracts citation-bearing sentences:
 *   - LaTeX: \cite{...}, \citep{...}, \citet{...}
 *   - Bracketed Numbers: [1], [1-5], [1, 2]
 *   - Author-Year: (Author et al., 2024), (Smith, 2023)
 */

export interface ExtractedWasmClaim {
  id: string;
  claimSentence: string;
  citationKey: string;
  line: number;
  column: number;
  context: string;
  claimHash?: string;
  page?: number;
}

export interface WasmParserRequest {
  id: string;
  content: string | ArrayBuffer;
  format: 'latex' | 'typst' | 'markdown' | 'docx' | 'pdf';
  licenseStatus?: string; // 'FREE' | 'PRO' | 'ANNUAL_PRO' | 'LAB'
  filename?: string;
}

export interface WasmParserResponse {
  id: string;
  success: boolean;
  claims: ExtractedWasmClaim[];
  totalClaimsFound: number;
  isTruncated: boolean;
  totalPagesProcessed: number;
  parseTimeMs: number;
  error?: string;
}

// ─── Citation-Bearing Sentence Regexes ─────────────────────────────────────────
const LATEX_CITE_REGEX = /\\cite(?:[a-zA-Z*]*)?\{([^}]+)\}/g;
const NUMERIC_CITE_REGEX = /\[([0-9]+(?:[\s,-]+[0-9]+)*)\]/g;
const AUTHOR_YEAR_REGEX = /\(([A-Z][a-zA-Z\s.-]+(?:et\s+al\.)?,\s*(?:19|20)\d{2}[a-z]?)\)/g;

/**
 * Splits text into lines and extracts citation-bearing sentences.
 */
function extractCitationSentences(
  rawText: string,
  maxClaims: number,
  maxPages: number
): { claims: ExtractedWasmClaim[]; totalFound: number; isTruncated: boolean; pagesProcessed: number } {
  // Rough page boundary detection (either Form Feed \f, explicit \newpage / \pagebreak, or ~350 words per page)
  const pageDelimiters = rawText.split(/(?:\f|\\newpage|\\pagebreak)/);
  const totalPages = Math.max(1, pageDelimiters.length > 1 ? pageDelimiters.length : Math.ceil(rawText.split(/\s+/).length / 350));
  const pagesProcessed = Math.min(totalPages, maxPages);

  // If Free tier, truncate content to first maxPages
  let processedText = rawText;
  let isTruncated = totalPages > maxPages;

  if (pageDelimiters.length > 1 && totalPages > maxPages) {
    processedText = pageDelimiters.slice(0, maxPages).join('\n');
  } else if (totalPages > maxPages) {
    const lines = rawText.split('\n');
    const linesPerPage = Math.ceil(lines.length / totalPages);
    processedText = lines.slice(0, linesPerPage * maxPages).join('\n');
  }

  const lines = processedText.split('\n');
  const claims: ExtractedWasmClaim[] = [];
  let totalFound = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx];
    if (!lineText.trim() || lineText.trim().startsWith('%')) continue;

    // 1. Check LaTeX \cite{...}
    let match: RegExpExecArray | null;
    LATEX_CITE_REGEX.lastIndex = 0;
    while ((match = LATEX_CITE_REGEX.exec(lineText)) !== null) {
      totalFound++;
      if (claims.length < maxClaims) {
        const rawKeys = match[1].split(',');
        const firstKey = rawKeys[0].trim();
        claims.push({
          id: `claim_${lineIdx + 1}_${match.index}`,
          claimSentence: lineText.trim(),
          citationKey: firstKey,
          line: lineIdx + 1,
          column: match.index,
          context: lineText,
          page: Math.min(pagesProcessed, Math.floor((lineIdx / lines.length) * pagesProcessed) + 1),
        });
      }
    }

    // 2. Check Numeric [1], [1-3]
    NUMERIC_CITE_REGEX.lastIndex = 0;
    while ((match = NUMERIC_CITE_REGEX.exec(lineText)) !== null) {
      totalFound++;
      if (claims.length < maxClaims) {
        claims.push({
          id: `claim_num_${lineIdx + 1}_${match.index}`,
          claimSentence: lineText.trim(),
          citationKey: `ref_${match[1]}`,
          line: lineIdx + 1,
          column: match.index,
          context: lineText,
          page: Math.min(pagesProcessed, Math.floor((lineIdx / lines.length) * pagesProcessed) + 1),
        });
      }
    }

    // 3. Check Author-Year (Smith et al., 2024)
    AUTHOR_YEAR_REGEX.lastIndex = 0;
    while ((match = AUTHOR_YEAR_REGEX.exec(lineText)) !== null) {
      totalFound++;
      if (claims.length < maxClaims) {
        claims.push({
          id: `claim_ay_${lineIdx + 1}_${match.index}`,
          claimSentence: lineText.trim(),
          citationKey: match[1].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          line: lineIdx + 1,
          column: match.index,
          context: lineText,
          page: Math.min(pagesProcessed, Math.floor((lineIdx / lines.length) * pagesProcessed) + 1),
        });
      }
    }
  }

  if (totalFound > claims.length) {
    isTruncated = true;
  }

  return { claims, totalFound, isTruncated, pagesProcessed };
}

// ─── Worker Event Listener ───────────────────────────────────────────────────

self.addEventListener('message', async (event: MessageEvent<WasmParserRequest>) => {
  const { id, content, format, licenseStatus } = event.data;
  const startTime = performance.now();

  try {
    const isPro = licenseStatus === 'PRO' || licenseStatus === 'ANNUAL_PRO' || licenseStatus === 'LAB';
    const maxPages = isPro ? 100 : 5; // Free tier capped at 5 pages
    const maxClaims = isPro ? 50 : 6;  // Free tier capped at 6 claims

    let rawString = '';
    if (typeof content === 'string') {
      rawString = content;
    } else if (content instanceof ArrayBuffer) {
      const decoder = new TextDecoder('utf-8');
      rawString = decoder.decode(content);
    }

    const { claims, totalFound, isTruncated, pagesProcessed } = extractCitationSentences(
      rawString,
      maxClaims,
      maxPages
    );

    const parseTimeMs = +(performance.now() - startTime).toFixed(2);

    self.postMessage({
      id,
      success: true,
      claims,
      totalClaimsFound: totalFound,
      isTruncated,
      totalPagesProcessed: pagesProcessed,
      parseTimeMs,
    } as WasmParserResponse);
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      claims: [],
      totalClaimsFound: 0,
      isTruncated: false,
      totalPagesProcessed: 0,
      parseTimeMs: +(performance.now() - startTime).toFixed(2),
      error: err.message || 'WASM parsing error',
    } as WasmParserResponse);
  }
});
