'use client';

import { useEffect } from 'react';
import { useReciteStore } from '@/lib/store';
import { FileSystemService } from '@/services/file-system';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { useTheme } from './ThemeProvider';

export default function KeyboardShortcuts() {
  const {
    workspace,
    rawText,
    parsedText,
    setRawText,
    setParsedText,
    setMathBlocks,
    setDocumentTitle,
    setFileFormat,
    mountWorkspace,
    setWorkspaceStatus,
    toggleSidebar,
    setShowSettings,
    setShowExportModal,
    addToast,
  } = useReciteStore();

  const { toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (!isCtrlOrMeta) return;

      const key = e.key.toLowerCase();

      // 1. Save (Ctrl/Cmd + S) - Intercepts browser save dialog
      if (key === 's') {
        e.preventDefault();
        e.stopPropagation();

        if (!workspace.fileHandle) {
          addToast('No mounted file handle. Open a document first (Ctrl+O).', 'warning');
          return;
        }

        try {
          const contentToSave = rawText || parsedText;
          await FileSystemService.saveFile(workspace.fileHandle, contentToSave);
          addToast(`Saved to disk: ${workspace.fileName || 'manuscript'}`, 'success');
        } catch (err: any) {
          addToast(`Save failed: ${err.message}`, 'error');
        }
      }

      // 2. Open Document (Ctrl/Cmd + O)
      else if (key === 'o') {
        e.preventDefault();
        e.stopPropagation();

        try {
          const { text, fileHandle, fileName, fileSize } = await FileSystemService.mountFile();
          setWorkspaceStatus('MOUNTING');

          const { text: parsed, mathBlocks } = parseMathBlocks(text);
          setRawText(text);
          setParsedText(parsed);
          setMathBlocks(mathBlocks);
          setDocumentTitle(fileName);
          setFileFormat(fileName.endsWith('.docx') ? 'docx' : fileName.endsWith('.txt') ? 'txt' : 'tex');

          mountWorkspace(fileName, fileSize, fileHandle);
          setWorkspaceStatus('AST_PARSER_IDLE');
          addToast(`Mounted workspace: ${fileName}`, 'success');
        } catch (err: any) {
          if (err.message !== 'USER_ABORTED') {
            addToast(`Failed to open document: ${err.message}`, 'error');
          }
        }
      }

      // 3. Toggle Sidebar (Ctrl/Cmd + B)
      else if (key === 'b') {
        if (!isInput) {
          e.preventDefault();
          toggleSidebar();
        }
      }

      // 4. Export (Ctrl/Cmd + E)
      else if (key === 'e') {
        if (!isInput) {
          e.preventDefault();
          setShowExportModal(true);
        }
      }

      // 5. Settings (Ctrl/Cmd + ,)
      else if (e.key === ',') {
        e.preventDefault();
        setShowSettings(true);
      }

      // 6. Theme Toggle (Ctrl/Cmd + T)
      else if (key === 't' && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          toggleTheme();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    workspace,
    rawText,
    parsedText,
    setRawText,
    setParsedText,
    setMathBlocks,
    setDocumentTitle,
    setFileFormat,
    mountWorkspace,
    setWorkspaceStatus,
    toggleSidebar,
    setShowSettings,
    setShowExportModal,
    toggleTheme,
    addToast,
  ]);

  return null;
}
