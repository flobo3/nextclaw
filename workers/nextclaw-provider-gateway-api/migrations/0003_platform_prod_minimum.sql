PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  before_json TEXT,
  after_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created_at ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_created_at_id ON users(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_usage_ledger_user_created_at_id ON usage_ledger(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_recharge_intents_status_created_at_id ON recharge_intents(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_recharge_intents_user_created_at_id ON recharge_intents(user_id, created_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_ledger_request_id_unique
  ON usage_ledger(request_id)
  WHERE request_id IS NOT NULL;
