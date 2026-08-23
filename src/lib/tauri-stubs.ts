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

export async function invoke<T>(_cmd: string, _args?: unknown): Promise<T> {
  throw new Error('[ReciteAI] invoke() is only available inside the Tauri desktop shell.');
}

// ─────────────────────────────────────────────────────────────────────────────
// @tauri-apps/plugin-dialog stubs
// ─────────────────────────────────────────────────────────────────────────────

export async function open(_options?: any): Promise<string | null> {
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// @tauri-apps/plugin-fs stubs
// ─────────────────────────────────────────────────────────────────────────────

export async function readDir(_path: string, _options?: any): Promise<any[]> {
  return [];
}

export async function readTextFile(_path: string): Promise<string> {
  return '';
}

export async function writeTextFile(_path: string, _contents: string): Promise<void> {}

export async function watch(
  _paths: any,
  _cb: (event: any) => void,
  _options?: any
): Promise<() => void> {
  return () => {};
}

export async function watchImmediate(
  _paths: any,
  _cb: (event: any) => void,
  _options?: any
): Promise<() => void> {
  return () => {};
}


