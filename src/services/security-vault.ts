/**
 * SecurityVault — In-Memory / Session-Safe BYOK Key Management
 *
 * Provides safe in-memory session key management for web environments.
 * Keys are never logged and can be purged upon locking.
 */

const _sessionKeyMap = new Map<string, string>();
let _isUnlocked = true;

export const SecurityVault = {
  async unlockVault(_pin?: string): Promise<void> {
    _isUnlocked = true;
  },

  get isUnlocked(): boolean {
    return _isUnlocked;
  },

  async saveApiKey(provider: string, key: string): Promise<void> {
    _sessionKeyMap.set(provider, key);
  },

  async getApiKey(provider: string): Promise<string | null> {
    return _sessionKeyMap.get(provider) ?? null;
  },

  async removeApiKey(provider: string): Promise<void> {
    _sessionKeyMap.delete(provider);
  },

  lockVault(): void {
    _isUnlocked = false;
    _sessionKeyMap.clear();
  },
};
