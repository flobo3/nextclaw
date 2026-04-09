ALTER TABLE marketplace_skill_items
  ADD COLUMN package_name TEXT;

ALTER TABLE marketplace_skill_items
  ADD COLUMN owner_user_id TEXT;

ALTER TABLE marketplace_skill_items
  ADD COLUMN owner_scope TEXT;

ALTER TABLE marketplace_skill_items
  ADD COLUMN skill_name TEXT;

ALTER TABLE marketplace_skill_items
  ADD COLUMN publish_status TEXT NOT NULL DEFAULT 'published';

ALTER TABLE marketplace_skill_items
  ADD COLUMN published_by_type TEXT NOT NULL DEFAULT 'admin';

UPDATE marketplace_skill_items
SET package_name = '@nextclaw/' || slug,
    owner_scope = 'nextclaw',
    skill_name = slug,
    publish_status = 'published',
    published_by_type = 'admin',
    install_spec = '@nextclaw/' || slug,
    install_command = 'nextclaw skills install @nextclaw/' || slug
WHERE package_name IS NULL
   OR owner_scope IS NULL
   OR skill_name IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_skill_items_package_name
  ON marketplace_skill_items(package_name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_skill_items_owner_scope_skill_name
  ON marketplace_skill_items(owner_scope, skill_name);

CREATE INDEX IF NOT EXISTS idx_marketplace_skill_items_publish_status
  ON marketplace_skill_items(publish_status);
