'use client';

import React from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { ZeroStateDropzone } from './ZeroStateDropzone';

export const MainEditorArea: React.FC = () => {
  const { activeFileId, files } = useWorkspaceStore();
  
  // 1. If a file is selected, ALWAYS show the editor.
  if (activeFileId) {
    return <CodeMirrorEditor />;
  }

  // 2. If no file is selected and the tree is empty, show the Dropzone.
  const isWorkspaceEmpty = !files || Object.keys(files).length <= 1;
  if (isWorkspaceEmpty) {
    return <ZeroStateDropzone />;
  }

  // 3. Fallback for loaded tree but no active file.
  return (
    <div className="w-full h-full bg-neutral-950 flex items-center justify-center text-neutral-500 text-sm">
      Select a file from the Explorer to begin editing.
    </div>
  );
};
