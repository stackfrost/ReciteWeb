import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/audit
 * Receives extracted claim text and routes it through the active LLM provider
 * for citation verification, retraction checks, and severity classification.
 *
 * @stub — LLM router wiring pending BYOK config handshake (§ C of store.ts)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claims, provider = 'gemini' } = body as {
      claims: { id: string; text: string; category: string }[];
      provider?: string;
    };

    if (!claims || !Array.isArray(claims)) {
      return NextResponse.json({ error: 'claims array required' }, { status: 400 });
    }

    // TODO: Route to active LLM provider via BYOK matrix
    // const result = await llmRouter.route(provider, claims);
    // For now, return a passthrough stub so the type system is satisfied.
    return NextResponse.json({
      status: 'STUB_OK',
      provider,
      claimCount: claims.length,
      message: 'LLM_ROUTER_STUB // BYOK_PENDING_CONFIG',
    });
  } catch (error) {
    console.error('[Audit API Error]:', error);
    return NextResponse.json({ error: 'Internal audit engine error' }, { status: 500 });
  }
}
