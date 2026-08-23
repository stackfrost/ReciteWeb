'use client';

import React, { useState, useRef } from 'react';
import { useWorkspaceStore, type VirtualFile } from '@/store/useWorkspaceStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useReciteStore } from '@/lib/store';
import { BibTeXParser } from '@/services/bibtex-parser';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import type { DocumentFormat } from '@/services/universal-ast';

export const WorkspaceExplorer: React.FC = () => {
  const { files, activeFileId, setActiveFile, toggleFolder, createFile, deleteFile, setContent, mountLocalProject, workspacePath } = useWorkspaceStore();
  const { setActiveFileId, setRawLatex } = useEditorStore();
  const { mountBibTex, addToast } = useReciteStore();

  const [isAddingFile, setIsAddingFile] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFile = (file: VirtualFile) => {
    if (file.type === 'folder') {
      toggleFolder(file.id);
      return;
    }
    setActiveFile(file.id);
    setActiveFileId(file.name);
    setRawLatex(file.content || '');

    // If it's a .bib file, automatically mount it as active bibliography
    if (file.name.endsWith('.bib') && file.content) {
      const entries = BibTeXParser.parse(file.content);
      mountBibTex(file.name, file.content);
      addToast?.(`Auto-linked ${entries.size} references from ${file.name}`, 'info');
    } else {
      const { text: parsed, mathBlocks } = parseMathBlocks(file.content || '');
      const recite = useReciteStore.getState();
      recite.setRawText(file.content || '');
      recite.setParsedText(parsed);
      recite.setMathBlocks(mathBlocks);
      recite.setDocumentTitle(file.name);
      recite.setFileFormat(
        file.name.endsWith('.docx')
          ? 'docx'
          : file.name.endsWith('.txt')
          ? 'txt'
          : 'tex'
      );
      recite.mountWorkspace(file.name, (file.content || '').length);
    }
  };

  const handleAddSubmit = (type: 'file' | 'folder') => {
    if (newFileName.trim()) {
      let format: DocumentFormat = 'latex';
      if (newFileName.endsWith('.md')) format = 'markdown';
      if (newFileName.endsWith('.typ')) format = 'typst';
      if (newFileName.endsWith('.docx')) format = 'docx';

      const id = createFile(newFileName.trim(), type, 'root', format);
      if (type === 'file') {
        const createdFile = useWorkspaceStore.getState().files[id];
        if (createdFile) handleSelectFile(createdFile);
      }
      setNewFileName('');
      setIsAddingFile(false);
      setIsAddingFolder(false);
    }
  };

  // Drag and drop multi-file handler
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!droppedFiles.length) return;

    for (const file of droppedFiles) {
      let format: DocumentFormat = 'latex';
      if (file.name.endsWith('.md')) format = 'markdown';
      if (file.name.endsWith('.typ')) format = 'typst';
      if (file.name.endsWith('.docx')) format = 'docx';

      const id = createFile(file.name, 'file', 'root', format);

      if (file.name.endsWith('.docx')) {
        const buffer = await file.arrayBuffer();
        useEditorStore.getState().loadDocxBuffer(buffer);
      } else {
        const text = await file.text();
        setContent(id, text);

        if (file.name.endsWith('.bib')) {
          const entries = BibTeXParser.parse(text);
          mountBibTex(file.name, text);
          addToast?.(`Auto-detected and mounted ${file.name} (${entries.size} references)`, 'success');
        } else if (file.name.endsWith('.tex') || file.name.endsWith('.md') || file.name.endsWith('.typ')) {
          const createdFile = useWorkspaceStore.getState().files[id];
          if (createdFile) handleSelectFile(createdFile);
        }
      }
    }
  };

  const renderFileIcon = (file: VirtualFile) => {
    if (file.type === 'folder') {
      return <span className="w-4 mr-1 text-neutral-500 font-mono">{file.isOpen ? '▾' : '▸'}</span>;
    }
    if (file.name.endsWith('.bib')) {
      return <span className="w-4 mr-1 text-emerald-400 font-mono text-[10px]">🕮</span>;
    }
    if (file.name.endsWith('.tex')) {
      return <span className="w-4 mr-1 text-sky-400 font-mono text-[10px]">T</span>;
    }
    if (file.name.endsWith('.md')) {
      return <span className="w-4 mr-1 text-purple-400 font-mono text-[10px]">M</span>;
    }
    if (file.name.endsWith('.docx')) {
      return <span className="w-4 mr-1 text-blue-400 font-mono text-[10px]">W</span>;
    }
    return <span className="w-4 mr-1 text-neutral-500 font-mono">≡</span>;
  };

  const renderTree = (parentId: string | null = 'root', depth = 0) => {
    const children = Object.values(files).filter((f) => f.parentId === parentId && f.id !== 'root');

    return children.map((file) => (
      <div key={file.id}>
        <div
          className={`flex items-center group px-2 py-1.5 cursor-pointer text-xs transition-colors rounded-sm mx-1 ${
            activeFileId === file.id
              ? 'bg-neutral-800 text-white font-medium'
              : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleSelectFile(file)}
        >
          {renderFileIcon(file)}
          <span className="truncate flex-1 font-mono text-[11px]">{file.name}</span>

          {file.name.endsWith('.bib') && (
            <span className="text-[9px] px-1 py-0.2 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded mr-1">
              bib
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteFile(file.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400 px-1 transition-opacity cursor-pointer"
            title="Delete file"
          >
            ✕
          </button>
        </div>

        {file.type === 'folder' && file.isOpen && renderTree(file.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`w-full flex flex-col h-full overflow-hidden select-none bg-neutral-950 ${
        isDraggingOver ? 'ring-2 ring-sky-500/50 bg-sky-950/10' : ''
      }`}
    >
      {/* Explorer Top Toolbar */}
      <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-900/30 flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
        <span className="truncate max-w-[110px]" title={workspacePath || 'Files'}>
          {workspacePath ? workspacePath.split(/[/\\]/).filter(Boolean).pop() : 'Files'}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={mountLocalProject}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded text-[10px] font-semibold transition-colors cursor-pointer"
            title="Open Local Project (Native OS Picker)"
          >
            <span>📂 Open</span>
          </button>
          <button
            onClick={() => {
              setIsAddingFile(true);
              setIsAddingFolder(false);
            }}
            className="text-neutral-400 hover:text-white px-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
            title="New File"
          >
            + File
          </button>
          <button
            onClick={() => {
              setIsAddingFolder(true);
              setIsAddingFile(false);
            }}
            className="text-neutral-400 hover:text-white px-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
            title="New Folder"
          >
            + Folder
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {/* Inline file/folder creation */}
        {(isAddingFile || isAddingFolder) && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddSubmit(isAddingFolder ? 'folder' : 'file');
            }}
            className="px-2 mb-2"
          >
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => {
                setIsAddingFile(false);
                setIsAddingFolder(false);
              }}
              className="w-full bg-neutral-900 border border-sky-500/80 rounded px-2 py-1 text-xs text-white outline-none font-mono"
              placeholder={isAddingFolder ? 'folder_name' : 'filename.tex / refs.bib'}
            />
          </form>
        )}

        {renderTree('root', 0)}

        {Object.keys(files).length <= 1 && !isAddingFile && !isAddingFolder && (
          <div className="px-4 py-8 text-center text-neutral-600 text-xs flex flex-col items-center">
            <p className="font-medium text-neutral-400 mb-2">No Workspace Folder Opened</p>
            <button
              onClick={mountLocalProject}
              className="mb-4 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>📂 Open Local Folder</span>
            </button>
            <p className="text-[11px] leading-relaxed">
              Or drag &amp; drop <span className="text-neutral-400">.tex</span>, <span className="text-emerald-400">.bib</span>, <span className="text-purple-400">.md</span>, or <span className="text-blue-400">.docx</span> files here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
