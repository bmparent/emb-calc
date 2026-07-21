PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  learning_enabled INTEGER NOT NULL DEFAULT 0 CHECK (learning_enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_magic_links_email_created
  ON magic_links(email, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS printavo_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credentials_cipher TEXT NOT NULL,
  credentials_iv TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  connected_at TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  renewal_reminder_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  printavo_order_id TEXT,
  printavo_visual_id TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user_updated
  ON saved_jobs(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS learning_outcomes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_event_id TEXT NOT NULL,
  source TEXT NOT NULL,
  model TEXT NOT NULL,
  garment_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  location_count INTEGER NOT NULL,
  heads INTEGER NOT NULL,
  rpm REAL NOT NULL,
  predicted_minutes REAL NOT NULL,
  actual_minutes REAL NOT NULL,
  stitches INTEGER NOT NULL,
  colors INTEGER NOT NULL,
  trims INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_user_created
  ON learning_outcomes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_user_garment
  ON learning_outcomes(user_id, garment_type, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_outcomes_user_event
  ON learning_outcomes(user_id, client_event_id);

CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);
