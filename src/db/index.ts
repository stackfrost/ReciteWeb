import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type DrizzleD1Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates a Drizzle database instance from a Cloudflare D1 Database binding.
 */
export function getDb(d1: D1Database): DrizzleD1Database {
  return drizzle(d1, { schema });
}

/**
 * Global fallback / mock instance for local testing & non-Cloudflare execution environments.
 */
export function getFallbackDb() {
  // In Cloudflare Worker environment with global DB or getCloudflareContext
  const globalD1 = (globalThis as any).DB || (globalThis as any).__D1_BETA__;
  if (globalD1) {
    return drizzle(globalD1, { schema });
  }

  // Minimal proxy database to safely handle schema queries during build / static render
  return drizzle({} as D1Database, { schema });
}

export * from './schema';
