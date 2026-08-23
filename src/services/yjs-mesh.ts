import * as Y from 'yjs';

/**
 * Compacts a Yjs document by encoding it as a pure state update and 
 * loading it into a fresh document, thereby discarding granular keystroke history.
 * Run this during auto-saves or when the user leaves a collaboration room.
 */
export function compactCollaborationState(doc: Y.Doc): Y.Doc {
  // 1. Generate a complete state update from the bloated document
  const stateUpdate = Y.encodeStateAsUpdate(doc);
  
  // 2. Create a brand new, empty document
  const compactedDoc = new Y.Doc();
  
  // 3. Apply the state update to the new document. 
  // It now has the exact same text/content, but 0 undo history stack.
  Y.applyUpdate(compactedDoc, stateUpdate);
  
  return compactedDoc;
}
