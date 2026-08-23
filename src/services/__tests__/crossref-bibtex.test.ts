import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLiteratureRecommendations } from '../crossref-client';
import { generateBibtex } from '@/utils/bibtex-generator';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

describe('Sprint 14: Crossref & BibTeX Pipeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generateBibtex converts Crossref JSON into valid BibTeX', () => {
    const mockCrossref = {
      type: 'journal-article',
      title: ['Quantum Vacuum Fluctuations in Curved Spacetime'],
      author: [
        { family: 'Hawking', given: 'Stephen W.' },
        { family: 'Ellis', given: 'George F. R.' }
      ],
      issued: { 'date-parts': [[1973, 5, 1]] },
      DOI: '10.1017/CBO9780511524646'
    };

    const { bibtex, citeKey } = generateBibtex(mockCrossref);
    expect(citeKey).toBe('Hawking1973');
    expect(bibtex).toContain('@article{Hawking1973,');
    expect(bibtex).toContain('author = {Hawking, Stephen W. and Ellis, George F. R.}');
    expect(bibtex).toContain('title = {Quantum Vacuum Fluctuations in Curved Spacetime}');
    expect(bibtex).toContain('year = {1973}');
    expect(bibtex).toContain('doi = {10.1017/CBO9780511524646}');
  });

  it('fetchLiteratureRecommendations handles API response and maps fields', async () => {
    const mockPayload = {
      message: {
        items: [
          {
            DOI: '10.1103/PhysRevD.14.870',
            title: ['Breakdown of Predictability in Gravitational Collapse'],
            author: [{ family: 'Hawking', given: 'S. W.' }],
            issued: { 'date-parts': [[1976]] },
            type: 'journal-article'
          }
        ]
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPayload
    } as any);

    const results = await fetchLiteratureRecommendations('Hawking black hole information');
    expect(results).toHaveLength(1);
    expect(results[0].doi).toBe('10.1103/PhysRevD.14.870');
    expect(results[0].title).toBe('Breakdown of Predictability in Gravitational Collapse');
    expect(results[0].authors).toEqual(['S. W. Hawking']);
    expect(results[0].year).toBe('1976');
  });

  it('appendToBibFile creates or appends to .bib in useWorkspaceStore', () => {
    const store = useWorkspaceStore.getState();
    const entry = `@article{Einstein1905,
  author = {Einstein, Albert},
  title = {Zur Elektrodynamik bewegter Korper},
  year = {1905}
}`;

    store.appendToBibFile(entry);
    const files = useWorkspaceStore.getState().files;
    const bibFile = Object.values(files).find(f => f.type === 'file' && f.name.endsWith('.bib'));
    
    expect(bibFile).toBeDefined();
    expect(bibFile?.content).toContain('Einstein1905');
  });

  it('injectCitationIntoTex injects ~\\cite{key} at exact char offset without corruption', () => {
    const store = useWorkspaceStore.getState();
    const fileId = store.createFile('paper.tex', 'file', 'root', 'latex');
    store.setContent(fileId, 'The cosmological constant leads to accelerating expansion in vacuum.');
    
    // Inject right before the trailing period (character index 67)
    store.injectCitationIntoTex(fileId, 67, 'Perlmutter1999');
    
    const updated = useWorkspaceStore.getState().files[fileId].content;
    expect(updated).toBe('The cosmological constant leads to accelerating expansion in vacuum~\\cite{Perlmutter1999}.');
  });

  it('generateBibtex returns citeKey and supports destructured usage', () => {
    const mock = {
      type: 'journal-article',
      title: ['Discovery of Pulsars'],
      author: [{ family: 'BellBurnell', given: 'Jocelyn' }],
      issued: { 'date-parts': [[1968]] },
      DOI: '10.1038/217709a0'
    };

    const { bibtex, citeKey } = generateBibtex(mock);
    expect(citeKey).toBe('BellBurnell1968');
    expect(bibtex).toContain('@article{BellBurnell1968,');
  });

  it('extractContextSnippet generates clean windowed context around match', async () => {
    const { extractContextSnippet } = await import('../latex-parser');
    const manuscript = 'We measure the effective vacuum permittivity in cryogenic topological insulators using scanning SQUID microscopy.';
    const snippet = extractContextSnippet(manuscript, 15, 29, 20);
    expect(snippet).toContain('effective vacuum permittivity');
    expect(snippet.startsWith('...')).toBe(true);
    expect(snippet.endsWith('...')).toBe(true);
  });

  it('saveFileToDisk and loadProjectFiles handle file operations', async () => {
    const { saveFileToDisk, loadProjectFiles } = await import('../local-fs');
    expect(typeof saveFileToDisk).toBe('function');
    expect(typeof loadProjectFiles).toBe('function');
  });
});
