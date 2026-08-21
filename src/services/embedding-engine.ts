/**
 * src/services/embedding-engine.ts
 *
 * Zero-knowledge local vector embedding engine powered by @xenova/transformers.
 * Executes in-process using the Xenova/all-MiniLM-L6-v2 ONNX model.
 * No data, claims, or manuscript tokens leave the user's local machine.
 */

// Global singleton instance holder for the feature extraction pipeline
let pipelineInstance: any = null;
let pipelinePromise: Promise<any> | null = null;

export interface ModelDownloadProgress {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

/**
 * Singleton manager for the local all-MiniLM-L6-v2 ONNX embedding pipeline.
 */
export class LocalEmbeddingEngine {
  private static readonly MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

  /**
   * Initializes or returns the cached transformer pipeline instance.
   * Uses dynamic import to prevent SSR build issues in Next.js.
   *
   * @param onProgress Optional callback to monitor model download progress (~22MB on first run).
   */
  public static async getPipeline(
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<any> {
    if (pipelineInstance) {
      return pipelineInstance;
    }

    if (!pipelinePromise) {
      pipelinePromise = (async () => {
        const { pipeline, env } = await import('@xenova/transformers');

        // Configure environment for local browser/node caching
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        const extractor = await pipeline('feature-extraction', LocalEmbeddingEngine.MODEL_NAME, {
          progress_callback: onProgress,
        });

        pipelineInstance = extractor;
        return extractor;
      })();
    }

    return pipelinePromise;
  }

  /**
   * Extracts a normalized 384-dimensional dense vector for a single text input.
   *
   * @param text String to embed.
   * @returns 384-element array representing the mean-pooled, L2-normalized embedding.
   */
  public static async getEmbedding(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
      return new Array(384).fill(0);
    }

    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });

    return Array.from(output.data);
  }

  /**
   * Batch extracts embeddings for an array of text chunks.
   *
   * @param texts Array of strings to embed.
   * @returns Array of 384-element vector arrays.
   */
  public static async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Process in batches of 16 to keep UI responsiveness and memory bounded
    const BATCH_SIZE = 16;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((t) => this.getEmbedding(t));
      const batchResults = await Promise.all(batchPromises);
      allEmbeddings.push(...batchResults);
    }

    return allEmbeddings;
  }
}

/**
 * Top-level async helper to generate an embedding for a text string.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  return LocalEmbeddingEngine.getEmbedding(text);
}
