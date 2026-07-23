-- Native appointment scheduling, availability, reminders, and audit trail.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS scheduling_timezone TEXT NOT NULL DEFAULT 'America/New_York';

DO $$ BEGIN
  CREATE TYPE appointment_status_enum AS ENUM
    ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 1440),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_minutes BETWEEN 0 AND 240),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_minutes BETWEEN 0 AND 240),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_scheduling_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  is_bookable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, user_id)
);

CREATE TABLE IF NOT EXISTS staff_availability_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES staff_scheduling_profiles(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS staff_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES staff_scheduling_profiles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES appointment_services(id) ON DELETE RESTRICT,
  staff_profile_id UUID NOT NULL REFERENCES staff_scheduling_profiles(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  status appointment_status_enum NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'staff' CHECK (source IN ('staff', 'whatsapp', 'automation')),
  notes TEXT,
  cancellation_reason TEXT,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at < ends_at)
);

-- The database, not a race-prone preflight query, is the final conflict guard.
DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT appointments_staff_no_overlap
    EXCLUDE USING gist (
      staff_profile_id WITH =,
      tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status IN ('pending', 'confirmed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS appointment_reminder_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  offset_minutes INTEGER NOT NULL CHECK (offset_minutes BETWEEN 1 AND 525600),
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, offset_minutes)
);

CREATE TABLE IF NOT EXISTS appointment_reminder_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_rule_id UUID NOT NULL REFERENCES appointment_reminder_rules(id) ON DELETE CASCADE,
  appointment_revision INTEGER NOT NULL,
  run_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  whatsapp_message_id TEXT,
  error_message TEXT,
  claimed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, reminder_rule_id, appointment_revision)
);

CREATE TABLE IF NOT EXISTS appointment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_account_start
  ON appointments(account_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_contact_start
  ON appointments(contact_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_availability_staff_weekday
  ON staff_availability_rules(staff_profile_id, weekday);
CREATE INDEX IF NOT EXISTS idx_reminder_jobs_due
  ON appointment_reminder_jobs(COALESCE(next_attempt_at, run_at))
  WHERE status = 'pending';

-- Regenerate reminder jobs whenever an appointment is created or revised.
CREATE OR REPLACE FUNCTION refresh_appointment_reminder_jobs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE appointment_reminder_jobs
  SET status = 'cancelled'
  WHERE appointment_id = NEW.id AND status IN ('pending', 'running');

  IF NEW.status IN ('pending', 'confirmed') THEN
    INSERT INTO appointment_reminder_jobs (
      account_id, appointment_id, reminder_rule_id,
      appointment_revision, run_at
    )
    SELECT NEW.account_id, NEW.id, r.id, NEW.revision,
           NEW.starts_at - make_interval(mins => r.offset_minutes)
    FROM appointment_reminder_rules r
    WHERE r.account_id = NEW.account_id
      AND r.is_active
      AND r.template_id IS NOT NULL
      AND NEW.starts_at - make_interval(mins => r.offset_minutes) > NOW()
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS appointments_refresh_reminders ON appointments;
CREATE TRIGGER appointments_refresh_reminders
AFTER INSERT OR UPDATE OF starts_at, status, revision ON appointments
FOR EACH ROW EXECUTE FUNCTION refresh_appointment_reminder_jobs();

-- New accounts receive inactive defaults until approved utility templates are chosen.
CREATE OR REPLACE FUNCTION seed_default_appointment_reminders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO appointment_reminder_rules (account_id, offset_minutes)
  VALUES (NEW.id, 1440), (NEW.id, 120)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS accounts_seed_appointment_reminders ON accounts;
CREATE TRIGGER accounts_seed_appointment_reminders
AFTER INSERT ON accounts FOR EACH ROW EXECUTE FUNCTION seed_default_appointment_reminders();
INSERT INTO appointment_reminder_rules (account_id, offset_minutes)
SELECT id, offset FROM accounts CROSS JOIN (VALUES (1440), (120)) x(offset)
ON CONFLICT DO NOTHING;

-- Account-scoped RLS. Service-role workers bypass these policies.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointment_services', 'staff_scheduling_profiles',
    'staff_availability_rules', 'staff_availability_exceptions',
    'appointments', 'appointment_reminder_rules',
    'appointment_reminder_jobs', 'appointment_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (is_account_member(account_id, ''viewer''::account_role_enum))',
      t || '_select', t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS appointment_services_write ON appointment_services;
CREATE POLICY appointment_services_write ON appointment_services FOR ALL
  USING (is_account_member(account_id, 'admin')) WITH CHECK (is_account_member(account_id, 'admin'));
DROP POLICY IF EXISTS staff_scheduling_profiles_write ON staff_scheduling_profiles;
CREATE POLICY staff_scheduling_profiles_write ON staff_scheduling_profiles FOR ALL
  USING (is_account_member(account_id, 'admin')) WITH CHECK (is_account_member(account_id, 'admin'));
DROP POLICY IF EXISTS staff_availability_rules_write ON staff_availability_rules;
CREATE POLICY staff_availability_rules_write ON staff_availability_rules FOR ALL
  USING (is_account_member(account_id, 'admin')) WITH CHECK (is_account_member(account_id, 'admin'));
DROP POLICY IF EXISTS staff_availability_exceptions_write ON staff_availability_exceptions;
CREATE POLICY staff_availability_exceptions_write ON staff_availability_exceptions FOR ALL
  USING (is_account_member(account_id, 'admin')) WITH CHECK (is_account_member(account_id, 'admin'));
DROP POLICY IF EXISTS appointments_write ON appointments;
CREATE POLICY appointments_write ON appointments FOR ALL
  USING (is_account_member(account_id, 'agent')) WITH CHECK (is_account_member(account_id, 'agent'));
DROP POLICY IF EXISTS appointment_reminder_rules_write ON appointment_reminder_rules;
CREATE POLICY appointment_reminder_rules_write ON appointment_reminder_rules FOR ALL
  USING (is_account_member(account_id, 'admin')) WITH CHECK (is_account_member(account_id, 'admin'));
