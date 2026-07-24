-- Zernio-backed social publishing and connected-account tenancy.
CREATE TABLE IF NOT EXISTS zernio_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  zernio_profile_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  zernio_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  profile_url TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, zernio_account_id)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  zernio_post_id TEXT,
  content TEXT,
  media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_for TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'draft',
  error_message TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zernio_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_accounts_account_idx
  ON social_accounts(account_id, platform);
CREATE INDEX IF NOT EXISTS social_posts_account_created_idx
  ON social_posts(account_id, created_at DESC);

ALTER TABLE zernio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zernio_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zernio_profiles_select ON zernio_profiles;
CREATE POLICY zernio_profiles_select ON zernio_profiles FOR SELECT
  USING (is_account_member(account_id, 'viewer'));
DROP POLICY IF EXISTS zernio_profiles_manage ON zernio_profiles;
CREATE POLICY zernio_profiles_manage ON zernio_profiles FOR ALL
  USING (is_account_member(account_id, 'admin'))
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS social_accounts_select ON social_accounts;
CREATE POLICY social_accounts_select ON social_accounts FOR SELECT
  USING (is_account_member(account_id, 'viewer'));
DROP POLICY IF EXISTS social_accounts_manage ON social_accounts;
CREATE POLICY social_accounts_manage ON social_accounts FOR ALL
  USING (is_account_member(account_id, 'admin'))
  WITH CHECK (is_account_member(account_id, 'admin'));

DROP POLICY IF EXISTS social_posts_select ON social_posts;
CREATE POLICY social_posts_select ON social_posts FOR SELECT
  USING (is_account_member(account_id, 'viewer'));
DROP POLICY IF EXISTS social_posts_insert ON social_posts;
CREATE POLICY social_posts_insert ON social_posts FOR INSERT
  WITH CHECK (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS social_posts_update ON social_posts;
CREATE POLICY social_posts_update ON social_posts FOR UPDATE
  USING (is_account_member(account_id, 'agent'));

-- Webhook events are service-role only. No authenticated-user policy.
NOTIFY pgrst, 'reload schema';

