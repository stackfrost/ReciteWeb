import type { NormalizedASTDocument, DocumentFormat } from './universal-ast';
import type { ASTWorkerRequest, ASTWorkerResponse } from '@/workers/ast-engine.worker';
import { parseDocxDocument } from './docx-parser';
import { parseTypstDocument } from './typst-parser';
import { parseScientificMarkdown } from './markdown-parser';

class ASTOrchestrator {
  private worker: Worker | null = null;
  private pendingJobs = new Map<string, { resolve: (ast: NormalizedASTDocument) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private jobIdCounter = 0;
  private workerFailed = false;

  private initWorker() {
    if (typeof window === 'undefined' || this.workerFailed) return;
    if (!this.worker) {
      try {
        this.worker = new Worker(new URL('../workers/ast-engine.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = () => {
          this.workerFailed = true;
          this.worker = null;
        };
      } catch (err) {
        console.warn('[ASTOrchestrator] Worker initialization fallback to main thread:', err);
        this.workerFailed = true;
        this.worker = null;
      }
    }
  }

  private handleWorkerMessage(event: MessageEvent<ASTWorkerResponse>) {
    const { id, success, ast, error } = event.data;
    const job = this.pendingJobs.get(id);

    if (job) {
      clearTimeout(job.timer);
      this.pendingJobs.delete(id);

      if (success && ast) {
        job.resolve(ast);
      } else {
        job.reject(new Error(error || 'Unknown AST parsing error'));
      }
    }
  }

  private async parseDirect(format: DocumentFormat, content: string | ArrayBuffer): Promise<NormalizedASTDocument> {
    switch (format) {
      case 'latex':
        return {
          format: 'latex',
          rawContent: content as string,
          sanitizedContent: content as string,
          citations: [],
          mathBlocks: [],
          crossReferences: [],
          mathTokenMap: new Map()
        };
      case 'typst':
        return parseTypstDocument(content as string);
      case 'markdown':
        return parseScientificMarkdown(content as string);
      case 'docx':
        return await parseDocxDocument(content as ArrayBuffer);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  public async parse(format: DocumentFormat, content: string | ArrayBuffer): Promise<NormalizedASTDocument> {
    this.initWorker();
    if (!this.worker || this.workerFailed) {
      return this.parseDirect(format, content);
    }

    const id = `ast-job-${++this.jobIdCounter}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingJobs.delete(id);
        // Fallback to direct parsing on timeout
        this.parseDirect(format, content).then(resolve).catch(reject);
      }, 5000);

      this.pendingJobs.set(id, { resolve, reject, timer });

      const request: ASTWorkerRequest = { id, format, content };

      try {
        if (content instanceof ArrayBuffer) {
          this.worker!.postMessage(request, [content]);
        } else {
          this.worker!.postMessage(request);
        }
      } catch (postErr) {
        clearTimeout(timer);
        this.pendingJobs.delete(id);
        this.parseDirect(format, content).then(resolve).catch(reject);
      }
    });
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const job of this.pendingJobs.values()) {
      clearTimeout(job.timer);
      job.reject(new Error('AST Worker terminated'));
    }
    this.pendingJobs.clear();
  }
}

export const astOrchestrator = new ASTOrchestrator();
