import { LocalFile } from './local-fs';

export interface SourceSegment {
  fileId: string;
  stitchedStart: number;
  stitchedEnd: number;
  localStart: number;
}

export interface StitchedDocument {
  stitchedText: string;
  sourceMap: SourceSegment[];
}

// Simple path resolver (handles basic relative paths)
function resolvePath(basePath: string, inputPath: string): string {
  // Normalize both paths
  const normBase = basePath.replace(/\\/g, '/');
  const normInput = inputPath.replace(/\\/g, '/');
  
  const baseDir = normBase.substring(0, normBase.lastIndexOf('/') + 1);
  let resolved = baseDir + normInput;
  if (!resolved.endsWith('.tex')) resolved += '.tex';
  return resolved;
}

export function stitchProject(rootFileId: string, fileTree: Record<string, LocalFile>): StitchedDocument {
  let stitchedText = '';
  const sourceMap: SourceSegment[] = [];
  
  function traverse(fileId: string) {
    // We normalize the fileId to match how it might be stored in the fileTree
    const normalizedId = Object.keys(fileTree).find(k => k.replace(/\\/g, '/') === fileId.replace(/\\/g, '/')) || fileId;
    const file = fileTree[normalizedId];
    if (!file) return;

    const content = file.content || '';
    // Match \input{...}, \include{...} or \subfile{...}
    const importRegex = /\\(?:input|include|subfile)\{([^}]+)\}/g;
    
    let lastIndex = 0;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      // 1. Append text BEFORE the \input
      const textChunk = content.substring(lastIndex, match.index);
      if (textChunk.length > 0) {
        sourceMap.push({
          fileId: normalizedId,
          stitchedStart: stitchedText.length,
          stitchedEnd: stitchedText.length + textChunk.length,
          localStart: lastIndex
        });
        stitchedText += textChunk;
      }

      // 2. Recursively process the included file
      const childPath = resolvePath(normalizedId, match[1]);
      traverse(childPath);

      lastIndex = match.index + match[0].length;
    }

    // 3. Append remaining text AFTER the last \input
    const remainingChunk = content.substring(lastIndex);
    if (remainingChunk.length > 0) {
      sourceMap.push({
        fileId: normalizedId,
        stitchedStart: stitchedText.length,
        stitchedEnd: stitchedText.length + remainingChunk.length,
        localStart: lastIndex
      });
      stitchedText += remainingChunk;
    }
  }

  traverse(rootFileId);
  return { stitchedText, sourceMap };
}

// Map a stitched character index back to the physical file and local offset
export function getLocalCoordinate(stitchedIndex: number, sourceMap: SourceSegment[]): { fileId: string, localOffset: number } | null {
  const segment = sourceMap.find(s => stitchedIndex >= s.stitchedStart && stitchedIndex < s.stitchedEnd);
  if (!segment) return null;
  return {
    fileId: segment.fileId,
    localOffset: segment.localStart + (stitchedIndex - segment.stitchedStart)
  };
}
