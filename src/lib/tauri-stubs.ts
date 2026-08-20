/**
 * tauri-stubs.ts
 *
 * Browser/Next.js build-time stubs for Tauri runtime packages.
 * These are aliased via next.config.ts webpack.resolve.alias so that
 * @tauri-apps/plugin-stronghold and @tauri-apps/api/path resolve to
 * no-ops during the static Next.js export.
 *
 * At Tauri runtime the isTauriRuntime() guard in security-vault.ts
 * prevents these stubs from ever being invoked.
 */

// ─────────────────────────────────────────────────────────────────────────────
// @tauri-apps/plugin-stronghold stubs
// ─────────────────────────────────────────────────────────────────────────────

export async function load(_path: string, _password: string): Promise<never> {
  throw new Error('[ReciteAI] Stronghold is only available inside the Tauri desktop shell.');
}

// ─────────────────────────────────────────────────────────────────────────────
// @tauri-apps/api/path stubs
// ─────────────────────────────────────────────────────────────────────────────

export async function appDataDir(): Promise<never> {
  throw new Error('[ReciteAI] appDataDir() is only available inside the Tauri desktop shell.');
}
