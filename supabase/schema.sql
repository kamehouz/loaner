-- Dinio Lending Tracker — Supabase schema
-- Run this entire file in your Supabase project's SQL Editor

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loans (
  id          TEXT PRIMARY KEY,
  received    TEXT,
  name        TEXT NOT NULL DEFAULT '',
  phone       TEXT DEFAULT '',
  seller      TEXT DEFAULT '',
  model       TEXT DEFAULT '',
  amount      NUMERIC DEFAULT 0,
  intake      TEXT,
  docs        TEXT DEFAULT 'Pending',
  submitted   TEXT,
  contact     TEXT DEFAULT '',
  status      TEXT DEFAULT 'lead',
  decision    TEXT DEFAULT 'Pending',
  close       TEXT,
  follow      TEXT,
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- App config stores JSON blobs: columns, statuses, trail confirmations
CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Access is controlled by URL (anon key). All operations are permitted.

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select loans"  ON loans;
DROP POLICY IF EXISTS "Public insert loans"  ON loans;
DROP POLICY IF EXISTS "Public update loans"  ON loans;
DROP POLICY IF EXISTS "Public delete loans"  ON loans;
DROP POLICY IF EXISTS "Public select config" ON app_config;
DROP POLICY IF EXISTS "Public insert config" ON app_config;
DROP POLICY IF EXISTS "Public update config" ON app_config;

CREATE POLICY "Public select loans"  ON loans FOR SELECT USING (true);
CREATE POLICY "Public insert loans"  ON loans FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update loans"  ON loans FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete loans"  ON loans FOR DELETE USING (true);

CREATE POLICY "Public select config" ON app_config FOR SELECT USING (true);
CREATE POLICY "Public insert config" ON app_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update config" ON app_config FOR UPDATE USING (true) WITH CHECK (true);

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Also enable realtime in the Supabase dashboard:
--   Table Editor → loans → Enable Realtime
--   Table Editor → app_config → Enable Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE loans;
ALTER PUBLICATION supabase_realtime ADD TABLE app_config;
