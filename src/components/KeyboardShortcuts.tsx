'use client';

import { useEffect } from 'react';
import { useReciteStore, calculateDocMetrics } from '@/lib/store';
import { FileSystemService } from '@/services/file-system';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { DiffGenerator } from '@/services/diff-generator';
import { ReportGenerator } from '@/services/report-generator';
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
    runAudit,
  } = useReciteStore();

  const { toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (!isCtrlOrMeta) return;

      const key = e.key.toLowerCase();

      // 0. Run Audit (Ctrl/Cmd + Enter)
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        runAudit();
        return;
      }

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

      // 7. Export Unified Patch (Ctrl/Cmd + Shift + P)
      else if (key === 'p' && e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          try {
            const { claims, rawText: currentRaw, workspace: currentWs, documentTitle: currentTitle } = useReciteStore.getState();
            if (currentWs.status === 'NO_WORKSPACE_MOUNTED') {
              addToast('Open a manuscript first to export fixes.', 'warning');
              return;
            }
            const fileName = currentWs.fileName || currentTitle || 'manuscript.tex';
            const actionableClaims = claims.filter(
              (c) => typeof c.suggestedFix === 'string' && c.suggestedFix.trim().length > 0
            );

            if (actionableClaims.length === 0) {
              addToast('No suggested fixes available to generate patch.', 'warning');
              return;
            }

            const patchContent = DiffGenerator.generateUnifiedPatchFromClaims(currentRaw, claims, fileName);
            const baseName = fileName.replace(/\.[^/.]+$/, '');
            const suggestedPatchName = `${baseName || 'fixes'}.patch`;

            if ('showSaveFilePicker' in window) {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: suggestedPatchName,
                types: [
                  {
                    description: 'Unified Diff Patch (*.patch, *.diff)',
                    accept: { 'text/plain': ['.patch', '.diff'] },
                  },
                ],
              });
              await FileSystemService.saveFile(handle, patchContent);
            } else {
              const blob = new Blob([patchContent], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = suggestedPatchName;
              a.click();
              URL.revokeObjectURL(url);
            }
            addToast(`Exported unified patch (${actionableClaims.length} fixes included).`, 'success');
          } catch (err: any) {
            if (err.name !== 'AbortError' && err.message !== 'USER_ABORTED') {
              addToast(`Patch export failed: ${err.message}`, 'error');
            }
          }
        }
      }

      // 8. Export Audit Report (Ctrl/Cmd + Shift + R)
      else if (key === 'r' && e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          try {
            const { claims, rawText: currentRaw, workspace: currentWs, documentTitle: currentTitle, docMetrics } = useReciteStore.getState();
            if (currentWs.status === 'NO_WORKSPACE_MOUNTED') {
              addToast('Open a manuscript first to export audit report.', 'warning');
              return;
            }
            const fileName = currentWs.fileName || currentTitle || 'manuscript.tex';
            const metrics = docMetrics && docMetrics.wordCount > 0 ? docMetrics : calculateDocMetrics(currentRaw);

            const reportContent = ReportGenerator.generateMarkdownReport(fileName, claims, metrics);
            const baseName = fileName.replace(/\.[^/.]+$/, '');
            const suggestedReportName = `audit_report_${baseName || 'manuscript'}.md`;

            if ('showSaveFilePicker' in window) {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: suggestedReportName,
                types: [
                  {
                    description: 'Markdown Audit Report (*.md)',
                    accept: { 'text/markdown': ['.md'], 'text/plain': ['.txt'] },
                  },
                ],
              });
              await FileSystemService.saveFile(handle, reportContent);
            } else {
              const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = suggestedReportName;
              a.click();
              URL.revokeObjectURL(url);
            }
            addToast(`Exported Markdown audit report (${claims.length} claims documented).`, 'success');
          } catch (err: any) {
            if (err.name !== 'AbortError' && err.message !== 'USER_ABORTED') {
              addToast(`Report export failed: ${err.message}`, 'error');
            }
          }
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
    runAudit,
  ]);

  return null;
}
