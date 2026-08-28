-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  license_status TEXT CHECK(license_status IN ('free', 'researcher_pro', 'lab_multiseat', 'banned')) DEFAULT 'free',
  is_banned INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. License Keys Table
CREATE TABLE IF NOT EXISTS license_keys (
  key_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tier TEXT CHECK(tier IN ('researcher_pro', 'lab_multiseat')) NOT NULL,
  is_active INTEGER DEFAULT 1,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_license_keys_user ON license_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_active ON license_keys(is_active, expires_at);

-- 3. Audit Telemetry Table
CREATE TABLE IF NOT EXISTS audit_telemetry (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  claims_found INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user ON audit_telemetry(user_email);
CREATE INDEX IF NOT EXISTS idx_telemetry_file ON audit_telemetry(file_hash);

-- 4. Blacklisted Entities Table
CREATE TABLE IF NOT EXISTS blacklisted_entities (
  fingerprint_hash TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
