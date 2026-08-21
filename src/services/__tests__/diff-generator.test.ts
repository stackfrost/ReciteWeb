import { describe, it, expect, beforeEach } from 'vitest';
import { DiffGenerator } from '../diff-generator';
import { CoordinateDriftTracker } from '../coordinate-tracker';

describe('DiffGenerator', () => {
  const originalSource = `line 0
line 1
line 2
line 3
line 4
line 5
line 6
line 7
line 8
line 9
line 10`;

  let tracker: CoordinateDriftTracker;

  beforeEach(() => {
    tracker = new CoordinateDriftTracker(originalSource);
  });

  it('generates a unified diff with exactly 3 context lines for a single mutation', () => {
    // Modify 'line 4' to 'line FOUR'
    const startOffset = originalSource.indexOf('line 4');
    const endOffset = startOffset + 6; // 'line 4'.length
    
    tracker.registerMutation({
      originalStartOffset: startOffset,
      originalEndOffset: endOffset,
      newText: 'line FOUR',
      delta: 3
    });

    const projectChanges = new Map();
    projectChanges.set('test.tex', { tracker, originalSource });

    const patches = DiffGenerator.generatePatches(projectChanges);
    const patch = patches.get('test.tex');

    expect(patch).toBeDefined();
    // Context should be lines 1-3, and lines 5-7
    // Line indices: 1, 2, 3 (before), 4 (changed), 5, 6, 7 (after) -> Total 7 lines in hunk
    // line 1 is line index 1. 0-indexed it's 1. 1-indexed it is 2.
    // wait, hunk header for context:
    // startLineIdx = 4 (line 4)
    // contextStartLineIdx = 1 (line 1)
    // contextEndLineIdx = 7 (line 7)
    // origStartLine = 1 (line 1 is the 2nd line, so 1-indexed is 2)
    // Let's verify the patch format:
    expect(patch).toContain('--- a/test.tex\n+++ b/test.tex\n');
    expect(patch).toContain('@@ -2,7 +2,7 @@');
    expect(patch).toContain(' line 1');
    expect(patch).toContain(' line 2');
    expect(patch).toContain(' line 3');
    expect(patch).toContain('-line 4');
    expect(patch).toContain('+line FOUR');
    expect(patch).toContain(' line 5');
    expect(patch).toContain(' line 6');
    expect(patch).toContain(' line 7');
  });

  it('merges mutations into a single hunk if they are closer than 3 lines apart', () => {
    // Modify 'line 4' and 'line 6'
    // They are 2 lines apart (line 5 is in between) -> they should merge!
    const start4 = originalSource.indexOf('line 4');
    tracker.registerMutation({
      originalStartOffset: start4,
      originalEndOffset: start4 + 6,
      newText: 'line FOUR',
      delta: 3
    });

    const start6 = originalSource.indexOf('line 6');
    tracker.registerMutation({
      originalStartOffset: start6,
      originalEndOffset: start6 + 6,
      newText: 'line SIX',
      delta: 2
    });

    const patch = DiffGenerator.generateUnifiedPatch('test.tex', originalSource, tracker.getMutations());

    // Single hunk expected
    // start is 4 and 6. Context start is 1, context end is 9.
    // lines: 1 to 9 -> 9 lines total
    expect(patch).toContain('@@ -2,9 +2,9 @@');
    expect(patch).toContain('-line 4');
    expect(patch).toContain('+line FOUR');
    expect(patch).toContain(' line 5');
    expect(patch).toContain('-line 6');
    expect(patch).toContain('+line SIX');
    expect(patch).not.toContain('@@ -6,'); // should not have a second hunk
  });

  describe('validatePatch (Dry-Run Validator)', () => {
    it('returns true for a pristine, correctly generated patch', () => {
      const startOffset = originalSource.indexOf('line 5');
      tracker.registerMutation({
        originalStartOffset: startOffset,
        originalEndOffset: startOffset + 6,
        newText: 'line FIVE',
        delta: 3
      });
      
      const patch = DiffGenerator.generateUnifiedPatch('test.tex', originalSource, tracker.getMutations());
      const result = DiffGenerator.validatePatch(originalSource, patch);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns false if the patch context lines mismatch the original source', () => {
      const patch = `--- a/test.tex
+++ b/test.tex
@@ -2,7 +2,7 @@
 wrong context
 line 2
 line 3
-line 4
+line FOUR
 line 5
 line 6
 line 7
`;
      const result = DiffGenerator.validatePatch(originalSource, patch);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Context mismatch at line 2');
    });

    it('returns false if the original line counts in the hunk header are wrong', () => {
      const patch = `--- a/test.tex
+++ b/test.tex
@@ -2,8 +2,7 @@
 line 1
 line 2
 line 3
-line 4
+line FOUR
 line 5
 line 6
 line 7
`;
      const result = DiffGenerator.validatePatch(originalSource, patch);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Hunk original line count mismatch');
    });
  });
});
