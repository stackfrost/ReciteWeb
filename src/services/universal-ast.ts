export type DocumentFormat = 'latex' | 'typst' | 'markdown' | 'docx';

export interface ASTCitationNode {
  type: 'citation';
  keys: string[];
  rawText: string;
  startIndex: number;
  endIndex: number;
}

export interface ASTMathNode {
  type: 'math';
  content: string;
  displayMode: boolean;
  quarantineToken: string;
  startIndex: number;
  endIndex: number;
}

export interface ASTCrossReferenceNode {
  type: 'cross-reference';
  targetLabel: string;
  rawText: string;
  startIndex: number;
  endIndex: number;
}

export interface NormalizedASTDocument {
  format: DocumentFormat;
  rawContent: string;
  sanitizedContent: string;
  citations: ASTCitationNode[];
  mathBlocks: ASTMathNode[];
  crossReferences: ASTCrossReferenceNode[];
  mathTokenMap: Map<string, string>;
}
