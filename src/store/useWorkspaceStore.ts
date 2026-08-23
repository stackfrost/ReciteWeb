import { create } from 'zustand';
import { open } from '@tauri-apps/plugin-dialog';
import { loadProjectFiles, saveFileToDisk, watchWorkspace, type LocalFile } from '@/services/local-fs';
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

  // Native Disk Actions
  mountLocalProject: () => Promise<void>;
  resetWorkspace: () => void;
  saveFileWithLock: (filePath: string, content: string) => Promise<boolean>;
  appendBibtex: (bibtexString: string) => Promise<void>;

  // Core & Virtual Actions
  createFile: (name: string, type: 'file' | 'folder', parentId: string | null, format?: DocumentFormat) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  setContent: (id: string, content: string) => void;
  setActiveFile: (id: string | null) => void;
  toggleFolder: (id: string) => void;
  ingestFiles: (files: File[]) => Promise<void>;
  appendToBibFile: (bibtexString: string) => void;
  injectCitationIntoTex: (fileId: string, charOffset: number, citeKey: string) => Promise<void> | void;
}

let isInternalWrite = false; // Flag to prevent auto-save from triggering the watcher

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspacePath: '~/research/quantum-spin-liquid',
  activeTexPath: 'main.tex',
  bibPath: 'references.bib',
  activeTexContent: DEMO_MANUSCRIPT,
  fileTree: {},
  activeFileId: 'main.tex',
  isLoading: false,
  files: {
    'root': {
      id: 'root',
      name: 'quantum-spin-liquid',
      type: 'folder',
      parentId: null,
      content: '',
      isOpen: true,
    },
    'main.tex': {
      id: 'main.tex',
      name: 'main.tex',
      type: 'file',
      parentId: 'root',
      content: DEMO_MANUSCRIPT,
      format: 'latex',
      isOpen: false,
      path: 'main.tex',
    },
    'references.bib': {
      id: 'references.bib',
      name: 'references.bib',
      type: 'file',
      parentId: 'root',
      content: DEMO_BIBTEX,
      format: 'bibtex' as any,
      isOpen: false,
      path: 'references.bib',
    },
  },

  resetWorkspace: () => {
    set({
      workspacePath: null,
      activeTexPath: null,
      bibPath: null,
      activeTexContent: null,
      fileTree: {},
      activeFileId: null,
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

  mountLocalProject: async () => {
    let dirPath: string | null = null;
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select LaTeX Manuscript Directory',
      });
      if (selected && typeof selected === 'string') {
        dirPath = selected;
      }
    } catch (error) {
      console.error('[WorkspaceStore] Error selecting directory:', error);
    }
    
    if (!dirPath) {
      // Fallback: reload/mount demo project if not in desktop mode or user cancelled
      set({
        workspacePath: '~/research/quantum-spin-liquid',
        activeTexPath: 'main.tex',
        bibPath: 'references.bib',
        activeTexContent: DEMO_MANUSCRIPT,
        activeFileId: 'main.tex',
        files: {
          'root': {
            id: 'root',
            name: 'quantum-spin-liquid',
            type: 'folder',
            parentId: null,
            content: '',
            isOpen: true,
          },
          'main.tex': {
            id: 'main.tex',
            name: 'main.tex',
            type: 'file',
            parentId: 'root',
            content: DEMO_MANUSCRIPT,
            format: 'latex',
            isOpen: false,
            path: 'main.tex',
          },
          'references.bib': {
            id: 'references.bib',
            name: 'references.bib',
            type: 'file',
            parentId: 'root',
            content: DEMO_BIBTEX,
            format: 'bibtex' as any,
            isOpen: false,
            path: 'references.bib',
          },
        },
      });
      return;
    }

    const diskFiles = await loadProjectFiles(dirPath);
    const virtualFiles: Record<string, VirtualFile> = {
      root: {
        id: 'root',
        name: dirPath.split(/[/\\]/).pop() || 'Project',
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

    const activeId = firstTexPath || Object.keys(diskFiles)[0] || null;
    const activeContent = (activeId && diskFiles[activeId]) ? diskFiles[activeId].content : '';

    set({
      workspacePath: dirPath,
      activeTexPath: firstTexPath,
      bibPath: firstBibPath,
      activeTexContent: activeContent,
      fileTree: diskFiles,
      files: virtualFiles,
      activeFileId: activeId,
    });

    // If an active .tex file was mounted, load it into the editor
    if (activeId && diskFiles[activeId]) {
      if (typeof window !== 'undefined') {
        try {
          const { useEditorStore } = require('@/store/useEditorStore');
          const { useReciteStore } = require('@/lib/store');
          useEditorStore.getState().updateContent(diskFiles[activeId].content);
          useEditorStore.getState().setActiveFileId(diskFiles[activeId].name);
          useReciteStore.getState().setRawText(diskFiles[activeId].content);
          useReciteStore.getState().setParsedText(diskFiles[activeId].content);
        } catch (e) {
          console.warn('[WorkspaceStore] Failed to sync mounted file to editor:', e);
        }
      }
    }

    // Load findings from frozen cache to prevent findings from shifting across sessions
    try {
      const { readReciteCache } = require('@/services/cache-manager');
      const cachedFindings = await readReciteCache(dirPath);
      if (cachedFindings && cachedFindings.length > 0) {
        if (typeof window !== 'undefined') {
          const { useEditorStore } = require('@/store/useEditorStore');
          const { useReciteStore } = require('@/lib/store');
          useEditorStore.getState().setFindings(cachedFindings);

          const mappedClaims = cachedFindings.map((f: any) => ({
            id: f.id,
            text: f.claim,
            category: 'Literature Claim',
            severity: f.severity,
            status: f.resolved ? 'accepted' : 'pending',
            lineIndex: f.line,
            startIndex: f.index,
            endIndex: f.index + (f.length || 0),
            fileId: f.fileId,
            context: f.claim,
            auditType: f.type,
            searchQuery: f.claim,
          }));
          useReciteStore.getState().setClaims(mappedClaims);
        }
      }
    } catch (cacheErr) {
      console.warn('[WorkspaceStore] Failed to load frozen cache:', cacheErr);
    }

    // Initialize the file watcher for external edits
    await watchWorkspace(dirPath, async (modifiedFilePath) => {
      if (isInternalWrite) return; // Ignore our own CodeMirror saves

      console.log(`[Workspace] External modification detected: ${modifiedFilePath}`);
      const updatedFiles = await loadProjectFiles(dirPath);
      const normalizedModified = modifiedFilePath.replace(/\\/g, '/');
      const matchedFile = updatedFiles[normalizedModified] || 
        Object.values(updatedFiles).find(f => f.path === normalizedModified || f.name === normalizedModified.split('/').pop());

      if (matchedFile) {
        set((state) => ({
          fileTree: {
            ...state.fileTree,
            [matchedFile.path]: matchedFile,
          },
          files: {
            ...state.files,
            [matchedFile.path]: {
              ...(state.files[matchedFile.path] || {
                id: matchedFile.path,
                name: matchedFile.name,
                type: 'file',
                parentId: 'root',
                isOpen: false,
              }),
              content: matchedFile.content,
              path: matchedFile.path,
            },
          },
        }));

        const currentActiveFileId = get().activeFileId;
        if (currentActiveFileId === matchedFile.path || currentActiveFileId === matchedFile.name) {
          if (typeof window !== 'undefined') {
            try {
              const { useEditorStore } = require('@/store/useEditorStore');
              const { useReciteStore } = require('@/lib/store');
              useEditorStore.getState().updateContent(matchedFile.content);
              useEditorStore.getState().invalidateCache();
              useReciteStore.getState().setRawText(matchedFile.content);
              useReciteStore.getState().setParsedText(matchedFile.content);
            } catch (e) {
              console.warn('[WorkspaceStore] Hot-reload editor sync error:', e);
            }
          }
        }
      }
    });
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

  setActiveFile: (id) => set({ activeFileId: id }),

  toggleFolder: (id) => {
    set((state) => ({
      files: {
        ...state.files,
        [id]: { ...state.files[id], isOpen: !state.files[id]?.isOpen }
      }
    }));
  },

  ingestFiles: async (newFiles: File[]) => {
    for (const file of newFiles) {
      const text = await file.text();
      const format = file.name.endsWith('.docx') ? 'docx' : file.name.endsWith('.md') ? 'markdown' : 'latex';
      get().createFile(file.name, 'file', 'root', format);
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


