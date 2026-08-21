import { describe, it, expect } from 'vitest';
import { CoordinateDriftTracker, CoordinateCorruptionError, TextMutation } from '../coordinate-tracker';
import { BaseASTNode } from '../../lib/parsers/tex-parser';

describe('Coordinate Drift Tracker Engine', () => {
  it('Test 1: Single upstream insertion shifts downstream nodes correctly', () => {
    // 0123456789 (10 chars)
    const originalText = "Hello Node"; 
    const tracker = new CoordinateDriftTracker(originalText);

    // Insert 50 chars at offset 5
    const mutation: TextMutation = {
      originalStartOffset: 5,
      originalEndOffset: 5,
      newText: " ".repeat(50), // length 50
      delta: 50
    };
    tracker.registerMutation(mutation);

    const nodes: BaseASTNode[] = [
      { id: '1', type: 'text', filePath: 'test.tex', startOffset: 6, endOffset: 10 }
    ];
    
    tracker.shiftASTNodes(nodes);

    expect(nodes[0].startOffset).toBe(6 + 50);
    expect(nodes[0].endOffset).toBe(10 + 50);
  });

  it('Test 2: Multiple staggered deletions and insertions apply cumulatively', () => {
    const originalText = "A B C D E F"; 
    const tracker = new CoordinateDriftTracker(originalText);

    // Mut 1: Delete "B " (offset 2 to 4) -> delta -2
    tracker.registerMutation({
      originalStartOffset: 2,
      originalEndOffset: 4,
      newText: "",
      delta: -2
    });

    // Mut 2: Insert "XYZ" at offset 6 -> delta +3
    tracker.registerMutation({
      originalStartOffset: 6,
      originalEndOffset: 6,
      newText: "XYZ",
      delta: 3
    });

    // Node 'F' is originally at offset 10 to 11
    // It should be shifted by -2 + 3 = +1
    const nodes: BaseASTNode[] = [
      { id: '1', type: 'text', filePath: 'test.tex', startOffset: 10, endOffset: 11 }
    ];

    tracker.shiftASTNodes(nodes);

    expect(nodes[0].startOffset).toBe(11);
    expect(nodes[0].endOffset).toBe(12);
  });

  it('Test 3: Line/Column recalculation handles upstream newlines correctly', () => {
    const originalText = "Line 1\nLine 2\nLine 3"; // 21 chars, \n at index 6 and 13
    const tracker = new CoordinateDriftTracker(originalText);

    // Node originally on Line 3 (starts at 14)
    const nodes: BaseASTNode[] = [
      { 
        id: '1', type: 'text', filePath: 'test.tex', 
        startOffset: 14, endOffset: 18, 
        loc: { 
          start: { line: 3, column: 1, offset: 14 }, 
          end: { line: 3, column: 5, offset: 18 } 
        } 
      }
    ];

    // Mutate Line 1: insert 3 newlines
    tracker.registerMutation({
      originalStartOffset: 6,
      originalEndOffset: 6,
      newText: "\n\n\n",
      delta: 3
    });

    tracker.shiftASTNodes(nodes);

    // Line 3 should now be Line 6
    expect(nodes[0].loc?.start.line).toBe(6);
    expect(nodes[0].loc?.start.column).toBe(1);
    expect(nodes[0].startOffset).toBe(17);
  });

  it('Test 4: Corruption Guard throws error when querying inside mutated region', () => {
    const originalText = "0123456789"; 
    const tracker = new CoordinateDriftTracker(originalText);

    tracker.registerMutation({
      originalStartOffset: 2,
      originalEndOffset: 5,
      newText: "XXX",
      delta: 0
    });

    // A node at offset 3 is completely destroyed by the mutation
    const nodes: BaseASTNode[] = [
      { id: '1', type: 'text', filePath: 'test.tex', startOffset: 3, endOffset: 4 }
    ];

    expect(() => tracker.shiftASTNodes(nodes)).toThrow(CoordinateCorruptionError);
  });
});
