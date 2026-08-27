'use client';

import React, { memo, useRef, useEffect, useMemo, useCallback } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuditStore } from '@/store/useAuditStore';
import { useEditorStore } from '@/store/useEditorStore';

export const CodeMirrorEditor: React.FC = memo(() => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // ── Atomic selectors — each subscribes to only one scalar ──────────────────
  const activeTexContent = useWorkspaceStore((s) => s.activeTexContent);
  const setContent = useWorkspaceStore((s) => s.setContent);
  const saveFileWithLock = useWorkspaceStore((s) => s.saveFileWithLock);
  // NOTE: activeFileId is read from store.getState() inside callbacks to avoid
  // stale closure issues during rapid file switches.

  const rawLatex = useEditorStore((s) => s.rawLatex);
  const updateEditorContent = useEditorStore((s) => s.updateContent);

  // Atomic derivation: subscribe only to selectedFindingId; resolve line number
  // by reading findings once at selection time — avoids subscribing to the full
  // findings array and re-rendering on every append during live audit streaming.
  const activeLine = useAuditStore((s) => {
    if (!s.selectedFindingId) return undefined;
    const finding = s.findings.find((f) => f.id === s.selectedFindingId);
    return finding?.line;
  });

  const content = activeTexContent || rawLatex || '';

  // Memoized line count — avoids O(n) split on every render tick
  const lineCount = useMemo(() => {
    if (!content) return 1;
    let count = 1;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '\n') count++;
    }
    return count;
  }, [content]);

  // Stable handler — reads activeFileId imperatively to prevent stale closures
  // during rapid file switches or fast typing in 10k-line documents.
  const handleChange = useCallback(
    (val: string) => {
      // Imperative read avoids closure capture of stale activeFileId
      const fileId = useWorkspaceStore.getState().activeFileId;
      if (fileId) {
        setContent(fileId, val);
      }
      updateEditorContent(val);
    },
    [setContent, updateEditorContent]
  );

  // Debounced auto-save — reads activeFileId imperatively for the same reason
  useEffect(() => {
    if (!content) return;
    const timer = setTimeout(() => {
      const fileId = useWorkspaceStore.getState().activeFileId;
      if (fileId) {
        saveFileWithLock(fileId, content);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, saveFileWithLock]);

  // Jump to and highlight active line — safe: reads live view.state.doc from
  // CodeMirror's B-tree, never from a closed-over React state value.
  useEffect(() => {
    if (!activeLine || !editorRef.current?.view) return;
    try {
      const view = editorRef.current.view;
      const doc = view.state.doc;
      const targetLine = Math.max(1, Math.min(activeLine, doc.lines));
      const linePos = doc.line(targetLine);
      view.dispatch({
        selection: { anchor: linePos.from, head: linePos.to },
        scrollIntoView: true,
      });
    } catch (err) {
      console.warn('[CodeMirror] Line scroll skipped:', err);
    }
  }, [activeLine]);

  // Dark IDE Theme with adaptive line wrapping — stable: no deps → built once
  const extensions = useMemo(
    () => [
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          height: '100%',
          backgroundColor: '#0A0C0E',
          color: '#D1D5DB',
          fontSize: '12px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        },
        '.cm-scroller': {
          overflow: 'auto',
          fontFamily: 'inherit',
          lineHeight: '1.65',
        },
        '.cm-content': {
          padding: '12px 16px',
          caretColor: '#38BDF8',
        },
        '.cm-line': {
          padding: '0 4px',
        },
        '.cm-gutters': {
          backgroundColor: '#0A0C0E',
          color: '#4B5563',
          borderRight: '1px solid #1F242C',
          paddingRight: '6px',
          userSelect: 'none',
        },
        '.cm-lineNumbers .cm-gutterElement': {
          padding: '0 8px 0 12px',
          minWidth: '32px',
          textAlign: 'right',
        },
        '.cm-activeLine': {
          backgroundColor: '#131920',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#131920',
          color: '#38BDF8',
        },
        '&.cm-focused .cm-selectionBackground, ::selection': {
          backgroundColor: '#1E3A5F !important',
        },
        '.cm-cursor': {
          borderLeftColor: '#38BDF8',
          borderLeftWidth: '2px',
        },
      }),
    ],
    []
  );

  return (
    <div className="w-full h-full min-w-0 overflow-hidden bg-[#0A0C0E] flex flex-col">
      {/* Editor Sub-Header / Breadcrumb */}
      <div className="h-7 bg-[#0D1013] border-b border-[#1F242C] flex items-center justify-between px-3 text-[11px] font-mono text-neutral-400 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ActiveFileLabel />
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-500 truncate">LaTeX Manuscript</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500 shrink-0">
          <span>{lineCount} lines</span>
          <span>UTF-8</span>
          <span className="text-sky-400 font-semibold">Adaptive Wrap</span>
        </div>
      </div>

      {/* CodeMirror Workspace */}
      <div className="flex-1 min-w-0 overflow-hidden w-full h-full">
        <CodeMirror
          className="h-full w-full"
          height="100%"
          theme="dark"
          value={content}
          onChange={handleChange}
          ref={editorRef}
          extensions={extensions}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
          }}
        />
      </div>
    </div>
  );
});

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

// ── Isolated sub-component so the file breadcrumb does not re-render the
//    entire editor when activeFileId changes (e.g. tab switches).
const ActiveFileLabel = memo(() => {
  const activeFileId = useWorkspaceStore((s) => s.activeFileId) || 'main.tex';
  return <span className="text-emerald-400 font-semibold truncate">{activeFileId}</span>;
});
ActiveFileLabel.displayName = 'ActiveFileLabel';
