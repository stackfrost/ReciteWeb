import { describe, it, expect, beforeEach } from 'vitest';
import { POST as entailmentRoute } from '../entailment/route';
import { signToken } from '@/lib/auth-token';
import { NextRequest } from 'next/server';

describe('POST /api/audit/entailment Payload Limits & Edge Validation', () => {
  let validToken: string;

  beforeEach(async () => {
    validToken = await signToken({
      email: 'researcher@academic.edu',
      tier: 'annual_pro',
      expiresAt: Date.now() + 86400000,
    });
  });

  it('rejects payloads exceeding 64KB with HTTP 413 Payload Too Large', async () => {
    // Construct a payload slightly larger than 64KB (65,536 bytes)
    const largeClaim = 'A'.repeat(66 * 1024);
    const bodyStr = JSON.stringify({
      claimText: largeClaim,
      citedPaperTitle: 'Valid Paper Title',
    });

    const req = new NextRequest('http://localhost:3000/api/audit/entailment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: bodyStr,
    });

    const res = await entailmentRoute(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.status).toBe('error');
    expect(data.message).toContain('Payload Too Large');
  });

  it('accepts payloads within the 64KB boundary', async () => {
    const normalClaim = 'The proposed transformer architecture yields superior BLEU scores.';
    const bodyStr = JSON.stringify({
      claimText: normalClaim,
      citedPaperTitle: 'Attention Is All You Need',
      citedAbstract: 'We introduce the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies.',
    });

    const req = new NextRequest('http://localhost:3000/api/audit/entailment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: bodyStr,
    });

    const res = await entailmentRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.classification).toBeDefined();
  });
});
