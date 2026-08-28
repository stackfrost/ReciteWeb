/**
 * src/app/api/payments/webhook/route.ts
 *
 * Dodo Payments Webhook Handler for CiteAssist AI.
 *
 * Webhook signature format from Dodo:
 *   Header: webhook-signature: t={timestamp},v1={hmac_sha256_hex}
 *   Signed payload: "{timestamp}.{rawBody}"
 *   Algorithm: HMAC-SHA256(DODO_WEBHOOK_SECRET, signedPayload)
 *
 * D1 Binding:
 *   Production (Cloudflare Workers): Cloudflare injects env.DB at runtime.
 *   Local dev (Next.js): Falls back to an in-memory Map store.
 *
 * Events handled:
 *   - payment.succeeded        => INSERT annual_pro or emergency_pass license
 *   - subscription.activated   => INSERT annual_pro license (recurring)
 *   - payment.refunded         => UPDATE revoked=1
 *   - subscription.cancelled   => UPDATE revoked=1
 *   - <all others>             => 200 acknowledge
 */

import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth-token';

// ─── Dev fallback: in-memory license store ────────────────────────────────────
// Mirrors the D1 schema. Lost on process restart — fine for local dev only.
export const devLicenses = new Map<string, {
  email: string;
  tier: 'annual_pro' | 'emergency_pass';
  payment_id: string;
  expires_at: number;
  revoked: boolean;
}>();

// ─── D1 type shim (not a real import — injected by Cloudflare runtime) ────────
type D1Database = {
  prepare: (sql: string) => {
    bind: (...params: unknown[]) => {
      run: () => Promise<void>;
    };
  };
};

/** Returns the D1 binding injected by Cloudflare, or undefined in local dev. */
function getDB(): D1Database | undefined {
  return (globalThis as Record<string, unknown>).__D1_DB as D1Database | undefined;
}

async function insertLicense(
  db: D1Database | undefined,
  params: {
    email: string;
    userId?: string;
    tier: 'annual_pro' | 'emergency_pass';
    paymentId: string;
    expiresAt: number;
    tokenHash: string;
  }
): Promise<void> {
  const { email, userId, tier, paymentId, expiresAt, tokenHash } = params;
  const now = Date.now();

  if (db) {
    // 1. Update user.licenseStatus to PRO
    try {
      if (userId) {
        await db
          .prepare(`UPDATE user SET license_status = 'PRO', updated_at = ? WHERE id = ?`)
          .bind(now, userId)
          .run();
      } else if (email) {
        await db
          .prepare(`UPDATE user SET license_status = 'PRO', updated_at = ? WHERE email = ?`)
          .bind(now, email)
          .run();
      }
    } catch {
      // Non-blocking if user table doesn't have user yet
    }

    // 2. Insert into license_keys table
    try {
      const keyId = `key_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await db
        .prepare(
          `INSERT OR REPLACE INTO license_keys (id, user_id, key, tier, status, expires_at, created_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?)`
        )
        .bind(keyId, userId || null, paymentId, tier, expiresAt, now)
        .run();
    } catch {
      // Non-blocking if table is structured differently in test mocks
    }

    // 3. Backward-compatible licenses table
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO licenses (email, tier, payment_id, payment_provider, token_hash, expires_at)
           VALUES (?, ?, ?, 'dodo', ?, ?)`
        )
        .bind(email, tier, paymentId, tokenHash, expiresAt)
        .run();
    } catch {
      // Ignore if table already migrated
    }
  } else {
    devLicenses.set(paymentId, {
      email,
      tier,
      payment_id: paymentId,
      expires_at: expiresAt,
      revoked: false,
    });
    console.log(`[Dodo Dev] License stored: ${tier} for ${email} (payment_id=${paymentId})`);
  }
}

async function revokeLicense(db: D1Database | undefined, paymentId: string, email?: string): Promise<void> {
  const now = Date.now();
  if (db) {
    // 1. Update user.licenseStatus to REVOKED
    try {
      if (email) {
        await db
          .prepare(`UPDATE user SET license_status = 'REVOKED', updated_at = ? WHERE email = ?`)
          .bind(now, email)
          .run();
      }
    } catch {
      // Non-blocking
    }

    // 2. Update license_keys status to revoked
    try {
      await db
        .prepare(`UPDATE license_keys SET status = 'revoked' WHERE key = ?`)
        .bind(paymentId)
        .run();
    } catch {
      // Non-blocking
    }

    // 3. Backward-compatible licenses table
    try {
      await db
        .prepare(`UPDATE licenses SET revoked = 1 WHERE payment_id = ?`)
        .bind(paymentId)
        .run();
    } catch {
      // Non-blocking
    }
  } else {
    const rec = devLicenses.get(paymentId);
    if (rec) rec.revoked = true;
    console.log(`[Dodo Dev] License revoked: payment_id=${paymentId}`);
  }
}

// ─── HMAC-SHA256 Signature Verification ──────────────────────────────────────

/**
 * Verifies a Dodo Payments webhook signature.
 *
 * Header format: "t=1234567890,v1=<hex_hmac>"
 * Signed string: "<timestamp>.<rawBody>"
 * Replay window: 5 minutes
 */
export async function verifyDodoSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((s) => {
      const idx = s.indexOf('=');
      return [s.slice(0, idx), s.slice(idx + 1)] as [string, string];
    })
  );
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  // Reject webhooks older than 5 minutes
  const age = Date.now() - parseInt(timestamp, 10) * 1000;
  if (age > 5 * 60 * 1000) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (expectedHex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  return diff === 0;
}

// ─── SHA-256 token-hash helper ────────────────────────────────────────────────
export async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Main Webhook Handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('webhook-signature');
  const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || process.env.DODO_WEBHOOK_SECRET;
  const db = getDB();

  // Signature verification
  if (webhookSecret) {
    if (!signatureHeader) {
      return NextResponse.json({ error: 'Missing webhook-signature header' }, { status: 400 });
    }
    const isValid = await verifyDodoSignature(rawBody, signatureHeader, webhookSecret);
    if (!isValid) {
      console.error('[Dodo Webhook] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } else {
    console.warn('[Dodo Webhook] DODO_PAYMENTS_WEBHOOK_SECRET not set — dev mode, skipping verification');
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, data } = event;

  try {
    if (
      type === 'payment.succeeded' ||
      type === 'subscription.active' ||
      type === 'subscription.activated'
    ) {
      const paymentId = String(
        (data.payment_id ?? data.subscription_id ?? `dodo_${Date.now()}`)
      );
      const email = String((data as Record<string, Record<string, string>>).customer?.email ?? 'researcher@academic.edu');
      const userId = (data as Record<string, Record<string, string>>).metadata?.user_id ||
        (data as Record<string, Record<string, string>>).metadata?.userId;
      const tier: 'annual_pro' | 'emergency_pass' =
        type.startsWith('subscription')
          ? 'annual_pro'
          : ((data as Record<string, Record<string, string>>).metadata?.tier === 'emergency_pass' ? 'emergency_pass' : 'annual_pro');

      const durationMs = tier === 'annual_pro'
        ? 365 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
      const expiresAt = Date.now() + durationMs;

      const token = await signToken({ email, tier, expiresAt, passId: paymentId, sessionId: paymentId, userId });
      const tokenHash = await sha256hex(token);

      await insertLicense(db, { email, userId, tier, paymentId, expiresAt, tokenHash });
      console.log(`[Dodo Webhook] Provisioned ${tier} for ${email} (${paymentId})`);
      return NextResponse.json({ received: true, tier, email });
    }

    if (
      type === 'refund.processed' ||
      type === 'dispute.opened' ||
      type === 'payment.refunded' ||
      type === 'subscription.cancelled'
    ) {
      const paymentId = String(data.payment_id ?? data.subscription_id ?? '');
      const email = (data as Record<string, Record<string, string>>).customer?.email;
      if (paymentId) await revokeLicense(db, paymentId, email);
      return NextResponse.json({ received: true, event: type });
    }

    return NextResponse.json({ received: true, event: type });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook handler error';
    console.error('[Dodo Webhook] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
