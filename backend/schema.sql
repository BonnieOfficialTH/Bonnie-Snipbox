-- ============================================================
-- Bonnie-Snipbox: Supabase PostgreSQL Schema
-- ============================================================

-- 1. Collections Table
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  deleted_at BIGINT DEFAULT NULL
);

-- Index for active collections sorted by sort_order
CREATE INDEX IF NOT EXISTS idx_collections_active ON collections (sort_order) WHERE deleted_at IS NULL;

-- 2. Snippets Table
CREATE TABLE IF NOT EXISTS snippets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  icon TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  dynamic_fields JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  deleted_at BIGINT DEFAULT NULL
);

-- Index for active snippets filtered by category
CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets (category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_snippets_active ON snippets (created_at DESC) WHERE deleted_at IS NULL;

-- 3. Row Level Security (RLS)
-- Shared team access: allow full access with anon key (or service role)
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active collections" ON collections
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Allow public insert/update collections" ON collections
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read active snippets" ON snippets
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Allow public insert/update snippets" ON snippets
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial Seed Data
INSERT INTO collections (id, name, color, sort_order)
VALUES
  ('social', 'Social', '#f0a6c1', 1),
  ('work', 'Work', '#8bc9b5', 2),
  ('personal', 'Personal', '#f4c96b', 3),
  ('other', 'Other', '#93b8f4', 4)
ON CONFLICT (id) DO NOTHING;

-- Seed initial snippets
INSERT INTO snippets (id, title, category_id, icon, content, dynamic_fields)
VALUES
  (
    'intro-greeting',
    'Friendly greeting',
    'social',
    '👋',
    'Hello {{name}}, hope you are having a wonderful day!',
    '[{"name": "name", "defaultValue": "friend"}]'::JSONB
  ),
  (
    'work-standup',
    'Daily standup update',
    'work',
    '💼',
    'Yesterday: {{yesterday}}\nToday: {{today}}\nBlockers: {{blockers}}',
    '[{"name": "yesterday", "defaultValue": ""}, {"name": "today", "defaultValue": ""}, {"name": "blockers", "defaultValue": "None"}]'::JSONB
  )
ON CONFLICT (id) DO NOTHING;
