'use client';

import React, { useState, useCallback } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export const ZeroStateDropzone: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const { ingestFiles } = useWorkspaceStore() as any; // Need to implement ingestFiles or mock it if not present

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (ingestFiles) {
        await ingestFiles(Array.from(e.dataTransfer.files));
      } else {
        console.warn('ingestFiles not implemented in useWorkspaceStore yet');
      }
    }
  }, [ingestFiles]);

  return (
    <div className="w-full h-full bg-neutral-950 flex items-center justify-center p-8">
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-2xl h-96 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ${
          isDragging 
            ? 'border-sky-500 bg-sky-900/10' 
            : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/50'
        }`}
      >
        <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-sky-500/20 text-sky-400' : 'bg-neutral-800 text-neutral-400'}`}>
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-neutral-200 mb-2">Drop your manuscript here</h2>
        <p className="text-sm text-neutral-500 text-center max-w-md">
          Drag and drop a <span className="text-neutral-300 font-mono">.tex</span> file, <span className="text-neutral-300 font-mono">.docx</span> document, or an Overleaf <span className="text-neutral-300 font-mono">.zip</span> export to construct the virtual workspace.
        </p>
      </div>
    </div>
  );
};
