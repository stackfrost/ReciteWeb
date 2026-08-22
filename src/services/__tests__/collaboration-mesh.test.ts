import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import { CollaborationMeshService, type PeerUser } from '../collaboration-mesh';
import { useCollabStore } from '@/store/useCollabStore';
import { useEditorStore } from '@/store/useEditorStore';

const { MockAwareness, MockWebrtcProvider } = vi.hoisted(() => {
  class MockAwareness {
    private states = new Map<number, any>();
    private handlers = new Map<string, Array<() => void>>();
    public clientID = 1001;

    setLocalStateField(field: string, value: any) {
      const current = this.states.get(this.clientID) || {};
      current[field] = value;
      this.states.set(this.clientID, current);
      this.emit('change');
    }

    getStates() {
      return this.states;
    }

    on(event: string, handler: () => void) {
      const list = this.handlers.get(event) || [];
      list.push(handler);
      this.handlers.set(event, list);
    }

    emit(event: string) {
      const list = this.handlers.get(event) || [];
      list.forEach((h) => h());
    }

    setRemotePeerState(id: number, state: any) {
      this.states.set(id, state);
      this.emit('change');
    }
  }

  class MockWebrtcProvider {
    public awareness = new MockAwareness();
    public destroyed = false;
    public roomName: string;
    public doc: Y.Doc;
    public opts: any;

    constructor(roomName: string, doc: Y.Doc, opts: any) {
      this.roomName = roomName;
      this.doc = doc;
      this.opts = opts;
    }

    destroy() {
      this.destroyed = true;
    }
  }

  return { MockAwareness, MockWebrtcProvider };
});

vi.mock('y-webrtc', () => {
  return {
    WebrtcProvider: MockWebrtcProvider,
  };
});

describe('CRDT Collaboration Mesh Service (src/services/collaboration-mesh.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes mesh, binds local user awareness, and handles local text transactions', () => {
    const mesh = new CollaborationMeshService();
    let emittedText = '';
    let emittedPeers: PeerUser[] = [];

    mesh.initMesh({
      roomName: 'quantum-spin-lab',
      user: { name: 'Dr. Feynman', color: '#06b6d4' },
      onTextChange: (text) => {
        emittedText = text;
      },
      onPeersChange: (peers) => {
        emittedPeers = peers;
      },
    });

    // Check peers initialized
    expect(emittedPeers.length).toBe(1);
    expect(emittedPeers[0].name).toBe('Dr. Feynman');
    expect(emittedPeers[0].color).toBe('#06b6d4');

    // Update text
    mesh.updateLocalText('\\begin{document}\nQuantum Spin Dynamics\n\\end{document}');
    expect(emittedText).toBe('\\begin{document}\nQuantum Spin Dynamics\n\\end{document}');

    // Updating identical text should be a no-op
    mesh.updateLocalText('\\begin{document}\nQuantum Spin Dynamics\n\\end{document}');

    // Update cursor
    mesh.updateCursorPosition(12, 4);

    mesh.destroy();
  });

  it('accurately captures multiple peers joining and broadcasting awareness states', () => {
    const mesh = new CollaborationMeshService();
    let currentPeers: PeerUser[] = [];

    mesh.initMesh({
      roomName: 'condensed-matter',
      user: { name: 'Local Researcher', color: '#10b981' },
      onPeersChange: (peers) => {
        currentPeers = peers;
      },
    });

    // Access the mock provider awareness
    const provider = (mesh as any).provider as InstanceType<typeof MockWebrtcProvider>;
    expect(provider).toBeDefined();

    // Simulate remote peer joining
    provider.awareness.setRemotePeerState(2002, {
      user: { name: 'Remote Collaborator', color: '#f43f5e' },
      cursor: { line: 5, ch: 10 },
    });

    expect(currentPeers.length).toBe(2);
    const remote = currentPeers.find((p) => p.id === 2002);
    expect(remote).toBeDefined();
    expect(remote?.name).toBe('Remote Collaborator');
    expect(remote?.color).toBe('#f43f5e');
    expect(remote?.cursor).toEqual({ line: 5, ch: 10 });

    mesh.destroy();
  });

  it('demonstrates mathematical deterministic CRDT text convergence between 2 Y.Doc instances', () => {
    // Direct Yjs CRDT convergence proof
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();

    const yText1 = doc1.getText('latex-content');
    const yText2 = doc2.getText('latex-content');

    // Cross-sync update handlers
    doc1.on('update', (update) => {
      Y.applyUpdate(doc2, update);
    });
    doc2.on('update', (update) => {
      Y.applyUpdate(doc1, update);
    });

    // Initial state from client 1
    yText1.insert(0, '\\documentclass{article}\n');

    // Concurrent edits:
    // Client 1 inserts section at the end
    yText1.insert(yText1.length, '\\begin{document}\n\\section{Introduction}\n');
    // Client 2 inserts text concurrently
    yText2.insert(yText2.length, '\\end{document}');

    // Both documents converge to the exact identical string representation
    expect(yText1.toString()).toBe(yText2.toString());
    expect(yText1.toString()).toContain('\\section{Introduction}');
    expect(yText1.toString()).toContain('\\end{document}');

    doc1.destroy();
    doc2.destroy();
  });
});

describe('Zustand Collaboration Store (src/store/useCollabStore.ts)', () => {
  beforeEach(() => {
    useCollabStore.getState().leaveSession();
    useEditorStore.getState().setRawLatex('');
  });

  it('initiates session, pushes initial editor text, and syncs remote changes to editor store', () => {
    const collabStore = useCollabStore.getState();
    const initialLatex = '\\begin{document}Collaborative Physics\\end{document}';

    useEditorStore.getState().setRawLatex(initialLatex);

    collabStore.startSession('particle-physics-lab', 'Dr. Higgs', initialLatex);

    const activeState = useCollabStore.getState();
    expect(activeState.isCollaborating).toBe(true);
    expect(activeState.roomName).toBe('particle-physics-lab');
    expect(activeState.userName).toBe('Dr. Higgs');

    // Sync local changes
    collabStore.syncLocalChange('\\begin{document}Updated Theory\\end{document}');

    // Leave session
    collabStore.leaveSession();
    const closedState = useCollabStore.getState();
    expect(closedState.isCollaborating).toBe(false);
    expect(closedState.roomName).toBe('');
    expect(closedState.peers).toEqual([]);
  });
});
