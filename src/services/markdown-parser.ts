import { NormalizedASTDocument, ASTCitationNode, ASTMathNode } from './universal-ast';

export function parseScientificMarkdown(rawMarkdown: string): NormalizedASTDocument {
  const mathTokenMap = new Map<string, string>();
  const citations: ASTCitationNode[] = [];
  const mathBlocks: ASTMathNode[] = [];

  let counter = 0;

  // 1. Quarantine Markdown / Quarto Math ($$...$$ and $...$)
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+\$)/g;
  const sanitizedContent = rawMarkdown.replace(mathRegex, (match, _p1, offset) => {
    const isDisplay = match.startsWith('$$');
    const salt = Math.random().toString(36).substring(2, 8).toUpperCase();
    const token = `__RECITEAI_MD_MATH_${counter}_${salt}__`;

    mathTokenMap.set(token, match);
    mathBlocks.push({
      type: 'math',
      content: isDisplay ? match.slice(2, -2).trim() : match.slice(1, -1).trim(),
      displayMode: isDisplay,
      quarantineToken: token,
      startIndex: offset,
      endIndex: offset + match.length,
    });

    counter++;
    return token;
  });

  // 2. Extract Pandoc Citations: [@key], [@key1; @key2], and @key
  const pandocBracketRegex = /\[@([^\]]+)\]/g;
  for (const match of sanitizedContent.matchAll(pandocBracketRegex)) {
    const rawKeys = match[1];
    const keys = rawKeys.split(';').map((k) => k.trim().replace(/^@/, ''));
    citations.push({
      type: 'citation',
      keys,
      rawText: match[0],
      startIndex: match.index ?? 0,
      endIndex: (match.index ?? 0) + match[0].length,
    });
  }

  return {
    format: 'markdown',
    rawContent: rawMarkdown,
    sanitizedContent,
    citations,
    mathBlocks,
    crossReferences: [],
    mathTokenMap,
  };
}
