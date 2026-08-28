/**
 * src/lib/wasm-loader.ts
 *
 * Client-side loader and IPC dispatcher for the WASM Spatial Parser Web Worker.
 * Handles background non-blocking extraction, client-side Free vs Pro tier gating,
 * and passes typed claims back to the workspace store and CodeMirror.
 */

import type {
  WasmParserRequest,
  WasmParserResponse,
  ExtractedWasmClaim,
} from '@/workers/wasm-parser.worker';

export type { ExtractedWasmClaim, WasmParserResponse };

export class WasmParserService {
  private worker: Worker | null = null;
  private currentRequestId = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/wasm-parser.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (err) {
        console.warn('[WasmParserService] Worker initialization deferred:', err);
      }
    }
  }

  /**
   * Parses an ArrayBuffer or text document using the background Web Worker.
   * Free tier truncates to 5 pages / 6 claims; Pro tier parses full document up to 50 claims.
   */
  public async parseDocument(params: {
    content: string | ArrayBuffer;
    format?: 'latex' | 'typst' | 'markdown' | 'docx' | 'pdf';
    licenseStatus?: string;
    filename?: string;
  }): Promise<WasmParserResponse> {
    const { content, format = 'latex', licenseStatus = 'FREE', filename } = params;

    if (!this.worker) {
      this.initWorker();
    }

    const requestId = `req_${++this.currentRequestId}_${Date.now()}`;

    return new Promise((resolve) => {
      if (!this.worker) {
        // Fallback for SSR or non-worker environments: basic in-memory regex
        resolve(this.fallbackParse(content, licenseStatus));
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve({
          id: requestId,
          success: false,
          claims: [],
          totalClaimsFound: 0,
          isTruncated: false,
          totalPagesProcessed: 0,
          parseTimeMs: 15000,
          error: 'WASM Worker timeout exceeded 15,000ms',
        });
      }, 15000);

      const handler = (event: MessageEvent<WasmParserResponse>) => {
        if (event.data.id === requestId) {
          clearTimeout(timeoutId);
          this.worker?.removeEventListener('message', handler);
          resolve(event.data);
        }
      };

      this.worker.addEventListener('message', handler);

      const payload: WasmParserRequest = {
        id: requestId,
        content,
        format,
        licenseStatus,
        filename,
      };

      if (content instanceof ArrayBuffer) {
        this.worker.postMessage(payload, [content]);
      } else {
        this.worker.postMessage(payload);
      }
    });
  }

  /**
   * Pure JS fallback parser for non-worker environments (e.g. unit tests or SSR)
   */
  public fallbackParse(content: string | ArrayBuffer, licenseStatus = 'FREE'): WasmParserResponse {
    const isPro = licenseStatus === 'PRO' || licenseStatus === 'ANNUAL_PRO' || licenseStatus === 'LAB';
    const maxClaims = isPro ? 50 : 6;
    const maxPages = isPro ? 100 : 5;

    let rawString = '';
    if (typeof content === 'string') {
      rawString = content;
    } else if (content instanceof ArrayBuffer) {
      rawString = new TextDecoder('utf-8').decode(content);
    }

    const pageDelimiters = rawString.split(/(?:\f|\\newpage|\\pagebreak)/);
    const totalPages = Math.max(1, pageDelimiters.length > 1 ? pageDelimiters.length : Math.ceil(rawString.split(/\s+/).length / 350));
    const pagesProcessed = Math.min(totalPages, maxPages);

    let processedText = rawString;
    let isTruncated = totalPages > maxPages;

    if (pageDelimiters.length > 1 && totalPages > maxPages) {
      processedText = pageDelimiters.slice(0, maxPages).join('\n');
    } else if (totalPages > maxPages) {
      const lines = rawString.split('\n');
      const linesPerPage = Math.ceil(lines.length / totalPages);
      processedText = lines.slice(0, linesPerPage * maxPages).join('\n');
    }

    const lines = processedText.split('\n');
    const claims: ExtractedWasmClaim[] = [];
    const citeRegex = /\\cite(?:[a-zA-Z*]*)?\{([^}]+)\}/g;

    let totalFound = 0;
    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      let match;
      while ((match = citeRegex.exec(line)) !== null) {
        totalFound++;
        if (claims.length < maxClaims) {
          claims.push({
            id: `claim_fallback_${idx + 1}`,
            claimSentence: line.trim(),
            citationKey: match[1].split(',')[0].trim(),
            line: idx + 1,
            column: match.index,
            context: line,
            page: Math.min(pagesProcessed, Math.floor((idx / lines.length) * pagesProcessed) + 1),
          });
        }
      }
    }

    if (totalFound > claims.length) {
      isTruncated = true;
    }

    return {
      id: 'fallback',
      success: true,
      claims,
      totalClaimsFound: totalFound,
      isTruncated,
      totalPagesProcessed: pagesProcessed,
      parseTimeMs: 1,
    };
  }

  public terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const wasmParser = new WasmParserService();
