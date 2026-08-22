import { create } from 'zustand';
import { collabMesh, type PeerUser } from '@/services/collaboration-mesh';
import { useEditorStore } from './useEditorStore';

export interface CollabState {
  isCollaborating: boolean;
  roomName: string;
  userName: string;
  userColor: string;
  peers: PeerUser[];
  
  startSession: (roomName: string, userName: string, initialContent: string) => void;
  leaveSession: () => void;
  syncLocalChange: (text: string) => void;
}

const PALETTE = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

export const useCollabStore = create<CollabState>((set, get) => ({
  isCollaborating: false,
  roomName: '',
  userName: 'Researcher',
  userColor: PALETTE[Math.floor(Math.random() * PALETTE.length)],
  peers: [],

  startSession: (roomName, userName, initialContent) => {
    const { userColor } = get();

    collabMesh.initMesh({
      roomName,
      user: { name: userName, color: userColor },
      onTextChange: (incomingText) => {
        // Sync external changes directly into the primary editor state
        useEditorStore.getState().setRawLatex(incomingText);
      },
      onPeersChange: (peers) => {
        set({ peers });
      },
    });

    if (initialContent) {
      collabMesh.updateLocalText(initialContent);
    }

    set({ isCollaborating: true, roomName, userName });
  },

  leaveSession: () => {
    collabMesh.destroy();
    set({ isCollaborating: false, roomName: '', peers: [] });
  },

  syncLocalChange: (text) => {
    if (get().isCollaborating) {
      collabMesh.updateLocalText(text);
    }
  },
}));
