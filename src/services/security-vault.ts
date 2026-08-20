/**
 * SecurityVault — Encrypted BYOK Key Management
 *
 * Architecture:
 *   • Tauri Desktop: Keys live exclusively in the OS-level
 *     Stronghold encrypted vault (libsodium XSalsa20-Poly1305).
 *     They are NEVER written to IndexedDB or localStorage.
 *
 *   • Browser / Dev Mode: Falls back to a session-only in-memory
 *     Map so the app remains functional without Tauri.
 *     No key persistence occurs — keys are lost on page unload.
 *
 * All public methods are async and isomorphic: callers do not need
 * to know which backend is active.
 */

// ─────────────────────────────────────────────────────────────────────────────
// § CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const VAULT_CLIENT_PATH  = 'recite';
const VAULT_STORE_NAME   = 'api-keys';

// ─────────────────────────────────────────────────────────────────────────────
// § RUNTIME DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

// ─────────────────────────────────────────────────────────────────────────────
// § IN-MEMORY FALLBACK (Browser / Dev Mode)
// ─────────────────────────────────────────────────────────────────────────────

const _sessionKeyMap = new Map<string, string>();

// ─────────────────────────────────────────────────────────────────────────────
// § TAURI STRONGHOLD BACKEND
// ─────────────────────────────────────────────────────────────────────────────

let _vaultHandle: any = null;
let _storeHandle: any = null;
let _isUnlocked = false;

/**
 * Unlock (or create) the Stronghold vault using the provided PIN.
 * This MUST be called before any save/get operations in Tauri mode.
 *
 * The Vault file lives at:  ${appDataDir}/recite.hold
 */
async function tauriUnlockVault(pin: string): Promise<void> {
  // Dynamically import Tauri Stronghold APIs to prevent SSR/build errors
  const { load }        = await import('@tauri-apps/plugin-stronghold');
  const { appDataDir }  = await import('@tauri-apps/api/path');

  const vaultPath = `${await appDataDir()}/recite.hold`;
  const client    = await load(vaultPath, pin);

  _vaultHandle  = client;
  _storeHandle  = client.getStore(VAULT_STORE_NAME);
  _isUnlocked   = true;
}

async function tauriSaveKey(provider: string, key: string): Promise<void> {
  if (!_storeHandle) throw new Error('VAULT_LOCKED: Call unlockVault() first.');

  const encoder   = new TextEncoder();
  const keyBytes  = encoder.encode(key);

  await _storeHandle.insert(
    `${VAULT_CLIENT_PATH}.${provider}`,
    Array.from(keyBytes)
  );
  await _vaultHandle.save();
}

async function tauriGetKey(provider: string): Promise<string | null> {
  if (!_storeHandle) return null;

  const record = await _storeHandle.get(`${VAULT_CLIENT_PATH}.${provider}`);
  if (!record) return null;

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(record as number[]));
}

async function tauriRemoveKey(provider: string): Promise<void> {
  if (!_storeHandle) return;
  await _storeHandle.remove(`${VAULT_CLIENT_PATH}.${provider}`);
  await _vaultHandle.save();
}

// ─────────────────────────────────────────────────────────────────────────────
// § PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export const SecurityVault = {
  /**
   * Unlock the Stronghold vault with the user's local PIN.
   * In browser/dev mode this is a no-op (returns resolved promise).
   */
  async unlockVault(pin: string): Promise<void> {
    if (!isTauriRuntime()) {
      // Browser fallback: nothing to unlock
      _isUnlocked = true;
      return;
    }
    await tauriUnlockVault(pin);
  },

  /**
   * Whether the vault is currently unlocked and usable.
   */
  get isUnlocked(): boolean {
    return _isUnlocked;
  },

  /**
   * Persist an API key for the given LLM provider.
   *
   * Tauri: Written to Stronghold, never to disk unencrypted.
   * Browser: Written to session-only in-memory Map.
   */
  async saveApiKey(provider: string, key: string): Promise<void> {
    if (isTauriRuntime()) {
      await tauriSaveKey(provider, key);
    } else {
      _sessionKeyMap.set(provider, key);
    }
  },

  /**
   * Retrieve a stored API key.
   * Returns null if not found or vault is locked.
   */
  async getApiKey(provider: string): Promise<string | null> {
    if (isTauriRuntime()) {
      return tauriGetKey(provider);
    }
    return _sessionKeyMap.get(provider) ?? null;
  },

  /**
   * Delete a key from the vault.
   */
  async removeApiKey(provider: string): Promise<void> {
    if (isTauriRuntime()) {
      await tauriRemoveKey(provider);
    } else {
      _sessionKeyMap.delete(provider);
    }
  },

  /**
   * Lock the vault and purge all in-memory key state.
   * Should be called on app minimise / screen lock in the Tauri layer.
   */
  lockVault(): void {
    _vaultHandle  = null;
    _storeHandle  = null;
    _isUnlocked   = false;
    _sessionKeyMap.clear();
  },
};
