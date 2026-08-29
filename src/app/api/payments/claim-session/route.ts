/**
 * src/app/api/payments/claim-session/route.ts
 *
 * Dodo Payments — Post-Redirect Token Claim Endpoint.
 *
 * Called by the client after Dodo redirects the user back to the app:
 *   GET /api/payments/claim-session?payment_id=dodo_pay_xxxxx
 *
 * Flow:
 *   1. Lookup payment_id in D1 licenses table (or devLicenses in local dev)
 *   2. Reject if revoked or expired
 *   3. Issue a fresh HMAC-JWT via signToken()
 *   4. Return { status, token, tier, expiresAt }
 *
 * Mirrors the pattern of /api/stripe/claim-session for client-side
 * PaywallModal compatibility — the client only needs to store the token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth-token';
import { devLicenses } from '../webhook/route';

// ─── D1 type shim ─────────────────────────────────────────────────────────────
type D1LicenseRow = {
  email: string;
  tier: 'annual_pro' | 'emergency_pass';
  payment_id: string;
  expires_at: number;
  revoked: number; // 0 | 1
};

type D1Database = {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => {
      first: <T = unknown>() => Promise<T | null>;
    };
  };
};

function getDB(): D1Database | undefined {
  return (globalThis as Record<string, unknown>).__D1_DB as D1Database | undefined;
}

async function lookupLicense(
  db: D1Database | undefined,
  paymentId: string
): Promise<{ email: string; tier: 'annual_pro' | 'emergency_pass'; expires_at: number; revoked: boolean } | null> {
  if (db) {
    const row = await db
      .prepare(
        `SELECT email, tier, expires_at, revoked FROM licenses WHERE payment_id = ? LIMIT 1`
      )
      .bind(paymentId)
      .first<D1LicenseRow>();
    if (!row) return null;
    return { email: row.email, tier: row.tier, expires_at: row.expires_at, revoked: Boolean(row.revoked) };
  } else {
    // Dev fallback — read from in-memory store populated by webhook handler
    const rec = devLicenses.get(paymentId);
    if (!rec) return null;
    return { email: rec.email, tier: rec.tier, expires_at: rec.expires_at, revoked: rec.revoked };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get('payment_id');

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment_id query parameter' }, { status: 400 });
  }

  try {
    const db = getDB();
    const license = await lookupLicense(db, paymentId);

    if (!license) {
      // In non-production environments with no DODO_WEBHOOK_SECRET, allow a mock claim
      // for payment_ids that start with 'dodo_dev_' to unblock local UI testing.
      if (process.env.NODE_ENV !== 'production' && !process.env.DODO_WEBHOOK_SECRET && paymentId.startsWith('dodo_dev_')) {
        const tier = paymentId.includes('pro') ? 'annual_pro' : 'emergency_pass' as const;
        const durationMs = tier === 'annual_pro' ? 365 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        const expiresAt = Date.now() + durationMs;
        const token = await signToken({ email: 'dev@reciteweb.com', tier, expiresAt, sessionId: paymentId });
        return NextResponse.json({ status: 'success', token, tier, expiresAt, dev: true });
      }
      return NextResponse.json({ error: 'Payment not found. Complete checkout first.' }, { status: 404 });
    }

    if (license.revoked) {
      return NextResponse.json({ error: 'This license has been revoked.' }, { status: 402 });
    }

    if (license.expires_at < Date.now()) {
      return NextResponse.json({ error: 'License has expired. Please renew.' }, { status: 401 });
    }

    const token = await signToken({
      email: license.email,
      tier: license.tier,
      expiresAt: license.expires_at,
      passId: paymentId,
      sessionId: paymentId,
    });

    return NextResponse.json({
      status: 'success',
      token,
      tier: license.tier,
      expiresAt: license.expires_at,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to claim Dodo session';
    console.error('[Dodo claim-session] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
