import katex from 'katex';

export interface MathBlock {
  id: string;
  content: string; // Original raw LaTeX, e.g. "$E=mc^2$"
  rawFormula: string; // Formula without delimiters, e.g. "E=mc^2"
  type: 'inline' | 'display';
  renderedHtml?: string;
  originalCoordinates?: {
    startOffset: number;
    endOffset: number;
  };
}

export interface ParsedDocument {
  text: string;
  mathBlocks: Map<string, MathBlock>;
}

import { QuarantineVault, quarantineSource } from './environment-quarantine';

export function parseMathBlocks(rawText: string): ParsedDocument {
  const mathBlocks = new Map<string, MathBlock>();
  const vault = new QuarantineVault();
  
  const text = quarantineSource(rawText, vault);

  const quarantinedBlocks = vault.getAll();

  for (const block of quarantinedBlocks) {
    if (block.type === 'listing') continue; // Skip non-math

    const type = block.type === 'display_math' ? 'display' : 'inline';
    let rawFormula = block.rawContent;

    // Strip delimiters for KaTeX
    if (rawFormula.startsWith('\\begin{')) {
      const endBrace = rawFormula.indexOf('}');
      if (endBrace !== -1) {
        const envName = rawFormula.slice(7, endBrace);
        rawFormula = rawFormula.replace(`\\begin{${envName}}`, '').replace(`\\end{${envName}}`, '');
      }
    } else if (rawFormula.startsWith('$$')) {
      rawFormula = rawFormula.slice(2, -2);
    } else if (rawFormula.startsWith('\\[')) {
      rawFormula = rawFormula.slice(2, -2);
    } else if (rawFormula.startsWith('\\(')) {
      rawFormula = rawFormula.slice(2, -2);
    } else if (rawFormula.startsWith('$')) {
      rawFormula = rawFormula.slice(1, -1);
    }

    const cleanFormula = rawFormula.trim();
    let renderedHtml = '';

    try {
      renderedHtml = katex.renderToString(cleanFormula, {
        displayMode: type === 'display',
        throwOnError: false,
        trust: false,
      });
    } catch {
      renderedHtml = `<span class="text-red-400 font-mono">${escapeHtml(block.rawContent)}</span>`;
    }

    mathBlocks.set(block.id, {
      id: block.id,
      content: block.rawContent,
      rawFormula: cleanFormula,
      type,
      renderedHtml,
      originalCoordinates: block.originalCoordinates,
    });
  }

  return { text, mathBlocks };
}

/**
 * Re-injects raw LaTeX back into text (e.g. for saving or exporting)
 */
export function reInjectMath(text: string, mathBlocks: Map<string, MathBlock>): string {
  let result = text;
  mathBlocks.forEach((block, id) => {
    result = result.split(id).join(block.content);
  });
  return result;
}

/**
 * Replaces placeholders with KaTeX pre-rendered HTML for UI display
 */
export function renderMathToHTML(text: string, mathBlocks: Map<string, MathBlock>): string {
  let result = text;
  mathBlocks.forEach((block, id) => {
    const html = block.renderedHtml || `<span class="font-mono text-emerald-400">${escapeHtml(block.content)}</span>`;
    result = result.split(id).join(html);
  });
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}