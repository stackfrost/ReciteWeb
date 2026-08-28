-- ============================================================
-- CiteAssist AI -- Cloudflare D1 Migration 0001
-- Creates the license tracking table for Dodo Payments.
-- Compatible with SQLite dialect (no NOW(), uses unixepoch()).
-- ============================================================

CREATE TABLE IF NOT EXISTS licenses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  email            TEXT    NOT NULL,
  tier             TEXT    NOT NULL CHECK(tier IN ('annual_pro', 'emergency_pass')),
  payment_id       TEXT    NOT NULL UNIQUE,
  payment_provider TEXT    NOT NULL DEFAULT 'dodo',
  token_hash       TEXT,
  expires_at       INTEGER NOT NULL,
  revoked          INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0, 1)),
  created_at       INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_licenses_email      ON licenses(email);
CREATE INDEX IF NOT EXISTS idx_licenses_payment_id ON licenses(payment_id);
