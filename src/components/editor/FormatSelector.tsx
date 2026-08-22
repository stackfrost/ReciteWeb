'use client';

import React, { useRef } from 'react';
import { DocumentFormat } from '@/services/universal-ast';
import { useEditorStore } from '@/store/useEditorStore';

interface FormatSelectorProps {
  currentFormat: DocumentFormat;
  onFormatChange: (format: DocumentFormat) => void;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({ currentFormat, onFormatChange }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { loadDocxBuffer } = useEditorStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      const buffer = await file.arrayBuffer();
      await loadDocxBuffer(buffer);
      onFormatChange('docx');
    }
    // Reset file input value so same file can be reloaded if needed
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx"
        className="hidden"
      />

      {(['latex', 'typst', 'markdown', 'docx'] as DocumentFormat[]).map((fmt) => (
        <button
          key={fmt}
          onClick={() => {
            if (fmt === 'docx') {
              fileInputRef.current?.click();
            } else {
              onFormatChange(fmt);
            }
          }}
          className={`px-2.5 py-1 rounded-md uppercase font-medium transition-colors text-[11px] ${
            currentFormat === fmt
              ? 'bg-neutral-800 text-sky-400 shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          {fmt === 'latex' ? 'LaTeX' : fmt === 'typst' ? 'Typst' : fmt === 'markdown' ? 'Markdown' : 'Word (.docx)'}
        </button>
      ))}
    </div>
  );
};
export default FormatSelector;
