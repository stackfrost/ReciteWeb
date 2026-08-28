import { describe, it, expect } from 'vitest';
import { GET as telemetryRoute } from '../telemetry/route';
import { NextRequest } from 'next/server';

describe('GET /api/admin/telemetry Due-Diligence & Analytics Endpoint', () => {
  const validSecret = 'citeassist-admin-secret-key-dev';

  it('rejects unauthenticated requests without x-admin-key header (HTTP 401)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/telemetry', {
      method: 'GET',
    });

    const res = await telemetryRoute(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain('Unauthorized');
  });

  it('rejects requests with invalid x-admin-key header (HTTP 401)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/telemetry', {
      method: 'GET',
      headers: {
        'x-admin-key': 'wrong-secret-key',
      },
    });

    const res = await telemetryRoute(req);
    expect(res.status).toBe(401);
  });

  it('returns comprehensive due-diligence metrics when properly authenticated (HTTP 200 JSON)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/telemetry', {
      method: 'GET',
      headers: {
        'x-admin-key': validSecret,
      },
    });

    const res = await telemetryRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.status).toBe('success');
    expect(data.data.summary.total_users).toBeGreaterThan(0);
    expect(data.data.summary.pro_users).toBeGreaterThan(0);
    expect(data.data.summary.cached_claims_ratio).toBeDefined();
    expect(data.data.infrastructure.gross_margin).toBe('98.8%');
    expect(data.data.time_series_last_30_days.length).toBe(30);
  });

  it('generates downloadable CSV for data room due-diligence when format=csv is requested', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/telemetry?format=csv', {
      method: 'GET',
      headers: {
        'x-admin-key': validSecret,
      },
    });

    const res = await telemetryRoute(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');

    const csvText = await res.text();
    expect(csvText).toContain('Category,Metric,Value,Unit/Period,Notes');
    expect(csvText).toContain('Total Registered Users');
    expect(csvText).toContain('Gross Margin');
    expect(csvText).toContain('Deterministic SHA-256 D1 matches');
  });
});
