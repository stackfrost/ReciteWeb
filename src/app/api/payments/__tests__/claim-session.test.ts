/**
 * src/app/api/payments/__tests__/claim-session.test.ts
 *
 * Unit tests for the Dodo Payments claim-session endpoint.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { devLicenses } from '../webhook/route';

describe('GET /api/payments/claim-session', () => {
  beforeEach(() => {
    devLicenses.clear();
    delete (process.env as Record<string, string | undefined>).DODO_WEBHOOK_SECRET;
  });

  function makeGET(paymentId?: string) {
    const url = paymentId
      ? `http://localhost/api/payments/claim-session?payment_id=${paymentId}`
      : 'http://localhost/api/payments/claim-session';
    return new Request(url, { method: 'GET' });
  }

  it('returns 400 when payment_id is missing', async () => {
    const { GET } = await import('../claim-session/route');
    const res = await GET(makeGET() as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing payment_id/i);
  });

  it('returns 404 when payment_id not found and secret is set', async () => {
    (process.env as Record<string, string>).DODO_WEBHOOK_SECRET = 'secret';
    const { GET } = await import('../claim-session/route');
    const res = await GET(makeGET('dodo_pay_notfound') as any);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/not found/i);
  });

  it('returns 200 dev mock for dodo_dev_ prefix in dev mode', async () => {
    const { GET } = await import('../claim-session/route');
    const res = await GET(makeGET('dodo_dev_pro_pass') as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.token).toBeTruthy();
    expect(json.dev).toBe(true);
    expect(json.tier).toBe('annual_pro');
  });

  it('returns emergency_pass for dodo_dev_ IDs without "pro"', async () => {
    const { GET } = await import('../claim-session/route');
    const res = await GET(makeGET('dodo_dev_ep_pass') as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tier).toBe('emergency_pass');
  });

  it('returns 200 with token when license exists and is active', async () => {
    const paymentId = `dodo_pay_active_${Date.now()}`;
    devLicenses.set(paymentId, {
      email: 'researcher@uni.edu',
      tier: 'annual_pro',
      payment_id: paymentId,
      expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30,
      revoked: false,
    });
    const { GET } = await import('../claim-session/route');
    const res = await GET(makeGET(paymentId) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('success');
    expect(json.token).toBeTruthy();
    expect(json.tier).toBe('annual_pro');
    expect(json.expiresAt).toBeGreaterThan(Date.now());
  });

  it('returns 402 for revoked license', async () => {
    const paymentId = `dodo_pay_revoked_${Date.now()}`;
    devLicenses.set(paymentId, {
      email: 'bad@actor.com', tier: 'emergency_pass', payment_id: paymentId,
      expires_at: Date.now() + 1000000, revoked: true,
    });
    const { GET } = await import('../claim-session/route');
    const res = await GET(makeGET(paymentId) as any);
    expect(res.status).toBe(402);
    expect((await res.json()).error).toMatch(/revoked/i);
  });

  it('returns 401 for expired license', async () => {
    const paymentId = `dodo_pay_expired_${Date.now()}`;
    devLicenses.set(paymentId, {
      email: 'expired@user.com', tier: 'emergency_pass', payment_id: paymentId,
      expires_at: Date.now() - 1000, // already expired
      revoked: false,
    });
    const { GET } = await import('../claim-session/route');
    const res = await GET(makeGET(paymentId) as any);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/expired/i);
  });
});
