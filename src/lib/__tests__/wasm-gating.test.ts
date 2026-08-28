import { describe, it, expect } from 'vitest';
import { wasmParser } from '../wasm-loader';

describe('WASM Client-Side Gating & Parser', () => {
  // Generate a multi-page LaTeX document with 15 citations across 20 simulated pages
  const generateMultiPageDoc = () => {
    let content = '\\documentclass{article}\n\\begin{document}\n';
    for (let page = 1; page <= 20; page++) {
      content += `\\section{Page ${page}}\n`;
      content += `Here is claim on page ${page} discussing prior findings \\cite{ref_page_${page}}.\n`;
      content += `Numerical citation appears here [${page}].\n`;
      content += `Author year citation appears here (Author${page}, 202${page % 5}).\n`;
      content += '\\newpage\n';
    }
    content += '\\end{document}';
    return content;
  };

  it('truncates document to 5 pages and caps at 6 claims for FREE tier', async () => {
    const doc = generateMultiPageDoc();
    const result = wasmParser.fallbackParse(doc, 'FREE');

    expect(result.success).toBe(true);
    expect(result.claims.length).toBeLessThanOrEqual(6);
    expect(result.totalPagesProcessed).toBeLessThanOrEqual(5);
    expect(result.isTruncated).toBe(true);
  });

  it('processes full document and extracts up to 50 claims for PRO tier', async () => {
    const doc = generateMultiPageDoc();
    const result = wasmParser.fallbackParse(doc, 'PRO');

    expect(result.success).toBe(true);
    expect(result.claims.length).toBeGreaterThan(6);
    expect(result.claims.length).toBeLessThanOrEqual(50);
    expect(result.totalPagesProcessed).toBeGreaterThan(5);
  });

  it('correctly parses LaTeX citations', async () => {
    const text = 'Recent breakthroughs in transformers \\cite{vaswani2017attention, devlin2018bert} improved translation.';
    const result = wasmParser.fallbackParse(text, 'PRO');

    expect(result.claims.length).toBe(1);
    expect(result.claims[0].citationKey).toBe('vaswani2017attention');
    expect(result.claims[0].claimSentence).toContain('Recent breakthroughs in transformers');
  });

  it('handles ArrayBuffer input correctly', async () => {
    const text = 'Analyzing results \\cite{smith2024}.';
    const buffer = new TextEncoder().encode(text).buffer;
    const result = wasmParser.fallbackParse(buffer, 'FREE');

    expect(result.success).toBe(true);
    expect(result.claims.length).toBe(1);
    expect(result.claims[0].citationKey).toBe('smith2024');
  });
});
