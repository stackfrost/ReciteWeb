import { describe, it, expect } from 'vitest';
import { GET as healthRoute } from '../route';
import { NextRequest } from 'next/server';

describe('GET /api/health Pre-flight Health Check', () => {
  it('returns HTTP 200 with HEALTHY status and active services', async () => {
    const req = new NextRequest('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        'cf-ray': '8f12345678-iad',
      },
    });

    const res = await healthRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('HEALTHY');
    expect(data.edge_region).toBe('iad');
    expect(data.services).toBeDefined();
    expect(data.services.webhook_pipeline).toBe('active');
    expect(data.timestamp).toBeGreaterThan(0);
  });
});
