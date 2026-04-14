CREATE TABLE IF NOT EXISTS feedback_entries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  feedback_status TEXT NOT NULL,
  author_label TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  linked_item_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (linked_item_id) REFERENCES public_items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_updated_at ON feedback_entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_status ON feedback_entries(feedback_status);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_linked_item_id ON feedback_entries(linked_item_id);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  author_label TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_type, target_id, created_at DESC);
