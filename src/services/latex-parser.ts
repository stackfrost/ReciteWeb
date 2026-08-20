export interface ExtractedClaim {
  id: string;
  sectionTitle: string;
  rawText: string;
  citations: string[];
}

export class LaTeXParser {
  /**
   * Extracts claims from a LaTeX document string.
   * This is a stub for future AST parsing logic.
   */
  static extractClaims(texContent: string): any[] {
    
    // Stub
    return [];
  }

  /**
   * Recursively resolves \input{} and \include{} macros by substituting
   * the content of the referenced files.
   */
  static resolveIncludes(mainTexContent: string, projectFiles: Record<string, any>): string {
    const includeRegex = /\\(?:input|include)\{([^}]+)\}/g;
    let resolvedText = mainTexContent;
    
    let iterations = 0;
    while (includeRegex.test(resolvedText) && iterations < 100) {
      includeRegex.lastIndex = 0;
      resolvedText = resolvedText.replace(includeRegex, (match, p1) => {
        const relativePath = p1.trim();
        const texPath = relativePath.endsWith('.tex') ? relativePath : `${relativePath}.tex`;
        
        if (projectFiles[texPath]) {
          return projectFiles[texPath].text;
        }
        
        const matchedKey = Object.keys(projectFiles).find(k => k === texPath || k.endsWith('/' + texPath));
        if (matchedKey) {
          return projectFiles[matchedKey].text;
        }
        
        console.warn(`Could not resolve include: ${p1}`);
        return `%% [Missing Include: ${p1}] %%`;
      });
      iterations++;
    }
    
    return resolvedText;
  }

  /**
   * Strips out math blocks (e.g. \[...\] or \begin{equation}...\end{equation}) 
   * to isolate the natural language text for LLM processing.
   */
  static stripMathBlocks(texContent: string): { text: string; mathBlocks: Map<string, any> } {
    
    // Stub
    return { text: texContent, mathBlocks: new Map() };
  }

  /**
   * Finds existing \cite{...} commands in the LaTeX document.
   */
  static findCitations(texContent: string): string[] {
    const citations: string[] = [];
    // Basic regex for matching \cite{...} or \citep{...}, etc.
    const citeRegex = /\\cite[p|t|al]*\{([^}]+)\}/g;
    let match;
    while ((match = citeRegex.exec(texContent)) !== null) {
      // Split multiple citations e.g. \cite{key1,key2}
      const keys = match[1].split(',').map(k => k.trim());
      citations.push(...keys);
    }
    return [...new Set(citations)];
  }

  /**
   * Finds paragraphs containing \cite{...}, \citep{...}, or \citet{...} and 
   * returns them as an array of context blocks.
   */
  static extractContextBlocks(texContent: string): string[] {
    if (!texContent) return [];
    
    // Split text into paragraphs by double newlines
    const paragraphs = texContent.split(/\n\s*\n/);
    const citeRegex = /\\cite[p|t|al]*\{([^}]+)\}/;
    
    return paragraphs
      .map(p => p.trim())
      .filter(p => citeRegex.test(p));
  }

  /**
   * Scans a LaTeX document and extracts paragraphs with their structural context.
   */
  static scanDocument(texContent: string): ExtractedClaim[] {
    if (!texContent) return [];
    
    const claims: ExtractedClaim[] = [];
    let currentSection = 'Introduction';
    
    // Split text into paragraphs by double newlines
    const paragraphs = texContent.split(/\n\s*\n/);
    const citeRegexGlobal = /\\cite[p|t|al]*\{([^}]+)\}/g;
    const sectionRegex = /\\section\{([^}]+)\}/;

    let claimCounter = 1;

    for (const paragraph of paragraphs) {
      const p = paragraph.trim();
      if (!p) continue;

      // Update current section if found
      const sectionMatch = sectionRegex.exec(p);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
      }

      // Check for citations
      let match;
      const paragraphCitations: string[] = [];
      
      // Reset regex index
      citeRegexGlobal.lastIndex = 0;
      while ((match = citeRegexGlobal.exec(p)) !== null) {
        const keys = match[1].split(',').map(k => k.trim());
        paragraphCitations.push(...keys);
      }

      if (paragraphCitations.length > 0) {
        claims.push({
          id: `claim-ast-${claimCounter++}`,
          sectionTitle: currentSection,
          rawText: p,
          citations: [...new Set(paragraphCitations)]
        });
      }
    }
    
    return claims;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § MULTI-CALL CHUNKING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

import type { BibTeXEntry } from './bibtex-parser';

/**
 * Evenly divides an array of claims into at most `maxChunks` sub-arrays.
 * If there are fewer claims than maxChunks, the number of chunks equals
 * the number of claims (one per chunk). Empty input returns [].
 */
export function chunkClaims(
  claims: ExtractedClaim[],
  maxChunks: number = 4
): ExtractedClaim[][] {
  if (!claims || claims.length === 0) return [];

  const numChunks = Math.min(maxChunks, claims.length);
  const chunks: ExtractedClaim[][] = Array.from({ length: numChunks }, () => []);

  // Round-robin distribution keeps chunks balanced within ±1
  for (let i = 0; i < claims.length; i++) {
    chunks[i % numChunks].push(claims[i]);
  }

  return chunks;
}

/**
 * Given a chunk of claims and the full BibTeX map, returns a new Map
 * containing only the entries actually cited in that chunk.
 * This dramatically reduces token count per API call.
 */
export function pruneBibTeXForChunk(
  chunk: ExtractedClaim[],
  fullBib: Map<string, BibTeXEntry>
): Map<string, BibTeXEntry> {
  const pruned = new Map<string, BibTeXEntry>();

  for (const claim of chunk) {
    for (const citeKey of claim.citations) {
      if (fullBib.has(citeKey) && !pruned.has(citeKey)) {
        pruned.set(citeKey, fullBib.get(citeKey)!);
      }
    }
  }

  return pruned;
}
