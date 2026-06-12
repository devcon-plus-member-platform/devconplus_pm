-- GitHub Connections: one row per connected repo
CREATE TABLE IF NOT EXISTS github_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE SET NULL,
  repo_full_name  text NOT NULL,
  webhook_secret  text NOT NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- GitHub Events: one row per webhook event received
CREATE TABLE IF NOT EXISTS github_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id     uuid NOT NULL REFERENCES github_connections(id) ON DELETE CASCADE,
  event_type        text NOT NULL,
  action            text,
  pr_number         int,
  pr_title          text,
  pr_url            text,
  pr_state          text,
  merged            boolean NOT NULL DEFAULT false,
  author_login      text,
  author_avatar_url text,
  branch_from       text,
  branch_to         text,
  repo_full_name    text NOT NULL,
  raw_payload       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS github_events_connection_id_idx ON github_events(connection_id);
CREATE INDEX IF NOT EXISTS github_events_created_at_idx ON github_events(created_at DESC);
CREATE INDEX IF NOT EXISTS github_connections_project_id_idx ON github_connections(project_id);

-- RLS
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all connections/events
CREATE POLICY "auth_read_connections" ON github_connections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_events" ON github_events
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert/delete their own connections
CREATE POLICY "auth_insert_connections" ON github_connections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "auth_delete_connections" ON github_connections
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Webhook endpoint (service role) can insert events
CREATE POLICY "service_insert_events" ON github_events
  FOR INSERT TO service_role WITH CHECK (true);

-- Service role can also insert connections (for any server-side ops)
CREATE POLICY "service_all_connections" ON github_connections
  FOR ALL TO service_role USING (true) WITH CHECK (true);
