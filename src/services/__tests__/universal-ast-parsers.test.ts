import { describe, it, expect } from 'vitest';
import { parseTypstDocument } from '../typst-parser';
import { parseScientificMarkdown } from '../markdown-parser';

describe('Universal AST Ingestion Engine (src/services/typst-parser.ts & markdown-parser.ts)', () => {
  describe('Typst Parser (parseTypstDocument)', () => {
    it('quarantines inline and display Typst math with zero token leakage', () => {
      const rawTypst = `
#set page(paper: "a4")
We investigate $E = m c^2$ in relativistic kinematics.
Display formula:
$
  integral_0^infinity e^(-x) dif x = 1
$
      `.trim();

      const ast = parseTypstDocument(rawTypst);

      expect(ast.format).toBe('typst');
      expect(ast.mathBlocks.length).toBe(2);
      expect(ast.mathBlocks[0].displayMode).toBe(false);
      expect(ast.mathBlocks[0].content).toBe('E = m c^2');
      expect(ast.mathBlocks[1].displayMode).toBe(true);
      expect(ast.mathBlocks[1].content).toContain('integral_0^infinity');

      // Ensure tokens are injected into sanitizedContent
      expect(ast.sanitizedContent).not.toContain('$E = m c^2$');
      expect(ast.sanitizedContent).toContain(ast.mathBlocks[0].quarantineToken);
      expect(ast.mathTokenMap.get(ast.mathBlocks[0].quarantineToken)).toBe('$E = m c^2$');
    });

    it('extracts Typst citations: #cite(<key>), #cite("key"), and @key syntax', () => {
      const rawTypst = `
According to early quantum electrodynamics #cite(<feynman1949>) and seminal work by #cite("dirac1928"),
the electron self-energy was calculated. Later verified in @schwinger1948.
Check label <eq:schrodinger>.
      `.trim();

      const ast = parseTypstDocument(rawTypst);

      expect(ast.citations.length).toBe(3);
      expect(ast.citations[0].keys).toEqual(['feynman1949']);
      expect(ast.citations[1].keys).toEqual(['dirac1928']);
      expect(ast.citations[2].keys).toEqual(['schwinger1948']);

      expect(ast.crossReferences.length).toBe(1);
      expect(ast.crossReferences[0].targetLabel).toBe('eq:schrodinger');
    });
  });

  describe('Scientific Markdown & Quarto Parser (parseScientificMarkdown)', () => {
    it('quarantines inline and display LaTeX math in Markdown', () => {
      const rawMarkdown = `
# Introduction

The Hamiltonian is given by $H = \\sum_i \\frac{p_i^2}{2m}$.

$$
\\mathcal{L} = \\bar{\\psi}(i\\gamma^\\mu D_\\mu - m)\\psi
$$
      `.trim();

      const ast = parseScientificMarkdown(rawMarkdown);

      expect(ast.format).toBe('markdown');
      expect(ast.mathBlocks.length).toBe(2);
      expect(ast.mathBlocks[0].displayMode).toBe(false);
      expect(ast.mathBlocks[0].content).toBe('H = \\sum_i \\frac{p_i^2}{2m}');
      expect(ast.mathBlocks[1].displayMode).toBe(true);
      expect(ast.mathBlocks[1].content).toContain('\\mathcal{L}');

      expect(ast.sanitizedContent).toContain(ast.mathBlocks[0].quarantineToken);
      expect(ast.sanitizedContent).toContain(ast.mathBlocks[1].quarantineToken);
      expect(ast.mathTokenMap.get(ast.mathBlocks[0].quarantineToken)).toBe('$H = \\sum_i \\frac{p_i^2}{2m}$');
    });

    it('extracts single and multi-key Pandoc citations ([@author2024; @doe2023])', () => {
      const rawMarkdown = `
Previous studies [@einstein1905] established the photoelectric effect.
Multi-author findings [@author2024; @doe2023; @feynman1965] corroborate this.
      `.trim();

      const ast = parseScientificMarkdown(rawMarkdown);

      expect(ast.citations.length).toBe(2);
      expect(ast.citations[0].keys).toEqual(['einstein1905']);
      expect(ast.citations[1].keys).toEqual(['author2024', 'doe2023', 'feynman1965']);
    });
  });
});
