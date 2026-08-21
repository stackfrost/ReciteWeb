import { CoordinateDriftTracker, TextMutation } from './coordinate-tracker';
import type { Claim } from '@/lib/store';

export class DiffGenerator {
  /**
   * Generates a Map of Git-compatible unified patch strings for all modified files.
   *
   * @param projectChanges A map of absolute file paths to their respective tracker and original source.
   * @returns A Map of absolute file paths to their generated unified patch strings.
   */
  public static generatePatches(
    projectChanges: Map<string, { tracker: CoordinateDriftTracker; originalSource: string }>
  ): Map<string, string> {
    const patches = new Map<string, string>();
    for (const [filePath, { tracker, originalSource }] of projectChanges.entries()) {
      const patch = this.generateUnifiedPatch(filePath, originalSource, tracker.getMutations());
      if (patch) {
        patches.set(filePath, patch);
      }
    }
    return patches;
  }

  /**
   * Generates a standard unified diff patch string.
   */
  public static generateUnifiedPatch(
    filePath: string,
    originalSource: string,
    mutations: ReadonlyArray<TextMutation>
  ): string {
    if (mutations.length === 0) return '';

    const originalLines = originalSource.split('\n');
    const lineOffsets: number[] = [];
    let currentOffset = 0;
    for (const line of originalLines) {
      lineOffsets.push(currentOffset);
      currentOffset += line.length + 1; // +1 for '\n'
    }

    const getLineIdx = (offset: number) => {
      let low = 0;
      let high = lineOffsets.length - 1;
      let ans = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (lineOffsets[mid] <= offset) {
          ans = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return ans;
    };

    interface LineGroup {
      startLineIdx: number;
      endLineIdx: number;
      mutations: TextMutation[];
    }

    // 1. Group mutations into LineGroups (mutations that overlap on the same lines)
    const lineGroups: LineGroup[] = [];
    for (const mut of mutations) {
      const mutStartLine = getLineIdx(mut.originalStartOffset);
      const mutEndLine = getLineIdx(mut.originalEndOffset);

      if (lineGroups.length === 0) {
        lineGroups.push({ startLineIdx: mutStartLine, endLineIdx: mutEndLine, mutations: [mut] });
      } else {
        const lastGroup = lineGroups[lineGroups.length - 1];
        // If they overlap or are adjacent, merge into the same LineGroup
        if (mutStartLine <= lastGroup.endLineIdx + 1) {
          lastGroup.endLineIdx = Math.max(lastGroup.endLineIdx, mutEndLine);
          lastGroup.mutations.push(mut);
        } else {
          lineGroups.push({ startLineIdx: mutStartLine, endLineIdx: mutEndLine, mutations: [mut] });
        }
      }
    }

    // 2. Group LineGroups into Hunks based on 3-line context overlap
    interface Hunk {
      groups: LineGroup[];
      contextStartLineIdx: number;
      contextEndLineIdx: number;
    }

    const hunks: Hunk[] = [];
    for (const group of lineGroups) {
      const contextStart = Math.max(0, group.startLineIdx - 3);
      const contextEnd = Math.min(originalLines.length - 1, group.endLineIdx + 3);

      if (hunks.length === 0) {
        hunks.push({ groups: [group], contextStartLineIdx: contextStart, contextEndLineIdx: contextEnd });
      } else {
        const lastHunk = hunks[hunks.length - 1];
        // Merge if contexts overlap or touch
        if (contextStart <= lastHunk.contextEndLineIdx) {
          lastHunk.contextEndLineIdx = Math.max(lastHunk.contextEndLineIdx, contextEnd);
          lastHunk.groups.push(group);
        } else {
          hunks.push({ groups: [group], contextStartLineIdx: contextStart, contextEndLineIdx: contextEnd });
        }
      }
    }

    // 3. Generate patch string
    let patch = `--- a/${filePath}\n+++ b/${filePath}\n`;

    for (const hunk of hunks) {
      const origStartLine = hunk.contextStartLineIdx;
      const origLinesCount = hunk.contextEndLineIdx - origStartLine + 1;
      let newLinesCount = 0;
      let currentOrigLine = origStartLine;
      const hunkBody: string[] = [];

      for (const group of hunk.groups) {
        // Unchanged context before group
        while (currentOrigLine < group.startLineIdx) {
          hunkBody.push(` ${originalLines[currentOrigLine]}`);
          newLinesCount++;
          currentOrigLine++;
        }

        // The original text of the group lines
        for (let i = group.startLineIdx; i <= group.endLineIdx; i++) {
          hunkBody.push(`-${originalLines[i]}`);
        }

        // Generate the new text for this group
        const groupStartOffset = lineOffsets[group.startLineIdx];
        const groupEndOffset = group.endLineIdx + 1 < lineOffsets.length 
          ? lineOffsets[group.endLineIdx + 1] - 1 
          : originalSource.length;

        let modifiedGroupText = '';
        let lastOffset = groupStartOffset;
        for (const mut of group.mutations) {
          modifiedGroupText += originalSource.substring(lastOffset, mut.originalStartOffset);
          modifiedGroupText += mut.newText;
          lastOffset = mut.originalEndOffset;
        }
        modifiedGroupText += originalSource.substring(lastOffset, groupEndOffset);

        const newGroupLines = modifiedGroupText.split('\n');
        for (const line of newGroupLines) {
          hunkBody.push(`+${line}`);
          newLinesCount++;
        }

        currentOrigLine = group.endLineIdx + 1;
      }

      // Unchanged context after last group
      while (currentOrigLine <= hunk.contextEndLineIdx) {
        hunkBody.push(` ${originalLines[currentOrigLine]}`);
        newLinesCount++;
        currentOrigLine++;
      }

      patch += `@@ -${origStartLine + 1},${origLinesCount} +${origStartLine + 1},${newLinesCount} @@\n`;
      patch += hunkBody.join('\n') + '\n';
    }

    return patch;
  }

  /**
   * Acts as an in-memory dry-run to validate if a patch cleanly applies to the original source.
   * Strictly matches the context and deletion lines.
   *
   * @param originalSource The baseline text
   * @param patch The unified patch string
   * @returns isValid boolean and optional error message
   */
  public static validatePatch(originalSource: string, patch: string): { isValid: boolean; error?: string } {
    if (!patch) return { isValid: true };
    const originalLines = originalSource.split('\n');
    const patchLines = patch.split('\n');

    let i = 0;
    while (i < patchLines.length && !patchLines[i].startsWith('@@')) {
      i++;
    }

    while (i < patchLines.length) {
      const header = patchLines[i];
      if (!header.startsWith('@@')) break;
      
      const match = header.match(/@@ -(\d+),(\d+) \+\d+,\d+ @@/);
      if (!match) return { isValid: false, error: 'Malformed hunk header: ' + header };
      
      let origLineIdx = parseInt(match[1], 10) - 1; // 1-indexed to 0-indexed
      const origCount = parseInt(match[2], 10);
      
      i++;
      let processedOrig = 0;
      
      while (i < patchLines.length && !patchLines[i].startsWith('@@')) {
        const pLine = patchLines[i];
        if (pLine === '') {
          i++;
          continue;
        }
        
        const type = pLine[0];
        const content = pLine.substring(1);
        
        if (type === ' ' || type === '-') {
          if (origLineIdx >= originalLines.length) {
            return { isValid: false, error: `Patch applies beyond end of file at line ${origLineIdx + 1}` };
          }
          if (originalLines[origLineIdx] !== content) {
            return { 
              isValid: false, 
              error: `Context mismatch at line ${origLineIdx + 1}.\nExpected: '${originalLines[origLineIdx]}'\nGot: '${content}'` 
            };
          }
          origLineIdx++;
          processedOrig++;
        }
        i++;
      }
      
      if (processedOrig !== origCount) {
        return { 
          isValid: false, 
          error: `Hunk original line count mismatch. Expected ${origCount}, got ${processedOrig}` 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * @deprecated Use `generatePatches(projectChanges)` for the AST-aware mutation pipeline.
   *
   * Legacy overload for UI call sites that pass a `Claim[]` list with `suggestedFix` strings.
   * Applies each fix by direct string replacement and generates a standard unified diff.
   *
   * @param originalText The baseline unedited manuscript text.
   * @param claims       List of claims; only those with a non-empty `suggestedFix` are applied.
   * @param fileName     Target filename used in the patch header (e.g. 'manuscript.tex').
   */
  static generateUnifiedPatchFromClaims(
    originalText: string,
    claims: Claim[],
    fileName: string = 'manuscript.tex'
  ): string {
    if (!originalText) return '';

    const actionable = claims.filter(
      (c) => typeof c.suggestedFix === 'string' && c.suggestedFix.trim().length > 0
    );
    if (actionable.length === 0) return '';

    const sorted = [...actionable].sort((a, b) => a.startIndex - b.startIndex);
    let modifiedText = originalText;

    for (const claim of sorted) {
      const target = claim.text;
      const fix = claim.suggestedFix!;
      if (!target || !fix) continue;

      let applied = false;

      if (claim.context && claim.context.trim().length > 0) {
        const ctx = claim.context.trim();
        const ctxIdx = modifiedText.indexOf(ctx);
        if (ctxIdx !== -1 && ctx.includes(target)) {
          modifiedText =
            modifiedText.slice(0, ctxIdx) +
            ctx.replace(target, fix) +
            modifiedText.slice(ctxIdx + ctx.length);
          applied = true;
        }
      }

      if (!applied && modifiedText.includes(target)) {
        modifiedText = modifiedText.replace(target, fix);
      }
    }

    // Re-use the low-level generateUnifiedPatch with synthetic TextMutation objects
    // by delegating directly to the diff library path via string comparison.
    // Build a temporary tracker from the original to get the line-indexed patch.
    const tracker = new CoordinateDriftTracker(originalText);
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');

    // Find the first diverging line and synthesise a single mutation covering the whole delta
    let firstDiff = 0;
    while (
      firstDiff < originalLines.length &&
      firstDiff < modifiedLines.length &&
      originalLines[firstDiff] === modifiedLines[firstDiff]
    ) {
      firstDiff++;
    }

    if (firstDiff === originalLines.length && modifiedLines.length === originalLines.length) {
      return ''; // No actual change
    }

    // Compute byte offsets for the first divergence
    const startOffset = originalLines.slice(0, firstDiff).join('\n').length + (firstDiff > 0 ? 1 : 0);
    const endOffset = originalText.length;
    const newText = modifiedLines.slice(firstDiff).join('\n');
    const delta = newText.length - (endOffset - startOffset);

    tracker.registerMutation({ originalStartOffset: startOffset, originalEndOffset: endOffset, newText, delta });
    return DiffGenerator.generateUnifiedPatch(fileName, originalText, tracker.getMutations());
  }
}
