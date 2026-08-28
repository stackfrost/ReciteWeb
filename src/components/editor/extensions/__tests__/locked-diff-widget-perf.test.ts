import { describe, it, expect, beforeEach } from 'vitest';
import { createLockedDiffExtension, LockedDiffWidget, type LockedDiffPayload } from '../lockedDiffWidget';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// Lightweight DOM mock for node environment
function createMockElement(tag: string) {
  let _html = '';
  return {
    tagName: tag.toUpperCase(),
    className: '',
    children: [] as any[],
    set innerHTML(val: string) { _html = val; },
    get innerHTML() { return _html; },
    appendChild(child: any) {
      this.children.push(child);
      _html += child.innerHTML || '';
    },
    replaceChildren() {
      this.children = [];
      _html = '';
    },
  };
}

describe('Phase 2 Audit: lockedDiffWidget Memory Safety & Event Loop Performance', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') {
      (globalThis as any).document = {
        createElement: createMockElement,
      };
    }
  });

  it('implements eq() to reuse DOM nodes across identical payloads (prevents DOM recreation)', () => {
    const payloadA: LockedDiffPayload = {
      line: 10,
      originalText: '\\cite{bad}',
      suggestedText: '\\cite{good}',
      issueType: 'Missing Citation',
      isLocked: true,
    };

    const payloadB: LockedDiffPayload = { ...payloadA };
    const payloadC: LockedDiffPayload = { ...payloadA, isLocked: false };

    const widgetA = new LockedDiffWidget(payloadA);
    const widgetB = new LockedDiffWidget(payloadB);
    const widgetC = new LockedDiffWidget(payloadC);

    expect(widgetA.eq(widgetB)).toBe(true);
    expect(widgetA.eq(widgetC)).toBe(false);
  });

  it('escapes special characters to prevent inline XSS in widget DOM', () => {
    const maliciousPayload: LockedDiffPayload = {
      line: 5,
      originalText: '<script>alert("XSS")</script>',
      suggestedText: '<img src=x onerror=alert(1)>',
      issueType: '"><script>alert(2)</script>',
      isLocked: true,
    };

    const widget = new LockedDiffWidget(maliciousPayload);
    const dom = widget.toDOM({} as EditorView);

    expect(dom.innerHTML).not.toContain('<script>');
    expect(dom.innerHTML).toContain('&lt;script&gt;');
    expect(dom.innerHTML).not.toContain('<img src=x');
    expect(dom.innerHTML).toContain('&lt;img src=x');
  });

  it('maintains P99 event loop latency < 50ms when decorating 100+ inline diff widgets across 1,000 lines', () => {
    // Generate 1000-line LaTeX document
    const lines = Array.from({ length: 1000 }, (_, i) => `\\section{Section ${i + 1}}\nThis is line content for testing.`);
    const docText = lines.join('\n');

    // Generate 100 distinct diff widgets spread across lines
    const diffs: LockedDiffPayload[] = Array.from({ length: 100 }, (_, i) => ({
      line: (i * 10) + 1,
      originalText: `\\cite{unverified_${i}}`,
      suggestedText: `\\cite{verified_${i}}`,
      issueType: i % 2 === 0 ? 'Retracted Paper Flag' : 'Broken DOI',
      isLocked: true,
    }));

    const ext = createLockedDiffExtension(() => diffs);

    const latencies: number[] = [];

    // Measure 20 state creation and decoration cycles
    for (let cycle = 0; cycle < 20; cycle++) {
      const start = performance.now();
      const state = EditorState.create({
        doc: docText,
        extensions: [ext],
      });
      const end = performance.now();
      latencies.push(end - start);
      expect(state).toBeDefined();
    }

    latencies.sort((a, b) => a - b);
    const p99Index = Math.floor(latencies.length * 0.99);
    const p99Latency = latencies[p99Index];

    console.log(`[Perf Benchmark] lockedDiffWidget P99 Latency for 100 inline widgets on 1k lines: ${p99Latency.toFixed(2)}ms`);

    expect(p99Latency).toBeLessThan(50); // P99 < 50ms requirement
  });
});
