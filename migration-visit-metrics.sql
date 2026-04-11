-- ============================================================
-- Visit Metrics: Precepting Entries + Room Time Entries
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Precepting Entries table
CREATE TABLE IF NOT EXISTS precepting_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attending_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_level TEXT NOT NULL DEFAULT '99214',
  attending_in_room BOOLEAN NOT NULL DEFAULT false,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0
);

-- 2. Room Time Entries table
CREATE TABLE IF NOT EXISTS room_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_level TEXT NOT NULL DEFAULT '99214',
  elapsed_seconds INTEGER NOT NULL DEFAULT 0
);

-- 3. RLS for precepting_entries
ALTER TABLE precepting_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read precepting_entries"
  ON precepting_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert precepting_entries"
  ON precepting_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own precepting_entries"
  ON precepting_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can delete own precepting_entries"
  ON precepting_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 4. RLS for room_time_entries
ALTER TABLE room_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read room_time_entries"
  ON room_time_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert room_time_entries"
  ON room_time_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own room_time_entries"
  ON room_time_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can delete own room_time_entries"
  ON room_time_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- 5. Seed permission keys (admin=full, faculty=none, resident=none)
INSERT INTO role_permissions (role, permission_key, access_level) VALUES
  ('admin',    'visit_metrics.view', 'full'),
  ('admin',    'visit_metrics.edit', 'full'),
  ('faculty',  'visit_metrics.view', 'none'),
  ('faculty',  'visit_metrics.edit', 'none'),
  ('resident', 'visit_metrics.view', 'none'),
  ('resident', 'visit_metrics.edit', 'none')
ON CONFLICT (role, permission_key) DO NOTHING;
