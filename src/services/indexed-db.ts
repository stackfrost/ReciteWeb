import { createStore, get, set } from 'idb-keyval';
import type { ValidationResult } from './metadata-cascade';

// Initialize a strictly typed IndexedDB database named `recite-metadata-store`
// with an object store named `citations`.
const customStore = createStore('recite-metadata-store', 'citations');

/**
 * Saves validated citation metadata to the IndexedDB persistence layer.
 */
export async function saveCitationMetadata(key: string, data: ValidationResult): Promise<void> {
  try {
    const normalizedKey = key.trim().toLowerCase();
    await set(normalizedKey, data, customStore);
  } catch (error) {
    console.error(`[IndexedDB] Failed to save metadata for key "${key}":`, error);
  }
}

/**
 * Retrieves validated citation metadata from the IndexedDB persistence layer.
 */
export async function getCitationMetadata(key: string): Promise<ValidationResult | null> {
  try {
    const normalizedKey = key.trim().toLowerCase();
    const data = await get<ValidationResult>(normalizedKey, customStore);
    return data || null;
  } catch (error) {
    console.error(`[IndexedDB] Failed to retrieve metadata for key "${key}":`, error);
    return null;
  }
}
