import { clearWorkspaceFromIdb } from '@/services/local-fs';
import { useReciteStore } from '@/lib/store';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

/**
 * Irrevocably purges all air-gapped local storage, tokens, preferences,
 * and IndexedDB workspace files from the client browser.
 */
export async function purgeAllLocalData(): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Clear IndexedDB workspace files
  try {
    await clearWorkspaceFromIdb();
  } catch (err) {
    console.warn('[AccountCleanup] Error clearing IndexedDB:', err);
  }

  // 2. Clear LocalStorage keys
  const keysToRemove = [
    'citeassist_pro_token',
    'citeassist_pro_tier',
    'recite_theme',
    'recite-theme',
    'recite_last_workspace_path',
    'recite_last_active_file',
    'recite_machine_id',
    'recite_device_fp',
    'reciteai-user-settings',
    'recite_active_workspace',
  ];

  try {
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    // Also remove any workspace cache keys
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (key.startsWith('recite_cache_') || key.startsWith('citeassist_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.warn('[AccountCleanup] Error clearing localStorage:', err);
  }

  // 3. Reset in-memory Zustand stores
  try {
    useWorkspaceStore.getState().resetWorkspace();
    useReciteStore.getState().unmountWorkspace();
    useReciteStore.getState().setRawText('');
    useReciteStore.getState().setParsedText('');
  } catch (err) {
    console.warn('[AccountCleanup] Error resetting Zustand stores:', err);
  }
}
