import { parseMathBlocks, MathBlock } from './math-parser';

export interface ExistingCitation {
  raw: string; // e.g. "\cite{smith2023, doe2024}"
  keys: string[]; // e.g. ["smith2023", "doe2024"]
  index: number;
}

export interface ParsedTexDocument {
  title?: string;
  abstract?: string;
  cleanedBody: string; // Body text with comments stripped and math replaced by tokens
  mathBlocks: Map<string, MathBlock>;
  existingCitations: ExistingCitation[];
  citationKeys: Set<string>; // Unique set of all keys already cited in the draft
  paragraphs: string[]; // Prose paragraphs ready for LLM claim extraction
}

/**
 * Removes LaTeX comments (% ...) while preserving escaped percent signs (\%)
 */
export function stripTexComments(texText: string): string {
  return texText.replace(/(?<!\\)%[^\n]*/g, '');
}

/**
 * Extracts all \cite{...}, \citep{...}, \citet{...}, \autocite{...} commands
 */
export function extractExistingCitations(text: string): {
  citations: ExistingCitation[];
  citationKeys: Set<string>;
} {
  const citations: ExistingCitation[] = [];
  const citationKeys = new Set<string>();

  // Matches \cite{...}, \citep{...}, \citet{...}, \autocite{...}, \citeauthor{...}, etc.
  const citeRegex = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{([^}]+)\}/gi;

  let match: RegExpExecArray | null;
  while ((match = citeRegex.exec(text)) !== null) {
    const raw = match[0];
    const rawKeys = match[1];

    // Split multiple keys separated by commas and trim whitespace
    const keys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    keys.forEach((key) => citationKeys.add(key));

    citations.push({
      raw,
      keys,
      index: match.index,
    });
  }

  return { citations, citationKeys };
}

/**
 * Extracts optional manuscript metadata (\title{...} and \begin{abstract}...\end{abstract})
 */
export function extractTexMetadata(text: string): { title?: string; abstract?: string } {
  let title: string | undefined;
  let abstract: string | undefined;

  const titleMatch = text.match(/\\title\{([^}]+)\}/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  const abstractMatch = text.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/i);
  if (abstractMatch) {
    abstract = abstractMatch[1].trim();
  }

  return { title, abstract };
}

/**
 * Main parser entry point for .tex file content
 */
export function parseTexDocument(rawTex: string): ParsedTexDocument {
  // 1. Remove LaTeX comments
  const uncommented = stripTexComments(rawTex);

  // 2. Extract title & abstract
  const { title, abstract } = extractTexMetadata(uncommented);

  // 3. Extract document body (if \begin{document} exists, isolate its content)
  let bodyText = uncommented;
  const docBodyMatch = uncommented.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/i);
  if (docBodyMatch) {
    bodyText = docBodyMatch[1];
  }

  // 4. Extract existing citations before tokenizing math
  const { citations: existingCitations, citationKeys } = extractExistingCitations(bodyText);

  // 5. Isolate math blocks into placeholders via math-parser.ts
  const { text: textWithMathTokens, mathBlocks } = parseMathBlocks(bodyText);

  // 6. Clean structural LaTeX commands (\section, \label, \ref, figures, etc.)
  const cleanText = textWithMathTokens
    .replace(/\\(?:section|subsection|subsubsection|paragraph)\*?\{([^}]+)\}/gi, '$1\n')
    .replace(/\\label\{[^}]+\}/gi, '')
    .replace(/\\ref\{[^}]+\}/gi, '[REF]')
    .replace(/\\begin\{(?:figure|table|itemize|enumerate)\*?\}[\s\S]*?\\end\{(?:figure|table|itemize|enumerate)\*?\}/gi, '')
    .replace(/\\\\/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 7. Split into paragraphs for LLM processing (filter out empty or tiny chunks)
  const paragraphs = cleanText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30);

  return {
    title,
    abstract,
    cleanedBody: cleanText,
    mathBlocks,
    existingCitations,
    citationKeys,
    paragraphs,
  };
}