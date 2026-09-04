import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeDoi,
  isKnownRetractedDoi,
  checkRetractionStatus,
  batchCheckRetractions,
  KNOWN_RETRACTIONS,
} from '../retraction-radar';
import { validateCitation } from '../metadata-cascade';
import { generateComplianceDossier } from '../compliance-dossier';

describe('Sprint 1: Retraction & Disputed Science Radar Engine', () => {
  describe('1. Canonical DOI Normalizer', () => {
    it('normalizes various DOI formats into lowercase canonical strings', () => {
      expect(normalizeDoi('https://doi.org/10.1016/S0140-6736(97)11096-0')).toBe('10.1016/s0140-6736(97)11096-0');
      expect(normalizeDoi('http://dx.doi.org/10.1038/Nature01086/')).toBe('10.1038/nature01086');
      expect(normalizeDoi('doi: 10.1126/SCIENCE.1214986#page=1')).toBe('10.1126/science.1214986');
      expect(normalizeDoi('  10.1056/NEJMoa2007621.  ')).toBe('10.1056/nejmoa2007621');
      expect(normalizeDoi('')).toBe('');
    });
  });

  describe('2. Curated Landmark Retraction Registry', () => {
    it('synchronously flags notorious landmark retracted papers in <1ms', () => {
      // Wakefield MMR paper
      expect(isKnownRetractedDoi('10.1016/S0140-6736(97)11096-0')).toBe(true);
      // Surgisphere Lancet Hydroxychloroquine
      expect(isKnownRetractedDoi('https://doi.org/10.1016/S0140-6736(20)31180-6')).toBe(true);
      // Schön Bell Labs Nature 2000
      expect(isKnownRetractedDoi('10.1038/nature01086')).toBe(true);
      // Obokata STAP stem cells Nature 2014
      expect(isKnownRetractedDoi('10.1038/nature12968')).toBe(true);
      // Clean / unretracted control paper
      expect(isKnownRetractedDoi('10.1038/s41586-024-0001-x')).toBe(false);
    });

    it('returns rich retraction metadata including reason and notice URL for landmark retractions', async () => {
      const wakefield = await checkRetractionStatus('10.1016/S0140-6736(97)11096-0');
      expect(wakefield.isRetracted).toBe(true);
      expect(wakefield.status).toBe('retracted');
      expect(wakefield.source).toBe('curated_index');
      expect(wakefield.noticeUrl).toContain('10.1016/S0140-6736(10)60175-4');
      expect(wakefield.reason).toContain('Data fabrication');
      expect(wakefield.crossmarkUpdated).toBe(true);

      const surgisphere = await checkRetractionStatus('10.1016/S0140-6736(20)31180-6');
      expect(surgisphere.isRetracted).toBe(true);
      expect(surgisphere.reason).toContain('Surgisphere');
    });
  });

  describe('3. Dynamic Retraction Checking with OpenAlex & Crossref', () => {
    it('detects retraction from OpenAlex payload when not in curated index', async () => {
      const mockWork = {
        id: 'https://openalex.org/W999999',
        doi: 'https://doi.org/10.9999/dynamic-retracted-paper',
        is_retracted: true,
        retraction_notice: 'https://doi.org/10.9999/retraction-notice-123',
        retracted_date: '2023-05-12',
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('openalex.org')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockWork,
          };
        }
        return { ok: false, status: 404 };
      });

      try {
        const result = await checkRetractionStatus('10.9999/dynamic-retracted-paper');
        expect(result.isRetracted).toBe(true);
        expect(result.status).toBe('retracted');
        expect(result.source).toBe('openalex');
        expect(result.noticeUrl).toBe('https://doi.org/10.9999/retraction-notice-123');
        expect(result.retractionDate).toBe('2023-05-12');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('detects Crossref Crossmark update-to retractions as fallback', async () => {
      const mockCrossref = {
        message: {
          DOI: '10.8888/crossmark-retracted-work',
          'update-to': [
            {
              type: 'retraction',
              label: 'Retraction of experimental findings',
              DOI: '10.8888/notice-doi-456',
              updated: { 'date-time': '2024-01-15T00:00:00Z' },
            },
          ],
        },
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('openalex.org')) {
          return { ok: false, status: 404 };
        }
        if (url.includes('crossref.org')) {
          return {
            ok: true,
            status: 200,
            json: async () => mockCrossref,
          };
        }
        return { ok: false, status: 404 };
      });

      try {
        const result = await checkRetractionStatus('10.8888/crossmark-retracted-work');
        expect(result.isRetracted).toBe(true);
        expect(result.status).toBe('retracted');
        expect(result.source).toBe('crossref');
        expect(result.crossmarkUpdated).toBe(true);
        expect(result.noticeUrl).toBe('https://doi.org/10.8888/notice-doi-456');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('returns clean status for non-retracted papers gracefully', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({ is_retracted: false, message: { 'update-to': [] } }),
        };
      });

      try {
        const result = await checkRetractionStatus('10.7777/valid-clean-paper');
        expect(result.isRetracted).toBe(false);
        expect(result.status).toBe('clean');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('4. Batch Checking with Concurrency & Deduplication', () => {
    it('concurrently checks an array of DOIs and returns a mapped result', async () => {
      const dois = [
        '10.1016/S0140-6736(97)11096-0', // Wakefield
        '10.1038/nature01086',           // Schön
        '10.1016/S0140-6736(97)11096-0', // Duplicate Wakefield
        '10.1126/science.1214986',       // Stapel
      ];

      const batchResults = await batchCheckRetractions(dois);
      expect(batchResults.size).toBe(3); // 3 unique normalized DOIs
      expect(batchResults.get('10.1016/s0140-6736(97)11096-0')?.isRetracted).toBe(true);
      expect(batchResults.get('10.1038/nature01086')?.isRetracted).toBe(true);
      expect(batchResults.get('10.1126/science.1214986')?.isRetracted).toBe(true);
    });
  });

  describe('5. Compliance Dossier Integration with Retraction Radar', () => {
    it('applies severe penalty to integrity score when retracted citations are present', async () => {
      const sampleLatex = `
        \\documentclass{article}
        \\begin{document}
        Recent experimental data was reported by \\cite{wakefield1998} and \\cite{cleanpaper2024}.
        \\end{document}
      `;

      const metadataMap = new Map();
      metadataMap.set('wakefield1998', {
        doi: '10.1016/S0140-6736(97)11096-0',
        title: 'Retracted Article on MMR Vaccine',
        provider: 'crossref',
        isRetracted: true,
        retractionNotice: 'Falsified patient data',
      });
      metadataMap.set('cleanpaper2024', {
        doi: '10.1038/s41586-024-0001-x',
        title: 'Authentic Genomic Research',
        provider: 'crossref',
        isRetracted: false,
      });

      const dossier = await generateComplianceDossier(
        sampleLatex,
        metadataMap,
        [],
        'pre_submission'
      );

      // Verify that dossier caught the retraction
      expect(dossier.verificationSummary.retractionAlertsCount).toBe(1);
      expect(dossier.retractionAlerts.length).toBe(1);
      expect(dossier.retractionAlerts[0].citeKey).toBe('wakefield1998');
      expect(dossier.retractionAlerts[0].doi).toBe('10.1016/S0140-6736(97)11096-0');
      expect(dossier.ethicsChecks.zeroRetractionsVerified).toBe(false);

      // The score should be severely penalized (below 80) due to 30-pt retraction penalty
      expect(dossier.integrityScore).toBeLessThan(80);
      expect(dossier.integrityGrade).not.toBe('A+');
    });

    it('awards high integrity score when 100% of citations are clean and verified', async () => {
      const sampleLatex = `
        \\documentclass{article}
        \\begin{document}
        Clean citations supported by \\cite{cleanpaper2024}.
        \\end{document}
      `;

      const metadataMap = new Map();
      metadataMap.set('cleanpaper2024', {
        doi: '10.1038/s41586-024-0001-x',
        title: 'Authentic Genomic Research',
        provider: 'openalex',
        isRetracted: false,
      });

      const dossier = await generateComplianceDossier(
        sampleLatex,
        metadataMap,
        [],
        'pre_submission'
      );

      expect(dossier.verificationSummary.retractionAlertsCount).toBe(0);
      expect(dossier.retractionAlerts.length).toBe(0);
      expect(dossier.ethicsChecks.zeroRetractionsVerified).toBe(true);
      expect(dossier.integrityScore).toBe(100);
      expect(dossier.integrityGrade).toBe('A+');
    });
  });
});
