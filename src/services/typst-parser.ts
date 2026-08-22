import { NormalizedASTDocument, ASTCitationNode, ASTMathNode, ASTCrossReferenceNode } from './universal-ast';

export function parseTypstDocument(rawTypst: string): NormalizedASTDocument {
  const mathTokenMap = new Map<string, string>();
  const citations: ASTCitationNode[] = [];
  const mathBlocks: ASTMathNode[] = [];
  const crossReferences: ASTCrossReferenceNode[] = [];

  let counter = 0;

  // 1. Quarantine Typst Math ($...$ for inline, $...$ with linebreaks for display)
  const mathRegex = /(\$[\s\S]*?\$)/g;
  const sanitizedContent = rawTypst.replace(mathRegex, (match, _p1, offset) => {
    const isDisplay = match.startsWith('$') && match.endsWith('$') && match.includes('\n');
    const salt = Math.random().toString(36).substring(2, 8).toUpperCase();
    const token = `__RECITEAI_TYPST_MATH_${counter}_${salt}__`;

    mathTokenMap.set(token, match);
    mathBlocks.push({
      type: 'math',
      content: match.slice(1, -1).trim(),
      displayMode: isDisplay,
      quarantineToken: token,
      startIndex: offset,
      endIndex: offset + match.length,
    });

    counter++;
    return token;
  });

  // 2. Extract Typst Citations: #cite(<key>), #cite("key"), and @key
  const citeFuncRegex = /#cite\(\s*[<"]([^>"]+)[>"]\s*\)/g;
  for (const match of sanitizedContent.matchAll(citeFuncRegex)) {
    citations.push({
      type: 'citation',
      keys: [match[1].trim()],
      rawText: match[0],
      startIndex: match.index ?? 0,
      endIndex: (match.index ?? 0) + match[0].length,
    });
  }

  const atCiteRegex = /(?<!\w)@([a-zA-Z0-9_\-:]+)/g;
  for (const match of sanitizedContent.matchAll(atCiteRegex)) {
    const key = match[1].trim();
    // Check if it corresponds to cross-reference or citation
    citations.push({
      type: 'citation',
      keys: [key],
      rawText: match[0],
      startIndex: match.index ?? 0,
      endIndex: (match.index ?? 0) + match[0].length,
    });
  }

  // 3. Extract Standalone Labels: <label-name> (ignoring #cite(<...>))
  const labelScanContent = sanitizedContent.replace(citeFuncRegex, (m) => ' '.repeat(m.length));
  const labelRegex = /<([a-zA-Z0-9_\-:]+)>/g;
  for (const match of labelScanContent.matchAll(labelRegex)) {
    crossReferences.push({
      type: 'cross-reference',
      targetLabel: match[1].trim(),
      rawText: match[0],
      startIndex: match.index ?? 0,
      endIndex: (match.index ?? 0) + match[0].length,
    });
  }

  return {
    format: 'typst',
    rawContent: rawTypst,
    sanitizedContent,
    citations,
    mathBlocks,
    crossReferences,
    mathTokenMap,
  };
}
