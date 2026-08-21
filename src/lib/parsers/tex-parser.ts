
import { parseMathBlocks, MathBlock } from './math-parser';

// ─────────────────────────────────────────────────────────────────────────────
// § COMPILER ERRORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a circular include/input/subfile dependency cycle is detected
 * during recursive project traversal.
 */
export class CircularReferenceError extends Error {
  public readonly filePath: string;
  public readonly traversalStack: readonly string[];

  constructor(filePath: string, traversalStack: string[]) {
    const cycleChain = [...traversalStack, filePath].join(' -> ');
    super(`Circular reference detected in LaTeX project: ${cycleChain}`);
    this.name = 'CircularReferenceError';
    this.filePath = filePath;
    this.traversalStack = Object.freeze([...traversalStack]);
    Object.setPrototypeOf(this, CircularReferenceError.prototype);
  }
}

/**
 * Thrown when an included file cannot be located at the expected resolved path.
 */
export class LaTeXFileNotFoundError extends Error {
  public readonly rawPath: string;
  public readonly parentFilePath: string;
  public readonly attemptedPaths: readonly string[];

  constructor(rawPath: string, parentFilePath: string, attemptedPaths: string[]) {
    super(
      `LaTeX include file not found: "${rawPath}" referenced from "${parentFilePath}". ` +
      `Attempted paths:\n  - ${attemptedPaths.join('\n  - ')}`
    );
    this.name = 'LaTeXFileNotFoundError';
    this.rawPath = rawPath;
    this.parentFilePath = parentFilePath;
    this.attemptedPaths = Object.freeze([...attemptedPaths]);
    Object.setPrototypeOf(this, LaTeXFileNotFoundError.prototype);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § AST INTERFACES & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ASTNodeType =
  | 'document'
  | 'include'
  | 'citation'
  | 'math'
  | 'section'
  | 'text';

export type IncludeNodeType = 'input' | 'include' | 'subfile';

export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
}

export interface SourceLocation {
  start: SourcePosition;
  end: SourcePosition;
}

export interface BaseASTNode {
  id: string;
  type: ASTNodeType;
  filePath: string; // Normalized absolute path of the containing file
  startOffset: number;
  endOffset: number;
  loc?: SourceLocation;
}

export interface IncludeNode extends BaseASTNode {
  type: 'include';
  includeType: IncludeNodeType;
  rawCommand: string; // e.g. "\input{sections/methods.tex}"
  rawPath: string; // e.g. "sections/methods.tex"
  resolvedPath: string; // Normalized absolute path to the target .tex file
  childDocument?: DocumentNode; // Recursively parsed document AST
}

export interface CitationNode extends BaseASTNode {
  type: 'citation';
  rawCommand: string; // e.g. "\cite{smith2023, doe2024}"
  keys: string[]; // e.g. ["smith2023", "doe2024"]
}

export interface MathNode extends BaseASTNode {
  type: 'math';
  mathType: 'inline' | 'display';
  content: string; // Raw LaTeX formula with delimiters
  rawFormula: string; // Formula stripped of delimiters
  renderedHtml?: string;
}

export interface SectionNode extends BaseASTNode {
  type: 'section';
  level: number; // 1 for section, 2 for subsection, etc.
  title: string;
  rawCommand: string;
}

export interface TextNode extends BaseASTNode {
  type: 'text';
  content: string;
}

export interface DocumentNode extends BaseASTNode {
  type: 'document';
  rawContent: string;
  title?: string;
  abstract?: string;
  children: ASTNode[];
  includes: IncludeNode[];
  citations: CitationNode[];
  mathNodes: MathNode[];
  sections: SectionNode[];
}

export type ASTNode =
  | DocumentNode
  | IncludeNode
  | CitationNode
  | MathNode
  | SectionNode
  | TextNode;

export interface LaTeXProjectAST {
  rootFilePath: string; // Normalized absolute path to entry .tex
  rootNode: DocumentNode;
  fileDependencyGraph: Map<string, string[]>; // sourcePath -> includedPaths
  allFiles: string[]; // All unique normalized absolute file paths
  flattenedContent: string; // Full composite content with includes resolved
}

// Legacy / UI compatibility interface
export interface ExistingCitation {
  raw: string; // e.g. "\cite{smith2023, doe2024}"
  keys: string[]; // e.g. ["smith2023", "doe2024"]
  index: number;
}

export interface ParsedTexDocument {
  title?: string;
  abstract?: string;
  cleanedBody: string;
  mathBlocks: Map<string, MathBlock>;
  existingCitations: ExistingCitation[];
  citationKeys: Set<string>;
  paragraphs: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// § PATH RESOLUTION & NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a file path to standard forward slashes with redundant separators removed.
 */
export function normalizePathSeparators(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/');
}

export function posixDirname(p: string): string {
  const norm = normalizePathSeparators(p);
  const lastSlash = norm.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  if (lastSlash === 0) return '/';
  return norm.slice(0, lastSlash);
}

export function posixResolve(parentDir: string, child: string): string {
  const normChild = normalizePathSeparators(child);
  if (normChild.startsWith('/')) return normChild;
  
  const parentParts = normalizePathSeparators(parentDir).split('/').filter(Boolean);
  const childParts = normChild.split('/').filter(Boolean);
  
  for (const part of childParts) {
    if (part === '.') continue;
    if (part === '..') parentParts.pop();
    else parentParts.push(part);
  }
  
  const isAbsolute = parentDir.startsWith('/');
  const prefix = isAbsolute ? '/' : '';
  return prefix + parentParts.join('/');
}

export function posixExtname(p: string): string {
  const name = p.split('/').pop() || '';
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx) : '';
}

/**
 * Resolves a LaTeX include path relative to the currently parsed file's directory.
 * If the rawPath does not have an extension, defaults to appending '.tex'.
 */
export function resolveTexRelativePath(rawPath: string, parentFilePath: string): string {
  const cleanRaw = rawPath.trim().replace(/^["']|["']$/g, '');
  const parentDir = posixDirname(parentFilePath);
  
  // Resolve relative to parent directory
  const resolved = posixResolve(parentDir, cleanRaw);
  
  // LaTeX automatically appends .tex if no extension is present
  const hasExt = posixExtname(resolved).length > 0;
  const targetPath = hasExt ? resolved : `${resolved}.tex`;
  
  return normalizePathSeparators(targetPath);
}

/**
 * Computes line and column coordinates from character offset
 */
export function computeSourcePosition(text: string, offset: number): SourcePosition {
  const clampedOffset = Math.max(0, Math.min(offset, text.length));
  const lines = text.slice(0, clampedOffset).split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column, offset: clampedOffset };
}

// ─────────────────────────────────────────────────────────────────────────────
// § TOKENIZATION & PARSING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Removes LaTeX comments (% ...) while strictly preserving escaped percent signs (\%)
 */
export function stripTexComments(texText: string): string {
  return texText.replace(/(?<!\\)%[^\n]*/g, '');
}

/**
 * Extracts all \input{}, \include{}, and \subfile{} commands from LaTeX content.
 * Accurately skips commented-out commands and computes exact character offsets.
 *
 * @param content Raw LaTeX text of the file
 * @param currentFilePath Absolute path to the file being parsed
 */
export function tokenizeIncludes(content: string, currentFilePath: string): IncludeNode[] {
  const includes: IncludeNode[] = [];
  const normalizedCurrentPath = normalizePathSeparators(currentFilePath);

  // Match \input{...}, \include{...}, \subfile{...}
  // Also supports optional arguments e.g. \subfile[options]{path}
  const includeRegex = /\\(input|include|subfile)\*?(?:\[[^\]]*\])?\{([^}]+)\}/g;

  let match: RegExpExecArray | null;
  while ((match = includeRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const matchIndex = match.index;

    // Verify match is not preceded by an unescaped comment (%) on the same line
    const lineStart = content.lastIndexOf('\n', matchIndex);
    const linePrefix = content.slice(lineStart === -1 ? 0 : lineStart + 1, matchIndex);
    
    // Check if there is an unescaped % before this match on the same line
    const unescapedCommentMatch = linePrefix.match(/(?<!\\)%/);
    if (unescapedCommentMatch) {
      continue; // Skip commented-out include
    }

    const commandType = match[1].toLowerCase() as IncludeNodeType;
    const rawPath = match[2].trim();
    const resolvedPath = resolveTexRelativePath(rawPath, normalizedCurrentPath);
    const endOffset = matchIndex + fullMatch.length;

    includes.push({
      id: `include-${normalizedCurrentPath}-${matchIndex}`,
      type: 'include',
      includeType: commandType,
      rawCommand: fullMatch,
      rawPath,
      resolvedPath,
      filePath: normalizedCurrentPath,
      startOffset: matchIndex,
      endOffset,
      loc: {
        start: computeSourcePosition(content, matchIndex),
        end: computeSourcePosition(content, endOffset),
      },
    });
  }

  return includes;
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

  const citeRegex = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{([^}]+)\}/gi;

  let match: RegExpExecArray | null;
  while ((match = citeRegex.exec(text)) !== null) {
    const raw = match[0];
    const rawKeys = match[1];

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

import { MacroRegistry, extractMacroDefinitions, expandMacros, remapOffset } from './macro-expander';

/**
 * Parses raw .tex content into a structured single-file DocumentNode AST
 */
export function parseTexToAST(rawTex: string, filePath: string): DocumentNode {
  const normalizedFilePath = normalizePathSeparators(filePath);
  
  // 0. Extract and Expand Macros
  const registry = new MacroRegistry();
  const withoutMacroDefs = extractMacroDefinitions(rawTex, registry);
  const { text: expandedTex, mappings } = expandMacros(withoutMacroDefs, registry);

  const uncommented = stripTexComments(expandedTex);
  const { title, abstract } = extractTexMetadata(uncommented);

  // 1. Extract includes with character coordinates
  const includes = tokenizeIncludes(expandedTex, normalizedFilePath);

  // 2. Extract citations
  const citations: CitationNode[] = [];
  const citeRegex = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{([^}]+)\}/gi;
  let citeMatch: RegExpExecArray | null;
  while ((citeMatch = citeRegex.exec(expandedTex)) !== null) {
    const matchIndex = citeMatch.index;
    const lineStart = expandedTex.lastIndexOf('\n', matchIndex);
    const linePrefix = expandedTex.slice(lineStart === -1 ? 0 : lineStart + 1, matchIndex);
    if (linePrefix.match(/(?<!\\)%/)) continue;

    const rawCommand = citeMatch[0];
    const keys = citeMatch[1]
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const endOffset = matchIndex + rawCommand.length;
    citations.push({
      id: `citation-${normalizedFilePath}-${matchIndex}`,
      type: 'citation',
      filePath: normalizedFilePath,
      rawCommand,
      keys,
      startOffset: matchIndex,
      endOffset,
      loc: {
        start: computeSourcePosition(expandedTex, matchIndex),
        end: computeSourcePosition(expandedTex, endOffset),
      },
    });
  }

  // 3. Extract sections
  const sections: SectionNode[] = [];
  const sectionRegex = /\\(part|chapter|section|subsection|subsubsection|paragraph)\*?\{([^}]+)\}/gi;
  const levelMap: Record<string, number> = {
    part: 0,
    chapter: 0,
    section: 1,
    subsection: 2,
    subsubsection: 3,
    paragraph: 4,
  };

  let secMatch: RegExpExecArray | null;
  while ((secMatch = sectionRegex.exec(expandedTex)) !== null) {
    const matchIndex = secMatch.index;
    const lineStart = expandedTex.lastIndexOf('\n', matchIndex);
    const linePrefix = expandedTex.slice(lineStart === -1 ? 0 : lineStart + 1, matchIndex);
    if (linePrefix.match(/(?<!\\)%/)) continue;

    const cmd = secMatch[1].toLowerCase();
    const secTitle = secMatch[2].trim();
    const rawCommand = secMatch[0];
    const endOffset = matchIndex + rawCommand.length;

    sections.push({
      id: `section-${normalizedFilePath}-${matchIndex}`,
      type: 'section',
      filePath: normalizedFilePath,
      level: levelMap[cmd] ?? 1,
      title: secTitle,
      rawCommand,
      startOffset: matchIndex,
      endOffset,
      loc: {
        start: computeSourcePosition(expandedTex, matchIndex),
        end: computeSourcePosition(expandedTex, endOffset),
      },
    });
  }

  // 4. Extract math nodes using math-parser
  const mathNodes: MathNode[] = [];
  const { mathBlocks } = parseMathBlocks(expandedTex);
  for (const [, block] of mathBlocks) {
    const startOffset = block.originalCoordinates?.startOffset ?? 0;
    const endOffset = block.originalCoordinates?.endOffset ?? (startOffset + block.content.length);
    mathNodes.push({
      id: block.id,
      type: 'math',
      filePath: normalizedFilePath,
      mathType: block.type,
      content: block.content,
      rawFormula: block.rawFormula,
      renderedHtml: block.renderedHtml,
      startOffset,
      endOffset,
      loc: {
        start: computeSourcePosition(expandedTex, startOffset),
        end: computeSourcePosition(expandedTex, endOffset),
      },
    });
  }

  // Remap Coordinates back to raw source file using macro expansion mappings
  const remapNode = (node: BaseASTNode) => {
    node.startOffset = remapOffset(node.startOffset, mappings);
    node.endOffset = remapOffset(node.endOffset, mappings);
    if (node.loc) {
      node.loc.start = computeSourcePosition(rawTex, node.startOffset);
      node.loc.end = computeSourcePosition(rawTex, node.endOffset);
    }
  };

  includes.forEach(remapNode);
  citations.forEach(remapNode);
  sections.forEach(remapNode);
  mathNodes.forEach(remapNode);

  // 5. Aggregate all children ordered by startOffset
  const children: ASTNode[] = [
    ...includes,
    ...citations,
    ...sections,
    ...mathNodes,
  ].sort((a, b) => a.startOffset - b.startOffset);

  return {
    id: `doc-${normalizedFilePath}`,
    type: 'document',
    filePath: normalizedFilePath,
    rawContent: rawTex,
    title,
    abstract,
    startOffset: 0,
    endOffset: rawTex.length,
    loc: {
      start: computeSourcePosition(rawTex, 0),
      end: computeSourcePosition(rawTex, rawTex.length),
    },
    children,
    includes,
    citations,
    mathNodes,
    sections,
  };
}

/**
 * Main parser entry point for .tex file content (backward-compatible)
 */
export function parseTexDocument(rawTex: string): ParsedTexDocument {
  const uncommented = stripTexComments(rawTex);
  const { title, abstract } = extractTexMetadata(uncommented);

  let bodyText = uncommented;
  const docBodyMatch = uncommented.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/i);
  if (docBodyMatch) {
    bodyText = docBodyMatch[1];
  }

  const { citations: existingCitations, citationKeys } = extractExistingCitations(bodyText);
  const { text: textWithMathTokens, mathBlocks } = parseMathBlocks(bodyText);

  const cleanText = textWithMathTokens
    .replace(/\\(?:section|subsection|subsubsection|paragraph)\*?\{([^}]+)\}/gi, '$1\n')
    .replace(/\\label\{[^}]+\}/gi, '')
    .replace(/\\ref\{[^}]+\}/gi, '[REF]')
    .replace(/\\begin\{(?:figure|table|itemize|enumerate)\*?\}[\s\S]*?\\end\{(?:figure|table|itemize|enumerate)\*?\}/gi, '')
    .replace(/\\\\/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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