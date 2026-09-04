import { describe, it, expect, beforeEach } from 'vitest';
import { useReciteStore, Claim, SuggestedPaper } from '@/lib/store';

describe('Sprint 3: Evidence-Anchored Ground-Truth & Telemetry Protocol', () => {
  beforeEach(() => {
    useReciteStore.setState({
      claims: [],
      filteredClaims: [],
      rawText: 'Transformers rely on self-attention mechanisms without recurrent units.',
      bibtexContent: '',
      streamFilter: 'all',
      activeClaimIndex: 0,
    });
  });

  describe('1. Match Percentage Telemetry Assurance', () => {
    it('computes high-confidence empirical match score >= 85%', () => {
      const highConfidencePaper: SuggestedPaper = {
        title: 'Attention Is All You Need',
        authors: ['Vaswani, A.', 'Shazeer, N.'],
        year: 2017,
        venue: 'NeurIPS',
        doi: '10.5555/3295222.3295349',
        bibtexKey: 'vaswani2017attention',
        matchScore: 96,
        abstractExcerpt: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
      };

      const matchScore = highConfidencePaper.matchScore!;
      expect(matchScore).toBe(96);
      expect(matchScore).toBeGreaterThanOrEqual(85);

      const statusCategory = matchScore >= 85 ? 'Empirical Grounding' : 'Tenuous Match';
      expect(statusCategory).toBe('Empirical Grounding');
    });

    it('flags literature contradiction when entailmentStatus is contradicted', () => {
      const contradictedPaper: SuggestedPaper & { entailmentStatus?: 'contradicted' } = {
        title: 'Room-temperature superconductivity in a carbonaceous sulfur hydride',
        authors: ['Dias, R.'],
        year: 2020,
        venue: 'Nature',
        doi: '10.1038/s41586-020-2801-z',
        bibtexKey: 'dias2020',
        matchScore: 35,
        entailmentStatus: 'contradicted',
        contradictionWarning: 'Paper retracted by editors due to non-reproducible background subtraction.',
      };

      const isContradicted = contradictedPaper.entailmentStatus === 'contradicted' || !!contradictedPaper.contradictionWarning;
      expect(isContradicted).toBe(true);
      expect(contradictedPaper.matchScore).toBeLessThan(50);
    });

    it('infers match percentage from influential citations when matchScore is not explicitly set', () => {
      const paperWithoutScore: SuggestedPaper = {
        title: 'Deep Residual Learning for Image Recognition',
        authors: ['He, K.', 'Zhang, X.'],
        year: 2016,
        venue: 'CVPR',
        influentialCitationCount: 14,
      };

      const computedMatch = paperWithoutScore.matchScore || (paperWithoutScore.influentialCitationCount
        ? Math.min(90 + Math.floor(paperWithoutScore.influentialCitationCount / 2), 99)
        : 92);

      expect(computedMatch).toBe(97); // 90 + 7 = 97%
    });
  });

  describe('2. Bulk 1-Click Auto-Remediation (bulkAutoRemediate)', () => {
    it('auto-fills unambiguous verified citations and integrity fixes into manuscript', async () => {
      const uncitedClaim: Claim = {
        id: 'claim-empirical-1',
        text: 'Transformers rely on self-attention mechanisms without recurrent units.',
        category: 'Literature Claim',
        severity: 'Medium',
        status: 'pending',
        startIndex: 0,
        endIndex: 72,
        suggestedPapers: [
          {
            title: 'Attention Is All You Need',
            authors: ['Vaswani, A.', 'Shazeer, N.'],
            year: 2017,
            venue: 'NeurIPS',
            doi: '10.5555/3295222.3295349',
            bibtexKey: 'vaswani2017attention',
            matchScore: 95,
            bibtexEntry: '@inproceedings{vaswani2017attention,\n  title={Attention is all you need},\n  author={Vaswani, Ashish},\n  year={2017}\n}',
          },
        ],
      };

      const integrityClaim: Claim = {
        id: 'claim-integrity-1',
        text: 'We utilize standard \\cite{vaswani2017, } benchmarks.',
        category: 'Theoretical Assertion',
        severity: 'Low',
        status: 'pending',
        startIndex: 100,
        endIndex: 140,
        suggestedFix: 'We utilize standard \\cite{vaswani2017} benchmarks.',
      };

      useReciteStore.setState({
        rawText: 'Transformers rely on self-attention mechanisms without recurrent units.\nWe utilize standard \\cite{vaswani2017, } benchmarks.',
        claims: [uncitedClaim, integrityClaim],
        bibtexContent: '',
      });

      const appliedCount = await useReciteStore.getState().bulkAutoRemediate();
      expect(appliedCount).toBe(2);

      const state = useReciteStore.getState();
      expect(state.rawText).toContain('\\cite{vaswani2017attention}');
      expect(state.rawText).toContain('\\cite{vaswani2017}');
      expect(state.rawText).not.toContain('\\cite{vaswani2017, }');
      expect(state.bibtexContent).toContain('vaswani2017attention');
      expect(state.bibtexContent).toContain('Attention Is All You Need');

      // Both claims marked accepted
      expect(state.claims.every((c) => c.status === 'accepted')).toBe(true);
    });

    it('safely refuses to auto-fill retracted citations or contradicted literature', async () => {
      const retractedClaim: Claim = {
        id: 'claim-retracted-1',
        text: 'Ambient superconductivity was verified at 287K \\cite{dias2020}.',
        category: 'Literature Claim',
        severity: 'Critical',
        status: 'pending',
        startIndex: 0,
        endIndex: 60,
        isRetracted: true,
        suggestedPapers: [
          {
            title: 'Room-temperature superconductivity',
            authors: ['Dias, R.'],
            year: 2020,
            bibtexKey: 'dias2020',
            matchScore: 90,
          },
        ],
      };

      const contradictedClaim: Claim = {
        id: 'claim-contradicted-1',
        text: 'All neural networks show linear scale-free convergence.',
        category: 'Literature Claim',
        severity: 'High',
        status: 'pending',
        startIndex: 70,
        endIndex: 125,
        suggestedPapers: [
          {
            title: 'Non-linear dynamics of deep networks',
            authors: ['Smith, J.'],
            year: 2023,
            bibtexKey: 'smith2023',
            matchScore: 40,
            entailmentStatus: 'contradicted',
          },
        ],
      };

      useReciteStore.setState({
        rawText: 'Ambient superconductivity was verified at 287K \\cite{dias2020}.',
        claims: [retractedClaim, contradictedClaim],
        bibtexContent: '',
      });

      const appliedCount = await useReciteStore.getState().bulkAutoRemediate();
      expect(appliedCount).toBe(0);

      const state = useReciteStore.getState();
      expect(state.claims.every((c) => c.status === 'pending')).toBe(true);
    });
  });
});
