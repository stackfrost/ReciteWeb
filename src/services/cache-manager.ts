import { saveFileToDisk, readTextFileSafely } from './local-fs';

const CACHE_FILE = '.recite_cache.json';

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
    const filePath = `${workspacePath}/${CACHE_FILE}`;
    await saveFileToDisk(filePath, JSON.stringify(findings, null, 2));
  } catch (err) {
    console.warn('[CacheManager] Failed to write cache:', err);
  }
}

export async function readReciteCache(workspacePath: string): Promise<CachedFinding[] | null> {
  try {
    const filePath = `${workspacePath}/${CACHE_FILE}`;
    const raw = await readTextFileSafely(filePath);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}
