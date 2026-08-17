-- ============================================================
-- 041_seed_dental_clinic.sql — Dental clinic starter content
--
-- Gives the app a turnkey dental-practice start:
--
--   - `appointment_services`: default dental treatments (cleaning,
--     filling, extraction, root canal, whitening, ...).
--   - `ai_knowledge_documents` + `ai_knowledge_chunks`: starter FAQs
--     (hours, booking, pre/post-op care, payments, emergencies) that
--     power the WhatsApp AI auto-reply.
--
-- New accounts are seeded automatically via an accounts trigger;
-- existing accounts are backfilled once. Both paths guard on "account
-- has no content yet", so re-runs and renamed/edited content are left
-- alone. Content stays editable in Settings → Scheduling / Settings → AI.
--
-- Chunks are inserted with a single `chunk_index 0` per document —
-- the same shape the ingest path produces for short documents; the
-- `fts` column is generated and `embedding` stays NULL (lexical
-- retrieval) until the account configures an embeddings key.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

CREATE OR REPLACE FUNCTION seed_dental_clinic_content(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default dental services (only when the account has none).
  IF NOT EXISTS (
    SELECT 1 FROM appointment_services WHERE account_id = p_account_id
  ) THEN
    INSERT INTO appointment_services (account_id, name, description, duration_minutes)
    VALUES
      (p_account_id, 'Consulta general',     'Evaluación completa del paciente', 30),
      (p_account_id, 'Limpieza dental',      'Profilaxis y pulido dental',        45),
      (p_account_id, 'Empaste (obturación)', 'Restauración de caries',            45),
      (p_account_id, 'Extracción dental',    'Extracción simple o compleja',      30),
      (p_account_id, 'Endodoncia',           'Tratamiento de conducto',           90),
      (p_account_id, 'Blanqueamiento',       'Blanqueamiento profesional',        60),
      (p_account_id, 'Corona o puente',      'Prótesis fija',                     60),
      (p_account_id, 'Revisión / control',   'Cita de seguimiento',               30);
  END IF;

  -- Starter clinic FAQs (only when the account has no knowledge yet).
  IF NOT EXISTS (
    SELECT 1 FROM ai_knowledge_documents WHERE account_id = p_account_id
  ) THEN
    WITH docs AS (
      INSERT INTO ai_knowledge_documents (account_id, title, content)
      VALUES
        (
          p_account_id,
          'Horarios de atención',
          $$Nuestra clínica dental atiende de lunes a viernes de 9:00 a 18:00 y los sábados de 9:00 a 13:00. Estamos cerrados los domingos y días festivos. Para emergencias fuera de horario, contáctanos por WhatsApp y te indicaremos cómo proceder.$$
        ),
        (
          p_account_id,
          'Cómo agendar una cita',
          $$Puedes agendar tu cita escribiéndonos por WhatsApp, llamando a la clínica o directamente desde este chat. Te ofreceremos los horarios disponibles y confirmaremos tu cita con un recordatorio automático el día anterior y dos horas antes.$$
        ),
        (
          p_account_id,
          'Antes de una limpieza dental',
          $$No necesitas preparación especial para una limpieza dental. Te recomendamos mantener tu rutina habitual de cepillado y, si tomas anticoagulantes, avísanos antes de la cita. La limpieza dura aproximadamente 45 minutos.$$
        ),
        (
          p_account_id,
          'Cuidados después de una extracción',
          $$Después de una extracción dental: mantén una gasa sobre la zona durante 30-45 minutos, evita enjuagues fuertes y bebidas calientes las primeras 24 horas, no fumes y evita hacer ejercicio intenso. Aplica hielo en la mejilla si hay inflamación y toma los analgésicos indicados. Si el sangrado continúa o tienes fiebre, contáctanos de inmediato.$$
        ),
        (
          p_account_id,
          'Medios de pago y seguros',
          $$Aceptamos efectivo, tarjetas de débito y crédito, y transferencias. Trabajamos con la mayoría de los seguros dentales; envíanos los datos de tu póliza por WhatsApp y verificaremos tu cobertura antes de la cita. También ofrecemos planes de pago para tratamientos mayores.$$
        ),
        (
          p_account_id,
          'Costo de una consulta',
          $$El costo de la consulta general varía según el tratamiento. Escríbenos por WhatsApp con el motivo de tu visita y te daremos un presupuesto claro y sin compromiso antes de agendar. El presupuesto incluye todos los materiales y el seguimiento.$$
        ),
        (
          p_account_id,
          'Urgencias dentales',
          $$Si tienes una urgencia dental (dolor intenso, inflamación, fractura o sangrado), escríbenos por WhatsApp de inmediato con una foto o descripción del problema. Priorizamos las urgencias el mismo día dentro de nuestro horario de atención.$$
        ),
        (
          p_account_id,
          'Recomendaciones generales',
          $$Recomendamos una revisión dental cada seis meses para detectar problemas a tiempo. Entre visitas: cepíllate al menos dos veces al día, usa hilo dental a diario y limita el consumo de azúcar. Los niños deben comenzar sus revisiones con su primer diente o antes de cumplir un año.$$
        )
      RETURNING id, account_id, content
    )
    INSERT INTO ai_knowledge_chunks (document_id, account_id, chunk_index, content)
    SELECT id, account_id, 0, content FROM docs;
  END IF;
END;
$$;

-- Trigger wrapper: trigger functions take no arguments and read NEW.
CREATE OR REPLACE FUNCTION seed_dental_clinic_content_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_dental_clinic_content(NEW.id);
  RETURN NEW;
END;
$$;

-- New accounts get dental content automatically.
DROP TRIGGER IF EXISTS accounts_seed_dental_clinic ON accounts;
CREATE TRIGGER accounts_seed_dental_clinic
AFTER INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION seed_dental_clinic_content_trigger();

-- Backfill existing accounts (the function guards on empty content).
SELECT seed_dental_clinic_content(id) FROM accounts;
