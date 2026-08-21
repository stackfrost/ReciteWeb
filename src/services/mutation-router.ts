import { CoordinateDriftTracker, TextMutation } from './coordinate-tracker';

export interface RoutedMutation {
  filePath: string;
  mutation: TextMutation;
}

/**
 * Routes text mutations to the correct file's coordinate tracker.
 * Serializes multi-file parallel mutations into a strict bottom-up chronological queue
 * to prevent upstream offset shifts from invalidating downstream offsets during batch application.
 */
export class ProjectMutationRouter {
  private trackers: Map<string, CoordinateDriftTracker> = new Map();

  /**
   * Initializes a coordinate tracker for a specific file.
   * Required before routing mutations to ensure the tracker can map newlines correctly.
   */
  public initializeFile(filePath: string, originalText: string): void {
    if (!this.trackers.has(filePath)) {
      this.trackers.set(filePath, new CoordinateDriftTracker(originalText));
    }
  }

  /**
   * Retrieves the localized tracker for a file.
   */
  public getTracker(filePath: string): CoordinateDriftTracker | undefined {
    return this.trackers.get(filePath);
  }

  /**
   * Routes a single mutation to the appropriate file's tracker.
   */
  public applyMutation(filePath: string, mutation: TextMutation): void {
    const tracker = this.trackers.get(filePath);
    if (!tracker) {
      throw new Error(`Mutation Router Error: File "${filePath}" is not initialized. Call initializeFile() first.`);
    }
    tracker.registerMutation(mutation);
  }

  /**
   * Sorts an array of mutations from bottom to top (descending originalStartOffset).
   * This is mathematically required: when applying mutations to a file, applying lower offsets
   * first would shift the original coordinate system for all higher offsets, corrupting them.
   */
  public serializeQueue(mutations: RoutedMutation[]): RoutedMutation[] {
    return [...mutations].sort((a, b) => {
      // Sort strictly by originalStartOffset descending.
      // If multiple mutations start at the exact same offset, order doesn't technically matter 
      // as they'd overwrite each other or be in an undefined state in our strict tracker,
      // but we maintain stable sort by preserving insertion order as a secondary metric if possible.
      return b.mutation.originalStartOffset - a.mutation.originalStartOffset;
    });
  }

  /**
   * Processes a batch of mutations safely by sorting them bottom-up first,
   * then routing them to their respective trackers.
   */
  public applyBatch(mutations: RoutedMutation[]): void {
    const sortedQueue = this.serializeQueue(mutations);
    for (const item of sortedQueue) {
      this.applyMutation(item.filePath, item.mutation);
    }
  }
}
