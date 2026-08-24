/**
 * Multi-File LaTeX Project Resolver
 * 
 * Recursively resolves modular LaTeX project structures:
 * - Identifies root document via \documentclass
 * - Recursively traces \input{...}, \include{...}, \subfile{...}
 * - Traverses relative paths and nested subdirectories (sections/*.tex)
 * - Identifies multi-file bibliography declarations (\bibliography{...}, \addbibresource{...})
 * - Builds a Virtual Document Map with bidirectional line coordinate mapping
 */

import { LocalFile } from './local-fs';

export interface SubFileNode {
  id: string;
  name: string;
  relativePath: string;
  absolutePath?: string;
  content: string;
  lineCount: number;
  wordCount: number;
  startGlobalLine: number;
  endGlobalLine: number;
  issuesCount: number;
  status: 'clean' | 'warning' | 'critical';
  children: SubFileNode[];
  parentPath?: string;
}

export interface LineCoordinateMapping {
  globalLine: number;
  filePath: string;
  localLine: number;
  snippet: string;
}

export interface ResolvedProjectTree {
  rootFileId: string;
  stitchedLatex: string;
  totalLines: number;
  totalWords: number;
  fileNodes: SubFileNode[];
  bibFiles: string[];
  coordinateMap: LineCoordinateMapping[];
}

export class MultiFileProjectResolver {
  /**
   * Normalizes path separators to forward slashes and removes leading slashes.
   */
  static normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/, '');
  }

  /**
   * Resolves a child path relative to the parent file path.
   */
  static resolveRelativePath(parentPath: string, relativePath: string): string {
    const normParent = this.normalizePath(parentPath);
    let normRel = this.normalizePath(relativePath);
    if (!normRel.endsWith('.tex') && !normRel.endsWith('.bib')) {
      normRel += '.tex';
    }

    const lastSlash = normParent.lastIndexOf('/');
    const baseDir = lastSlash >= 0 ? normParent.substring(0, lastSlash + 1) : '';
    const combined = baseDir + normRel;

    // Resolve .. and .
    const parts = combined.split('/');
    const resolvedParts: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        resolvedParts.pop();
      } else {
        resolvedParts.push(part);
      }
    }
    return resolvedParts.join('/');
  }

  /**
   * Detects the root LaTeX document containing \documentclass.
   */
  static findRootDocument(files: Record<string, LocalFile>): string | null {
    const keys = Object.keys(files);
    // 1. Look for \documentclass in content
    for (const key of keys) {
      const file = files[key];
      if (file.name.endsWith('.tex') && file.content && /\\documentclass/i.test(file.content)) {
        return key;
      }
    }

    // 2. Fallback to main.tex, index.tex, or first .tex file
    const mainFile = keys.find((k) => k.toLowerCase().endsWith('main.tex') || k.toLowerCase().endsWith('index.tex'));
    if (mainFile) return mainFile;

    const firstTex = keys.find((k) => k.endsWith('.tex'));
    return firstTex || (keys.length > 0 ? keys[0] : null);
  }

  /**
   * Scans document for \bibliography{...} and \addbibresource{...} declarations.
   */
  static findBibDeclarations(texContent: string): string[] {
    const bibs: string[] = [];
    const bibRegex = /\\(?:bibliography|addbibresource)\{([^}]+)\}/g;
    let match;
    while ((match = bibRegex.exec(texContent)) !== null) {
      const raw = match[1];
      const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        let bibName = item;
        if (!bibName.endsWith('.bib')) bibName += '.bib';
        bibs.push(bibName);
      }
    }
    return bibs;
  }

  /**
   * Recursively parses the multi-file project tree.
   */
  static resolveProject(
    files: Record<string, LocalFile>,
    customRootId?: string
  ): ResolvedProjectTree {
    const rootId = customRootId || this.findRootDocument(files) || 'main.tex';
    const coordinateMap: LineCoordinateMapping[] = [];
    const visited = new Set<string>();
    const bibFiles = new Set<string>();
    const fileNodes: SubFileNode[] = [];

    let currentGlobalLine = 1;
    let stitchedLatex = '';

    const traverse = (fileId: string, parentPath?: string): SubFileNode | null => {
      const normId = this.normalizePath(fileId);
      if (visited.has(normId)) return null;
      visited.add(normId);

      // Find matching file in project files
      const fileKey = Object.keys(files).find(
        (k) => this.normalizePath(k) === normId || this.normalizePath(files[k].path) === normId || files[k].name === normId
      );

      const file = fileKey ? files[fileKey] : null;
      const rawContent = file?.content || '';
      const localLines = rawContent.split('\n');
      const startGlobalLine = currentGlobalLine;

      // Extract referenced bib files
      const declaredBibs = this.findBibDeclarations(rawContent);
      declaredBibs.forEach((b) => bibFiles.add(b));

      // Regex for \input{...}, \include{...}, \subfile{...}
      const importRegex = /\\(?:input|include|subfile)\{([^}]+)\}/g;
      const childNodes: SubFileNode[] = [];

      let localLineIndex = 0;
      for (const line of localLines) {
        coordinateMap.push({
          globalLine: currentGlobalLine,
          filePath: normId,
          localLine: localLineIndex + 1,
          snippet: line,
        });

        stitchedLatex += line + '\n';
        currentGlobalLine++;
        localLineIndex++;

        // Check if this line includes a child file
        let match;
        while ((match = importRegex.exec(line)) !== null) {
          const childRel = match[1].trim();
          const childPath = this.resolveRelativePath(normId, childRel);
          const childNode = traverse(childPath, normId);
          if (childNode) {
            childNodes.push(childNode);
          }
        }
      }

      const endGlobalLine = currentGlobalLine - 1;
      const wordCount = rawContent
        .replace(/\\[a-zA-Z]+/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 0).length;

      const node: SubFileNode = {
        id: normId,
        name: normId.split('/').pop() || normId,
        relativePath: normId,
        absolutePath: file?.path,
        content: rawContent,
        lineCount: localLines.length,
        wordCount,
        startGlobalLine,
        endGlobalLine,
        issuesCount: 0,
        status: 'clean',
        children: childNodes,
        parentPath,
      };

      return node;
    };

    const rootNode = traverse(rootId);
    if (rootNode) fileNodes.push(rootNode);

    // Also include any standalone files not reached from root traversal
    Object.keys(files).forEach((key) => {
      const norm = this.normalizePath(key);
      if (!visited.has(norm) && (norm.endsWith('.tex') || norm.endsWith('.bib'))) {
        const file = files[key];
        const content = file.content || '';
        const lines = content.split('\n');
        fileNodes.push({
          id: norm,
          name: file.name,
          relativePath: norm,
          absolutePath: file.path,
          content,
          lineCount: lines.length,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          startGlobalLine: 0,
          endGlobalLine: 0,
          issuesCount: 0,
          status: 'clean',
          children: [],
        });
      }
    });

    const totalWords = stitchedLatex
      .replace(/\\[a-zA-Z]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    return {
      rootFileId: rootId,
      stitchedLatex,
      totalLines: currentGlobalLine - 1,
      totalWords,
      fileNodes,
      bibFiles: Array.from(bibFiles),
      coordinateMap,
    };
  }

  /**
   * Maps a global stitched line number back to its local file path and local line.
   */
  static mapGlobalToLocal(
    globalLine: number,
    coordinateMap: LineCoordinateMapping[]
  ): { filePath: string; localLine: number; snippet: string } {
    const entry = coordinateMap.find((c) => c.globalLine === globalLine);
    if (entry) {
      return {
        filePath: entry.filePath,
        localLine: entry.localLine,
        snippet: entry.snippet,
      };
    }
    return {
      filePath: coordinateMap[0]?.filePath || 'main.tex',
      localLine: globalLine,
      snippet: '',
    };
  }
}
