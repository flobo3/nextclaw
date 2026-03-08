PRAGMA foreign_keys = ON;

CREATE TRIGGER IF NOT EXISTS trg_usage_ledger_block_update
BEFORE UPDATE ON usage_ledger
BEGIN
  SELECT RAISE(FAIL, 'usage_ledger is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_usage_ledger_block_delete
BEFORE DELETE ON usage_ledger
BEGIN
  SELECT RAISE(FAIL, 'usage_ledger is immutable');
END;
