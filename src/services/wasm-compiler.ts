export interface CompilationJob {
  source: string;
  assets?: Map<string, Uint8Array>;
  engine?: 'pdftex' | 'xetex';
}

export interface CompilationResult {
  success: boolean;
  pdfBlobUrl?: string;
  pdfBuffer?: Uint8Array;
  log: string;
  compilationTimeMs: number;
}

export class WasmTeXCompilerService {
  private worker: Worker | null = null;
  private isCompiling = false;
  private currentBlobUrl: string | null = null;
  private currentJobId = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof window !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/tex-compiler.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (err) {
        console.warn('[WasmCompiler] Worker initialization deferred:', err);
      }
    }
  }

  public async compile(job: CompilationJob): Promise<CompilationResult> {
    if (this.isCompiling) {
      return {
        success: false,
        log: 'Compiler busy: A build is already in progress.',
        compilationTimeMs: 0,
      };
    }

    this.isCompiling = true;
    const jobId = ++this.currentJobId;
    const startTime = performance.now();

    if (!this.worker) {
      this.initWorker();
    }

    return new Promise((resolve) => {
      if (!this.worker) {
        this.isCompiling = false;
        resolve({
          success: false,
          log: 'Web Worker not available in current environment.',
          compilationTimeMs: 0,
        });
        return;
      }

      const timeoutId = setTimeout(() => {
        if (this.currentJobId === jobId) {
          this.isCompiling = false;
          resolve({
            success: false,
            log: 'Compilation timeout: Exceeded 15000ms threshold.',
            compilationTimeMs: performance.now() - startTime,
          });
        }
      }, 15000);

      this.worker.onmessage = (event: MessageEvent<{ success: boolean; pdfBuffer?: ArrayBuffer; log: string }>) => {
        // Discard late or out-of-order job responses
        if (this.currentJobId !== jobId) return;

        clearTimeout(timeoutId);
        this.isCompiling = false;
        const duration = performance.now() - startTime;

        if (event.data.success && event.data.pdfBuffer) {
          if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
          }

          const pdfBytes = new Uint8Array(event.data.pdfBuffer);
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          this.currentBlobUrl = URL.createObjectURL(blob);

          resolve({
            success: true,
            pdfBlobUrl: this.currentBlobUrl,
            pdfBuffer: pdfBytes,
            log: event.data.log,
            compilationTimeMs: duration,
          });
        } else {
          resolve({
            success: false,
            log: event.data.log || 'Unknown compilation error.',
            compilationTimeMs: duration,
          });
        }
      };

      this.worker.onerror = (err) => {
        if (this.currentJobId !== jobId) return;
        clearTimeout(timeoutId);
        this.isCompiling = false;
        resolve({
          success: false,
          log: `Worker Thread Error: ${err.message}`,
          compilationTimeMs: performance.now() - startTime,
        });
      };

      // Extract transferable buffers for zero-copy IPC
      const transferableAssets: Array<{ filename: string; buffer: ArrayBuffer }> = [];
      const transferList: Transferable[] = [];

      if (job.assets) {
        job.assets.forEach((uint8Array, filename) => {
          // Clone buffer slice to preserve source memory if needed elsewhere
          const bufferCopy = uint8Array.buffer.slice(0) as ArrayBuffer;
          transferableAssets.push({ filename, buffer: bufferCopy });
          transferList.push(bufferCopy);
        });
      }

      this.worker.postMessage(
        {
          source: job.source,
          assets: transferableAssets,
          engine: job.engine || 'pdftex',
        },
        transferList
      );
    });
  }

  public cleanup(): void {
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }
    this.worker?.terminate();
    this.worker = null;
    this.isCompiling = false;
  }
}

export const wasmCompiler = new WasmTeXCompilerService();
