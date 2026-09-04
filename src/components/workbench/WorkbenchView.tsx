'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { SidebarExplorer } from './SidebarExplorer';
import ActionInspector from '@/components/inspector/ActionInspector';
import { ManuscriptEditor } from './ManuscriptEditor';
import { PdfEvidenceDrawer, DockMode } from './PdfEvidenceDrawer';
import { cn } from '@/lib/utils';

/** Custom resize handle — 4px sleek splitter with centered grab pill */
function ResizeHandle({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  const isVertical = orientation === 'vertical';
  return (
    <PanelResizeHandle
      className={cn(
        'group flex items-center justify-center transition-colors shrink-0',
        isVertical
          ? 'h-1 cursor-row-resize bg-zinc-800 hover:bg-emerald-500/80 active:bg-emerald-500'
          : 'w-1 cursor-col-resize bg-zinc-800 hover:bg-emerald-500/80 active:bg-emerald-500'
      )}
    >
      <div
        className={cn(
          'rounded-full bg-zinc-600 group-hover:bg-white transition-colors',
          isVertical ? 'w-6 h-0.5' : 'h-6 w-0.5'
        )}
      />
    </PanelResizeHandle>
  );
}

export const WorkbenchView: React.FC = () => {
  // SSR hydration guard: PanelGroup computes layout dimensions that can mismatch during SSR
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // PDF evidence drawer docking state
  const [isPdfDockedBottom, setIsPdfDockedBottom] = useState(false);
  const [pdfDockMode, setPdfDockMode] = useState<DockMode>('bottom');

  const handleDockModeChange = (mode: DockMode) => {
    startTransition(() => {
      setPdfDockMode(mode);
      if (mode === 'floating') {
        setIsPdfDockedBottom(false);
      } else if (mode === 'bottom') {
        setIsPdfDockedBottom(true);
      } else {
        // 'side' — for now, treat as bottom dock; could be extended to a right sub-tab
        setIsPdfDockedBottom(true);
      }
    });
  };

  if (!isMounted) {
    // Render a static fallback during SSR/initial paint to avoid layout calculation mismatches
    return (
      <div className="flex-1 w-full flex flex-row min-h-0 overflow-hidden bg-zinc-950 text-zinc-100" />
    );
  }

  return (
    <div className="flex-1 w-full min-h-0 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 transition-colors">
      <div className="flex-1 w-full min-h-0 overflow-hidden">
        <PanelGroup orientation="horizontal" id="reciteweb-workbench-layout">
        {/* ── Panel 1: Left File Tree Explorer (Collapsible) ────────────── */}
        <Panel
          id="file-explorer"
          defaultSize="18%"
          minSize="12%"
          maxSize="30%"
          collapsible
        >
          <SidebarExplorer />
        </Panel>

        <ResizeHandle orientation="horizontal" />

        {/* ── Panel 2: Center Editor + Nested Vertical PDF Dock ─────────── */}
        <Panel id="editor-canvas" defaultSize="46%" minSize="30%">
          {isPdfDockedBottom ? (
            <PanelGroup orientation="vertical" id="reciteweb-editor-v-layout">
              <Panel id="editor-main" defaultSize="55%" minSize="30%">
                <div className="h-full flex flex-col overflow-hidden bg-zinc-950">
                  <ManuscriptEditor />
                </div>
              </Panel>

              <ResizeHandle orientation="vertical" />

              <Panel id="editor-pdf-dock" defaultSize="45%" minSize="15%">
                <PdfEvidenceDrawer
                  isOpen={false}
                  isDocked={true}
                  dockMode={pdfDockMode}
                  onDockModeChange={handleDockModeChange}
                  onClose={() => setIsPdfDockedBottom(false)}
                  title=""
                  authors={[]}
                />
              </Panel>
            </PanelGroup>
          ) : (
            <div className="h-full flex flex-col overflow-hidden bg-zinc-950">
              <ManuscriptEditor />
            </div>
          )}
        </Panel>

        <ResizeHandle orientation="horizontal" />

        {/* ── Panel 3: Right Clinical Inspector ─────────────────────────── */}
        <Panel
          id="action-inspector"
          defaultSize="36%"
          minSize="25%"
          maxSize="55%"
        >
          <ActionInspector />
        </Panel>
      </PanelGroup>
      </div>
    </div>
  );
};
