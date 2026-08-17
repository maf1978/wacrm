-- ============================================================
-- 042_clinic_services.sql — Dr. [Clinic] core service menu
--
-- Adds the practice's core 30-minute services to EVERY existing
-- account that doesn't already have them (per account + service
-- name), and to every new account via the 041 trigger seed (which
-- now carries the same three services). The 041 backfill guard only
-- seeds accounts with *no* services, so accounts that already ran the
-- old 8-service seed need this targeted insert to pick up the new
-- menu without touching their existing rows.
--
-- Idempotent — safe to run multiple times. Duplicates by name are
-- never created; any pre-existing service with the same name (e.g. an
-- older 'Limpieza dental') is left alone and can be deactivated in
-- Settings → Scheduling.
-- ============================================================

INSERT INTO appointment_services (account_id, name, description, duration_minutes)
SELECT a.id, s.name, s.description, s.duration_minutes
FROM accounts a
CROSS JOIN (
  VALUES
    ('Visita inicial',          'Primera evaluación completa del paciente', 30),
    ('Limpieza',                'Profilaxis y pulido dental',               30),
    ('Extracción / Root canal', 'Extracción dental o tratamiento de conducto', 30)
) AS s(name, description, duration_minutes)
WHERE NOT EXISTS (
  SELECT 1
  FROM appointment_services sv
  WHERE sv.account_id = a.id
    AND sv.name = s.name
);
