import { describe, it, expect, beforeEach } from 'vitest';
import { useReciteStore, computeIssueStatistics, Claim } from '@/lib/store';
import { DEMO_CLAIMS, DEMO_BIBTEX, DEMO_MANUSCRIPT } from '@/lib/demo-data';

describe('Sprint 2: Workbench High-Severity Alert HUD & Retraction Filter', () => {
  const cleanClaim: Claim = {
    id: 'clean-1',
    text: 'A clean scientific finding with valid citations \\cite{valid2024}.',
    category: 'Literature Claim',
    severity: 'Low',
    status: 'pending',
    startIndex: 0,
    endIndex: 65,
    citationKey: 'valid2024',
    isRetracted: false,
  };

  const retractedClaim: Claim = {
    id: 'retracted-1',
    text: 'An anomalous ambient superconductivity claim citing retracted literature \\cite{dias2020}.',
    category: 'Literature Claim',
    severity: 'Critical',
    status: 'pending',
    startIndex: 70,
    endIndex: 160,
    citationKey: 'dias2020',
    isRetracted: true,
    retractedReason: 'Official Retraction: Nature 2022 due to irreproducible background subtraction.',
    retractionNoticeUrl: 'https://doi.org/10.1038/s41586-022-05287-7',
    retractionDate: '2022-09-26',
    auditType: 'Misattribution',
  };

  beforeEach(() => {
    useReciteStore.setState({
      claims: [],
      filteredClaims: [],
      streamFilter: 'all',
      activeClaimIndex: 0,
    });
  });

  describe('1. Issue Statistics with Retraction Counting', () => {
    it('accurately tallies retracted citations alongside integrity and discovery counts', () => {
      const stats = computeIssueStatistics([cleanClaim, retractedClaim]);
      expect(stats.totalCount).toBe(2);
      expect(stats.retractedCount).toBe(1);
      expect(stats.criticalCount).toBe(1);
    });

    it('returns zero retracted citations when manuscript citations are clean', () => {
      const stats = computeIssueStatistics([cleanClaim]);
      expect(stats.retractedCount).toBe(0);
      expect(stats.criticalCount).toBe(0);
    });

    it('ignores dismissed citations when tallying active retractions', () => {
      const dismissedRetracted: Claim = { ...retractedClaim, id: 'retracted-2', status: 'dismissed' };
      const stats = computeIssueStatistics([cleanClaim, dismissedRetracted]);
      expect(stats.retractedCount).toBe(0);
      expect(stats.dismissedCount).toBe(1);
    });
  });

  describe('2. Store Retraction Stream Filter & State Transitions', () => {
    it('isolates only retracted claims when streamFilter is set to "retracted"', () => {
      useReciteStore.getState().setClaims([cleanClaim, retractedClaim]);
      expect(useReciteStore.getState().filteredClaims.length).toBe(2);

      useReciteStore.getState().setStreamFilter('retracted');
      const filtered = useReciteStore.getState().filteredClaims;

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('retracted-1');
      expect(filtered[0].isRetracted).toBe(true);
      expect(filtered[0].citationKey).toBe('dias2020');
    });

    it('restores all non-dismissed claims when returning to streamFilter "all"', () => {
      useReciteStore.getState().setClaims([cleanClaim, retractedClaim]);
      useReciteStore.getState().setStreamFilter('retracted');
      expect(useReciteStore.getState().filteredClaims.length).toBe(1);

      useReciteStore.getState().setStreamFilter('all');
      expect(useReciteStore.getState().filteredClaims.length).toBe(2);
    });

    it('updates stats.retractedFound when setClaims is called', () => {
      useReciteStore.getState().setClaims([cleanClaim, retractedClaim]);
      const { stats } = useReciteStore.getState();
      expect(stats.retractedFound).toBe(1);
      expect(stats.highSeverity).toBe(1);
    });
  });

  describe('3. Demo Manuscript Protection Baseline', () => {
    it('verifies DEMO_CLAIMS includes a retracted paper to trigger the Alert HUD on demo load', () => {
      const retractedDemo = DEMO_CLAIMS.find((c) => c.isRetracted);
      expect(retractedDemo).toBeDefined();
      expect(retractedDemo?.citationKey).toBe('dias2020');
      expect(retractedDemo?.retractionNoticeUrl).toContain('10.1038/s41586-022-05287-7');
      expect(retractedDemo?.severity).toBe('Critical');

      const stats = computeIssueStatistics(DEMO_CLAIMS);
      expect(stats.retractedCount).toBeGreaterThanOrEqual(1);
    });

    it('verifies DEMO_BIBTEX and DEMO_MANUSCRIPT contain the retracted paper entry', () => {
      expect(DEMO_BIBTEX).toContain('dias2020');
      expect(DEMO_BIBTEX).toContain('10.1038/s41586-020-2801-z');
      expect(DEMO_MANUSCRIPT).toContain('\\cite{dias2020}');
    });
  });
});
