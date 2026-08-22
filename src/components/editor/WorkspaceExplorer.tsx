'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import type { DocumentFormat } from '@/services/universal-ast';

export const WorkspaceExplorer: React.FC = () => {
  const { files, activeFileId, setActiveFile, toggleFolder, createFile, deleteFile } = useWorkspaceStore();
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      let format: DocumentFormat = 'latex';
      if (newFileName.endsWith('.md')) format = 'markdown';
      if (newFileName.endsWith('.typ')) format = 'typst';
      if (newFileName.endsWith('.docx')) format = 'docx';
      
      const id = createFile(newFileName.trim(), 'file', 'root', format);
      setActiveFile(id);
      setNewFileName('');
      setIsAddingFile(false);
    }
  };

  const renderTree = (parentId: string | null = 'root', depth = 0) => {
    const children = Object.values(files).filter(f => f.parentId === parentId && f.id !== 'root');
    
    return children.map(file => (
      <div key={file.id}>
        <div 
          className={`flex items-center group px-2 py-1 cursor-pointer text-xs transition-colors ${activeFileId === file.id ? 'bg-sky-900/40 text-sky-200' : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => file.type === 'folder' ? toggleFolder(file.id) : setActiveFile(file.id)}
        >
          {file.type === 'folder' && (
            <span className="w-4 mr-1 text-neutral-500">{file.isOpen ? '˅' : '˃'}</span>
          )}
          {file.type === 'file' && (
            <span className="w-4 mr-1 text-neutral-600">≡</span>
          )}
          <span className="truncate flex-1">{file.name}</span>
          
          <button 
            onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
            className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-rose-400 px-1"
          >
            ✕
          </button>
        </div>
        
        {file.type === 'folder' && file.isOpen && renderTree(file.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-900 flex justify-between items-center text-xs font-semibold text-neutral-300 uppercase tracking-wider">
        Workspace
        <button 
          onClick={() => setIsAddingFile(true)}
          className="text-neutral-500 hover:text-white"
          title="New File"
        >
          +
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {isAddingFile && (
          <form onSubmit={handleAddFile} className="px-2 mb-2">
            <input 
              autoFocus
              type="text" 
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => setIsAddingFile(false)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
              placeholder="filename.tex"
            />
          </form>
        )}
        
        {renderTree('root', 0)}
        
        {Object.keys(files).length === 1 && !isAddingFile && (
          <div className="px-4 py-8 text-center text-neutral-600 text-xs italic">
            Workspace is empty.<br/>Click + to add files.
          </div>
        )}
      </div>
    </div>
  );
};
