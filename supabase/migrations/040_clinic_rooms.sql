-- ============================================================
-- 040_clinic_rooms.sql — Dental clinic rooms (physical operatories)
--
-- Turns the appointment calendar into a room-aware board so the
-- clinic can see, at a glance, which patient is in which room.
--
--   - `clinic_rooms`: account-owned physical rooms (e.g. Room 1/2/3)
--     with a display color and ordering.
--   - `appointments.room_id`: optional room assignment. Null keeps
--     WhatsApp/automation bookings "unassigned" until staff assigns
--     them in the calendar.
--   - A GiST exclusion constraint prevents two active appointments
--     from claiming the same room at the same time (same pattern as
--     the existing staff no-overlap guard in migration 037).
--   - New accounts are auto-seeded with three default rooms; existing
--     accounts are backfilled once (only if they have no rooms yet,
--     so renamed rooms are never re-created on a re-run).
--
-- RLS mirrors appointment_services: any member may read, admin+ may
-- write. Service-role workers bypass these policies.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS clinic_rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#0ea5e9',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uniqueness per account + name makes the seed idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_rooms_account_name
  ON clinic_rooms (account_id, name);
CREATE INDEX IF NOT EXISTS idx_clinic_rooms_account_sort
  ON clinic_rooms (account_id, sort_order);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES clinic_rooms(id) ON DELETE SET NULL;

-- Room occupancy guard: the database, not a preflight query, is the
-- final conflict guard (mirrors appointments_staff_no_overlap).
-- NULL room_id rows never conflict (NULL = NULL is not true in GiST).
DO $$ BEGIN
  ALTER TABLE appointments ADD CONSTRAINT appointments_room_no_overlap
    EXCLUDE USING gist (
      room_id WITH =,
      tstzrange(starts_at, ends_at, '[)') WITH &&
    ) WHERE (status IN ('pending', 'confirmed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_room_start
  ON appointments (account_id, room_id, starts_at);

-- New accounts receive three default rooms.
CREATE OR REPLACE FUNCTION seed_default_clinic_rooms()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO clinic_rooms (account_id, name, color, sort_order)
  VALUES
    (NEW.id, 'Room 1', '#0ea5e9', 0),
    (NEW.id, 'Room 2', '#10b981', 1),
    (NEW.id, 'Room 3', '#f59e0b', 2)
  ON CONFLICT (account_id, name) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS accounts_seed_clinic_rooms ON accounts;
CREATE TRIGGER accounts_seed_clinic_rooms
AFTER INSERT ON accounts FOR EACH ROW EXECUTE FUNCTION seed_default_clinic_rooms();

-- Backfill existing accounts — but only when they have no rooms yet,
-- so an account that renamed/deleted its defaults is left alone.
INSERT INTO clinic_rooms (account_id, name, color, sort_order)
SELECT a.id, r.name, r.color, r.sort_order
FROM accounts a
CROSS JOIN (
  VALUES
    ('Room 1', '#0ea5e9', 0),
    ('Room 2', '#10b981', 1),
    ('Room 3', '#f59e0b', 2)
) AS r(name, color, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM clinic_rooms c WHERE c.account_id = a.id)
ON CONFLICT (account_id, name) DO NOTHING;

-- Account-scoped RLS.
ALTER TABLE clinic_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clinic_rooms_select ON clinic_rooms;
CREATE POLICY clinic_rooms_select ON clinic_rooms FOR SELECT
  USING (is_account_member(account_id, 'viewer'::account_role_enum));

DROP POLICY IF EXISTS clinic_rooms_write ON clinic_rooms;
CREATE POLICY clinic_rooms_write ON clinic_rooms FOR ALL
  USING (is_account_member(account_id, 'admin'::account_role_enum))
  WITH CHECK (is_account_member(account_id, 'admin'::account_role_enum));
