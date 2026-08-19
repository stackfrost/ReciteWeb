import * as mammoth from 'mammoth';
import { parseMathBlocks, MathBlock } from './math-parser';

export interface ExistingDocxCitation {
  raw: string; // e.g. "[1, 2]" or "(Smith et al., 2023)"
  style: 'numeric' | 'author-year';
  extractedKeysOrMarkers: string[]; // e.g. ["1", "2"] or ["Smith et al., 2023"]
  index: number;
}

export interface ParsedDocxDocument {
  rawText: string;
  cleanedBody: string;
  mathBlocks: Map<string, MathBlock>;
  existingCitations: ExistingDocxCitation[];
  citationMarkers: Set<string>; // Set of all extracted citation markers
  paragraphs: string[]; // Clean paragraphs for LLM claim extraction
}

/**
 * Extracts numeric style citations [1], [1, 2], [3-5] and Author-Year style (Smith et al., 2023)
 */
export function extractDocxExistingCitations(text: string): {
  citations: ExistingDocxCitation[];
  citationMarkers: Set<string>;
} {
  const citations: ExistingDocxCitation[] = [];
  const citationMarkers = new Set<string>();

  // 1. Numeric Citations: [1], [1, 2], [1-4], [12, 15, 18]
  const numericRegex = /\[(\d+(?:\s*[\s,–-]\s*\d+)*)\]/g;
  let match: RegExpExecArray | null;

  while ((match = numericRegex.exec(text)) !== null) {
    const raw = match[0];
    const inner = match[1];
    
    // Split comma or dash separated range lists
    const markers = inner
      .split(/[,–-]/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    markers.forEach((m) => citationMarkers.add(`[${m}]`));

    citations.push({
      raw,
      style: 'numeric',
      extractedKeysOrMarkers: markers,
      index: match.index,
    });
  }

  // 2. Author-Year Citations: (Smith et al., 2023) or (Doe, 2021; Jones, 2024)
  const authorYearRegex = /\(([A-Z][a-zA-Z\s.-]+(?:et al\.)?,\s*\d{4}[a-z]?(?:;\s*[A-Z][a-zA-Z\s.-]+(?:et al\.)?,\s*\d{4}[a-z]?)*)\)/g;

  while ((match = authorYearRegex.exec(text)) !== null) {
    const raw = match[0];
    const inner = match[1];

    const markers = inner
      .split(';')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    markers.forEach((m) => citationMarkers.add(m));

    citations.push({
      raw,
      style: 'author-year',
      extractedKeysOrMarkers: markers,
      index: match.index,
    });
  }

  return { citations, citationMarkers };
}

/**
 * Parses a .docx File Buffer or ArrayBuffer into a structured document
 */
export async function parseDocxBuffer(buffer: Buffer | ArrayBuffer): Promise<ParsedDocxDocument> {
  // Convert .docx binary to raw plain text using Mammoth
  const inputBuffer = buffer instanceof Buffer ? buffer : Buffer.from(new Uint8Array(buffer as ArrayBuffer));
  const result = await mammoth.extractRawText({ buffer: inputBuffer });
  const rawText = result.value || '';

  // 1. Extract existing citations (both numeric and author-year)
  const { citations: existingCitations, citationMarkers } = extractDocxExistingCitations(rawText);

  // 2. Isolate inline or display LaTeX math expressions if the user typed $...$ or $$...$$ in Word
  const { text: textWithMathTokens, mathBlocks } = parseMathBlocks(rawText);

  // 3. Normalize whitespace and clean up extra spaces
  const cleanedBody = textWithMathTokens.replace(/[ \t]+/g, ' ').trim();

  // 4. Split into distinct paragraphs for LLM claim extraction
  const paragraphs = cleanedBody
    .split(/\n\s*\n|\r\n\r\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30); // Filter out tiny headers or footer lines

  return {
    rawText,
    cleanedBody,
    mathBlocks,
    existingCitations,
    citationMarkers,
    paragraphs,
  };
}