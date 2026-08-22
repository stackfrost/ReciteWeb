import JSZip from 'jszip';
import {
  NormalizedASTDocument,
  ASTCitationNode,
  ASTMathNode,
  ASTCrossReferenceNode,
} from './universal-ast';

function getChildByTag(parent: Element, tagNames: string[]): Element | undefined {
  const children = Array.from(parent.childNodes || []).filter((n) => n.nodeType === 1) as Element[];
  return children.find((c) => {
    const t = (c.tagName || c.nodeName || '').toLowerCase();
    const l = (c.localName || '').toLowerCase();
    return tagNames.includes(t) || tagNames.includes(l);
  });
}

function findElementsByTagNames(docOrElement: Document | Element, tags: string[]): Element[] {
  const result: Element[] = [];
  for (const tag of tags) {
    const list = docOrElement.getElementsByTagName(tag);
    if (list && list.length > 0) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!result.includes(item)) {
          result.push(item);
        }
      }
    }
  }
  return result;
}

/**
 * Converts basic OMML XML nodes (<m:oMath>) to LaTeX representation.
 * Handles subscripts, superscripts, fractions, radicals, and basic symbols.
 */
function ommlToLatex(mathElement: Element): string {
  if (!mathElement) return '';
  let latex = '';

  const childNodes = Array.from(mathElement.childNodes || []);
  for (const child of childNodes) {
    if (child.nodeType === 3) {
      latex += child.nodeValue || '';
      continue;
    }
    if (child.nodeType !== 1) continue;

    const el = child as Element;
    const tagName = (el.tagName || el.nodeName || '').toLowerCase();
    const localName = (el.localName || '').toLowerCase();

    if (tagName === 'm:f' || localName === 'f') {
      // Fraction: <m:num> / <m:den>
      const num = getChildByTag(el, ['m:num', 'num']);
      const den = getChildByTag(el, ['m:den', 'den']);
      const numText = num ? ommlToLatex(num) : '';
      const denText = den ? ommlToLatex(den) : '';
      latex += `\\frac{${numText}}{${denText}}`;
    } else if (tagName === 'm:ssub' || localName === 'ssub') {
      // Subscript: <m:e> base, <m:sub> sub
      const base = getChildByTag(el, ['m:e', 'e']);
      const sub = getChildByTag(el, ['m:sub', 'sub']);
      const baseText = base ? ommlToLatex(base) : '';
      const subText = sub ? ommlToLatex(sub) : '';
      latex += `${baseText}_{${subText}}`;
    } else if (tagName === 'm:ssup' || localName === 'ssup') {
      // Superscript: <m:e> base, <m:sup> sup
      const base = getChildByTag(el, ['m:e', 'e']);
      const sup = getChildByTag(el, ['m:sup', 'sup']);
      const baseText = base ? ommlToLatex(base) : '';
      const supText = sup ? ommlToLatex(sup) : '';
      latex += `${baseText}^{${supText}}`;
    } else if (tagName === 'm:rad' || localName === 'rad') {
      // Radical / Square Root: <m:deg> (opt), <m:e> base
      const deg = getChildByTag(el, ['m:deg', 'deg']);
      const base = getChildByTag(el, ['m:e', 'e']);
      const degText = deg && deg.textContent ? `[${deg.textContent.trim()}]` : '';
      const baseText = base ? ommlToLatex(base) : '';
      latex += `\\sqrt${degText}{${baseText}}`;
    } else if (tagName === 'm:r' || localName === 'r' || tagName === 'm:t' || localName === 't') {
      latex += el.textContent || '';
    } else {
      latex += ommlToLatex(el);
    }
  }

  return latex.trim() || mathElement.textContent || '';
}

export async function parseDocxDocument(fileBuffer: ArrayBuffer): Promise<NormalizedASTDocument> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('text');

  if (!documentXml) {
    throw new Error('Invalid .docx archive: word/document.xml not found.');
  }

  let parser: DOMParser;
  if (typeof DOMParser !== 'undefined') {
    parser = new DOMParser();
  } else if ((globalThis as any).DOMParser) {
    parser = new (globalThis as any).DOMParser();
  } else {
    const { DOMParser: NodeDOMParser } = await import('@xmldom/xmldom');
    parser = new NodeDOMParser() as unknown as DOMParser;
  }

  const xmlDoc = parser.parseFromString(documentXml, 'application/xml');

  const citations: ASTCitationNode[] = [];
  const mathBlocks: ASTMathNode[] = [];
  const crossReferences: ASTCrossReferenceNode[] = [];
  const mathTokenMap = new Map<string, string>();
  let mathCounter = 0;

  // 1. Extract Embedded Zotero / Mendeley / EndNote Field Codes
  const fieldInstructionNodes = findElementsByTagNames(xmlDoc, ['w:instrText', 'instrText']);
  for (let i = 0; i < fieldInstructionNodes.length; i++) {
    const rawInstruction = fieldInstructionNodes[i].textContent || '';

    // Zotero Reference Pattern
    if (rawInstruction.includes('ADDIN ZOTERO_ITEM')) {
      try {
        const jsonMatch = rawInstruction.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const payload = JSON.parse(jsonMatch[0]);
          const keys: string[] =
            payload.citationItems?.map(
              (item: { citationKey?: string; key?: string; uri?: string[] }) =>
                item.citationKey || item.key || 'unresolved_zotero_key'
            ) || [];

          citations.push({
            type: 'citation',
            keys,
            rawText: rawInstruction,
            startIndex: i,
            endIndex: i + rawInstruction.length,
          });
        }
      } catch {
        // Ignore malformed JSON field strings
      }
    }

    // EndNote / Mendeley Citation Pattern
    if (rawInstruction.includes('ADDIN EN.CITE') || rawInstruction.includes('ADDIN Mendeley')) {
      const citeMatch = rawInstruction.match(/(?:RecID|CitationKey)\s*[:=]\s*["']?([^"'\s}]+)/i);
      if (citeMatch) {
        citations.push({
          type: 'citation',
          keys: [citeMatch[1].trim()],
          rawText: rawInstruction,
          startIndex: i,
          endIndex: i + rawInstruction.length,
        });
      }
    }
  }

  // 2. Extract and Quarantine OMML Math Elements (<m:oMath> and <m:oMathPara>)
  const mathNodes = findElementsByTagNames(xmlDoc, ['m:oMath', 'oMath']);
  for (let i = 0; i < mathNodes.length; i++) {
    const mathElem = mathNodes[i];
    const rawLatexMath = ommlToLatex(mathElem);
    const salt = Math.random().toString(36).substring(2, 8).toUpperCase();
    const token = `__RECITEAI_DOCX_MATH_${mathCounter}_${salt}__`;

    const parentNode = (mathElem.parentElement || mathElem.parentNode) as Element | null;
    const parentName = (parentNode?.tagName || parentNode?.nodeName || parentNode?.localName || '').toLowerCase();
    const isDisplay = parentName.includes('omathpara');

    mathTokenMap.set(token, `$${rawLatexMath}$`);
    mathBlocks.push({
      type: 'math',
      content: rawLatexMath,
      displayMode: isDisplay,
      quarantineToken: token,
      startIndex: i,
      endIndex: i + rawLatexMath.length,
    });

    // Replace the XML node with a placeholder text node so text extraction preserves position
    const textReplacement = xmlDoc.createTextNode(` ${token} `);
    mathElem.parentNode?.replaceChild(textReplacement, mathElem);
    mathCounter++;
  }

  // 3. Reconstruct Linear Paragraph Text (<w:p>)
  const paragraphs = findElementsByTagNames(xmlDoc, ['w:p', 'p']);
  const paragraphTexts: string[] = [];

  for (const p of paragraphs) {
    const text = p.textContent?.trim();
    if (text) {
      paragraphTexts.push(text);
    }
  }

  const sanitizedContent = paragraphTexts.join('\n\n');

  // Fallback: Scan reconstructed text for standard bracketed citations if no field codes existed (e.g. [1], [Smith2020])
  if (citations.length === 0) {
    const bracketCitationRegex = /\[([a-zA-Z0-9_\-:,;\s]+)\]/g;
    for (const match of sanitizedContent.matchAll(bracketCitationRegex)) {
      const candidateKeys = match[1]
        .split(/[,;]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0 && !/^\d+$/.test(k)); // Exclude pure numbers if desired or keep for numbered references

      if (candidateKeys.length > 0) {
        citations.push({
          type: 'citation',
          keys: candidateKeys,
          rawText: match[0],
          startIndex: match.index ?? 0,
          endIndex: (match.index ?? 0) + match[0].length,
        });
      }
    }
  }

  return {
    format: 'docx',
    rawContent: sanitizedContent,
    sanitizedContent,
    citations,
    mathBlocks,
    crossReferences,
    mathTokenMap,
  };
}
