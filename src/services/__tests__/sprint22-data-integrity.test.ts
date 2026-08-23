import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWatch = vi.fn();
const mockWriteTextFile = vi.fn();
const mockReadDir = vi.fn();
const mockReadTextFile = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
  watch: (...args: any[]) => mockWatch(...args),
  writeTextFile: (...args: any[]) => mockWriteTextFile(...args),
  readDir: (...args: any[]) => mockReadDir(...args),
  readTextFile: (...args: any[]) => mockReadTextFile(...args),
}));

import { watchWorkspace } from '../local-fs';
import { useEditorStore } from '@/store/useEditorStore';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

describe('Sprint 22: Data Integrity Lockdown & Bi-Directional Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tauri File Watcher (local-fs.ts)', () => {
    it('initializes watch on directory and filters .tex and .bib changes', async () => {
      let registeredCallback: ((event: any) => void) | null = null;
      const unwatchMock = vi.fn();

      mockWatch.mockImplementation(async (path: string, cb: (event: any) => void) => {
        registeredCallback = cb;
        return unwatchMock;
      });

      const onFileChanged = vi.fn();
      await watchWorkspace('/mock/workspace', onFileChanged);

      expect(mockWatch).toHaveBeenCalledWith(
        '/mock/workspace',
        expect.any(Function),
        { recursive: true }
      );

      // Simulate a .tex modification
      registeredCallback!({
        type: 'modify',
        paths: ['/mock/workspace/sections/intro.tex'],
        attrs: null,
      });

      expect(onFileChanged).toHaveBeenCalledWith('/mock/workspace/sections/intro.tex');

      // Simulate a .bib modification
      registeredCallback!({
        type: 'any',
        paths: ['/mock/workspace/references.bib'],
        attrs: null,
      });

      expect(onFileChanged).toHaveBeenCalledWith('/mock/workspace/references.bib');

      // Simulate an unrelated file modification (.png)
      registeredCallback!({
        type: 'modify',
        paths: ['/mock/workspace/figures/diagram.png'],
        attrs: null,
      });

      expect(onFileChanged).not.toHaveBeenCalledWith('/mock/workspace/figures/diagram.png');
    });

    it('cleans up previous watcher when re-initializing', async () => {
      const unwatchMock1 = vi.fn();
      const unwatchMock2 = vi.fn();

      mockWatch
        .mockResolvedValueOnce(unwatchMock1)
        .mockResolvedValueOnce(unwatchMock2);

      await watchWorkspace('/mock/dir1', vi.fn());
      await watchWorkspace('/mock/dir2', vi.fn());

      expect(unwatchMock1).toHaveBeenCalled();
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
    it('sets and releases write-lock through saveFileWithLock', async () => {
      mockWriteTextFile.mockResolvedValue(undefined);

      const store = useWorkspaceStore.getState();
      const result = await store.saveFileWithLock('/mock/main.tex', 'New Content');

      expect(result).toBe(true);
      expect(mockWriteTextFile).toHaveBeenCalledWith('/mock/main.tex', 'New Content');
    });
  });
});
