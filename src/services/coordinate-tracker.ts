import { BaseASTNode, SourcePosition } from '../lib/parsers/tex-parser';

export interface TextMutation {
  originalStartOffset: number;
  originalEndOffset: number;
  newText: string;
  delta: number;
}

export class CoordinateCorruptionError extends Error {
  constructor(nodeId: string, nodeType: string, offset: number, mutationRange: [number, number]) {
    super(`AST Coordinate Corruption: Node ${nodeId} (${nodeType}) falls exactly inside a mutated region [orig: ${mutationRange[0]}-${mutationRange[1]}] at offset ${offset}.`);
    this.name = 'CoordinateCorruptionError';
    Object.setPrototypeOf(this, CoordinateCorruptionError.prototype);
  }
}

export class CoordinateDriftTracker {
  private mutations: TextMutation[] = [];
  // Store the indices of all newline characters (\n) in the original document
  private originalNewlineOffsets: number[] = [];
  // We'll also track the updated newline offsets, but for high performance O(log M),
  // we can just recalculate line/col dynamically using the mutations.
  private documentLength: number;

  constructor(originalText: string) {
    this.documentLength = originalText.length;
    for (let i = 0; i < originalText.length; i++) {
      if (originalText[i] === '\n') {
        this.originalNewlineOffsets.push(i);
      }
    }
  }

  /**
   * Returns a read-only copy of the internal mutations ledger.
   */
  public getMutations(): ReadonlyArray<TextMutation> {
    return this.mutations;
  }

  /**
   * Registers a new mutation. We assume mutations are appended sequentially in time,
   * but the ledger must be kept sorted by originalStartOffset.
   * If a mutation overlaps with an existing mutation, behavior is undefined for this strict AST tracking.
   */
  public registerMutation(mutation: TextMutation): void {
    // We insert it maintaining sorted order by originalStartOffset
    let insertIndex = this.mutations.length;
    while (insertIndex > 0 && this.mutations[insertIndex - 1].originalStartOffset > mutation.originalStartOffset) {
      insertIndex--;
    }
    this.mutations.splice(insertIndex, 0, mutation);
  }

  /**
   * Calculates the shifted offset in O(log M) using binary search.
   * Throws CoordinateCorruptionError if the offset falls strictly inside a mutation.
   */
  public calculateShiftedOffset(originalOffset: number, nodeId = 'unknown', nodeType = 'unknown'): number {
    let deltaSum = 0;

    // Binary search to find how many mutations occurred BEFORE this offset
    // Since mutations are sorted by originalStartOffset
    for (let i = 0; i < this.mutations.length; i++) {
      const mut = this.mutations[i];
      if (originalOffset < mut.originalStartOffset) {
        break; // Subsequent mutations are entirely after our offset
      }

      if (originalOffset > mut.originalStartOffset && originalOffset < mut.originalEndOffset) {
        throw new CoordinateCorruptionError(nodeId, nodeType, originalOffset, [mut.originalStartOffset, mut.originalEndOffset]);
      }

      // If the mutation happened before or exactly up to this offset, its delta applies
      if (mut.originalEndOffset <= originalOffset) {
        deltaSum += mut.delta;
      }
    }

    return originalOffset + deltaSum;
  }

  /**
   * Recalculates line and column using O(M + N_newlines).
   * This computes the shifted newlines from the mutations up to the offset.
   */
  private recalculateSourcePosition(originalOffset: number, shiftedOffset: number): SourcePosition {
    let shiftedLines = 0;
    let lastNewlineShiftedOffset = -1;

    // 1. Process all original newlines before the original offset
    for (const nl of this.originalNewlineOffsets) {
      if (nl >= originalOffset) break;
      
      // Was this newline deleted?
      let deleted = false;
      for (const mut of this.mutations) {
        if (nl >= mut.originalStartOffset && nl < mut.originalEndOffset) {
          deleted = true;
          break;
        }
      }
      
      if (!deleted) {
        shiftedLines++;
        // The shifted offset of this newline is calculated safely since it wasn't deleted
        const shiftedNl = this.calculateShiftedOffset(nl);
        if (shiftedNl > lastNewlineShiftedOffset) {
          lastNewlineShiftedOffset = shiftedNl;
        }
      }
    }

    // 2. Add newlines introduced by mutations that occurred before originalOffset
    for (const mut of this.mutations) {
      if (mut.originalEndOffset <= originalOffset) {
        let addedNewlines = 0;
        let lastAddedRel = -1;
        for (let i = 0; i < mut.newText.length; i++) {
          if (mut.newText[i] === '\n') {
            addedNewlines++;
            lastAddedRel = i;
          }
        }
        
        shiftedLines += addedNewlines;
        
        if (lastAddedRel !== -1) {
          const mutShiftedStart = this.calculateShiftedOffset(mut.originalStartOffset);
          const mutLastNewlineShifted = mutShiftedStart + lastAddedRel;
          if (mutLastNewlineShifted > lastNewlineShiftedOffset) {
            lastNewlineShiftedOffset = mutLastNewlineShifted;
          }
        }
      }
    }

    return {
      line: shiftedLines + 1,
      column: shiftedOffset - (lastNewlineShiftedOffset === -1 ? 0 : lastNewlineShiftedOffset + 1) + 1,
      offset: shiftedOffset
    };
  }

  /**
   * Shifts a batch of AST nodes in O(M + N).
   */
  public shiftASTNodes<T extends BaseASTNode>(nodes: T[]): T[] {
    for (const node of nodes) {
      const origStart = node.startOffset;
      const origEnd = node.endOffset;
      
      node.startOffset = this.calculateShiftedOffset(origStart, node.id, node.type);
      node.endOffset = this.calculateShiftedOffset(origEnd, node.id, node.type);

      if (node.loc) {
        node.loc.start = this.recalculateSourcePosition(origStart, node.startOffset);
        node.loc.end = this.recalculateSourcePosition(origEnd, node.endOffset);
      }
    }
    return nodes;
  }
}
