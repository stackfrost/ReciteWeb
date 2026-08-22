import { create } from 'zustand';
import { wasmCompiler, type CompilationResult } from '@/services/wasm-compiler';
import { astOrchestrator } from '@/services/ast-orchestrator';
import { useReciteStore } from '@/lib/store';

export interface EditorState {
  rawLatex: string;
  pdfBlobUrl: string | null;
  isCompilingPdf: boolean;
  compilationLog: string;
  lastCompileTimeMs: number;
  setRawLatex: (rawLatex: string) => void;
  compileCurrentDocument: () => Promise<void>;
  loadDocxBuffer: (buffer: ArrayBuffer) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  rawLatex: '',
  pdfBlobUrl: null,
  isCompilingPdf: false,
  compilationLog: '',
  lastCompileTimeMs: 0,

  setRawLatex: (rawLatex: string) => set({ rawLatex }),

  compileCurrentDocument: async () => {
    let { rawLatex } = get();
    if (!rawLatex.trim() && typeof window !== 'undefined') {
      const fallbackSource = useReciteStore.getState().rawText;
      if (fallbackSource && fallbackSource.trim()) {
        rawLatex = fallbackSource;
        set({ rawLatex: fallbackSource });
      }
    }
    if (!rawLatex.trim()) return;

    set({ isCompilingPdf: true });
    const result: CompilationResult = await wasmCompiler.compile({
      source: rawLatex,
    });

    set({
      isCompilingPdf: false,
      pdfBlobUrl: result.pdfBlobUrl || get().pdfBlobUrl,
      compilationLog: result.log,
      lastCompileTimeMs: result.compilationTimeMs,
    });
  },

  loadDocxBuffer: async (buffer: ArrayBuffer) => {
    try {
      const parsedDoc = await astOrchestrator.parse('docx', buffer);

      // Set sanitized content as active text
      set({
        rawLatex: parsedDoc.sanitizedContent,
      });

      // Synchronize into the main workspace store if available
      if (typeof window !== 'undefined') {
        const recite = useReciteStore.getState();
        if (recite.setRawText) {
          recite.setRawText(parsedDoc.sanitizedContent);
        }
        if (recite.setFileFormat) {
          recite.setFileFormat('docx');
        }
      }
    } catch (err) {
      console.error('[EditorStore] Failed to load .docx document:', err);
    }
  },
}));
