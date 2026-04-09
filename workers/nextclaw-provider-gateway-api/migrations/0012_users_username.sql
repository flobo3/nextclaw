-- Username uniqueness is enforced in application logic for now.
-- Add the column first; the durable DB-level unique constraint can be
-- introduced later once the remote platform database has writable headroom.
ALTER TABLE users
  ADD COLUMN username TEXT;
