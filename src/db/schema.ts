import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ============================================================================
// Better Auth Core Tables (Cloudflare D1 / SQLite Dialect)
// ============================================================================

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  // Custom Appends per Specification (Phase 1 Auth & UI Reboot)
  licenseStatus: text('license_status').default('FREE').notNull(),
  isBanned: integer('is_banned', { mode: 'boolean' }).default(false).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ============================================================================
// SaaS Business & Telemetry Tables
// ============================================================================

export const licenseKeys = sqliteTable('license_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  key: text('key').notNull().unique(),
  tier: text('tier').notNull(), // 'annual_pro' | 'emergency_pass'
  status: text('status').notNull().default('active'), // 'active' | 'expired' | 'revoked'
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const auditTelemetry = sqliteTable('audit_telemetry', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // 'audit_deterministic' | 'audit_entailment' | 'export_dossier'
  creditsUsed: integer('credits_used').notNull().default(1),
  latencyMs: integer('latency_ms'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export const citationCache = sqliteTable('citation_cache', {
  id: text('id').primaryKey(),
  claimHash: text('claim_hash').notNull().unique(),
  verifiedPayload: text('verified_payload').notNull(), // JSON stringified verification results
  status: text('status').notNull(), // 'verified' | 'retracted' | 'unresolved'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type LicenseKey = typeof licenseKeys.$inferSelect;
export type AuditTelemetry = typeof auditTelemetry.$inferSelect;
export type CitationCache = typeof citationCache.$inferSelect;
