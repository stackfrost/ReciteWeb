import { create } from 'zustand';
import type { DocumentFormat } from '@/services/universal-ast';

export interface VirtualFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  content: string; // for text files
  format?: DocumentFormat;
  isOpen: boolean; // used for folders (expanded state)
}

interface WorkspaceState {
  files: Record<string, VirtualFile>;
  activeFileId: string | null;

  createFile: (name: string, type: 'file' | 'folder', parentId: string | null, format?: DocumentFormat) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  setContent: (id: string, content: string) => void;
  setActiveFile: (id: string | null) => void;
  toggleFolder: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
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
  activeFileId: null,

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
      // Recursive delete helper could be added here
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
}));
