import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const d1 = (globalThis as any).__D1_DB || (globalThis as any).DB;
  let d1Status = 'connected';

  if (d1?.prepare) {
    try {
      await d1.prepare('SELECT 1').first();
    } catch {
      d1Status = 'degraded';
    }
  } else {
    d1Status = 'in-memory-dev';
  }

  const region = req.headers.get('cf-ray') 
    ? req.headers.get('cf-ray')?.split('-')[1] || 'cloudflare-edge'
    : req.headers.get('cf-ipcountry') || 'local';

  return NextResponse.json(
    {
      status: 'HEALTHY',
      edge_region: region,
      timestamp: Date.now(),
      services: {
        d1_database: d1Status,
        inference_engine: process.env.GEMINI_API_KEY ? 'ready' : 'fallback-keyword-overlap',
        webhook_pipeline: 'active',
      },
      version: '1.0.0',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
