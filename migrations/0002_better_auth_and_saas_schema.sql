-- ============================================================
-- CiteAssist AI -- Cloudflare D1 Migration 0002
-- Better Auth OAuth Schema & SaaS Telemetry Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS user (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image          TEXT,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  license_status TEXT NOT NULL DEFAULT 'FREE',
  is_banned      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);

CREATE TABLE IF NOT EXISTS session (
  id         TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  token      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id    TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_session_token   ON session(token);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);

CREATE TABLE IF NOT EXISTS account (
  id                       TEXT PRIMARY KEY,
  account_id               TEXT NOT NULL,
  provider_id              TEXT NOT NULL,
  user_id                  TEXT NOT NULL,
  access_token             TEXT,
  refresh_token            TEXT,
  id_token                 TEXT,
  access_token_expires_at  INTEGER,
  refresh_token_expires_at INTEGER,
  scope                    TEXT,
  password                 TEXT,
  created_at               INTEGER NOT NULL,
  updated_at               INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_account_user_id     ON account(user_id);
CREATE INDEX IF NOT EXISTS idx_account_provider_id ON account(provider_id, account_id);

CREATE TABLE IF NOT EXISTS verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);

-- SaaS Tables
CREATE TABLE IF NOT EXISTS license_keys (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  key        TEXT NOT NULL UNIQUE,
  tier       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_license_keys_user_id ON license_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_key     ON license_keys(key);

CREATE TABLE IF NOT EXISTS audit_telemetry (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  action       TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  latency_ms   INTEGER,
  timestamp    INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_telemetry_user_id ON audit_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_telemetry_time    ON audit_telemetry(timestamp);

CREATE TABLE IF NOT EXISTS citation_cache (
  id               TEXT PRIMARY KEY,
  claim_hash       TEXT NOT NULL UNIQUE,
  verified_payload TEXT NOT NULL,
  status           TEXT NOT NULL,
  created_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_citation_cache_hash ON citation_cache(claim_hash);
