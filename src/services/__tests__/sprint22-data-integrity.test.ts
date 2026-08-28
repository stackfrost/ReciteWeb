import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockIdbStore = new Map<string, any>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mockIdbStore.get(key)),
  set: vi.fn(async (key: string, val: any) => mockIdbStore.set(key, val)),
  del: vi.fn(async (key: string) => mockIdbStore.delete(key)),
  createStore: vi.fn(() => ({})),
}));

import { saveFileToDisk, saveWorkspaceToIdb, restoreWorkspaceFromIdb } from '../local-fs';
import { useEditorStore } from '@/store/useEditorStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

describe('Web Platform: Data Integrity & Browser-Native Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdbStore.clear();
  });

  describe('Browser-Native LocalFS & IndexedDB Persistence (local-fs.ts)', () => {
    it('persists and restores workspace from idb-keyval', async () => {
      const sampleFiles = {
        'main.tex': { path: 'main.tex', name: 'main.tex', content: '\\section{Intro}' },
        'references.bib': { path: 'references.bib', name: 'references.bib', content: '@article{test, title={Test}}' }
      };

      await saveWorkspaceToIdb('Test Project', sampleFiles);
      const restored = await restoreWorkspaceFromIdb();

      expect(restored).not.toBeNull();
      expect(restored?.dirName).toBe('Test Project');
      expect(restored?.files['main.tex'].content).toBe('\\section{Intro}');
    });

    it('saves single file updates to idb-keyval store', async () => {
      const initialFiles = {
        'main.tex': { path: 'main.tex', name: 'main.tex', content: 'Original' }
      };
      await saveWorkspaceToIdb('Project', initialFiles);

      const success = await saveFileToDisk('main.tex', 'Updated Content');
      expect(success).toBe(true);

      const restored = await restoreWorkspaceFromIdb();
      expect(restored?.files['main.tex'].content).toBe('Updated Content');
    });
  });

  describe('AST Invalidation Lock (useEditorStore.ts)', () => {
    beforeEach(() => {
      useEditorStore.setState({
        rawLatex: 'Initial text \\cite{ref1}',
        findings: [
          {
            id: 'f-1',
            fileId: 'main.tex',
            line: 1,
            index: 10,
            length: 12,
            claim: '\\cite{ref1}',
            type: 'Missing Citation',
            severity: 'Critical',
          },
        ],
        isCacheValid: true,
      });
    });

    it('flips isCacheValid to false when text is modified with existing findings', () => {
      expect(useEditorStore.getState().isCacheValid).toBe(true);

      // User types a single character in the editor
      useEditorStore.getState().updateContent('Initial text \\cite{ref1} addition');

      expect(useEditorStore.getState().isCacheValid).toBe(false);
    });

    it('allows manual invalidation and validation', () => {
      useEditorStore.getState().invalidateCache();
      expect(useEditorStore.getState().isCacheValid).toBe(false);

      useEditorStore.getState().validateCache();
      expect(useEditorStore.getState().isCacheValid).toBe(true);
    });

    it('resets isCacheValid to true when findings are freshly set', () => {
      useEditorStore.getState().invalidateCache();
      expect(useEditorStore.getState().isCacheValid).toBe(false);

      useEditorStore.getState().setFindings([]);
      expect(useEditorStore.getState().isCacheValid).toBe(true);
    });
  });

  describe('Workspace Write Lock & Self-Write Isolation (useWorkspaceStore.ts)', () => {
    it('mounts files directly and syncs state', async () => {
      const store = useWorkspaceStore.getState();
      const files = {
        'main.tex': { path: 'main.tex', name: 'main.tex', content: '\\documentclass{article}' }
      };

      const result = await store.mountFilesDirect('Test Project', files);
      expect(result).toBe(true);
      expect(useWorkspaceStore.getState().workspacePath).toBe('Test Project');
      expect(useWorkspaceStore.getState().activeTexContent).toBe('\\documentclass{article}');
    });
  });
});
