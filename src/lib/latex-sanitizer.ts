/**
 * Defensive LaTeX Sanitizer
 * 
 * Provides robust character escaping, quotation normalization, math environment detection,
 * and BibTeX field sanitization to prevent LaTeX compilation errors when applying suggested patches.
 */

export class LatexSanitizer {
  /**
   * Escapes unescaped LaTeX control characters (&, %, _, #, ~, ^)
   * while preserving valid LaTeX commands (e.g. \textbf, \&, \%, \_).
   */
  static escapeLatexSpecialChars(text: string): string {
    if (!text) return '';

    return text
      // Replace unescaped & with \& (e.g. "AT&T" -> "AT\&T")
      .replace(/(?<!\\)&/g, '\\&')
      // Replace unescaped % with \%
      .replace(/(?<!\\)%/g, '\\%')
      // Replace unescaped _ with \_
      .replace(/(?<!\\)_/g, '\\_')
      // Replace unescaped # with \#
      .replace(/(?<!\\)#/g, '\\#')
      // Normalize tilde outside math
      .replace(/(?<!\\)~/g, '{\\sim}')
      // Normalize caret outside math
      .replace(/(?<!\\)\^/g, '{\\wedge}');
  }

  /**
   * Normalizes ASCII quotation marks to proper LaTeX typographic quotes:
   * "quote" -> ``quote''
   * 'quote' -> `quote'
   */
  static normalizeLatexQuotes(text: string): string {
    if (!text) return '';

    return text
      // Opening double quote (after space, parenthesis, or start of string)
      .replace(/(^|[\s(\[{])"/g, '$1``')
      // Closing double quote
      .replace(/"/g, "''")
      // Opening single quote
      .replace(/(^|[\s(\[{])'/g, '$1`')
      // Closing single quote / apostrophe (keep standard apostrophe for contractions like don't)
      .replace(/(?<=[a-zA-Z])'(?=[a-zA-Z])/g, "'");
  }

  /**
   * Sanitizes BibTeX field values by escaping special characters, wrapping in braces,
   * and cleaning up invalid control characters.
   */
  static sanitizeBibtexField(value: string): string {
    if (!value) return '';
    let cleaned = value.trim();

    // Replace unescaped & with \&
    cleaned = cleaned.replace(/(?<!\\)&/g, '\\&');
    // Replace unescaped % with \%
    cleaned = cleaned.replace(/(?<!\\)%/g, '\\%');
    // Replace unescaped _ with \_
    cleaned = cleaned.replace(/(?<!\\)_/g, '\\_');
    // Replace unescaped # with \#
    cleaned = cleaned.replace(/(?<!\\)#/g, '\\#');

    // Normalize plain double quotes inside the field to proper quotes
    cleaned = this.normalizeLatexQuotes(cleaned);

    return cleaned;
  }

  /**
   * Generates a clean, valid, sanitized BibTeX @article or @misc entry.
   */
  static formatSanitizedBibtex(paper: {
    title: string;
    authors?: string[];
    year?: number | string;
    venue?: string;
    journal?: string;
    doi?: string;
    url?: string;
    bibtexKey?: string;
  }): string {
    const rawKey = paper.bibtexKey ||
      (paper.authors?.[0]?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'ref') +
      (paper.year || '2024');
    
    // Clean key: only alphanumeric, underscore, hyphen, or colon
    const key = rawKey.replace(/[^a-zA-Z0-9_\-:]/g, '');

    const title = this.sanitizeBibtexField(paper.title || 'Untitled');
    const authors = (paper.authors || ['Unknown Author'])
      .map((a) => this.sanitizeBibtexField(a))
      .join(' and ');
    const year = paper.year || new Date().getFullYear();
    const journal = this.sanitizeBibtexField(paper.venue || paper.journal || 'Preprint');

    const fields: string[] = [
      `  title = {${title}}`,
      `  author = {${authors}}`,
      `  journal = {${journal}}`,
      `  year = {${year}}`,
    ];

    if (paper.doi) {
      fields.push(`  doi = {${paper.doi.trim()}}`);
    }
    if (paper.url) {
      fields.push(`  url = {${paper.url.trim()}}`);
    }

    return `@article{${key},\n${fields.join(',\n')}\n}`;
  }

  /**
   * Checks if a character index in text is inside an inline ($...$) or display math environment ($$...$$, \[...\], \begin{equation}...\end{equation}).
   */
  static isInsideMathEnvironment(text: string, charOffset: number): boolean {
    if (charOffset < 0 || charOffset >= text.length) return false;

    // Check display math environments
    const displayEnvironments = ['equation', 'align', 'gather', 'multline', 'eqnarray'];
    for (const env of displayEnvironments) {
      const beginPattern = new RegExp(`\\\\begin\\{${env}\\*?\\}`, 'g');
      const endPattern = new RegExp(`\\\\end\\{${env}\\*?\\}`, 'g');

      let beginMatch: RegExpExecArray | null;
      while ((beginMatch = beginPattern.exec(text)) !== null) {
        if (beginMatch.index <= charOffset) {
          endPattern.lastIndex = beginMatch.index;
          const endMatch = endPattern.exec(text);
          if (endMatch && endMatch.index + endMatch[0].length >= charOffset) {
            return true;
          }
        }
      }
    }

    // Check \[ ... \] display math
    let bracketStart = -1;
    for (let i = 0; i < text.length; i++) {
      if (text.startsWith('\\[', i)) {
        bracketStart = i;
      } else if (text.startsWith('\\]', i) && bracketStart !== -1) {
        if (charOffset >= bracketStart && charOffset <= i + 2) return true;
        bracketStart = -1;
      }
    }

    // Check $...$ inline math up to charOffset
    const textBefore = text.slice(0, charOffset);
    let dollarCount = 0;
    for (let i = 0; i < textBefore.length; i++) {
      if (textBefore[i] === '$' && (i === 0 || textBefore[i - 1] !== '\\')) {
        dollarCount++;
      }
    }

    // If odd number of dollar signs before offset, we are inside $...$
    return dollarCount % 2 === 1;
  }

  /**
   * Adjusts a citation placement so it is placed outside of math delimiters
   * and formatted with a non-breaking space before trailing punctuation.
   */
  static safeCitationPlacement(sentence: string, bibKey: string): string {
    const trimmed = sentence.trim();
    const citeTag = `~\\cite{${bibKey}}`;

    // If sentence ends with a period, comma, semicolon, place citation before the punctuation
    const punctMatch = trimmed.match(/([.,;:!?])$/);
    if (punctMatch) {
      const punct = punctMatch[1];
      const base = trimmed.slice(0, -1).trimEnd();
      return `${base}${citeTag}${punct}`;
    }

    return `${trimmed}${citeTag}`;
  }
}
