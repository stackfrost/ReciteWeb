import { describe, it, expect, vi } from 'vitest';
import { ProjectMutationRouter, RoutedMutation } from '../mutation-router';
import { ASTChunker, TokenEstimator } from '../ast-chunker';
import { DocumentNode, ASTNode, TextNode } from '../../lib/parsers/tex-parser';

describe('Mutation Router & AST-Aware Chunker', () => {
  describe('ProjectMutationRouter', () => {
    it('Test 1: Feeds out-of-order mutations and verifies bottom-up chronological sorting', () => {
      const router = new ProjectMutationRouter();
      
      const mutations: RoutedMutation[] = [
        { filePath: '/main.tex', mutation: { originalStartOffset: 10, originalEndOffset: 15, newText: "A", delta: -4 } },
        { filePath: '/methods.tex', mutation: { originalStartOffset: 100, originalEndOffset: 105, newText: "B", delta: -4 } },
        { filePath: '/main.tex', mutation: { originalStartOffset: 50, originalEndOffset: 55, newText: "C", delta: -4 } },
        { filePath: '/main.tex', mutation: { originalStartOffset: 0, originalEndOffset: 5, newText: "D", delta: -4 } },
        { filePath: '/methods.tex', mutation: { originalStartOffset: 20, originalEndOffset: 25, newText: "E", delta: -4 } },
      ];

      const sorted = router.serializeQueue(mutations);

      // We expect strict descending order of originalStartOffset
      expect(sorted.length).toBe(5);
      expect(sorted[0].mutation.originalStartOffset).toBe(100); // /methods.tex
      expect(sorted[1].mutation.originalStartOffset).toBe(50);  // /main.tex
      expect(sorted[2].mutation.originalStartOffset).toBe(20);  // /methods.tex
      expect(sorted[3].mutation.originalStartOffset).toBe(10);  // /main.tex
      expect(sorted[4].mutation.originalStartOffset).toBe(0);   // /main.tex
    });
  });

  describe('ASTChunker', () => {
    it('Test 2: Splits 10 nodes into exactly 3 chunks without severing individual nodes', () => {
      const chunker = new ASTChunker();
      
      const children: ASTNode[] = [];
      // Create 10 TextNodes, each exactly 20 characters long.
      // Under our dummy estimator (1 token per character for simplicity in this test),
      // each node is exactly 20 tokens.
      for (let i = 0; i < 10; i++) {
        children.push({
          id: `para-${i}`,
          type: 'text',
          filePath: '/main.tex',
          startOffset: i * 20,
          endOffset: (i * 20) + 20,
          content: "A".repeat(20)
        } as TextNode);
      }

      const mockAST = {
        id: 'doc-1',
        type: 'document',
        filePath: '/main.tex',
        startOffset: 0,
        endOffset: 200,
        rawContent: "A".repeat(200),
        children,
        includes: [],
        citations: [],
        mathNodes: [],
        sections: []
      } as unknown as DocumentNode;

      // Custom estimator: 1 token = 1 character
      const exactEstimator: TokenEstimator = (content) => content.length;

      // We want to force it into 3 distinct arrays.
      // 10 nodes = 200 tokens total.
      // 3 chunks could be: 4 nodes (80 tokens), 4 nodes (80 tokens), 2 nodes (40 tokens).
      // If maxTokens is 80, it should perfectly yield chunks of 4, 4, 2.
      const chunks = chunker.sliceByBoundary(mockAST, 80, exactEstimator);

      expect(chunks.length).toBe(3);
      
      // Chunk 1 has 4 nodes
      expect(chunks[0].length).toBe(4);
      expect(chunks[0][0].id).toBe('para-0');
      expect(chunks[0][3].id).toBe('para-3');
      
      // Chunk 2 has 4 nodes
      expect(chunks[1].length).toBe(4);
      expect(chunks[1][0].id).toBe('para-4');
      expect(chunks[1][3].id).toBe('para-7');
      
      // Chunk 3 has 2 nodes
      expect(chunks[2].length).toBe(2);
      expect(chunks[2][0].id).toBe('para-8');
      expect(chunks[2][1].id).toBe('para-9');
    });

    it('should strictly respect file boundaries and sever large nodes', () => {
      const chunker = new ASTChunker();
      
      const mockAST = {
        children: [
          { id: '1', filePath: '/a.tex', startOffset: 0, endOffset: 10 },
          { id: '2', filePath: '/a.tex', startOffset: 10, endOffset: 20 },
          { id: '3', filePath: '/b.tex', startOffset: 0, endOffset: 100 }, // huge node (100 tokens)
          { id: '4', filePath: '/b.tex', startOffset: 100, endOffset: 110 },
        ]
      } as unknown as DocumentNode;

      const exactEstimator: TokenEstimator = (content) => content.length;

      // Max tokens = 50
      const chunks = chunker.sliceByBoundary(mockAST, 50, exactEstimator);

      // Expected chunks:
      // Chunk 0: a.tex nodes (10 + 10 = 20 <= 50). Forced seal by b.tex file boundary.
      // Chunk 1: b.tex node 3 (100 > 50). Strict sever guard seals it immediately alone.
      // Chunk 2: b.tex node 4 (10 <= 50).
      
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(2);
      expect(chunks[0][0].filePath).toBe('/a.tex');
      
      expect(chunks[1].length).toBe(1);
      expect(chunks[1][0].id).toBe('3');
      
      expect(chunks[2].length).toBe(1);
      expect(chunks[2][0].id).toBe('4');
    });
  });
});
