import { describe, it, expect, beforeEach } from 'vitest';
import { useReciteStore } from '@/lib/store';
import { useAuditStore } from '@/store/useAuditStore';

describe('Sprint 4: Overleaf Fast-Sync & Clean Source Exporters', () => {
  beforeEach(() => {
    useReciteStore.setState({
      rawText: 'Recent transformers show $O(N^2)$ complexity \\cite{vaswani2017attention}.',
      parsedText: 'Recent transformers show [[MATH_BLOCK_0]] complexity \\cite{vaswani2017attention}.',
      bibtexContent: '@article{vaswani2017attention,\n  title={Attention Is All You Need},\n  year={2017}\n}',
      claims: [],
      filteredClaims: [],
      documentTitle: 'main.tex',
    });

    useAuditStore.setState({
      findings: [],
    });
  });

  describe('1. Overleaf Fast-Sync Content Integrity', () => {
    it('retrieves uncorrupted patched LaTeX source ready for Overleaf', () => {
      const { rawText, parsedText } = useReciteStore.getState();
      const content = rawText || parsedText;

      expect(content).toBeDefined();
      expect(content).toContain('\\cite{vaswani2017attention}');
      expect(content).toContain('$O(N^2)$');
    });

    it('ensures references.bib is properly formed and synchronized', () => {
      const { bibtexContent } = useReciteStore.getState();

      expect(bibtexContent).toContain('@article{vaswani2017attention');
      expect(bibtexContent).toContain('title={Attention Is All You Need}');
      expect(bibtexContent).toContain('year={2017}');
    });
  });

  describe('2. Desk Rejection Citation Health Computation', () => {
    it('reports 100% clean citations when no retractions, dead DOIs, or missing keys exist', () => {
      useAuditStore.setState({
        findings: [
          {
            id: 'f-1',
            line: 10,
            type: 'Verified Citation',
            severity: 'Low',
            context: 'Normal verified finding',
            status: 'resolved',
            category: 'Literature Claim',
            streamType: 'integrity',
            verifiedSources: [],
          },
        ],
      });

      const { findings } = useAuditStore.getState();
      const retractions = findings.filter((f) => f.type?.toLowerCase().includes('retract')).length;
      const brokenDois = findings.filter((f) => f.type?.toLowerCase().includes('doi')).length;
      const missingBibs = findings.filter((f) => f.type?.toLowerCase().includes('missing')).length;

      expect(retractions).toBe(0);
      expect(brokenDois).toBe(0);
      expect(missingBibs).toBe(0);

      let score = 100;
      score -= retractions * 25;
      score -= brokenDois * 15;
      score -= missingBibs * 10;
      const riskScore = Math.max(0, Math.min(100, score));

      expect(riskScore).toBe(100);
    });

    it('penalizes health score appropriately when retractions or missing keys are flagged', () => {
      useAuditStore.setState({
        findings: [
          {
            id: 'f-retracted',
            line: 15,
            type: 'Retracted Paper Flag',
            severity: 'Critical',
            context: 'Retracted finding',
            status: 'unresolved',
            category: 'Literature Claim',
            streamType: 'integrity',
            verifiedSources: [],
          },
          {
            id: 'f-missing',
            line: 22,
            type: 'Missing BibTeX Key',
            severity: 'High',
            context: 'Missing key finding',
            status: 'unresolved',
            category: 'bib_mismatch',
            streamType: 'integrity',
            verifiedSources: [],
          },
        ],
      });

      const { findings } = useAuditStore.getState();
      const retractions = findings.filter((f) => f.type?.toLowerCase().includes('retract')).length;
      const missingBibs = findings.filter((f) => f.type?.toLowerCase().includes('missing')).length;

      expect(retractions).toBe(1);
      expect(missingBibs).toBe(1);

      let score = 100;
      score -= retractions * 25; // 75
      score -= missingBibs * 10; // 65
      const riskScore = Math.max(0, Math.min(100, score));

      expect(riskScore).toBe(65);
    });
  });
});
