import { parseDocxDocument } from '@/services/docx-parser';
import { parseTypstDocument } from '@/services/typst-parser';
import { parseScientificMarkdown } from '@/services/markdown-parser';
import type { NormalizedASTDocument, DocumentFormat } from '@/services/universal-ast';

export interface ASTWorkerRequest {
  id: string;
  format: DocumentFormat;
  content: string | ArrayBuffer;
}

export interface ASTWorkerResponse {
  id: string;
  success: boolean;
  ast?: NormalizedASTDocument;
  error?: string;
}

self.addEventListener('message', async (event: MessageEvent<ASTWorkerRequest>) => {
  const { id, format, content } = event.data;

  try {
    let ast: NormalizedASTDocument;

    switch (format) {
      case 'latex':
        ast = {
          format: 'latex',
          rawContent: content as string,
          sanitizedContent: content as string,
          citations: [],
          mathBlocks: [],
          crossReferences: [],
          mathTokenMap: new Map()
        };
        break;
      case 'typst':
        ast = parseTypstDocument(content as string);
        break;
      case 'markdown':
        ast = parseScientificMarkdown(content as string);
        break;
      case 'docx':
        ast = await parseDocxDocument(content as ArrayBuffer);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    self.postMessage({ id, success: true, ast } as ASTWorkerResponse);
  } catch (error: any) {
    self.postMessage({ id, success: false, error: error.message } as ASTWorkerResponse);
  }
});
