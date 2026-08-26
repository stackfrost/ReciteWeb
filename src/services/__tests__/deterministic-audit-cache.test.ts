import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  writeAuditCache,
  readAuditCache,
  computeContentHash,
  type AuditCachePayload,
} from '../cache-manager';
import * as localFs from '../local-fs';
import type { AuditFinding } from '@/types/audit';
import type { Claim } from '@/lib/store';

describe('Deterministic Audit Caching (.recite/audit-cache.json)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('computes deterministic and distinct hashes for manuscript contents', async () => {
    const tex1 = '\\documentclass{article}\\begin{document}Hello world\\cite{smith2024}\\end{document}';
    const tex2 = '\\documentclass{article}\\begin{document}Hello world\\cite{smith2024}\\end{document}';
    const tex3 = '\\documentclass{article}\\begin{document}Modified world\\cite{smith2024}\\end{document}';

    const hash1 = await computeContentHash(tex1);
    const hash2 = await computeContentHash(tex2);
    const hash3 = await computeContentHash(tex3);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('writes serialized cache to <workspace>/.recite/audit-cache.json', async () => {
    const createDirSpy = vi.spyOn(localFs, 'createDirSafely').mockResolvedValue(true);
    const saveSpy = vi.spyOn(localFs, 'saveFileToDisk').mockResolvedValue(true);

    const mockFindings: AuditFinding[] = [
      {
        id: 'finding-1',
        line: 12,
        category: 'literature_discovery',
        severity: 'Medium',
        type: 'Potential Attribution Gap',
        context: 'Empirical analysis shows high stability',
        status: 'unresolved',
      },
    ];

    const mockClaims: Claim[] = [
      {
        id: 'claim-1',
        text: 'Empirical analysis shows high stability',
        category: 'Literature Claim',
        streamType: 'discovery',
        severity: 'Medium',
        status: 'pending',
        startIndex: 100,
        endIndex: 140,
        fileId: 'main.tex',
        context: 'Empirical analysis shows high stability',
      },
    ];

    const success = await writeAuditCache(
      '/mock/project',
      'main.tex',
      '\\section{Intro} Empirical analysis shows high stability',
      mockFindings,
      mockClaims
    );

    expect(success).toBe(true);
    expect(createDirSpy).toHaveBeenCalledWith('/mock/project/.recite');
    expect(saveSpy).toHaveBeenCalled();
    const savedPath = saveSpy.mock.calls[0][0];
    expect(savedPath).toBe('/mock/project/.recite/audit-cache.json');
    const savedContent = JSON.parse(saveSpy.mock.calls[0][1]);
    expect(savedContent.findings.length).toBe(1);
    expect(savedContent.claims.length).toBe(1);
    expect(savedContent.manuscriptHash).toBeDefined();
  });

  it('reads audit cache and returns fresh when manuscript is unmodified', async () => {
    const tex = '\\section{Theory} We show quantum entanglement.';
    const hash = await computeContentHash(tex);

    const mockPayload: AuditCachePayload = {
      version: 1,
      workspacePath: '/mock/project',
      activeTexPath: 'main.tex',
      manuscriptHash: hash,
      lastModified: '2026-08-25T10:00:00Z',
      findings: [
        {
          id: 'f1',
          line: 1,
          category: 'literature_discovery',
          severity: 'High',
          type: 'Candidate Reference',
          context: 'We show quantum entanglement',
          status: 'unresolved',
        },
      ],
      claims: [
        {
          id: 'c1',
          text: 'We show quantum entanglement',
          category: 'Literature Claim',
          streamType: 'discovery',
          severity: 'High',
          status: 'pending',
          startIndex: 0,
          endIndex: 30,
          fileId: 'main.tex',
          context: 'We show quantum entanglement',
        },
      ],
    };

    vi.spyOn(localFs, 'readTextFileSafely').mockResolvedValue(JSON.stringify(mockPayload));

    const result = await readAuditCache('/mock/project', tex);
    expect(result.hit).toBe(true);
    expect(result.isFresh).toBe(true);
    expect(result.findings.length).toBe(1);
    expect(result.claims.length).toBe(1);
  });

  it('preserves user integrity warnings when manuscript text is modified', async () => {
    const oldTex = '\\section{Theory} Old text';
    const oldHash = await computeContentHash(oldTex);
    const newTex = '\\section{Theory} New edited text with modifications';

    const mockPayload: AuditCachePayload = {
      version: 1,
      workspacePath: '/mock/project',
      activeTexPath: 'main.tex',
      manuscriptHash: oldHash,
      lastModified: '2026-08-25T10:00:00Z',
      findings: [
        {
          id: 'f1',
          line: 1,
          category: 'literature_discovery',
          severity: 'High',
          type: 'Candidate Reference',
          context: 'Old text',
          status: 'unresolved',
        },
        {
          id: 'f2',
          line: 2,
          category: 'bib_mismatch',
          severity: 'Critical',
          type: 'Unresolved Reference Key',
          context: 'Key mismatch',
          status: 'unresolved',
        },
      ],
      claims: [
        {
          id: 'c1',
          text: 'Old text',
          category: 'Literature Claim',
          streamType: 'discovery',
          severity: 'High',
          status: 'pending',
          startIndex: 0,
          endIndex: 10,
          fileId: 'main.tex',
          context: 'Old text',
        },
        {
          id: 'c2',
          text: 'Key mismatch',
          category: 'Literature Claim',
          streamType: 'integrity',
          severity: 'Critical',
          status: 'pending',
          startIndex: 10,
          endIndex: 25,
          fileId: 'main.tex',
          context: 'Key mismatch',
        },
      ],
    };

    vi.spyOn(localFs, 'readTextFileSafely').mockResolvedValue(JSON.stringify(mockPayload));

    const result = await readAuditCache('/mock/project', newTex);
    expect(result.hit).toBe(true);
    expect(result.isFresh).toBe(false); // Stale
    // Discovery findings cleared, but integrity warning retained
    expect(result.findings.length).toBe(1);
    expect(result.findings[0].category).toBe('bib_mismatch');
    expect(result.claims.length).toBe(1);
    expect(result.claims[0].streamType).toBe('integrity');
  });
});
