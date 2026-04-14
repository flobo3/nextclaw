CREATE TABLE IF NOT EXISTS public_items (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  public_phase TEXT NOT NULL,
  item_type TEXT NOT NULL,
  source TEXT NOT NULL,
  is_official INTEGER NOT NULL DEFAULT 1,
  tags_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  shipped_at TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  linked_feedback_count INTEGER NOT NULL DEFAULT 0,
  source_metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_public_items_phase ON public_items(public_phase);
CREATE INDEX IF NOT EXISTS idx_public_items_type ON public_items(item_type);
CREATE INDEX IF NOT EXISTS idx_public_items_updated_at ON public_items(updated_at);

CREATE TABLE IF NOT EXISTS item_source_links (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_object_id TEXT NOT NULL UNIQUE,
  provider_url TEXT,
  source_status TEXT NOT NULL,
  source_type TEXT,
  team_key TEXT,
  raw_payload_json TEXT NOT NULL,
  last_synced_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES public_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_source_links_provider ON item_source_links(provider);
CREATE INDEX IF NOT EXISTS idx_item_source_links_item_id ON item_source_links(item_id);
