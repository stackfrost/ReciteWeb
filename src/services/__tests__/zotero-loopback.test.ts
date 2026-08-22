import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pingZoteroConnector, syncCitationToZotero, type ZoteroSyncPayload } from '../zotero-loopback';

describe('Zotero Loopback Service (src/services/zotero-loopback.ts)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('window', globalThis);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pingZoteroConnector()', () => {
    it('returns false when window is undefined (e.g. server-side rendering)', async () => {
      vi.unstubAllGlobals();
      // in node env, window is undefined by default
      const isAlive = await pingZoteroConnector();
      expect(isAlive).toBe(false);
    });

    it('returns false when Zotero local server is unreachable (connection refused)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

      const isAlive = await pingZoteroConnector();
      expect(isAlive).toBe(false);
    });

    it('returns true when Zotero connector responds with ok status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
        })
      );

      const isAlive = await pingZoteroConnector();
      expect(isAlive).toBe(true);
    });

    it('returns false when Zotero ping returns non-ok status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
        })
      );

      const isAlive = await pingZoteroConnector();
      expect(isAlive).toBe(false);
    });
  });

  describe('syncCitationToZotero()', () => {
    const samplePayload: ZoteroSyncPayload = {
      citeKey: 'Einstein1905',
      doi: '10.1002/andp.19053221004',
      tag: 'Verified',
      note: 'Audited by ReciteAI Sprint 5',
    };

    it('gracefully returns connected: false when Zotero ping fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));

      const result = await syncCitationToZotero(samplePayload);
      expect(result.connected).toBe(false);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Zotero Desktop connector unreachable');
    });

    it('synchronizes citation metadata successfully when Zotero is live', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/ping')) {
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (url.includes('/updateItem')) {
          const body = JSON.parse(init?.body as string);
          expect(body.citationKey).toBe('Einstein1905');
          expect(body.extra).toBe('DOI: 10.1002/andp.19053221004');
          expect(body.tags).toEqual([{ tag: 'Verified' }]);
          expect(body.notes).toEqual(['Audited by ReciteAI Sprint 5']);
          return Promise.resolve({ ok: true, status: 200 });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      vi.stubGlobal('fetch', fetchMock);

      const result = await syncCitationToZotero(samplePayload);
      expect(result.connected).toBe(true);
      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully synchronized 'Einstein1905'");
    });

    it('uses default fallback tag ReciteAI:Verified when tag is not provided', async () => {
      let capturedBody: any = null;
      const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/ping')) {
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (url.includes('/updateItem')) {
          capturedBody = JSON.parse(init?.body as string);
          return Promise.resolve({ ok: true, status: 200 });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      vi.stubGlobal('fetch', fetchMock);

      const result = await syncCitationToZotero({ citeKey: 'Heisenberg1927' });
      expect(result.connected).toBe(true);
      expect(result.success).toBe(true);
      expect(capturedBody.tags).toEqual([{ tag: 'ReciteAI:Verified' }]);
      expect(capturedBody.extra).toBeUndefined();
      expect(capturedBody.notes).toBeUndefined();
    });

    it('handles non-200 response from updateItem', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/ping')) {
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (url.includes('/updateItem')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      vi.stubGlobal('fetch', fetchMock);

      const result = await syncCitationToZotero(samplePayload);
      expect(result.connected).toBe(true);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Zotero API returned status: 404');
    });

    it('handles unexpected exceptions during updateItem post', async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/ping')) {
          return Promise.resolve({ ok: true, status: 200 });
        }
        if (url.includes('/updateItem')) {
          return Promise.reject(new Error('Connection reset by peer'));
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      vi.stubGlobal('fetch', fetchMock);

      const result = await syncCitationToZotero(samplePayload);
      expect(result.connected).toBe(true);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Zotero write operation failed: Connection reset by peer');
    });
  });
});
