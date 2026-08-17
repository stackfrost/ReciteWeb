import { SuggestedPaper } from '../store';

const ZOTERO_API_BASE = 'https://api.zotero.org';

// Standard headers required by Zotero API v3
function getZoteroHeaders(apiKey: string): HeadersInit {
  return {
    'Zotero-API-Version': '3',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * A heuristic to split full names into First and Last names for Zotero's schema.
 * Example: "A. R. Miller" -> firstName: "A. R.", lastName: "Miller"
 */
function parseAuthorName(fullName: string) {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { creatorType: 'author', firstName: '', lastName: parts[0] };
  }
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { creatorType: 'author', firstName, lastName };
}

/**
 * Gets the ID of a specific collection (folder) by name. 
 * Creates it if it doesn't exist.
 */
export async function getOrCreateCollection(
  userId: string,
  apiKey: string,
  collectionName = 'CiteGuard Imports'
): Promise<string | null> {
  try {
    // 1. Check if collection already exists
    const getRes = await fetch(`${ZOTERO_API_BASE}/users/${userId}/collections`, {
      headers: getZoteroHeaders(apiKey),
    });

    if (getRes.ok) {
      const collections = await getRes.json();
      const existing = collections.find((c: any) => c.data.name === collectionName);
      if (existing) {
        return existing.key; // Zotero refers to IDs as 'key'
      }
    }

    // 2. Create collection if missing
    const createRes = await fetch(`${ZOTERO_API_BASE}/users/${userId}/collections`, {
      method: 'POST',
      headers: getZoteroHeaders(apiKey),
      body: JSON.stringify([{ name: collectionName }]),
    });

    if (createRes.ok) {
      const result = await createRes.json();
      // Returns an object containing { successful: { "0": { key: "ABC12345", ... } } }
      return result.successful['0'].key;
    }

    return null;
  } catch (error) {
    console.error('[Zotero Service] Failed to get/create collection:', error);
    return null;
  }
}

/**
 * Formats and pushes a SuggestedPaper to the user's Zotero Library.
 */
export async function pushToZotero(
  userId: string,
  apiKey: string,
  paper: SuggestedPaper,
  collectionKey?: string
): Promise<boolean> {
  try {
    // 1. Map our SuggestedPaper to Zotero's strict 'journalArticle' schema
    const zoteroItem: Record<string, any> = {
      itemType: 'journalArticle',
      title: paper.title,
      creators: paper.authors.map(parseAuthorName),
      date: paper.year.toString(),
      DOI: paper.doi || '',
      url: paper.url || '',
      collections: collectionKey ? [collectionKey] : [],
    };

    // 2. Post to Zotero API
    const response = await fetch(`${ZOTERO_API_BASE}/users/${userId}/items`, {
      method: 'POST',
      headers: getZoteroHeaders(apiKey),
      body: JSON.stringify([zoteroItem]),
    });

    if (!response.ok) {
      console.error(`[Zotero Service] Failed to push item. Status: ${response.status}`);
      const errorText = await response.text();
      console.error('[Zotero Service] Error details:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Zotero Service] Exception pushing to Zotero:', error);
    return false;
  }
}