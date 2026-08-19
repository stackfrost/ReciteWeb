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
    console.log('[LaTeXParser] Extracting claims...');
    // Stub
    return [];
  }

  /**
   * Strips out math blocks (e.g. \[...\] or \begin{equation}...\end{equation}) 
   * to isolate the natural language text for LLM processing.
   */
  static stripMathBlocks(texContent: string): { text: string; mathBlocks: Map<string, any> } {
    console.log('[LaTeXParser] Stripping math blocks...');
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
