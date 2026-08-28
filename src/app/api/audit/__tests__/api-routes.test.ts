import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as deterministicRoute } from '../deterministic/route';
import { POST as entailmentRoute } from '../entailment/route';
import { signToken } from '@/lib/auth-token';
import { NextRequest } from 'next/server';

describe('Next.js App Router API Routes: Deterministic & Entailment Audits', () => {
  describe('POST /api/audit/deterministic', () => {
    it('accurately parses BibTeX and calculates clean score when citations match', async () => {
      const bibtex = `@article{shimizu2003,
  title = {Spin-liquid state in an organic Mott insulator},
  author = {Shimizu, Y. and Miyagawa, K.},
  journal = {Physical Review Letters},
  year = {2003}
}`;
      const manuscriptText = 'We compare our results with the organic Mott insulator \\cite{shimizu2003}.';

      const req = new NextRequest('http://localhost:3000/api/audit/deterministic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibtex, manuscriptText }),
      });

      const res = await deterministicRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.riskScore).toBe(100);
      expect(data.metrics.totalCitedInText).toBe(1);
      expect(data.metrics.missingCites).toBe(0);
      expect(data.metrics.orphanCites).toBe(0);
    });

    it('detects missing bibliography entries for in-text citations', async () => {
      const bibtex = `@article{other2020, title={Other}, year={2020}}`;
      const manuscriptText = 'As shown in \\cite{missing2024} and \\cite{other2020}.';

      const req = new NextRequest('http://localhost:3000/api/audit/deterministic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibtex, manuscriptText }),
      });

      const res = await deterministicRoute(req);
      const data = await res.json();

      expect(data.metrics.missingCites).toBe(1);
      expect(data.riskScore).toBeLessThan(100);
      expect(data.redFlags.some((f: any) => f.category === 'MISSING_BIB' && f.citeKey === 'missing2024')).toBe(true);
    });

    it('detects retracted paper markers in literature titles', async () => {
      const bibtex = `@article{badstudy2021,
  title = {RETRACTED: Fabrication of Superconducting State in Room Temperature Hydrides},
  author = {Author, Fake},
  year = {2021},
  doi = {10.1038/s41586-020-2649-2}
}`;
      const manuscriptText = 'We replicate \\cite{badstudy2021}.';

      const req = new NextRequest('http://localhost:3000/api/audit/deterministic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibtex, manuscriptText }),
      });

      const res = await deterministicRoute(req);
      const data = await res.json();

      expect(data.metrics.retractions).toBe(1);
      expect(data.riskScore).toBeLessThanOrEqual(75);
      expect(data.redFlags.some((f: any) => f.category === 'RETRACTION')).toBe(true);
    });
  });

  describe('POST /api/audit/entailment', () => {
    it('blocks unauthenticated requests with 401 and Pro upgrade message', async () => {
      const req = new NextRequest('http://localhost:3000/api/audit/entailment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimText: 'The sample exhibits gapless thermal transport.',
          citedPaperTitle: 'Absence of gapless thermal excitations',
        }),
      });

      const res = await entailmentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.status).toBe('error');
      expect(data.message).toContain('Missing Authorization Bearer token');
    });

    it('accepts valid Pro token and returns semantic entailment analysis', async () => {
      const validToken = await signToken({
        email: 'pro.author@stanford.edu',
        tier: 'annual_pro',
        expiresAt: Date.now() + 100000,
      });

      const req = new NextRequest('http://localhost:3000/api/audit/entailment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          claimText: 'Thermal conductivity measurements at 50 mK confirm negligible linear term.',
          citedPaperTitle: 'Thermal conductivity in EtMe3Sb[Pd(dmit)2]2',
          citedAbstract: 'Low-temperature thermal conductivity measurements down to 50 mK reveal a negligible residual linear term.',
        }),
      });

      const res = await entailmentRoute(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.tier).toBe('annual_pro');
      expect(data.classification).toBe('SUPPORTED');
      expect(data.confidence).toBeGreaterThan(0.8);
    });
  });
});
