import {
  DocumentNode,
  IncludeNode,
  LaTeXProjectAST,
  CircularReferenceError,
  LaTeXFileNotFoundError,
  normalizePathSeparators,
  resolveTexRelativePath,
  posixDirname,
  posixResolve,
  parseTexToAST,
  stripTexComments,
  extractExistingCitations,
} from '../lib/parsers/tex-parser';
import { parseMathBlocks, MathBlock } from '../lib/parsers/math-parser';
import type { BibTeXEntry } from './bibtex-parser';

export interface ExtractedClaim {
  id: string;
  sectionTitle: string;
  rawText: string;
  citations: string[];
  verifiedSourceContext?: string[];
}

export interface VirtualProjectFile {
  text: string;
  [key: string]: unknown;
}

export class LaTeXParser {
  /**
   * Asynchronously and recursively parses a single .tex file and all its
   * child includes into a full DocumentNode AST tree with cycle detection.
   *
   * @param filePath Absolute or relative path to the .tex file
   * @param traversalStack Set of visited normalized absolute file paths in current branch
   * @throws {CircularReferenceError} When an include cycle is detected
   * @throws {LaTeXFileNotFoundError} When an included file cannot be located
   */
  static async parseFile(
    filePath: string,
    traversalStack: Set<string> = new Set<string>()
  ): Promise<DocumentNode> {
    const fs = await import('fs/promises');
    const path = await import('path');

    let resolvedAbsolutePath = normalizePathSeparators(path.resolve(filePath));

    // Cycle detection guard
    if (traversalStack.has(resolvedAbsolutePath)) {
      throw new CircularReferenceError(resolvedAbsolutePath, Array.from(traversalStack));
    }

    const nextStack = new Set<string>(traversalStack).add(resolvedAbsolutePath);

    // Read file content asynchronously with fallback for missing .tex extension
    let rawContent: string;
    try {
      rawContent = await fs.readFile(resolvedAbsolutePath, 'utf-8');
    } catch {
      if (!resolvedAbsolutePath.endsWith('.tex')) {
        const withTex = `${resolvedAbsolutePath}.tex`;
        try {
          rawContent = await fs.readFile(withTex, 'utf-8');
          resolvedAbsolutePath = withTex;
        } catch {
          const parent = Array.from(traversalStack).pop() || 'entry';
          throw new LaTeXFileNotFoundError(filePath, parent, [
            resolvedAbsolutePath,
            `${resolvedAbsolutePath}.tex`,
          ]);
        }
      } else {
        const parent = Array.from(traversalStack).pop() || 'entry';
        throw new LaTeXFileNotFoundError(filePath, parent, [resolvedAbsolutePath]);
      }
    }

    // Generate Document AST for the current file
    const docNode = parseTexToAST(rawContent, resolvedAbsolutePath);

    // Recursively parse all child includes
    for (const includeNode of docNode.includes) {
      try {
        const childDoc = await LaTeXParser.parseFile(includeNode.resolvedPath, nextStack);
        includeNode.childDocument = childDoc;
      } catch (err: unknown) {
        if (err instanceof CircularReferenceError) {
          // Immediately halt and rethrow cycle detection error
          throw err;
        }
        // If file not found or other read error, rethrow or record in AST
        throw err;
      }
    }

    return docNode;
  }

  /**
   * Parses an entire multi-directory LaTeX project starting from an entry .tex file.
   * Produces a unified LaTeXProjectAST containing the AST root, dependency DAG,
   * all referenced file coordinates, and the flattened composite text.
   *
   * @param entryFilePath Path to the root .tex file (e.g. main.tex)
   */
  static async parseProject(entryFilePath: string): Promise<LaTeXProjectAST> {
    const path = await import('path');
    const normalizedRoot = normalizePathSeparators(path.resolve(entryFilePath));
    const rootNode = await LaTeXParser.parseFile(normalizedRoot, new Set<string>());

    const fileDependencyGraph = new Map<string, string[]>();
    const allFilesSet = new Set<string>();

    const walk = (node: DocumentNode): void => {
      allFilesSet.add(node.filePath);
      const childPaths: string[] = [];
      for (const inc of node.includes) {
        childPaths.push(inc.resolvedPath);
        if (inc.childDocument) {
          walk(inc.childDocument);
        }
      }
      fileDependencyGraph.set(node.filePath, childPaths);
    };

    walk(rootNode);

    // Flatten AST into a single composite string, replacing includes with child contents
    const flatten = (node: DocumentNode): string => {
      let content = node.rawContent;
      // Sort includes in descending order by startOffset to replace from bottom to top
      const sortedIncludes = [...node.includes].sort((a, b) => b.startOffset - a.startOffset);
      for (const inc of sortedIncludes) {
        const replacement = inc.childDocument
          ? flatten(inc.childDocument)
          : `%% [Missing: ${inc.rawPath}] %%`;
        content =
          content.slice(0, inc.startOffset) +
          `\n%% START: ${inc.rawPath} %%\n` +
          replacement +
          `\n%% END: ${inc.rawPath} %%\n` +
          content.slice(inc.endOffset);
      }
      return content;
    };

    const flattenedContent = flatten(rootNode);

    return {
      rootFilePath: normalizedRoot,
      rootNode,
      fileDependencyGraph,
      allFiles: Array.from(allFilesSet),
      flattenedContent,
    };
  }

  /**
   * High-level utility to resolve all includes on disk asynchronously and return flattened text.
   */
  static async resolveProjectIncludes(entryFilePath: string): Promise<string> {
    const projectAST = await LaTeXParser.parseProject(entryFilePath);
    return projectAST.flattenedContent;
  }

  /**
   * Recursively resolves \input{}, \include{}, and \subfile{} macros across an
   * in-memory virtual file dictionary with strict cycle detection and relative path resolution.
   *
   * @param mainTexContent Content of the starting .tex file
   * @param projectFiles Map of relative file paths to virtual file objects
   * @param currentFilePath Relative path of the currently resolved file
   * @param traversalStack Set of visited paths for cycle detection
   */
  static resolveIncludes(
    mainTexContent: string,
    projectFiles: Record<string, VirtualProjectFile>,
    currentFilePath: string = 'main.tex',
    traversalStack: Set<string> = new Set<string>()
  ): string {
    const normCurrent = currentFilePath.replace(/\\/g, '/').replace(/^\.\//, '');

    if (traversalStack.has(normCurrent)) {
      throw new CircularReferenceError(normCurrent, Array.from(traversalStack));
    }

    const nextStack = new Set<string>(traversalStack).add(normCurrent);

    const includeRegex = /\\(input|include|subfile)\*?(?:\[[^\]]*\])?\{([^}]+)\}/g;
    let resolvedText = mainTexContent;

    // Split into lines or check comments to avoid expanding commented includes
    resolvedText = resolvedText.replace(includeRegex, (match, _cmd, rawPath, offset) => {
      // Check if match is commented out
      const lineStart = resolvedText.lastIndexOf('\n', offset);
      const linePrefix = resolvedText.slice(lineStart === -1 ? 0 : lineStart + 1, offset);
      if (linePrefix.match(/(?<!\\)%/)) {
        return match; // Retain commented-out include verbatim
      }

      const cleanRaw = (rawPath as string).trim().replace(/^["']|["']$/g, '');
      const currentDir = posixDirname(normCurrent);
      const targetBase = posixResolve(currentDir, cleanRaw);
      const targetTex = targetBase.endsWith('.tex') ? targetBase : `${targetBase}.tex`;

      // Helper to find matching key in projectFiles
      const findKey = (key: string): string | undefined => {
        if (projectFiles[key]) return key;
        const normalizedKey = key.replace(/\\/g, '/').replace(/^\.\//, '');
        return Object.keys(projectFiles).find((k) => {
          const normK = k.replace(/\\/g, '/').replace(/^\.\//, '');
          return normK === normalizedKey || normK.endsWith('/' + normalizedKey);
        });
      };

      const matchedKey = findKey(targetTex) || findKey(targetBase);

      if (matchedKey && projectFiles[matchedKey]) {
        const childContent = projectFiles[matchedKey].text;
        return LaTeXParser.resolveIncludes(childContent, projectFiles, matchedKey, nextStack);
      }

      console.warn(`Could not resolve include: ${rawPath} from ${normCurrent}`);
      return `%% [Missing Include: ${rawPath}] %%`;
    });

    return resolvedText;
  }

  /**
   * Extracts claims from a LaTeX document string.
   */
  static extractClaims(texContent: string): ExtractedClaim[] {
    return LaTeXParser.scanDocument(texContent);
  }

  /**
   * Strips out math blocks to isolate natural language text for LLM processing.
   */
  static stripMathBlocks(texContent: string): { text: string; mathBlocks: Map<string, MathBlock> } {
    return parseMathBlocks(texContent);
  }

  /**
   * Finds existing \cite{...} commands in the LaTeX document.
   */
  static findCitations(texContent: string): string[] {
    const { citationKeys } = extractExistingCitations(texContent);
    return Array.from(citationKeys);
  }

  /**
   * Finds paragraphs containing citations and returns them as context blocks.
   */
  static extractContextBlocks(texContent: string): string[] {
    if (!texContent) return [];
    
    const paragraphs = texContent.split(/\n\s*\n/);
    const citeRegex = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{([^}]+)\}/i;
    
    return paragraphs
      .map((p) => p.trim())
      .filter((p) => citeRegex.test(p));
  }

  /**
   * Scans a LaTeX document and extracts paragraphs with their structural context and citations.
   */
  static scanDocument(texContent: string): ExtractedClaim[] {
    if (!texContent) return [];
    
    const claims: ExtractedClaim[] = [];
    let currentSection = 'Introduction';
    
    const paragraphs = texContent.split(/\n\s*\n/);
    const citeRegexGlobal = /\\(?:auto|p|t|page|author|year)?cite[a-z]*\*?(?:\[.*?\])*\{([^}]+)\}/gi;
    const sectionRegex = /\\(section|subsection|chapter)\*?\{([^}]+)\}/i;

    let claimCounter = 1;

    for (const paragraph of paragraphs) {
      const p = paragraph.trim();
      if (!p) continue;

      // Update current section if found
      const sectionMatch = sectionRegex.exec(p);
      if (sectionMatch) {
        currentSection = sectionMatch[2].trim();
      }

      // Check for citations
      let match: RegExpExecArray | null;
      const paragraphCitations: string[] = [];
      
      citeRegexGlobal.lastIndex = 0;
      while ((match = citeRegexGlobal.exec(p)) !== null) {
        const keys = match[1].split(',').map((k) => k.trim()).filter((k) => k.length > 0);
        paragraphCitations.push(...keys);
      }

      if (paragraphCitations.length > 0) {
        claims.push({
          id: `claim-ast-${claimCounter++}`,
          sectionTitle: currentSection,
          rawText: p,
          citations: Array.from(new Set(paragraphCitations)),
        });
      }
    }
    
    return claims;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § MULTI-CALL CHUNKING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evenly divides an array of claims into at most `maxChunks` sub-arrays.
 */
export function chunkClaims(
  claims: ExtractedClaim[],
  maxChunks: number = 4
): ExtractedClaim[][] {
  if (!claims || claims.length === 0) return [];

  const numChunks = Math.min(maxChunks, claims.length);
  const chunks: ExtractedClaim[][] = Array.from({ length: numChunks }, () => []);

  for (let i = 0; i < claims.length; i++) {
    chunks[i % numChunks].push(claims[i]);
  }

  return chunks;
}

/**
 * Given a chunk of claims and the full BibTeX map, returns a new Map
 * containing only the entries actually cited in that chunk.
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

/**
 * Rehydrates quarantine tokens back to their original LaTeX.
 * Use split/join to avoid RegExp character-bracket escape bugs.
 */
export function rehydrateQuarantinedMath(
  sanitizedText: string,
  tokenMap: Map<string, string>
): string {
  return sanitizedText.replace(/\[\[RECITEAI_QUARANTINE_[A-Z_]+_\d+_[A-Z0-9]+\]\]/g, (token) => {
    return tokenMap.get(token) || token;
  });
}
