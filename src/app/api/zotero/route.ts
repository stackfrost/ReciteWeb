import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/zotero
 * Returns Zotero library items for the authenticated user.
 *
 * @stub — OAuth handshake and Zotero API v3 client pending
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    status: 'STUB_OK',
    items: [],
    message: 'ZOTERO_ADAPTER_STUB // OAUTH_PENDING',
  });
}

/**
 * POST /api/zotero
 * Pushes an accepted citation back into the user's Zotero library.
 *
 * @stub — OAuth handshake and Zotero API v3 client pending
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paperId, collectionKey } = body as { paperId: string; collectionKey?: string };

    if (!paperId) {
      return NextResponse.json({ error: 'paperId required' }, { status: 400 });
    }

    // TODO: POST to https://api.zotero.org/users/{userId}/items using OAuth token
    return NextResponse.json({
      status: 'STUB_OK',
      paperId,
      collectionKey: collectionKey ?? null,
      message: 'ZOTERO_PUSH_STUB // OAUTH_PENDING',
    });
  } catch (error) {
    console.error('[Zotero API Error]:', error);
    return NextResponse.json({ error: 'Internal Zotero adapter error' }, { status: 500 });
  }
}
