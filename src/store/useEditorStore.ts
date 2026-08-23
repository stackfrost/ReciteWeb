import { create } from 'zustand';
import { wasmCompiler, type CompilationResult } from '@/services/wasm-compiler';
import { astOrchestrator } from '@/services/ast-orchestrator';
import { useReciteStore } from '@/lib/store';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { stitchProject } from '@/services/document-stitcher';
import { executeThesisSweep } from '@/services/llm-orchestrator';
// Lightweight debounce utility to avoid external dependencies
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Define the debounced parse function OUTSIDE the store creation so it maintains a stable timer instance
const debouncedParse = debounce(async (content: string, format: string, set: any) => {
  set({ isParsing: true });
  try {
    const parsedDoc = await astOrchestrator.parse(format as any, content);
    set({ 
      isParsing: false 
    });
  } catch (error) {
    console.error('[AST Worker] Parsing failed:', error);
    set({ isParsing: false });
  }
}, 250);

export interface EditorState {
  rawLatex: string;
  activeFormat: 'latex' | 'typst' | 'markdown' | 'docx';
  isParsing: boolean;
  isCacheValid: boolean;
  invalidateCache: () => void;
  validateCache: () => void;
  updateContent: (content: string) => void;
  pdfBlobUrl: string | null;
  isCompilingPdf: boolean;
  compilationLog: string;
  lastCompileTimeMs: number;
  activeFileId: string | null;
  findings: any[];
  activeFinding: any | null;
  activeIssuesCount: number;
  criticalCount: number;
  mediumCount: number;
  lowCount: number;
  setRawLatex: (rawLatex: string) => void;
  setActiveFileId: (id: string | null) => void;
  setActiveFinding: (finding: any | null) => void;
  setIssueCounts: (total: number, critical: number) => void;
  setFindings: (findings: any[]) => void;
  addFindings: (newFindings: any[]) => void;
  resolveFinding: (findingId: string) => void;
  closeFile: (fileId?: string | null) => void;
  runAudit: () => Promise<void>;
  compileCurrentDocument: () => Promise<void>;
  loadDocxBuffer: (buffer: ArrayBuffer) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  rawLatex: '',
  activeFormat: 'latex',
  isParsing: false,
  isCacheValid: true,
  pdfBlobUrl: null,
  isCompilingPdf: false,
  compilationLog: '',
  lastCompileTimeMs: 0,
  activeFileId: 'main.tex',
  findings: [],
  activeFinding: null,
  activeIssuesCount: 0,
  criticalCount: 0,
  mediumCount: 0,
  lowCount: 0,

  invalidateCache: () => set({ isCacheValid: false }),
  validateCache: () => set({ isCacheValid: true }),

  updateContent: (content: string) => {
    const prevLatex = get().rawLatex;
    const currentFindings = get().findings || [];

    // If the content is changing, the cached coordinate indexes are now mathematically dangerous.
    if (prevLatex !== content && currentFindings.length > 0) {
      set({ rawLatex: content, isCacheValid: false });
    } else {
      set({ rawLatex: content });
    }

    debouncedParse(content, get().activeFormat, set);

    // Tier 1 Deterministic Linting (<16ms)
    try {
      const workspaceStore = useWorkspaceStore.getState();
      const fileTree = workspaceStore.fileTree || {};
      const files = workspaceStore.files || {};
      const bibFile = Object.values(fileTree).find((f) => f.name.endsWith('.bib')) ||
                      Object.values(files).find((f) => f.name.endsWith('.bib'));
      
      const reciteBib = typeof window !== 'undefined' ? useReciteStore.getState().bibtexContent : null;
      const bibContent = bibFile?.content || reciteBib || '';

      if (bibContent) {
        const { auditDeterministicBib } = require('@/services/latex-parser');
        const { missingInBib, unusedInTex } = auditDeterministicBib(content, bibContent);
        
        const deterministicFindings: any[] = [];
        const activeFile = get().activeFileId || 'main.tex';

        missingInBib.forEach((key: string) => {
          const citePattern = new RegExp(`\\\\(?:cite|citep|citet|autocite)\\{[^}]*${key}[^}]*\\}`);
          const match = citePattern.exec(content);
          const index = match ? match.index : 0;
          const line = (content.substring(0, index).match(/\n/g) || []).length + 1;
          
          deterministicFindings.push({
            id: `det-missing-${key}`,
            fileId: activeFile,
            line,
            index,
            length: match ? match[0].length : key.length,
            claim: match ? match[0] : `\\cite{${key}}`,
            key,
            type: 'Missing Citation',
            severity: 'Critical',
            resolved: false,
          });
        });

        const bibPath = bibFile?.path || (bibFile as any)?.id || 'references.bib';

        unusedInTex.forEach((key: string) => {
          deterministicFindings.push({
            id: `det-unused-${key}`,
            fileId: bibPath,
            line: 1,
            index: 0,
            length: key.length,
            claim: `@entry{${key}}`,
            key,
            type: 'Unused Reference',
            severity: 'Low',
            resolved: false,
          });
        });


        // Merge deterministic findings with existing non-deterministic findings
        const nonDeterministic = (get().findings || []).filter((f) => !f.id.startsWith('det-'));
        const allFindings = [...deterministicFindings, ...nonDeterministic];
        
        set({
          findings: allFindings,
          activeIssuesCount: allFindings.length,
          criticalCount: allFindings.filter((f) => f.severity === 'Critical' || f.severity === 'critical' || f.severity === 'High').length,
          mediumCount: allFindings.filter((f) => f.severity === 'Medium' || f.severity === 'medium').length,
          lowCount: allFindings.filter((f) => f.severity === 'Low' || f.severity === 'low').length,
        });
      }
    } catch (e) {
      console.warn('[Tier 1 Linter] Keystroke check error:', e);
    }
  },

  setRawLatex: (rawLatex: string) => set({ rawLatex }),
  setActiveFileId: (activeFileId: string | null) => set({ activeFileId }),
  setActiveFinding: (activeFinding: any | null) => set((state) => {
    const workspaceStore = useWorkspaceStore.getState();
    const { setActiveFile, activeFileId: workspaceActiveFileId, fileTree, files } = workspaceStore;
    
    // If the finding belongs to a different child file (e.g., sections/methods.tex), 
    // switch the editor to that file instantly.
    if (activeFinding?.fileId && activeFinding.fileId !== workspaceActiveFileId) {
      const targetId = activeFinding.fileId;
      setActiveFile(targetId);
      
      const diskFile = fileTree[targetId] || Object.values(fileTree).find(f => f.name === targetId || f.path === targetId);
      const virtFile = files[targetId] || Object.values(files).find(f => f.name === targetId || f.id === targetId);
      
      const newContent = diskFile ? diskFile.content : virtFile ? virtFile.content : '';
      
      // We also update the editor store's active file id and content
      set({ activeFileId: targetId, rawLatex: newContent });
    }
  
    return { activeFinding };
  }),
  setIssueCounts: (activeIssuesCount: number, criticalCount: number) => set({ activeIssuesCount, criticalCount }),

  setFindings: (findings: any[]) => set(() => ({
    findings,
    isCacheValid: true,
    activeIssuesCount: findings.length,
    criticalCount: findings.filter(f => f.severity === 'Critical' || f.severity === 'critical' || f.severity === 'High').length,
    mediumCount: findings.filter(f => f.severity === 'Medium' || f.severity === 'medium').length,
    lowCount: findings.filter(f => f.severity === 'Low' || f.severity === 'low').length,
  })),

  addFindings: (newFindings: any[]) => set((state) => {
    const merged = [...(state.findings || []), ...newFindings];
    return {
      findings: merged,
      isCacheValid: true,
      activeIssuesCount: merged.length,
      criticalCount: merged.filter(f => f.severity === 'Critical' || f.severity === 'critical' || f.severity === 'High').length,
      mediumCount: merged.filter(f => f.severity === 'Medium' || f.severity === 'medium').length,
      lowCount: merged.filter(f => f.severity === 'Low' || f.severity === 'low').length,
    };
  }),

  resolveFinding: (findingId: string) => set((state) => {
    const updated = (state.findings || []).filter(f => f.id !== findingId);
    return {
      findings: updated,
      activeIssuesCount: updated.length,
      criticalCount: updated.filter(f => f.severity === 'Critical' || f.severity === 'critical' || f.severity === 'High').length,
      mediumCount: updated.filter(f => f.severity === 'Medium' || f.severity === 'medium').length,
      lowCount: updated.filter(f => f.severity === 'Low' || f.severity === 'low').length,
      activeFinding: state.activeFinding?.id === findingId ? null : state.activeFinding,
    };
  }),

  closeFile: (_fileId?: string | null) => {
    set({ activeFileId: null, rawLatex: '' });
    useWorkspaceStore.getState().setActiveFile(null);
  },

  runAudit: async () => {
    if (typeof window !== 'undefined') {
      const workspaceStore = useWorkspaceStore.getState();
      const activeFile = workspaceStore.activeFileId || 'main.tex';
      
      const { stitchedText, sourceMap } = stitchProject(activeFile, workspaceStore.fileTree);
      
      // We pass the raw text and map to the new parallel orchestrator
      const rawFindings = await executeThesisSweep(stitchedText, sourceMap);

      // Deduplicate based on physical fileId and local character index (within a 50-character radius)
      const uniqueFindings = rawFindings.filter((finding, index, self) =>
        index === self.findIndex((f) => (
          f.fileId === finding.fileId && Math.abs(f.index - finding.index) < 50
        ))
      );

      get().addFindings(uniqueFindings);
      set({ isCacheValid: true });

      const workspacePath = workspaceStore.workspacePath;
      if (workspacePath) {
        try {
          const { writeReciteCache } = require('@/services/cache-manager');
          const currentFindings = get().findings || [];
          const cachedFindings = currentFindings.map((f) => ({
            id: f.id,
            fileId: f.fileId || workspaceStore.activeFileId || '',
            line: f.line || 1,
            index: f.index || 0,
            length: f.length || 0,
            claim: f.claim || f.text || '',
            type: f.type || 'Needs Literature',
            severity: f.severity || 'Medium',
            resolved: f.resolved || f.status === 'Resolved' || f.status === 'accepted',
          }));
          await writeReciteCache(workspacePath, cachedFindings);
        } catch (err) {
          console.warn('[EditorStore] Failed to write frozen cache:', err);
        }
      }
    }
  },



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
