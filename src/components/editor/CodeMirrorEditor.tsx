'use client';

import React, { memo, useRef, useEffect, useMemo } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAuditStore } from '@/store/useAuditStore';
import { useEditorStore } from '@/store/useEditorStore';

export const CodeMirrorEditor: React.FC = memo(() => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const activeTexContent = useWorkspaceStore((state) => state.activeTexContent) || '';
  const setContent = useWorkspaceStore((state) => state.setContent);
  const activeFileId = useWorkspaceStore((state) => state.activeFileId) || 'main.tex';
  const saveFileWithLock = useWorkspaceStore((state) => state.saveFileWithLock);

  const rawLatex = useEditorStore((state) => state.rawLatex);
  const updateEditorContent = useEditorStore((state) => state.updateContent);

  const selectedFindingId = useAuditStore((state) => state.selectedFindingId);
  const findings = useAuditStore((state) => state.findings);
  const selectedFinding = findings.find((f) => f.id === selectedFindingId);
  const activeLine = selectedFinding?.line;

  const content = activeTexContent || rawLatex || '';

  // Synchronize stores on edit
  const handleChange = (val: string) => {
    if (activeFileId) {
      setContent(activeFileId, val);
    }
    updateEditorContent(val);
  };

  // Debounced auto-save directly to disk with write-lock
  useEffect(() => {
    if (!activeFileId || !content) return;

    const timer = setTimeout(() => {
      saveFileWithLock(activeFileId, content);
    }, 1000);

    return () => clearTimeout(timer);
  }, [content, activeFileId, saveFileWithLock]);

  // Jump to and highlight active line
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

  // Dark IDE Theme with adaptive line wrapping
  const extensions = useMemo(() => [
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
  ], []);

  return (
    <div className="w-full h-full min-w-0 overflow-hidden bg-[#0A0C0E] flex flex-col">
      {/* Editor Sub-Header / Breadcrumb */}
      <div className="h-7 bg-[#0D1013] border-b border-[#1F242C] flex items-center justify-between px-3 text-[11px] font-mono text-neutral-400 select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-emerald-400 font-semibold truncate">{activeFileId}</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-500 truncate">LaTeX Manuscript</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500 shrink-0">
          <span>{content.split('\n').length} lines</span>
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
