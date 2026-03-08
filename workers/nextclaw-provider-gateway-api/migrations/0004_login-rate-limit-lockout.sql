PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_security (
  user_id TEXT PRIMARY KEY,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  login_locked_until TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_security_locked_until ON user_security(login_locked_until);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  ip TEXT,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created_at ON login_attempts(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created_at ON login_attempts(email, created_at DESC);
