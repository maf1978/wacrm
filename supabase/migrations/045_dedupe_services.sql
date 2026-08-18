-- ============================================================
-- 045_dedupe_services.sql — Deduplicate the GutiDental service menu
--
-- An earlier seed run left the account with a mixed menu: the new
-- core services (Visita inicial / Limpieza / Extracción / Root canal)
-- alongside legacy duplicates from the old seed (Consulta general /
-- Limpieza dental / Extracción dental / Revisión / control) and a few
-- typos ('limpieza', 'Extracion', '15 min consulacion').
--
-- This migration:
--   1. Deactivates the legacy duplicates by name — they stay hidden
--      from the pickers but are NOT deleted (appointments reference
--      these rows; deactivation is reversible in Settings → Scheduling).
--   2. Fixes the typo'd service names.
--
-- Name-based and idempotent — safe to run multiple times, on any
-- project (fresh installs have no matching rows, so it no-ops).
-- ============================================================

-- 1) Deactivate legacy duplicates (kept hidden, not deleted).
UPDATE appointment_services
SET is_active = false,
    updated_at = now()
WHERE name IN (
  'Consulta general',    -- dup of Visita inicial
  'Limpieza dental',     -- dup of Limpieza
  'Extracción dental',   -- dup of Extracción / Root canal
  'Revisión / control'   -- dup of Visita inicial
)
AND is_active = true;

-- 2) Fix typos from the earlier seed run.
UPDATE appointment_services
SET name = 'Limpieza',
    updated_at = now()
WHERE name = 'limpieza';

UPDATE appointment_services
SET name = 'Extracción / Root canal',
    updated_at = now()
WHERE name = 'Extracion';

UPDATE appointment_services
SET name = 'Consulta 15 min',
    updated_at = now()
WHERE name = '15 min consulacion';
