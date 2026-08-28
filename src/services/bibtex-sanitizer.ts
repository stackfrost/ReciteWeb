import type { ValidationResult } from './metadata-cascade';

export interface SanitizedBibResult {
  sanitizedContent: string;
  injectedDois: number;
  healedSyntaxErrors: number;
  protectedTitles: number;
}

export function sanitizeBibTeX(
  rawBibContent: string,
  validatedMetadata?: Map<string, ValidationResult>
): SanitizedBibResult {
  if (!rawBibContent || typeof rawBibContent !== 'string') {
    return { sanitizedContent: '', injectedDois: 0, healedSyntaxErrors: 0, protectedTitles: 0 };
  }

  let injectedDois = 0;
  let healedSyntaxErrors = 0;
  let protectedTitles = 0;

  // Split content by @ to iterate over entries.
  // We keep the @ so we don't lose it.
  const entryParts = rawBibContent.split(/(?=@)/g);
  const sanitizedEntries: string[] = [];

  for (let part of entryParts) {
    if (!part.trim().startsWith('@')) {
      sanitizedEntries.push(part); // Push non-entry text (comments, preamble, etc.)
      continue;
    }

    // Attempt to extract the cite key and the body of the entry
    const match = part.match(/^(@[a-zA-Z]+\s*\{)\s*([^,]+)\s*,([\s\S]*)$/);
    if (!match) {
      // Could be severely malformed or something we can't parse easily; push as-is
      sanitizedEntries.push(part);
      continue;
    }

    const [, typeAndBrace, citeKey, bodyRaw] = match;
    const cleanCiteKey = citeKey.trim();

    let body = bodyRaw;

    // Syntax Healing: Fix missing commas between fields (e.g. year = {2024} followed by title = {Foo})
    const missingCommaRegex = /(?<=[}"'\w])\s*\n\s*([a-zA-Z0-9_]+)\s*=/g;
    // Only replace if not preceded by a comma
    const hasUncommaFields = /(?<=[^\s,])\s*\n\s*([a-zA-Z0-9_]+)\s*=/g;
    if (missingCommaRegex.test(body)) {
      body = body.replace(/(?<=[}"'\w])(?<!,)\s*\n\s*([a-zA-Z0-9_]+)\s*=/g, (match, field) => {
        healedSyntaxErrors++;
        return `,\n  ${field} =`;
      });
    }

    // Syntax Healing: Ensure the entry is closed with a trailing brace
    const trimmedBody = body.trim();
    if (!trimmedBody.endsWith('}')) {
      healedSyntaxErrors++;
      body = body.replace(/\s*$/, '\n}');
    }

    // Field processing
    const fieldRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)")/g;
    
    // Instead of replacing blindly, let's replace fields selectively
    body = body.replace(fieldRegex, (fullMatch, name, braceVal, quoteVal) => {
      const fieldName = name.toLowerCase();
      let value = braceVal !== undefined ? braceVal : quoteVal;
      const quoteType = braceVal !== undefined ? '{' : '"';

      // Title Protection
      if (fieldName === 'title') {
        const originalValue = value;
        // Regex to find words with >= 2 uppercase letters that aren't already wrapped in braces
        // E.g., GaAs, NMR, Hamiltonian
        // It matches bounds, followed by uppercase string with at least one more uppercase char somewhere
        value = value.replace(/(?<!\{)\b([A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*)\b(?!\})/g, (matchGrp: string) => {
          return `{${matchGrp}}`;
        });
        if (value !== originalValue) {
          protectedTitles++;
        }
      }

      // Author Normalization
      if (fieldName === 'author') {
        // Split by " and "
        const authors = value.split(/\s+and\s+/i);
        const normalizedAuthors = authors.map((authorStr: string) => {
          authorStr = authorStr.trim();
          // If already Last, First, keep it
          if (authorStr.includes(',')) return authorStr;
          
          // Try to convert First Last to Last, First
          const parts = authorStr.split(/\s+/);
          if (parts.length > 1) {
            const last = parts.pop();
            return `${last}, ${parts.join(' ')}`;
          }
          return authorStr;
        });
        value = normalizedAuthors.join(' and ');
      }

      const closingQuote = quoteType === '{' ? '}' : '"';
      return `${name} = ${quoteType}${value}${closingQuote}`;
    });

    // Missing DOI Injection
    if (validatedMetadata && validatedMetadata.has(cleanCiteKey.toLowerCase())) {
      const metadata = validatedMetadata.get(cleanCiteKey.toLowerCase())!;
      
      // Check if DOI field already exists
      const hasDoi = /doi\s*=\s*(?:\{|"|)/i.test(body);
      
      if (!hasDoi && metadata.doi) {
        // Inject DOI before the final closing brace
        body = body.replace(/\s*\}\s*$/, `,\n  doi = {${metadata.doi}}\n}`);
        injectedDois++;
      }
    }

    sanitizedEntries.push(`${typeAndBrace}${cleanCiteKey},${body}`);
  }

  return {
    sanitizedContent: sanitizedEntries.join(''),
    injectedDois,
    healedSyntaxErrors,
    protectedTitles
  };
}
