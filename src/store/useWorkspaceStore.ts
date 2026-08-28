import { create } from 'zustand';
import {
  loadProjectFiles,
  saveFileToDisk,
  watchWorkspace,
  openProjectDialog,
  ingestFileList,
  restoreWorkspaceFromIdb,
  clearWorkspaceFromIdb,
  saveWorkspaceToIdb,
  type LocalFile,
} from '@/services/local-fs';
import type { DocumentFormat } from '@/services/universal-ast';
import { DEMO_MANUSCRIPT, DEMO_BIBTEX } from '@/lib/demo-data';

export interface VirtualFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content: string; // for text files
  format?: DocumentFormat;
  isOpen: boolean; // used for folders (expanded state)
  path?: string;
}

export type { LocalFile };

interface WorkspaceState {
  workspacePath: string | null;
  activeTexPath: string | null;
  bibPath: string | null;
  activeTexContent: string | null;
  fileTree: Record<string, LocalFile>;
  activeFileId: string | null;
  files: Record<string, VirtualFile>;
  isLoading?: boolean;

  openTabs: string[];

  // Native Disk Actions
  mountLocalProject: () => Promise<void>;
  mountFilesDirect: (dirName: string, diskFiles: Record<string, LocalFile>, targetActiveFile?: string) => Promise<boolean>;
  mountPathDirect: (dirPath: string, targetActiveFile?: string) => Promise<boolean>;
  autoRestoreSession: () => Promise<boolean>;
  resetWorkspace: () => void;
  saveFileWithLock: (filePath: string, content: string) => Promise<boolean>;
  appendBibtex: (bibtexString: string) => Promise<void>;

  // Core & Virtual Actions
  createFile: (name: string, type: 'file' | 'folder', parentId: string | null, format?: DocumentFormat) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  setContent: (id: string, content: string) => void;
  setActiveFile: (id: string | null) => void;
  openFileTab: (id: string) => void;
  closeFileTab: (id: string) => void;
  toggleFolder: (id: string) => void;
  ingestFiles: (files: File[]) => Promise<void>;
  appendToBibFile: (bibtexString: string) => void;
  injectCitationIntoTex: (fileId: string, charOffset: number, citeKey: string) => Promise<void> | void;
}

const LAST_WORKSPACE_KEY = 'recite_last_workspace_path';
const LAST_ACTIVE_FILE_KEY = 'recite_last_active_file';

let isInternalWrite = false; // Flag to prevent auto-save from triggering the watcher

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspacePath: null,
  activeTexPath: null,
  bibPath: null,
  activeTexContent: null,
  fileTree: {},
  activeFileId: null,
  openTabs: [],
  isLoading: false,
  files: {
    'root': {
      id: 'root',
      name: 'root',
      type: 'folder',
      parentId: null,
      content: '',
      isOpen: true,
    },
  },

  resetWorkspace: () => {
    clearWorkspaceFromIdb().catch(() => {});
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(LAST_WORKSPACE_KEY);
        localStorage.removeItem(LAST_ACTIVE_FILE_KEY);
      } catch {}
    }
    set({
      workspacePath: null,
      activeTexPath: null,
      bibPath: null,
      activeTexContent: null,
      fileTree: {},
      activeFileId: null,
      openTabs: [],
      files: {
        'root': {
          id: 'root',
          name: 'root',
          type: 'folder',
          parentId: null,
          content: '',
          isOpen: true,
        }
      },
    });
    if (typeof window !== 'undefined') {
      try {
        const { useEditorStore } = require('@/store/useEditorStore');
        const { useReciteStore } = require('@/lib/store');
        useEditorStore.getState().updateContent('');
        useEditorStore.getState().setActiveFileId(null);
        useReciteStore.getState().setRawText('');
        useReciteStore.getState().setParsedText('');
        useReciteStore.getState().unmountWorkspace();
      } catch (e) {
        console.warn('[WorkspaceStore] Failed to reset editor:', e);
      }
    }
  },

  saveFileWithLock: async (filePath: string, content: string) => {
    isInternalWrite = true;
    const success = await saveFileToDisk(filePath, content);
    setTimeout(() => {
      isInternalWrite = false;
    }, 500); // Release lock after physical write
    return success;
  },

  mountFilesDirect: async (dirName: string, diskFiles: Record<string, LocalFile>, targetActiveFile?: string): Promise<boolean> => {
    const fileCount = Object.keys(diskFiles).length;
    if (fileCount === 0) return false;
    set({ isLoading: true });

    try {
      const virtualFiles: Record<string, VirtualFile> = {
        root: {
          id: 'root',
          name: dirName,
          type: 'folder',
          parentId: null,
          content: '',
          isOpen: true,
        },
      };

      let firstTexPath: string | null = null;
      let firstBibPath: string | null = null;

      Object.values(diskFiles).forEach((f) => {
        const format: DocumentFormat = f.name.endsWith('.bib')
          ? 'bibtex' as any
          : f.name.endsWith('.md')
          ? 'markdown'
          : 'latex';

        if (!firstTexPath && f.name.endsWith('.tex')) {
          firstTexPath = f.path;
        }
        if (!firstBibPath && f.name.endsWith('.bib')) {
          firstBibPath = f.path;
        }

        virtualFiles[f.path] = {
          id: f.path,
          name: f.name,
          type: 'file',
          parentId: 'root',
          content: f.content,
          format,
          isOpen: false,
          path: f.path,
        };
      });

      const activeId = targetActiveFile && diskFiles[targetActiveFile]
        ? targetActiveFile
        : firstTexPath || Object.keys(diskFiles)[0] || null;
      const activeContent = (activeId && diskFiles[activeId]) ? diskFiles[activeId].content : '';
      const bibContent = (firstBibPath && diskFiles[firstBibPath]) ? diskFiles[firstBibPath].content : '';

      set({
        workspacePath: dirName,
        activeTexPath: firstTexPath,
        bibPath: firstBibPath,
        activeTexContent: activeContent,
        fileTree: diskFiles,
        files: virtualFiles,
        activeFileId: activeId,
        openTabs: activeId ? [activeId] : [],
        isLoading: false,
      });

      // Save to IndexedDB persistence
      await saveWorkspaceToIdb(dirName, diskFiles);

      // Sync with useReciteStore and useEditorStore
      if (typeof window !== 'undefined') {
        try {
          const { useEditorStore } = require('@/store/useEditorStore');
          const { useReciteStore } = require('@/lib/store');
          const reciteStore = useReciteStore.getState();

          useEditorStore.getState().updateContent(activeContent);
          useEditorStore.getState().setActiveFileId(activeId ? diskFiles[activeId]?.name : null);

          reciteStore.mountDirectoryWorkspace(dirName, diskFiles);
          reciteStore.setRawText(activeContent);
          reciteStore.setParsedText(activeContent);
          if (firstBibPath) {
            const bibFileName = String(firstBibPath).split(/[/\\]/).pop() || 'references.bib';
            reciteStore.mountBibTex(bibFileName, bibContent);
          }
        } catch (e) {
          console.warn('[WorkspaceStore] Failed to sync mounted directory to stores:', e);
        }
      }

      return true;
    } catch (err) {
      console.error('[WorkspaceStore] Failed to mount files:', err);
      set({ isLoading: false });
      return false;
    }
  },

  mountPathDirect: async (dirPath: string, targetActiveFile?: string): Promise<boolean> => {
    if (!dirPath) return false;
    const diskFiles = await loadProjectFiles(dirPath);
    if (Object.keys(diskFiles).length === 0) return false;
    const dirName = dirPath.split(/[/\\]/).pop() || 'Project';
    return await get().mountFilesDirect(dirName, diskFiles, targetActiveFile);
  },

  autoRestoreSession: async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
      const restored = await restoreWorkspaceFromIdb();
      if (restored && Object.keys(restored.files).length > 0) {
        return await get().mountFilesDirect(restored.dirName, restored.files);
      }
      return false;
    } catch (err) {
      console.warn('[WorkspaceStore] Auto restore session failed:', err);
      return false;
    }
  },

  mountLocalProject: async () => {
    try {
      const pickedFiles = await openProjectDialog();
      if (pickedFiles && Object.keys(pickedFiles).length > 0) {
        await get().mountFilesDirect('Local Project', pickedFiles);
      }
    } catch (error) {
      console.error('[WorkspaceStore] Error selecting directory:', error);
    }
  },

  createFile: (name, type, parentId, format) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      files: {
        ...state.files,
        [id]: {
          id,
          name,
          type,
          parentId: parentId || 'root',
          content: '',
          format,
          isOpen: false,
        }
      }
    }));
    return id;
  },

  deleteFile: (id) => {
    set((state) => {
      const newFiles = { ...state.files };
      delete newFiles[id];
      return {
        files: newFiles,
        activeFileId: state.activeFileId === id ? null : state.activeFileId
      };
    });
  },

  renameFile: (id, newName) => {
    set((state) => ({
      files: {
        ...state.files,
        [id]: { ...state.files[id], name: newName }
      }
    }));
  },

  setContent: (id, content) => {
    set((state) => ({
      files: {
        ...state.files,
        [id]: { ...state.files[id], content }
      }
    }));
  },

  setActiveFile: (id) => {
    if (!id) {
      set({ activeFileId: null, activeTexPath: null, activeTexContent: null });
      return;
    }
    const state = get();
    const diskFile = state.fileTree[id] || Object.values(state.fileTree).find((f) => f.name === id || f.path === id);
    const virtFile = state.files[id] || Object.values(state.files).find((f) => f.name === id || f.id === id);

    const content = diskFile?.content || virtFile?.content || '';
    const filePath = diskFile?.path || virtFile?.path || id;

    set({
      activeFileId: id,
      activeTexPath: filePath,
      activeTexContent: content,
    });

    if (typeof window !== 'undefined') {
      try {
        const { useEditorStore } = require('@/store/useEditorStore');
        const { useReciteStore } = require('@/lib/store');
        useEditorStore.getState().updateContent(content);
        useEditorStore.getState().setActiveFileId(id);
        useReciteStore.getState().setRawText(content);
        useReciteStore.getState().setParsedText(content);
        useReciteStore.getState().setDocumentTitle(filePath.split(/[/\\]/).pop() || id);
      } catch (err) {
        console.warn('[WorkspaceStore] Sync error on setActiveFile:', err);
      }
    }
  },

  openFileTab: (id) => {
    const { openTabs } = get();
    if (!openTabs.includes(id)) {
      set({ openTabs: [...openTabs, id] });
    }
    get().setActiveFile(id);
  },

  closeFileTab: (id) => {
    const { openTabs, activeFileId } = get();
    const nextTabs = openTabs.filter((t) => t !== id);
    let nextActive = activeFileId;
    if (activeFileId === id) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null;
    }
    set({ openTabs: nextTabs });
    if (nextActive !== activeFileId) {
      get().setActiveFile(nextActive);
    }
  },

  toggleFolder: (id) => {
    set((state) => ({
      files: {
        ...state.files,
        [id]: { ...state.files[id], isOpen: !state.files[id]?.isOpen }
      }
    }));
  },

  ingestFiles: async (newFiles: File[]) => {
    try {
      const loadedTree = await ingestFileList(newFiles);
      if (Object.keys(loadedTree).length > 0) {
        await get().mountFilesDirect('Uploaded Manuscript', loadedTree);
      }
    } catch (err) {
      console.error('[WorkspaceStore] Failed to ingest files:', err);
    }
  },

  appendBibtex: async (bibtexString: string) => {
    const { fileTree, files, workspacePath, saveFileWithLock } = get();
    let bibFilePath = Object.keys(fileTree).find((path) => path.endsWith('.bib')) ||
      Object.values(files).find((f) => f.type === 'file' && f.name.endsWith('.bib'))?.path;

    if (!bibFilePath && workspacePath) {
      bibFilePath = `${workspacePath}/references.bib`.replace(/\\/g, '/');
      const updatedContent = bibtexString + '\n';
      
      try {
        await saveFileWithLock(bibFilePath, updatedContent);
      } catch (err) {
        console.error('[WorkspaceStore] Failed to create references.bib', err);
      }
      
      set((state) => ({
        fileTree: {
          ...state.fileTree,
          [bibFilePath as string]: { path: bibFilePath as string, name: 'references.bib', content: updatedContent },
        },
        files: {
          ...state.files,
          [bibFilePath as string]: {
            id: bibFilePath as string,
            name: 'references.bib',
            type: 'file',
            parentId: 'root',
            isOpen: false,
            content: updatedContent,
            path: bibFilePath as string,
          },
        },
      }));
    } else if (bibFilePath && fileTree[bibFilePath]) {
      const file = fileTree[bibFilePath];
      const updatedContent = (file.content || '').trimEnd() + '\n\n' + bibtexString + '\n';

      // 1. Physically write to the hard drive with write-lock
      await saveFileWithLock(bibFilePath, updatedContent);

      // 2. Update state
      set((state) => ({
        fileTree: {
          ...state.fileTree,
          [bibFilePath as string]: { ...file, content: updatedContent },
        },
        files: {
          ...state.files,
          [bibFilePath as string]: {
            ...(state.files[bibFilePath as string] || {
              id: bibFilePath,
              name: file.name,
              type: 'file',
              parentId: 'root',
              isOpen: false,
            }),
            content: updatedContent,
          },
        },
      }));
    } else {
      get().appendToBibFile(bibtexString);
    }
  },

  appendToBibFile: (bibtexString: string) => {
    const state = get();
    const bibFile = Object.values(state.files).find((f) => f.type === 'file' && f.name.endsWith('.bib'));
    
    if (bibFile) {
      const updatedContent = (bibFile.content ? bibFile.content.trim() + '\n\n' : '') + bibtexString;
      if (bibFile.path) {
        state.saveFileWithLock(bibFile.path, updatedContent).catch(console.error);
      }
      set({
        files: {
          ...state.files,
          [bibFile.id]: {
            ...bibFile,
            content: updatedContent,
          },
        },
      });
    } else {
      const id = Math.random().toString(36).substring(2, 9);
      set({
        files: {
          ...state.files,
          [id]: {
            id,
            name: 'references.bib',
            type: 'file',
            parentId: 'root',
            content: bibtexString,
            isOpen: false,
          },
        },
      });
    }

    if (typeof window !== 'undefined') {
      try {
        const { useReciteStore } = require('@/lib/store');
        const recite = useReciteStore.getState();
        if (recite.mountBibTex) {
          const currentBib = recite.bibtexContent || '';
          recite.mountBibTex(recite.bibtexFileName || 'references.bib', (currentBib ? currentBib.trim() + '\n\n' : '') + bibtexString);
          if (recite.addToast) {
            recite.addToast('BibTeX citation appended to workspace bibliography', 'success');
          }
        }
      } catch (err) {
        console.warn('[WorkspaceStore] ReciteStore sync error:', err);
      }
    }
  },

  injectCitationIntoTex: async (filePathOrId: string, charOffset: number, citeKey: string) => {
    const { fileTree, files, activeFileId, saveFileWithLock } = get();
    const injection = `~\\cite{${citeKey}}`;

    const diskFile = fileTree[filePathOrId] || Object.values(fileTree).find(f => f.name === filePathOrId || f.path === filePathOrId);
    const virtFile = files[filePathOrId] || Object.values(files).find(f => f.name === filePathOrId || f.id === filePathOrId || f.id === activeFileId);

    const targetContent = diskFile ? diskFile.content : virtFile ? virtFile.content : '';
    const safeOffset = Math.max(0, Math.min(charOffset, targetContent.length));
    const updatedContent = targetContent.slice(0, safeOffset) + injection + targetContent.slice(safeOffset);

    // Physically write to the hard drive if a disk file path exists with write-lock
    const diskPath = diskFile?.path || virtFile?.path;
    if (diskPath) {
      await saveFileWithLock(diskPath, updatedContent);
    }

    set((state) => {
      const updatedTree = { ...state.fileTree };
      if (diskPath && updatedTree[diskPath]) {
        updatedTree[diskPath] = { ...updatedTree[diskPath], content: updatedContent };
      }

      const updatedFiles = { ...state.files };
      if (virtFile) {
        updatedFiles[virtFile.id] = { ...virtFile, content: updatedContent };
      } else if (diskPath) {
        updatedFiles[diskPath] = {
          id: diskPath,
          name: diskFile?.name || 'main.tex',
          type: 'file',
          parentId: 'root',
          content: updatedContent,
          isOpen: false,
          path: diskPath,
        };
      }

      return {
        fileTree: updatedTree,
        files: updatedFiles,
      };
    });

    // Sync to active editor stores
    if (typeof window !== 'undefined') {
      try {
        const { useEditorStore } = require('@/store/useEditorStore');
        const editorState = useEditorStore.getState();
        const rawLatex = editorState.rawLatex;
        if (rawLatex && typeof rawLatex === 'string') {
          const safeOffsetRaw = Math.max(0, Math.min(charOffset, rawLatex.length));
          const updatedRaw = rawLatex.slice(0, safeOffsetRaw) + injection + rawLatex.slice(safeOffsetRaw);
          editorState.updateContent(updatedRaw);
        }

        const { useReciteStore } = require('@/lib/store');
        const reciteState = useReciteStore.getState();
        if (reciteState.rawText) {
          const safeOffsetRaw = Math.max(0, Math.min(charOffset, reciteState.rawText.length));
          const updatedText = reciteState.rawText.slice(0, safeOffsetRaw) + injection + reciteState.rawText.slice(safeOffsetRaw);
          reciteState.setRawText(updatedText);
          reciteState.setParsedText(updatedText);
        }
      } catch (err) {
        console.warn('[WorkspaceStore] Error syncing citation injection to editor:', err);
      }
    }
  },
}));


