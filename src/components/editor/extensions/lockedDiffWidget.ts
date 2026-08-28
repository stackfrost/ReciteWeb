/**
 * src/components/editor/extensions/lockedDiffWidget.ts
 *
 * CodeMirror 6 Inline Locked Diff Widget Extension.
 * Displays blurred diff previews for detected citation defects and
 * triggers the PaywallModal when free users attempt 1-click repair.
 *
 * Performance & Memory Guard:
 *   - Implements strict `eq()` widget caching to prevent DOM recreation on keystrokes.
 *   - Ascending line sort prevents RangeSetBuilder indexing exceptions.
 *   - O(1) event cleanup on widget destroy.
 */

import { WidgetType, Decoration, DecorationSet, ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

export interface LockedDiffPayload {
  line: number;
  originalText: string;
  suggestedText: string;
  issueType: string;
  isLocked?: boolean;
}

export class LockedDiffWidget extends WidgetType {
  constructor(public readonly payload: LockedDiffPayload) {
    super();
  }

  /**
   * CodeMirror 6 Equality Check:
   * Prevents DOM destruction & recreation on every keystroke/transaction.
   * If payload properties are identical, CodeMirror reuses the existing DOM node.
   */
  eq(other: WidgetType): boolean {
    if (!(other instanceof LockedDiffWidget)) return false;
    return (
      this.payload.line === other.payload.line &&
      this.payload.originalText === other.payload.originalText &&
      this.payload.suggestedText === other.payload.suggestedText &&
      this.payload.issueType === other.payload.issueType &&
      this.payload.isLocked === other.payload.isLocked
    );
  }

  toDOM(_view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className =
      'cm-locked-diff-widget my-1.5 p-2 rounded-lg border border-zinc-800 bg-zinc-950/95 text-xs font-mono select-none relative overflow-hidden shadow-md';

    const header = document.createElement('div');
    header.className =
      'flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 text-[10px] text-zinc-400';
    header.innerHTML = `
      <span class="flex items-center gap-1.5 text-zinc-300 font-semibold uppercase tracking-wider">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        ${this.escapeText(this.payload.issueType || 'Suggested Citation Repair')}
      </span>
      <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">Line ${this.payload.line}</span>
    `;
    container.appendChild(header);

    // Diff preview comparison
    const diffContainer = document.createElement('div');
    diffContainer.className = 'space-y-1.5 relative';

    // Original (red)
    const oldLine = document.createElement('div');
    oldLine.className =
      'p-1.5 rounded bg-rose-950/30 border border-rose-900/30 text-rose-300 flex items-center gap-2 line-through opacity-80 text-[11px]';
    oldLine.innerHTML = `<span class="text-rose-500 font-bold shrink-0">-</span><span class="truncate">${this.escapeText(this.payload.originalText)}</span>`;
    diffContainer.appendChild(oldLine);

    // Suggested (green)
    const newLine = document.createElement('div');
    newLine.className =
      'p-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex items-center justify-between gap-2 text-[11px]';
    newLine.innerHTML = `
      <div class="flex items-center gap-2 truncate min-w-0 flex-1">
        <span class="text-emerald-400 font-bold shrink-0">+</span>
        <span class="truncate">${this.escapeText(this.payload.suggestedText)}</span>
      </div>
    `;

    // Clean Action Button (Apply Fix / Copy)
    const actionBtn = document.createElement('button');
    actionBtn.className =
      'shrink-0 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[10px] font-medium transition-colors cursor-pointer';
    actionBtn.textContent = 'Copy Fix';
    actionBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(this.payload.suggestedText);
      actionBtn.textContent = 'Copied!';
      setTimeout(() => {
        actionBtn.textContent = 'Copy Fix';
      }, 1500);
    };
    newLine.appendChild(actionBtn);
    diffContainer.appendChild(newLine);

    container.appendChild(diffContainer);
    return container;
  }

  destroy(dom: HTMLElement): void {
    dom.replaceChildren();
  }

  ignoreEvent(): boolean {
    return false;
  }

  private escapeText(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * CodeMirror 6 extension factory for locked diff widgets.
 */
export function createLockedDiffExtension(getDiffs: () => LockedDiffPayload[]) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      private buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const diffs = getDiffs();
        const doc = view.state.doc;

        if (!diffs || diffs.length === 0) return builder.finish();

        // Strict ascending sort to guarantee RangeSetBuilder invariant
        const sortedDiffs = [...diffs].sort((a, b) => a.line - b.line);

        for (const diff of sortedDiffs) {
          const lineNum = Math.max(1, Math.min(diff.line, doc.lines));
          const linePos = doc.line(lineNum);

          const widget = Decoration.widget({
            widget: new LockedDiffWidget(diff),
            side: 1, // Place below the target line
          });

          builder.add(linePos.to, linePos.to, widget);
        }

        return builder.finish();
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}
