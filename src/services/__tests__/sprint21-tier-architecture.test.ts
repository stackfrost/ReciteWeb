import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseBibKeys, auditDeterministicBib } from '../latex-parser';
import { writeReciteCache, readReciteCache, CachedFinding } from '../cache-manager';
import * as localFs from '../local-fs';

describe('Sprint 21: 3-Tier Architecture, Frozen Cache & Deterministic Linting', () => {
  describe('Tier 1: Deterministic Bibliography Hygiene (latex-parser.ts)', () => {
    it('accurately parses BibTeX citation keys', () => {
      const bibContent = `
        @article{smith2024deep,
          author = {Smith, John},
          title = {Deep Learning Innovations},
          year = {2024}
        }
        @book{ knuth1984texbook ,
          author = {Donald Knuth},
          title = {The TeXbook},
          year = {1984}
        }
        @inproceedings{vaswani2017attention,
          author = {Vaswani, Ashish},
          title = {Attention Is All You Need},
          year = {2017}
        }
      `;

      const keys = parseBibKeys(bibContent);
      expect(keys.size).toBe(3);
      expect(keys.has('smith2024deep')).toBe(true);
      expect(keys.has('knuth1984texbook')).toBe(true);
      expect(keys.has('vaswani2017attention')).toBe(true);
      expect(keys.has('nonexistent')).toBe(false);
    });

    it('identifies missing references and unused bibliography entries', () => {
      const texContent = `
        In recent advances \\cite{smith2024deep}, transformers have flourished \\citep{vaswani2017attention}.
        However, classical algorithms remain foundational \\citet{orphanKey1, orphanKey2}.
        Additionally we refer to \\autocite{orphanKey3}.
      `;

      const bibContent = `
        @article{smith2024deep,
          author = {Smith, John}
        }
        @inproceedings{vaswani2017attention,
          author = {Vaswani, Ashish}
        }
        @article{unusedAuthor2020,
          author = {Unused, Alice}
        }
        @book{unusedBook1999,
          author = {Old, Bob}
        }
      `;

      const audit = auditDeterministicBib(texContent, bibContent);

      expect(audit.missingInBib).toContain('orphanKey1');
      expect(audit.missingInBib).toContain('orphanKey2');
      expect(audit.missingInBib).toContain('orphanKey3');
      expect(audit.missingInBib).not.toContain('smith2024deep');
      expect(audit.missingInBib).not.toContain('vaswani2017attention');

      expect(audit.unusedInTex).toContain('unusedAuthor2020');
      expect(audit.unusedInTex).toContain('unusedBook1999');
      expect(audit.unusedInTex).not.toContain('smith2024deep');
      expect(audit.unusedInTex).not.toContain('vaswani2017attention');
    });

    it('executes in sub-16ms for large 10,000-word manuscripts', () => {
      const largeBib = Array.from({ length: 500 }, (_, i) => `@article{refKey_${i},\n  author={Author ${i}},\n  title={Paper ${i}}\n}`).join('\n');
      const largeTex = Array.from({ length: 1000 }, (_, i) => `Paragraph ${i} discusses findings \\cite{refKey_${i % 400}} and another \\citep{refKey_${(i + 50) % 600}}.`).join('\n');

      const start = performance.now();
      const audit = auditDeterministicBib(largeTex, largeBib);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(16);
      expect(audit.missingInBib.length).toBeGreaterThan(0);
      expect(audit.unusedInTex.length).toBe(0);
    });
  });

  describe('Tier 2: Frozen Cache Manager (cache-manager.ts)', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('persists findings to .recite_cache.json in the workspace root', async () => {
      const saveSpy = vi.spyOn(localFs, 'saveFileToDisk').mockResolvedValue(true);

      const mockFindings: CachedFinding[] = [
        {
          id: 'claim-1',
          fileId: 'main.tex',
          line: 42,
          index: 1200,
          length: 50,
          claim: 'Recent experiments show 99% accuracy \\cite{smith2024}',
          type: 'Needs Literature',
          severity: 'Critical',
          resolved: false,
        },
        {
          id: 'claim-2',
          fileId: 'main.tex',
          line: 85,
          index: 2500,
          length: 30,
          claim: '\\cite{missing2023}',
          type: 'Missing Citation',
          severity: 'Medium',
          resolved: true,
        },
      ];

      await writeReciteCache('/mock/workspace', mockFindings);

      expect(saveSpy).toHaveBeenCalledWith(
        '/mock/workspace/.recite_cache.json',
        JSON.stringify(mockFindings, null, 2)
      );
    });

    it('reads and parses findings from .recite_cache.json', async () => {
      const mockFindings: CachedFinding[] = [
        {
          id: 'claim-1',
          fileId: 'main.tex',
          line: 12,
          index: 300,
          length: 40,
          claim: 'Test claim',
          type: 'Unused Reference',
          severity: 'Low',
        },
      ];

      vi.spyOn(localFs, 'readTextFileSafely').mockResolvedValue(JSON.stringify(mockFindings));

      const loaded = await readReciteCache('/mock/workspace');
      expect(loaded).toEqual(mockFindings);
      expect(loaded?.length).toBe(1);
      expect(loaded?.[0].id).toBe('claim-1');
    });

    it('returns null safely when cache file is absent or corrupted', async () => {
      vi.spyOn(localFs, 'readTextFileSafely').mockResolvedValue(null);
      const absent = await readReciteCache('/mock/workspace');
      expect(absent).toBeNull();

      vi.spyOn(localFs, 'readTextFileSafely').mockResolvedValue('INVALID_JSON_CONTENT{{{');
      const corrupted = await readReciteCache('/mock/workspace');
      expect(corrupted).toBeNull();
    });
  });
});
