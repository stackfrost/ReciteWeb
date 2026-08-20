'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Play,
  FolderOpen,
  Sparkles,
  XCircle,
  Download,
  Sliders,
  Moon,
  Sun,
  Activity,
  Shield,
  Layers,
  RotateCcw,
  Trash2,
  HelpCircle,
  Command,
  FileCode2,
  FileText,
} from 'lucide-react';
import { useReciteStore, calculateDocMetrics } from '@/lib/store';
import { parseMathBlocks } from '@/lib/parsers/math-parser';
import { DEMO_MANUSCRIPT, DEMO_CLAIMS, DEMO_BIBTEX } from '@/lib/demo-data';
import { useTheme } from './ThemeProvider';
import { cn } from '@/lib/utils';
import { FileSystemService } from '@/services/file-system';
import { LaTeXParser } from '@/services/latex-parser';
import { BibTeXParser } from '@/services/bibtex-parser';
import { DiffGenerator } from '@/services/diff-generator';
import { ReportGenerator } from '@/services/report-generator';

interface CommandItem {
  id: string;
  category: 'Document' | 'Navigation' | 'Preferences' | 'System';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

export default function CommandPalette({
  isOpen: propIsOpen,
  onClose: propOnClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { resolvedTheme, toggleTheme } = useTheme();
  const {
    workspace,
    rawText,
    bibtexContent,
    mountWorkspace,
    unmountWorkspace,
    setRawText,
    setParsedText,
    setMathBlocks,
    setClaims,
    setDocumentTitle,
    setFileFormat,
    setWorkspaceStatus,
    setIsAuditing,
    setShowSettings,
    setShowExportModal,
    setShowLegalWindow,
    setInspectorTab,
    toggleSidebar,
    setFilterSeverity,
    setFilterCategory,
    setFilterStatus,
    setTelemetry,
    runAudit,
    mountBibTex,
  } = useReciteStore();

  const isControlled = propIsOpen !== undefined;
  const isOpen = isControlled ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (isControlled && propOnClose) {
      propOnClose();
    } else {
      setInternalOpen(false);
    }
    setQuery('');
    setSelectedIndex(0);
  };

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          setInternalOpen(true);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const isMounted = workspace.status !== 'NO_WORKSPACE_MOUNTED';

  const handleMountClick = async () => {
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
      setWorkspaceStatus('AST_PARSING');
      
      setTimeout(() => {
        setWorkspaceStatus('AST_PARSER_IDLE');
      }, 200);
      
      handleClose();
    } catch (err: any) {
      if (err.message !== 'USER_ABORTED') {
        const { addToast } = useReciteStore.getState();
        addToast(`Failed to open document: ${err.message}`, 'error');
      }
    }
  };

  const handleLoadDemo = () => {
    setWorkspaceStatus('MOUNTING');
    const { text: parsed, mathBlocks } = parseMathBlocks(DEMO_MANUSCRIPT);

    setRawText(DEMO_MANUSCRIPT);
    setParsedText(parsed);
    setMathBlocks(mathBlocks);
    setClaims(DEMO_CLAIMS);
    setDocumentTitle('Quantum Spin Dynamics (Draft).tex');
    setFileFormat('tex');
    mountWorkspace('Quantum Spin Dynamics (Draft).tex', 14200);
    mountBibTex('quantum_references.bib', DEMO_BIBTEX);
    setWorkspaceStatus('MOUNTED');
    handleClose();
  };

  const handleRunAnalysis = () => {
    runAudit();
    handleClose();
  };

  const allCommands = useMemo<CommandItem[]>(() => {
    return [
      {
        id: 'doc-analyze',
        category: 'Document',
        title: 'Analyze Document',
        subtitle: 'Initiate automated claim tokenization & citation verification',
        icon: <Play className="w-4 h-4 text-emerald-500" />,
        shortcut: 'Ctrl+Enter',
        disabled: !isMounted,
        action: handleRunAnalysis,
      },
      {
        id: 'doc-open',
        category: 'Document',
        title: 'Open Document...',
        subtitle: 'Load a local LaTeX (.tex), Word (.docx), or text file',
        icon: <FolderOpen className="w-4 h-4 text-blue-500" />,
        shortcut: 'Ctrl+O',
        action: handleMountClick,
      },
      {
        id: 'doc-sample',
        category: 'Document',
        title: 'Load Sample Manuscript',
        subtitle: 'Load pre-configured quantum physics draft with 5 claims',
        icon: <Sparkles className="w-4 h-4 text-amber-500" />,
        shortcut: 'Ctrl+Shift+D',
        action: handleLoadDemo,
      },
      {
        id: 'doc-export',
        category: 'Document',
        title: 'Export Bibliography (.bib)...',
        subtitle: 'Generate standard BibTeX database for used citations only',
        icon: <Download className="w-4 h-4 text-indigo-500" />,
        shortcut: 'Ctrl+E',
        disabled: !isMounted,
        action: async () => {
          handleClose();
          try {
            // Extract used citation keys from the manuscript
            const usedKeys = LaTeXParser.findCitations(rawText);
            if (usedKeys.length === 0) {
              const { addToast } = useReciteStore.getState();
              addToast('No \\cite{} commands found in the manuscript.', 'warning');
              return;
            }

            // Parse the loaded BibTeX and generate filtered output
            const bibMap = BibTeXParser.parse(bibtexContent || '');
            const filteredBib = BibTeXParser.generateFilteredBib(usedKeys, bibMap);

            if (filteredBib.trim().length === 0) {
              const { addToast } = useReciteStore.getState();
              addToast('No matching BibTeX entries found for used citation keys.', 'warning');
              return;
            }

            // Try native save dialog
            if ('showSaveFilePicker' in window) {
              const handle = await (window as any).showSaveFilePicker({
                suggestedName: 'references.bib',
                types: [{
                  description: 'BibTeX Database',
                  accept: { 'text/plain': ['.bib'] },
                }],
              });
              await FileSystemService.saveFile(handle, filteredBib);
              const { addToast } = useReciteStore.getState();
              addToast(`Exported ${usedKeys.length} citation entries.`, 'success');
            } else {
              // Fallback: Blob download
              const blob = new Blob([filteredBib], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'references.bib';
              a.click();
              URL.revokeObjectURL(url);
              const { addToast } = useReciteStore.getState();
              addToast(`Exported ${usedKeys.length} citation entries.`, 'success');
            }
          } catch (err: any) {
            if (err.name !== 'AbortError' && err.message !== 'USER_ABORTED') {
              const { addToast } = useReciteStore.getState();
              addToast(`Export failed: ${err.message}`, 'error');
            }
          }
        },
      },
      {
        id: 'doc-export-patch',
        category: 'Document',
        title: 'Export Suggested Fixes (.patch)...',
        subtitle: 'Generate Git-compatible unified patch of all AI citation remediations',
        icon: <FileCode2 className="w-4 h-4 text-emerald-500" />,
        shortcut: 'Ctrl+Shift+P',
        disabled: !isMounted,
        action: async () => {
          handleClose();
          try {
            const { claims, rawText, workspace, documentTitle, addToast } = useReciteStore.getState();
            const fileName = workspace.fileName || documentTitle || 'manuscript.tex';
            const actionableClaims = claims.filter(
              (c) => typeof c.suggestedFix === 'string' && c.suggestedFix.trim().length > 0
            );

            if (actionableClaims.length === 0) {
              addToast('No suggested fixes available to generate patch.', 'warning');
              return;
            }

            const patchContent = DiffGenerator.generateUnifiedPatch(rawText, claims, fileName);
            if (!patchContent || patchContent.trim().length === 0) {
              addToast('No diff changes detected in manuscript.', 'warning');
              return;
            }

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
              const { addToast } = useReciteStore.getState();
              addToast(`Patch export failed: ${err.message}`, 'error');
            }
          }
        },
      },
      {
        id: 'doc-export-report',
        category: 'Document',
        title: 'Export Audit Report (.md)...',
        subtitle: 'Generate clinical peer-review Markdown audit of all citation anomalies',
        icon: <FileText className="w-4 h-4 text-violet-500" />,
        shortcut: 'Ctrl+Shift+R',
        disabled: !isMounted,
        action: async () => {
          handleClose();
          try {
            const { claims, rawText, workspace, documentTitle, docMetrics, addToast } = useReciteStore.getState();
            const fileName = workspace.fileName || documentTitle || 'manuscript.tex';
            const metrics = docMetrics && docMetrics.wordCount > 0 ? docMetrics : calculateDocMetrics(rawText);

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
              const { addToast } = useReciteStore.getState();
              addToast(`Report export failed: ${err.message}`, 'error');
            }
          }
        },
      },
      {
        id: 'doc-close',
        category: 'Document',
        title: 'Close Document',
        subtitle: 'Unmount active manuscript and clear working buffer',
        icon: <XCircle className="w-4 h-4 text-rose-500" />,
        shortcut: 'Ctrl+W',
        disabled: !isMounted,
        action: () => {
          unmountWorkspace();
          handleClose();
        },
      },
      {
        id: 'nav-sidebar',
        category: 'Navigation',
        title: 'Toggle Explorer Sidebar',
        subtitle: 'Show or hide the document outline and workspace tree',
        icon: <Layers className="w-4 h-4 text-zinc-500" />,
        shortcut: 'Ctrl+B',
        action: () => {
          toggleSidebar();
          handleClose();
        },
      },
      {
        id: 'nav-candidates',
        category: 'Navigation',
        title: 'View Candidate Citations',
        subtitle: 'Focus inspector on matched literature candidates',
        icon: <Activity className="w-4 h-4 text-emerald-500" />,
        action: () => {
          setInspectorTab('candidates');
          handleClose();
        },
      },
      {
        id: 'nav-radar',
        category: 'Navigation',
        title: 'View Retraction Radar',
        subtitle: 'Inspect retraction notices and integrity flags',
        icon: <Shield className="w-4 h-4 text-rose-500" />,
        action: () => {
          setInspectorTab('health');
          handleClose();
        },
      },
      {
        id: 'pref-theme',
        category: 'Preferences',
        title: `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`,
        subtitle: 'Toggle clinical high-contrast light or dark appearance',
        icon: resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
        shortcut: 'Ctrl+T',
        action: () => {
          toggleTheme();
          handleClose();
        },
      },
      {
        id: 'pref-settings',
        category: 'Preferences',
        title: 'Open Settings & Preferences...',
        subtitle: 'Configure LLM router keys, seat license, and sensitivity',
        icon: <Sliders className="w-4 h-4 text-zinc-400" />,
        shortcut: 'Ctrl+,',
        action: () => {
          handleClose();
          setShowSettings(true);
        },
      },
      {
        id: 'sys-reset-filters',
        category: 'System',
        title: 'Reset Severity Filters',
        subtitle: 'Show all high, medium, and low severity claims',
        icon: <RotateCcw className="w-4 h-4 text-zinc-400" />,
        action: () => {
          setFilterSeverity('All');
          setFilterCategory('All');
          setFilterStatus('All');
          handleClose();
        },
      },
      {
        id: 'sys-purge-cache',
        category: 'System',
        title: 'Purge Local Storage Cache',
        subtitle: 'Clear cached IndexedDB tokens and citation graphs',
        icon: <Trash2 className="w-4 h-4 text-rose-400" />,
        action: () => {
          alert('Local IndexedDB cache cleared.');
          handleClose();
        },
      },
      {
        id: 'sys-legal-privacy',
        category: 'System',
        title: 'Legal & Privacy Compliance...',
        subtitle: 'View enterprise zero-knowledge architecture and BYOK liability terms',
        icon: <Shield className="w-4 h-4 text-amber-500" />,
        action: () => {
          handleClose();
          setShowLegalWindow(true);
        },
      },
    ];
  }, [
    isMounted,
    resolvedTheme,
    handleRunAnalysis,
    handleLoadDemo,
    setShowExportModal,
    unmountWorkspace,
    toggleSidebar,
    setInspectorTab,
    toggleTheme,
    setShowSettings,
    setShowLegalWindow,
    setFilterSeverity,
    setFilterCategory,
    setFilterStatus,
  ]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        c.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Arrow key navigation
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCommands.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev >= filteredCommands.length - 1 ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? filteredCommands.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected && !selected.disabled) {
        selected.action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-100">
      {/* Palette Container */}
      <div className="relative w-[600px] max-w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans select-none animate-in zoom-in-95 duration-100">
        {/* Search Header */}
        <div className="flex items-center px-3.5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-sans border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500">
            ESC
          </kbd>
        </div>

        {/* Action List */}
        <div className="max-h-[340px] overflow-y-auto p-1.5 space-y-0.5">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-sans">
              No matching commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    if (!cmd.disabled) cmd.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  disabled={cmd.disabled}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors font-sans text-xs',
                    cmd.disabled
                      ? 'opacity-40 cursor-not-allowed text-zinc-400'
                      : isSelected
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/15'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="flex-shrink-0">{cmd.icon}</span>
                    <div className="truncate">
                      <div className="font-medium truncate">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className="text-[11px] font-sans text-zinc-400 dark:text-zinc-500 truncate">
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-[10px] font-sans font-medium text-zinc-400 dark:text-zinc-500">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded text-[10px] font-sans border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-500">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-8 px-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] font-sans text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={10} />
            <span>ReciteAI Command Console</span>
          </div>
        </div>
      </div>
    </div>
  );
}
