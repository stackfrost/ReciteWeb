import { DocumentNode, ASTNode } from '../lib/parsers/tex-parser';

export type TokenEstimator = (content: string) => number;

export class ASTChunker {
  /**
   * Default fallback token estimator (approximates 4 characters per token).
   */
  public static defaultEstimator: TokenEstimator = (content: string) => Math.ceil(content.length / 4);

  /**
   * Slices an AST into LLM-safe boundaries without severing individual nodes.
   * Strictly respects file boundaries, ensuring nodes from different files are never mixed.
   * 
   * @param ast The document root node to chunk
   * @param maxTokens The maximum number of tokens per chunk
   * @param estimator Token estimation function (defaults to char length / 4)
   * @returns An array of chunks, where each chunk is an array of unbroken ASTNodes
   */
  public sliceByBoundary(
    ast: DocumentNode, 
    maxTokens: number, 
    estimator: TokenEstimator = ASTChunker.defaultEstimator
  ): ASTNode[][] {
    const chunks: ASTNode[][] = [];
    let currentChunk: ASTNode[] = [];
    let currentTokens = 0;
    let currentFilePath: string | null = null;

    const pushChunk = () => {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentTokens = 0;
        currentFilePath = null;
      }
    };

    for (const node of ast.children) {
      // Reconstruct a string of the exact byte length for the estimator.
      // This is necessary because nodes might belong to subfiles not present in ast.rawContent.
      const byteLength = Math.max(0, node.endOffset - node.startOffset);
      const dummyContent = "a".repeat(byteLength);
      const nodeTokens = estimator(dummyContent);

      // Condition 1: File Boundary Change
      // If we are crossing into a new file, we MUST seal the current chunk.
      if (currentFilePath !== null && currentFilePath !== node.filePath) {
        pushChunk();
      }

      // Condition 2: Max Tokens Exceeded
      // If adding this node exceeds the limit, seal the current chunk.
      if (currentTokens + nodeTokens > maxTokens && currentChunk.length > 0) {
        pushChunk();
      }

      currentChunk.push(node);
      currentTokens += nodeTokens;
      currentFilePath = node.filePath;

      // Condition 3: Strict Sever Guard
      // If a single node is inherently larger than maxTokens, it is placed in a chunk 
      // by itself. Since it was just pushed into an empty chunk above, we seal it immediately.
      if (nodeTokens >= maxTokens) {
        pushChunk();
      }
    }

    // Flush any remaining nodes
    pushChunk();

    return chunks;
  }
}
