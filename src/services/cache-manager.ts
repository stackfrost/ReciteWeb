import { saveFileToDisk, readTextFileSafely, createDirSafely, fileExists } from './local-fs';
import type { AuditFinding } from '@/types/audit';
import type { Claim } from '@/lib/store';

const RECITE_DIR = '.recite';
const CACHE_FILE = 'audit-cache.json';

export interface AuditCachePayload {
  version: number;
  workspacePath: string;
  activeTexPath: string;
  manuscriptHash: string;
  lastModified: string;
  findings: AuditFinding[];
  claims: Claim[];
}

export interface CacheReadResult {
  hit: boolean;
  isFresh: boolean;
  cachedHash?: string;
  currentHash?: string;
  timestamp?: string;
  findings: AuditFinding[];
  claims: Claim[];
}

/**
 * Computes deterministic SHA-256 hash of manuscript string.
 */
export async function computeContentHash(content: string): Promise<string> {
  if (!content) return 'empty_hash';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback if crypto.subtle throws
    }
  }

  // Fast deterministic FNV-1a hash fallback
  let h = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    h ^= content.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv_${(h >>> 0).toString(16)}_${content.length}`;
}

/**
 * Writes audit findings and claims to `<workspace>/.recite/audit-cache.json`
 */
export async function writeAuditCache(
  workspacePath: string,
  activeTexPath: string,
  texContent: string,
  findings: AuditFinding[],
  claims: Claim[]
): Promise<boolean> {
  if (!workspacePath) return false;

  try {
    const manuscriptHash = await computeContentHash(texContent);
    const payload: AuditCachePayload = {
      version: 1,
      workspacePath,
      activeTexPath: activeTexPath || 'main.tex',
      manuscriptHash,
      lastModified: new Date().toISOString(),
      findings,
      claims,
    };

    const serialized = JSON.stringify(payload, null, 2);

    // 1. In Tauri Desktop mode: ensure .recite dir and save to disk
    const normalizedDir = workspacePath.replace(/\\/g, '/').replace(/\/$/, '');
    const reciteFolderPath = `${normalizedDir}/${RECITE_DIR}`;
    const cacheFilePath = `${reciteFolderPath}/${CACHE_FILE}`;

    await createDirSafely(reciteFolderPath);
    const writtenToDisk = await saveFileToDisk(cacheFilePath, serialized);

    // 2. Web / LocalStorage backup
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`recite_cache_${workspacePath}`, serialized);
      } catch {}
    }

    return writtenToDisk;
  } catch (err) {
    console.warn('[CacheManager] Failed to write audit cache:', err);
    return false;
  }
}

/**
 * Reads audit cache from `<workspace>/.recite/audit-cache.json` and verifies hash against current manuscript text.
 */
export async function readAuditCache(
  workspacePath: string,
  currentTexContent: string
): Promise<CacheReadResult> {
  const emptyResult: CacheReadResult = {
    hit: false,
    isFresh: false,
    findings: [],
    claims: [],
  };

  if (!workspacePath) return emptyResult;

  try {
    const normalizedDir = workspacePath.replace(/\\/g, '/').replace(/\/$/, '');
    const cacheFilePath = `${normalizedDir}/${RECITE_DIR}/${CACHE_FILE}`;

    let raw = await readTextFileSafely(cacheFilePath);

    // Fallback to localStorage if disk read returned null (e.g. web demo mode)
    if (!raw && typeof window !== 'undefined' && window.localStorage) {
      raw = localStorage.getItem(`recite_cache_${workspacePath}`);
    }

    if (!raw) return emptyResult;

    const payload: AuditCachePayload = JSON.parse(raw);
    if (!payload || !payload.findings) return emptyResult;

    const currentHash = await computeContentHash(currentTexContent);
    const isFresh = payload.manuscriptHash === currentHash;

    if (isFresh) {
      return {
        hit: true,
        isFresh: true,
        cachedHash: payload.manuscriptHash,
        currentHash,
        timestamp: payload.lastModified,
        findings: payload.findings || [],
        claims: payload.claims || [],
      };
    } else {
      // Document changed since cache: retain only user's unresolved integrity warnings / manual claims
      const integrityClaims = (payload.claims || []).filter(
        (c) => c.streamType === 'integrity' || c.status === 'dismissed' || c.status === 'accepted'
      );
      const integrityFindings = (payload.findings || []).filter(
        (f) => f.category === 'bib_mismatch' || f.status === 'resolved' || f.status === 'dismissed'
      );

      return {
        hit: true,
        isFresh: false,
        cachedHash: payload.manuscriptHash,
        currentHash,
        timestamp: payload.lastModified,
        findings: integrityFindings,
        claims: integrityClaims,
      };
    }
  } catch (err) {
    console.warn('[CacheManager] Error reading audit cache:', err);
    return emptyResult;
  }
}

// ── Legacy Compatibility Wrappers ─────────────────────────────────────────────
const LEGACY_CACHE_FILE = '.recite_cache.json';

export interface CachedFinding {
  id: string;
  fileId: string;
  line: number;
  index: number;
  length: number;
  claim: string;
  type: 'Needs Literature' | 'Missing Citation' | 'Unused Reference';
  severity: 'Critical' | 'Medium' | 'Low';
  resolved?: boolean;
}

export async function writeReciteCache(workspacePath: string, findings: CachedFinding[]): Promise<void> {
  try {
    const filePath = `${workspacePath}/${LEGACY_CACHE_FILE}`;
    await saveFileToDisk(filePath, JSON.stringify(findings, null, 2));
  } catch (err) {
    console.warn('[CacheManager] Failed to write legacy cache:', err);
  }
}

export async function readReciteCache(workspacePath: string): Promise<CachedFinding[] | null> {
  try {
    const filePath = `${workspacePath}/${LEGACY_CACHE_FILE}`;
    const raw = await readTextFileSafely(filePath);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

