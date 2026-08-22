import type { NormalizedASTDocument, DocumentFormat } from './universal-ast';
import type { ASTWorkerRequest, ASTWorkerResponse } from '@/workers/ast-engine.worker';

class ASTOrchestrator {
  private worker: Worker | null = null;
  private pendingJobs = new Map<string, { resolve: (ast: NormalizedASTDocument) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private jobIdCounter = 0;

  private initWorker() {
    if (typeof window === 'undefined') return;
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/ast-engine.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
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

  public async parse(format: DocumentFormat, content: string | ArrayBuffer): Promise<NormalizedASTDocument> {
    this.initWorker();
    if (!this.worker) {
      throw new Error('Web Worker not supported or running on server.');
    }

    const id = `ast-job-${++this.jobIdCounter}`;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingJobs.delete(id);
        reject(new Error('AST processing timed out (30s)'));
      }, 30000);

      this.pendingJobs.set(id, { resolve, reject, timer });

      const request: ASTWorkerRequest = { id, format, content };

      if (content instanceof ArrayBuffer) {
        this.worker!.postMessage(request, [content]);
      } else {
        this.worker!.postMessage(request);
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
