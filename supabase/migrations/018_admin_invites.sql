-- ============================================================
-- DEVCON+ PM — Multi-admin support + admin invites
-- Migration: 018_admin_invites.sql
-- ============================================================

-- ─── contributors.is_admin ──────────────────────────────────────────────────
ALTER TABLE contributors ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Seed the current admin so they keep access after this migration lands.
UPDATE contributors SET is_admin = true WHERE email = 'rperocho@devcon.ph';

-- ─── Helper: is the current Supabase Auth user an admin? ───────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contributors WHERE email = auth.email() AND is_admin = true
  );
$$;

-- ─── Guard: contributors_write_contributor lets any contributor write any row
-- (see 002_rls_policies.sql). Without this, a contributor could grant
-- themselves admin via a direct client update. Block is_admin changes unless
-- the actor is already an admin, or the write comes from trusted server code
-- (service_role — used by the accept-invite endpoint).
CREATE OR REPLACE FUNCTION prevent_self_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.role() = 'service_role' OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  ELSIF TG_OP = 'INSERT' AND NEW.is_admin IS TRUE THEN
    NEW.is_admin := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contributors_guard_is_admin ON contributors;
CREATE TRIGGER contributors_guard_is_admin
  BEFORE INSERT OR UPDATE ON contributors
  FOR EACH ROW EXECUTE FUNCTION prevent_self_admin_escalation();

-- ─── admin_invites ───────────────────────────────────────────────────────────
-- Pending invitations for new admins. Accessed only via server-side API
-- routes using the service-role client — no anon/authenticated policies.
CREATE TABLE IF NOT EXISTS admin_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  token       text NOT NULL UNIQUE,
  invited_by  uuid REFERENCES contributors(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_invites_token_idx ON admin_invites (token);
