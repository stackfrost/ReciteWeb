import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WasmTeXCompilerService } from '../wasm-compiler';
import { useEditorStore } from '../../store/useEditorStore';

class MockWorker {
  public onmessage: ((event: MessageEvent<any>) => void) | null = null;
  public onerror: ((error: any) => void) | null = null;
  public terminated = false;
  public postedMessages: any[] = [];
  public transferLists: any[] = [];

  postMessage(message: any, transfer?: any[]) {
    this.postedMessages.push(message);
    if (transfer) {
      this.transferLists.push(transfer);
    }
    const { source } = message;

    setTimeout(() => {
      if (this.terminated) return;

      if (!source.includes('\\begin{document}') || !source.includes('\\end{document}')) {
        this.onmessage?.({
          data: {
            success: false,
            log: 'LaTeX compilation error: Missing \\begin{document} or \\end{document} environment.',
          },
        } as MessageEvent);
        return;
      }

      const encoder = new TextEncoder();
      const mockPdfHeader = `%PDF-1.5\n%ReciteAI Generated PDF\n`;
      const syntheticPdf = new Uint8Array([
        ...encoder.encode(mockPdfHeader),
        ...encoder.encode(`% Document Source Length: ${source.length}\n`),
      ]);

      this.onmessage?.({
        data: {
          success: true,
          pdfBuffer: syntheticPdf.buffer,
          log: `[Worker] Ingesting LaTeX source stream (${source.length} bytes)...\n[Worker] Compilation finished with 0 errors.`,
        },
      } as MessageEvent);
    }, 10);
  }

  terminate() {
    this.terminated = true;
  }
}

describe('Wasm TeX Compiler Engine (src/services/wasm-compiler.ts)', () => {
  let createdUrls: string[] = [];
  let revokedUrls: string[] = [];

  beforeEach(() => {
    createdUrls = [];
    revokedUrls = [];

    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('Worker', MockWorker);

    vi.spyOn(URL, 'createObjectURL').mockImplementation((_obj: Blob | MediaSource) => {
      const url = `blob:http://localhost/pdf-${Math.random()}`;
      createdUrls.push(url);
      return url;
    });

    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((url: string) => {
      revokedUrls.push(url);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully compiles a valid LaTeX document into a PDF Blob URL', async () => {
    const compiler = new WasmTeXCompilerService();
    const validLatex = `\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}`;

    const result = await compiler.compile({ source: validLatex });

    expect(result.success).toBe(true);
    expect(result.pdfBlobUrl).toBeDefined();
    expect(result.pdfBlobUrl).toContain('blob:');
    expect(result.pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(result.log).toContain('Compilation finished with 0 errors');
    expect(result.compilationTimeMs).toBeGreaterThan(0);

    compiler.cleanup();
  });

  it('fails gracefully when LaTeX document is missing required environments', async () => {
    const compiler = new WasmTeXCompilerService();
    const invalidLatex = `\\documentclass{article}\nSome text without document environment`;

    const result = await compiler.compile({ source: invalidLatex });

    expect(result.success).toBe(false);
    expect(result.pdfBlobUrl).toBeUndefined();
    expect(result.log).toContain('Missing \\begin{document} or \\end{document}');

    compiler.cleanup();
  });

  it('prevents concurrent compilations with busy status', async () => {
    const compiler = new WasmTeXCompilerService();
    const validLatex = `\\documentclass{article}\n\\begin{document}\nHello Concurrent\n\\end{document}`;

    // Start first compilation (takes 10ms)
    const compilePromise1 = compiler.compile({ source: validLatex });
    // Immediately attempt second compilation
    const compilePromise2 = compiler.compile({ source: validLatex });

    const [res1, res2] = await Promise.all([compilePromise1, compilePromise2]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(false);
    expect(res2.log).toContain('Compiler busy');

    compiler.cleanup();
  });

  it('prevents memory leaks by revoking previous Blob URLs on successive compilations and cleanup', async () => {
    const compiler = new WasmTeXCompilerService();
    const doc1 = `\\begin{document}Doc 1\\end{document}`;
    const doc2 = `\\begin{document}Doc 2\\end{document}`;

    const res1 = await compiler.compile({ source: doc1 });
    expect(res1.success).toBe(true);
    const firstUrl = res1.pdfBlobUrl!;
    expect(createdUrls).toContain(firstUrl);
    expect(revokedUrls).not.toContain(firstUrl);

    const res2 = await compiler.compile({ source: doc2 });
    expect(res2.success).toBe(true);
    const secondUrl = res2.pdfBlobUrl!;
    expect(revokedUrls).toContain(firstUrl);
    expect(revokedUrls).not.toContain(secondUrl);

    compiler.cleanup();
    expect(revokedUrls).toContain(secondUrl);
  });

  it('handles asset serializations for embedded graphics and styles with zero-copy transfer list', async () => {
    const compiler = new WasmTeXCompilerService();
    const assetMap = new Map<string, Uint8Array>();
    assetMap.set('figure1.png', new Uint8Array([1, 2, 3, 4]));

    const result = await compiler.compile({
      source: `\\begin{document}\\includegraphics{figure1.png}\\end{document}`,
      assets: assetMap,
    });

    expect(result.success).toBe(true);
    compiler.cleanup();
  });
});

describe('Editor Store Integration (src/store/useEditorStore.ts)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('Worker', MockWorker);
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:http://localhost/mock-pdf-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates compilation state and stores PDF Blob URL upon compileCurrentDocument', async () => {
    const store = useEditorStore.getState();
    store.setRawLatex(`\\begin{document}\\section{Testing Store}\\end{document}`);

    expect(useEditorStore.getState().isCompilingPdf).toBe(false);

    const compilePromise = useEditorStore.getState().compileCurrentDocument();
    await compilePromise;

    const updated = useEditorStore.getState();
    expect(updated.isCompilingPdf).toBe(false);
    expect(updated.pdfBlobUrl).toBe('blob:http://localhost/mock-pdf-url');
    expect(updated.compilationLog).toContain('0 errors');
    expect(updated.lastCompileTimeMs).toBeGreaterThan(0);
  });
});
