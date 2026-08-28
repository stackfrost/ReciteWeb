import { describe, it, expect } from 'vitest';
import { createLockedDiffExtension, type LockedDiffPayload } from '../lockedDiffWidget';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

describe('lockedDiffWidget: CodeMirror 6 Inline Extension', () => {
  it('instantiates the extension with diff payload list', () => {
    const diffs: LockedDiffPayload[] = [
      {
        line: 1,
        originalText: '\\cite{badkey}',
        suggestedText: '\\cite{goodkey}',
        issueType: 'Retracted Paper Flag',
        isLocked: true,
      },
    ];

    const ext = createLockedDiffExtension(() => diffs);
    expect(ext).toBeDefined();

    const state = EditorState.create({
      doc: 'Line 1 text with citation\nLine 2',
      extensions: [ext],
    });

    expect(state).toBeDefined();
  });
});
