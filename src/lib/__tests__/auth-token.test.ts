import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, type ProTokenPayload } from '../auth-token';

describe('auth-token: HMAC-SHA256 Stateless Token Engine', () => {
  it('signs and verifies a valid Pro token payload', async () => {
    const payload: ProTokenPayload = {
      email: 'alex.researcher@stanford.edu',
      tier: 'annual_pro',
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    };

    const token = await signToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = await verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.email).toBe('alex.researcher@stanford.edu');
    expect(verified?.tier).toBe('annual_pro');
  });

  it('signs and verifies a 7-day Emergency Pass token', async () => {
    const payload: ProTokenPayload = {
      email: 'postdoc@mit.edu',
      tier: 'emergency_pass',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      passId: 'pass_neurips_2026',
    };

    const token = await signToken(payload);
    const verified = await verifyToken(token);

    expect(verified).not.toBeNull();
    expect(verified?.tier).toBe('emergency_pass');
    expect(verified?.passId).toBe('pass_neurips_2026');
  });

  it('rejects tampered tokens', async () => {
    const payload: ProTokenPayload = {
      email: 'author@oxford.ac.uk',
      tier: 'annual_pro',
      expiresAt: Date.now() + 100000,
    };

    const token = await signToken(payload);
    const parts = token.split('.');
    
    // Tamper with payload
    const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, tier: 'unlimited_super_admin' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const verified = await verifyToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const expiredPayload: ProTokenPayload = {
      email: 'past.student@cmu.edu',
      tier: 'emergency_pass',
      expiresAt: Date.now() - 10000, // Expired 10 seconds ago
    };

    const token = await signToken(expiredPayload);
    const verified = await verifyToken(token);

    expect(verified).toBeNull();
  });

  it('rejects tokens signed with a different secret', async () => {
    const payload: ProTokenPayload = {
      email: 'researcher@berkeley.edu',
      tier: 'annual_pro',
      expiresAt: Date.now() + 100000,
    };

    const token = await signToken(payload, 'secret-key-alpha');
    const verified = await verifyToken(token, 'secret-key-beta');

    expect(verified).toBeNull();
  });

  it('embeds unique nonce (jti) and issued-at (iat) timestamps to prevent token collision', async () => {
    const payload: ProTokenPayload = {
      email: 'student@caltech.edu',
      tier: 'emergency_pass',
      expiresAt: Date.now() + 100000,
    };

    const token1 = await signToken(payload);
    const token2 = await signToken(payload);

    const verified1 = await verifyToken(token1);
    const verified2 = await verifyToken(token2);

    expect(verified1?.jti).toBeDefined();
    expect(verified2?.jti).toBeDefined();
    expect(verified1?.jti).not.toBe(verified2?.jti); // Unique nonces
    expect(verified1?.iat).toBeDefined();
  });
});
