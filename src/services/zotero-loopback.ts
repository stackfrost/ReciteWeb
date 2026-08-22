const ZOTERO_LOOPBACK_BASE = 'http://127.0.0.1:23119/connector';

export interface ZoteroSyncPayload {
  citeKey: string;
  doi?: string;
  tag?: string;
  note?: string;
}

export interface ZoteroSyncResult {
  connected: boolean;
  success: boolean;
  message: string;
}

/**
 * Checks if Zotero desktop application loopback server is reachable.
 */
export async function pingZoteroConnector(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(`${ZOTERO_LOOPBACK_BASE}/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(800),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Writes validated metadata, tags, and compliance audit notes back into local Zotero.
 */
export async function syncCitationToZotero(payload: ZoteroSyncPayload): Promise<ZoteroSyncResult> {
  const isAlive = await pingZoteroConnector();
  if (!isAlive) {
    return {
      connected: false,
      success: false,
      message: 'Zotero Desktop connector unreachable on 127.0.0.1:23119 (ensure Zotero is running).',
    };
  }

  try {
    const res = await fetch(`${ZOTERO_LOOPBACK_BASE}/updateItem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        citationKey: payload.citeKey,
        extra: payload.doi ? `DOI: ${payload.doi}` : undefined,
        tags: payload.tag ? [{ tag: payload.tag }] : [{ tag: 'ReciteAI:Verified' }],
        notes: payload.note ? [payload.note] : undefined,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      return {
        connected: true,
        success: true,
        message: `Successfully synchronized '${payload.citeKey}' to local Zotero library.`,
      };
    }

    return {
      connected: true,
      success: false,
      message: `Zotero API returned status: ${res.status}`,
    };
  } catch (err) {
    return {
      connected: true,
      success: false,
      message: `Zotero write operation failed: ${(err as Error).message}`,
    };
  }
}
