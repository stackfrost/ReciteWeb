import katex from 'katex';

export interface MathBlock {
  id: string;
  content: string; // Original raw LaTeX, e.g. "$E=mc^2$"
  rawFormula: string; // Formula without delimiters, e.g. "E=mc^2"
  type: 'inline' | 'display';
  renderedHtml?: string;
}

export interface ParsedDocument {
  text: string;
  mathBlocks: Map<string, MathBlock>;
}

export function parseMathBlocks(rawText: string): ParsedDocument {
  const mathBlocks = new Map<string, MathBlock>();
  let counter = 0;
  let text = rawText;

  // Helper to register a math block
  const registerBlock = (fullMatch: string, formula: string, type: 'inline' | 'display'): string => {
    const id = `[[MATH_BLOCK_${counter++}]]`;
    const cleanFormula = formula.trim();
    let renderedHtml = '';

    try {
      renderedHtml = katex.renderToString(cleanFormula, {
        displayMode: type === 'display',
        throwOnError: false,
        trust: false,
      });
    } catch {
      renderedHtml = `<span class="text-red-400 font-mono">${escapeHtml(fullMatch)}</span>`;
    }

    mathBlocks.set(id, {
      id,
      content: fullMatch,
      rawFormula: cleanFormula,
      type,
      renderedHtml,
    });

    return id;
  };

  // 1. Match LaTeX Display Environments: \begin{equation}...\end{equation}, \begin{align}...\end{align}, \[...\]
  const envRegex = /\\(?:begin\{(equation|align|gather|multline)\*?\}[\s\S]*?\\end\{\1\*?\}|\[[\s\S]*?\])/g;
  text = text.replace(envRegex, (match) => {
    // Extract inner content if it's \[...\]
    const inner = match.startsWith('\\[') ? match.slice(2, -2) : match;
    return registerBlock(match, inner, 'display');
  });

  // 2. Match Display Math $$...$$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    return registerBlock(match, formula, 'display');
  });

  // 3. Match Inline Math $...$ or \(...\)
  // Negative lookbehind (?<!\\) prevents matching escaped dollars \$
  const inlineRegex = /(?<!\\)\$([^$\n]+?)(?<!\\)\$|\\(?:\[([[\s\S]*?\])|\\(([\s\S]*?)\\\))/g;
  text = text.replace(inlineRegex, (match, p1, p2, p3) => {
    const formula = p1 || p2 || p3 || match.slice(1, -1);
    return registerBlock(match, formula, 'inline');
  });

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