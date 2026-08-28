/**
 * src/app/api/payments/__tests__/webhook.test.ts
 *
 * Unit tests for the Dodo Payments webhook handler.
 * Covers: HMAC signature verification, event dispatch, D1 mock writes, revocation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyDodoSignature, sha256hex, devLicenses } from '../webhook/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function makeSignature(rawBody: string, secret: string, ts?: number): Promise<string> {
  const timestamp = ts ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${rawBody}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
  const hex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `t=${timestamp},v1=${hex}`;
}

function makeMockRequest(body: object, signatureHeader?: string): Request {
  const rawBody = JSON.stringify(body);
  const headers = new Headers({ 'content-type': 'application/json' });
  if (signatureHeader) headers.set('webhook-signature', signatureHeader);
  return new Request('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers,
    body: rawBody,
  });
}

// ─── verifyDodoSignature ──────────────────────────────────────────────────────

describe('verifyDodoSignature', () => {
  const SECRET = 'test-webhook-secret-xyz';

  it('returns true for a valid signature', async () => {
    const body = JSON.stringify({ type: 'payment.succeeded', data: {} });
    const sig = await makeSignature(body, SECRET);
    expect(await verifyDodoSignature(body, sig, SECRET)).toBe(true);
  });

  it('returns false for a tampered body', async () => {
    const body = JSON.stringify({ type: 'payment.succeeded' });
    const sig = await makeSignature(body, SECRET);
    const tamperedBody = JSON.stringify({ type: 'payment.refunded' });
    expect(await verifyDodoSignature(tamperedBody, sig, SECRET)).toBe(false);
  });

  it('returns false for wrong secret', async () => {
    const body = '{"type":"test"}';
    const sig = await makeSignature(body, SECRET);
    expect(await verifyDodoSignature(body, sig, 'wrong-secret')).toBe(false);
  });

  it('returns false for malformed header (missing t= or v1=)', async () => {
    expect(await verifyDodoSignature('{}', 'badheader', SECRET)).toBe(false);
    expect(await verifyDodoSignature('{}', 'v1=abc123', SECRET)).toBe(false);
    expect(await verifyDodoSignature('{}', '', SECRET)).toBe(false);
  });

  it('rejects webhooks older than 5 minutes (replay attack)', async () => {
    const body = '{"type":"test"}';
    const staleTs = Math.floor(Date.now() / 1000) - 6 * 60; // 6 minutes ago
    const sig = await makeSignature(body, SECRET, staleTs);
    expect(await verifyDodoSignature(body, sig, SECRET)).toBe(false);
  });
});

// ─── sha256hex ────────────────────────────────────────────────────────────────

describe('sha256hex', () => {
  it('produces a 64-character lowercase hex string', async () => {
    const hash = await sha256hex('hello');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', async () => {
    expect(await sha256hex('test')).toBe(await sha256hex('test'));
  });

  it('produces different hashes for different inputs', async () => {
    expect(await sha256hex('a')).not.toBe(await sha256hex('b'));
  });
});

// ─── POST /api/payments/webhook (integration-style, no D1 binding in test) ───

describe('POST /api/payments/webhook — dev mode (no secret)', () => {
  beforeEach(() => {
    devLicenses.clear();
    delete (process.env as Record<string, string | undefined>).DODO_WEBHOOK_SECRET;
  });

  it('accepts payment.succeeded and stores license in devLicenses', async () => {
    const { POST } = await import('../webhook/route');
    const paymentId = `dodo_pay_test_${Date.now()}`;
    const req = makeMockRequest({
      type: 'payment.succeeded',
      data: {
        payment_id: paymentId,
        customer: { email: 'researcher@uni.edu' },
        metadata: { tier: 'annual_pro' },
      },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.tier).toBe('annual_pro');
    expect(devLicenses.has(paymentId)).toBe(true);
    expect(devLicenses.get(paymentId)!.revoked).toBe(false);
  });

  it('accepts subscription.activated and stores annual_pro license', async () => {
    const { POST } = await import('../webhook/route');
    const subscriptionId = `dodo_sub_${Date.now()}`;
    const req = makeMockRequest({
      type: 'subscription.activated',
      data: {
        subscription_id: subscriptionId,
        customer: { email: 'phd@lab.edu' },
      },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(devLicenses.get(subscriptionId)!.tier).toBe('annual_pro');
  });

  it('accepts emergency_pass tier via metadata', async () => {
    const { POST } = await import('../webhook/route');
    const paymentId = `dodo_pay_ep_${Date.now()}`;
    const req = makeMockRequest({
      type: 'payment.succeeded',
      data: {
        payment_id: paymentId,
        customer: { email: 'researcher@uni.edu' },
        metadata: { tier: 'emergency_pass' },
      },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(devLicenses.get(paymentId)!.tier).toBe('emergency_pass');
  });

  it('revokes license on payment.refunded', async () => {
    const { POST } = await import('../webhook/route');
    const paymentId = `dodo_pay_ref_${Date.now()}`;
    // First insert
    devLicenses.set(paymentId, {
      email: 'user@x.com', tier: 'annual_pro', payment_id: paymentId,
      expires_at: Date.now() + 1000000, revoked: false,
    });
    const req = makeMockRequest({ type: 'payment.refunded', data: { payment_id: paymentId } });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(devLicenses.get(paymentId)!.revoked).toBe(true);
  });

  it('acknowledges unknown events with 200', async () => {
    const { POST } = await import('../webhook/route');
    const req = makeMockRequest({ type: 'payment.pending', data: {} });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event).toBe('payment.pending');
  });

  it('rejects invalid JSON body with 400', async () => {
    const { POST } = await import('../webhook/route');
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: 'not json at all',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/payments/webhook — prod mode (with secret)', () => {
  beforeEach(() => {
    devLicenses.clear();
    (process.env as Record<string, string>).DODO_WEBHOOK_SECRET = 'prod-secret-abc';
  });

  it('rejects missing webhook-signature header with 400', async () => {
    const { POST } = await import('../webhook/route');
    const req = makeMockRequest({ type: 'payment.succeeded', data: {} }); // no sig header
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Missing webhook-signature/i);
  });

  it('rejects invalid signature with 400', async () => {
    const { POST } = await import('../webhook/route');
    const body = JSON.stringify({ type: 'payment.succeeded', data: {} });
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      headers: { 'webhook-signature': 't=9999999999,v1=badhex' },
      body,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid signature/i);
  });

  it('accepts a valid signature and stores license', async () => {
    const { POST } = await import('../webhook/route');
    const paymentId = `dodo_pay_prod_${Date.now()}`;
    const body = JSON.stringify({
      type: 'payment.succeeded',
      data: {
        payment_id: paymentId,
        customer: { email: 'prod@uni.edu' },
        metadata: { tier: 'annual_pro' },
      },
    });
    const sig = await makeSignature(body, 'prod-secret-abc');
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      headers: { 'webhook-signature': sig },
      body,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(devLicenses.has(paymentId)).toBe(true);
  });
});
