/**
 * src/services/__tests__/browser-fallback-and-paywall.test.ts
 *
 * Pre-production integration tests for:
 * 1. Safari / Firefox DOM input fallback in file-system.ts
 * 2. Blob download fallback for saveFile()
 * 3. 402 Paywall modal trigger in useReciteStore
 * 4. Deterministic DOI resolution LRU caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { FileSystemService } from '../file-system';
import { useReciteStore } from '@/lib/store';
import { doiResolutionCache } from '@/app/api/audit/deterministic/route';

describe('Pre-Production Hardening: Browser Fallbacks & Paywall Integration', () => {
  const originalGlobalWindow = (globalThis as any).window;
  const originalGlobalDocument = (globalThis as any).document;
  const originalGlobalURL = (globalThis as any).URL;

  beforeEach(() => {
    useReciteStore.setState({
      showPaywallModal: false,
      paywallReason: '',
      claims: [],
    });
    doiResolutionCache.clear();
  });

  afterEach(() => {
    if (originalGlobalWindow !== undefined) {
      (globalThis as any).window = originalGlobalWindow;
    } else {
      delete (globalThis as any).window;
    }
    if (originalGlobalDocument !== undefined) {
      (globalThis as any).document = originalGlobalDocument;
    } else {
      delete (globalThis as any).document;
    }
    (globalThis as any).URL = originalGlobalURL;
    vi.restoreAllMocks();
  });

  describe('1. File System Service — Safari & Firefox DOM Fallback', () => {
    it('uses DOM input fallback when window.showOpenFilePicker is missing', async () => {
      const mockFile = {
        name: 'paper.tex',
        text: async () => '\\documentclass{article}\n\\begin{document}Hello\\end{document}',
      };

      const mockInput: any = {
        type: 'file',
        accept: '',
        style: { display: '' },
        files: [],
        onchange: null,
      };

      mockInput.click = function () {
        mockInput.files = [mockFile];
        if (mockInput.onchange) {
          mockInput.onchange({ target: mockInput });
        }
      };

      const mockDoc = {
        createElement: vi.fn((tag: string) => {
          if (tag === 'input') return mockInput;
          return {};
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      (globalThis as any).window = {
        document: mockDoc,
        URL: globalThis.URL,
      };
      (globalThis as any).document = mockDoc;

      const mounted = await FileSystemService.mountFile();
      expect(mounted).not.toBeNull();
      expect(mounted?.fileName).toBe('paper.tex');
      expect(mounted?.text).toContain('\\documentclass{article}');
    });

    it('falls back to Blob download for saveFile when FileSystemHandle write is unsupported', async () => {
      let downloadedFilename = '';
      const mockAnchor: any = {
        get download() {
          return downloadedFilename;
        },
        set download(val: string) {
          downloadedFilename = val;
        },
        setAttribute: vi.fn((attr: string, val: string) => {
          if (attr === 'download') downloadedFilename = val;
        }),
        click: vi.fn(),
      };

      const mockDoc = {
        createElement: vi.fn((tag: string) => {
          if (tag === 'a') return mockAnchor;
          return {};
        }),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      };

      const mockURL = class MockURL extends (originalGlobalURL as any) {
        static createObjectURL = vi.fn(() => 'blob:http://localhost/test-uuid');
        static revokeObjectURL = vi.fn();
      };

      (globalThis as any).window = {
        document: mockDoc,
        URL: mockURL,
      };
      (globalThis as any).document = mockDoc;
      (globalThis as any).URL = mockURL;

      await FileSystemService.saveFile(null, 'Sample content', 'test.tex');
      expect(downloadedFilename).toBe('test.tex');
      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });

  describe('2. Paywall Modal Trigger State', () => {
    it('sets showPaywallModal and custom reason in useReciteStore', () => {
      expect(useReciteStore.getState().showPaywallModal).toBe(false);

      useReciteStore.getState().setShowPaywall(
        true,
        'Free trial quota exhausted. Upgrade to Researcher Pro ($49/yr).'
      );

      const state = useReciteStore.getState();
      expect(state.showPaywallModal).toBe(true);
      expect(state.paywallReason).toBe('Free trial quota exhausted. Upgrade to Researcher Pro ($49/yr).');

      useReciteStore.getState().setShowPaywall(false);
      expect(useReciteStore.getState().showPaywallModal).toBe(false);
    });
  });

  describe('3. Deterministic Route In-Memory LRU Cache', () => {
    it('stores and retrieves cached DOI status', () => {
      const doi = '10.1038/s41586-020-2649-2';
      doiResolutionCache.set(doi.toLowerCase(), {
        status: 200,
        item: { title: ['Sample Nature Paper'], 'update-to': [] },
        timestamp: Date.now(),
      });

      expect(doiResolutionCache.has(doi.toLowerCase())).toBe(true);
      const cached = doiResolutionCache.get(doi.toLowerCase());
      expect(cached?.status).toBe(200);
      expect(cached?.item?.title[0]).toBe('Sample Nature Paper');
    });
  });

  describe('4. Checkout API Backend & Promo Discount Logic', () => {
    it('applies $10 discount when valid promo code is submitted', async () => {
      const { POST } = await import('@/app/api/payments/create-checkout/route');
      const req = new Request('http://localhost:3000/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'researcher_pro',
          discountCode: 'PHD2026',
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('success');
      expect(data.discountApplied).toBe(10);
      expect(data.amountDue).toBe(49);
    });

    it('charges standard $59 when no promo code or invalid code is submitted', async () => {
      const { POST } = await import('@/app/api/payments/create-checkout/route');
      const req = new Request('http://localhost:3000/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'researcher_pro',
          discountCode: 'INVALID_CODE',
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('success');
      expect(data.discountApplied).toBe(0);
      expect(data.amountDue).toBe(59);
    });

    it('charges $299 for lab_multiseat plan without individual discount', async () => {
      const { POST } = await import('@/app/api/payments/create-checkout/route');
      const req = new Request('http://localhost:3000/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'lab_multiseat',
          discountCode: 'PHD2026',
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('success');
      expect(data.amountDue).toBe(299);
    });
  });

  describe('5. Direct Web Inquiry API (/api/contact)', () => {
    it('successfully processes valid contact submissions and returns 200', async () => {
      const { POST, recentSubmissions } = await import('@/app/api/contact/route');
      const req = new Request('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Prof. Ada Lovelace',
          email: 'ada@oxford.ac.uk',
          department: 'licensing',
          institution: 'Oxford University',
          message: 'Requesting quote for 25 department seats.',
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('success');
      expect(data.inquiryId).toBeDefined();
      expect(recentSubmissions.length).toBeGreaterThan(0);
      expect(recentSubmissions[0].name).toBe('Prof. Ada Lovelace');
    });

    it('rejects submissions with missing required fields', async () => {
      const { POST } = await import('@/app/api/contact/route');
      const req = new Request('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email',
          message: '',
        }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.status).toBe('error');
    });
  });

  describe('6. PI Compliance & Risk Dossier Engine', () => {
    it('generates cryptographic compliance dossier with integrity score and grant detection', async () => {
      const { generateComplianceDossier, generatePIBriefingMarkdown, detectGrantAcknowledgments } = await import('@/services/compliance-dossier');

      const sampleLatex = `
\\documentclass{article}
\\begin{document}
Recent studies \\cite{vaswani2017} established transformer mechanisms.
\\section*{Acknowledgments}
This research was supported in part by the National Science Foundation (NSF) award IIS-2026100 and NIH grant R01-EB012345.
\\section*{Data Availability}
The datasets and replication code are openly available at https://github.com/reciteweb/reproducibility.
\\section*{Author Contributions}
A.T. and E.M. conceived the experiment. All authors approved the final draft.
\\end{document}
`;

      const metadataMap = new Map();
      metadataMap.set('vaswani2017', {
        title: 'Attention Is All You Need',
        doi: '10.5555/3295222.3295349',
        provider: 'crossref',
        isRetracted: false,
      });

      const dossier = await generateComplianceDossier(sampleLatex, metadataMap, 'Transformer Attention Analysis');

      expect(dossier.specVersion).toBe('1.0.0');
      expect(dossier.integrityScore).toBeGreaterThanOrEqual(95);
      expect(dossier.integrityGrade).toBe('A+');
      expect(dossier.verificationSummary.totalCitations).toBe(1);
      expect(dossier.verificationSummary.verifiedCount).toBe(1);
      expect(dossier.verificationSummary.retractionAlertsCount).toBe(0);
      expect(dossier.detectedGrants.length).toBeGreaterThanOrEqual(2);
      expect(dossier.ethicsChecks.dataAvailabilityDeclared).toBe(true);
      expect(dossier.ethicsChecks.authorContributionsDeclared).toBe(true);

      const briefingMd = generatePIBriefingMarkdown(dossier, 'Transformer Attention Analysis');
      expect(briefingMd).toContain('Executive Pre-Submission Compliance Briefing');
      expect(briefingMd).toContain('A+');
      expect(briefingMd).toContain(dossier.documentFingerprint.rawSourceSha256);
    });
  });

  describe('7. GDPR / CCPA Account Deletion & Data Portability APIs', () => {
    it('generates GDPR Article 20 data export JSON', async () => {
      const { GET } = await import('@/app/api/user/export-data/route');
      const req = new Request('http://localhost:3000/api/user/export-data', {
        method: 'GET',
      });

      const res = await GET(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.exportMetadata).toBeDefined();
      expect(data.exportMetadata.legalFramework).toContain('GDPR Article 20');
      expect(data.accountProfile).toBeDefined();
      expect(data.dataGovernanceNotice).toBeDefined();
    }, 15000);

    it('rejects unauthenticated account deletion requests with 401 to prevent IDOR', async () => {
      const { POST } = await import('@/app/api/user/delete-account/route');
      const req = new Request('http://localhost:3000/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'victim@university.edu' }),
      });

      const res = await POST(req as any);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.status).toBe('error');
      expect(data.message).toContain('Unauthorized');
    });

    it('processes permanent account deletion when authorized with bearer token', async () => {
      const { POST } = await import('@/app/api/user/delete-account/route');
      const { signToken } = await import('@/lib/auth-token');

      const token = await signToken({
        email: 'test-user@university.edu',
        tier: 'annual_pro',
        expiresAt: Date.now() + 60000,
      });

      const req = new Request('http://localhost:3000/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await POST(req as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('success');
      expect(data.message).toContain('Right to be Forgotten');
    });
  });

  describe('8. Multi-Vendor Academic Search & Verification Mesh', () => {
    it('accurately classifies query domains for intelligent vendor routing', async () => {
      const { detectQueryDomain } = await import('@/services/academic-search-aggregator');

      expect(detectQueryDomain('CRISPR-Cas9 gene editing in T-cell immunotherapy')).toBe('biomedical');
      expect(detectQueryDomain('Clinical trial efficacy in oncology patient cohort')).toBe('biomedical');
      expect(detectQueryDomain('Quantum Riemannian manifold tensor curvature proof')).toBe('math_physics_cs');
      expect(detectQueryDomain('Transformer neural attention latency optimization')).toBe('math_physics_cs');
      expect(detectQueryDomain('Economic principles of market equilibrium')).toBe('general');
    });

    it('reconstructs structured BibTeX entries from Europe PMC and Semantic Scholar payloads', async () => {
      const { constructBibtexEntry } = await import('@/services/academic-search-aggregator');

      const bib = constructBibtexEntry(
        'Smith2024Genome',
        'Genome-wide association studies in human longevity',
        ['John Smith', 'Jane Doe'],
        2024,
        'Nature Genetics',
        '10.1038/s41588-024-0001-x'
      );

      expect(bib).toContain('@article{Smith2024Genome,');
      expect(bib).toContain('title = {Genome-wide association studies in human longevity}');
      expect(bib).toContain('author = {John Smith and Jane Doe}');
      expect(bib).toContain('doi = {10.1038/s41588-024-0001-x}');
    });
  });

  describe('9. OAuth Subscription & Entitlement API', () => {
    it('retrieves default FREE starter tier for unauthenticated guest session', async () => {
      const { GET } = await import('@/app/api/user/subscription/route');
      const req = new Request('http://localhost:3000/api/user/subscription', { method: 'GET' });
      const res = await GET(req as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.authenticated).toBe(false);
      expect(data.licenseStatus).toBe('FREE');
      expect(data.features.maxClaimsPerAudit).toBe(10);
    });

    it('toggles tier in development sandbox mode', async () => {
      const { POST } = await import('@/app/api/user/subscription/route');
      const req = new Request('http://localhost:3000/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', host: 'localhost:3000' },
        body: JSON.stringify({ tier: 'PRO' }),
      });
      const res = await POST(req as any);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('success');
      expect(data.licenseStatus).toBe('PRO');
      expect(data.devMode).toBe(true);
    });
  });
});
