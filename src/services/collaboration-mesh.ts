import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export interface PeerUser {
  id: number;
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
}

export interface CollabConfig {
  roomName: string;
  password?: string;
  user: { name: string; color: string };
  onTextChange?: (newText: string) => void;
  onPeersChange?: (peers: PeerUser[]) => void;
}

export class CollaborationMeshService {
  private doc: Y.Doc | null = null;
  private provider: WebrtcProvider | null = null;
  private yText: Y.Text | null = null;

  public initMesh(config: CollabConfig): void {
    this.destroy(); // Clean up any active session

    this.doc = new Y.Doc();
    this.yText = this.doc.getText('latex-content');

    // Configure WebRTC provider (Local LAN mesh with optional signaling fallback)
    this.provider = new WebrtcProvider(config.roomName, this.doc, {
      password: config.password || undefined,
      signaling: ['wss://signaling.yjs.dev', 'ws://localhost:4444'],
    });

    const awareness = this.provider.awareness;

    // Track peer connections and cursor awareness
    awareness.on('change', () => {
      if (!config.onPeersChange) return;
      const states = awareness.getStates();
      const peers: PeerUser[] = [];

      states.forEach((state: Record<string, any>, clientID: number) => {
        if (state.user) {
          peers.push({
            id: clientID,
            name: state.user.name || 'Anonymous Researcher',
            color: state.user.color || '#38bdf8',
            cursor: state.cursor,
          });
        }
      });

      config.onPeersChange(peers);
    });

    // Set local peer presence
    awareness.setLocalStateField('user', {
      name: config.user.name,
      color: config.user.color,
    });

    // Listen to remote text updates
    this.yText.observe(() => {
      if (this.yText && config.onTextChange) {
        config.onTextChange(this.yText.toString());
      }
    });
  }

  public updateLocalText(newText: string): void {
    if (!this.doc || !this.yText) return;
    if (this.yText.toString() === newText) return;

    this.doc.transact(() => {
      this.yText!.delete(0, this.yText!.length);
      this.yText!.insert(0, newText);
    });
  }

  public updateCursorPosition(line: number, ch: number): void {
    if (!this.provider) return;
    this.provider.awareness.setLocalStateField('cursor', { line, ch });
  }

  public destroy(): void {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }
    this.yText = null;
  }
}

export const collabMesh = new CollaborationMeshService();
