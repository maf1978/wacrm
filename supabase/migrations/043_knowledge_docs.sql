-- ============================================================
-- 043_knowledge_docs.sql — GutiDental knowledge base documents
--
-- The original 041 seed never applied to some existing accounts
-- (its first revision failed with a dollar-quote syntax error), so
-- their knowledge base is empty ("No documents yet"). This migration
-- replaces the FAQ portion of `seed_dental_clinic_content` with the
-- clinic's actual operating facts and backfills every account that
-- has no knowledge documents yet.
--
-- The same function name keeps the existing accounts trigger working:
-- any NEW account is seeded with this richer set automatically.
--
-- Docs are inserted with a single `chunk_index 0` per document (the
-- ingest path's shape for short docs); `fts` is generated, `embedding`
-- stays NULL so lexical (keyword) search works with no extra setup.
-- An embeddings key in Settings → AI turns on semantic search.
--
-- Idempotent — safe to run multiple times. Accounts that already
-- have documents are never touched.
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
      (p_account_id, 'Visita inicial',           'Primera evaluación completa del paciente', 30),
      (p_account_id, 'Limpieza',                 'Profilaxis y pulido dental',               30),
      (p_account_id, 'Extracción / Root canal',  'Extracción dental o tratamiento de conducto', 30);
  END IF;

  -- Knowledge base documents (only when the account has none).
  IF NOT EXISTS (
    SELECT 1 FROM ai_knowledge_documents WHERE account_id = p_account_id
  ) THEN
    WITH docs AS (
      INSERT INTO ai_knowledge_documents (account_id, title, content)
      VALUES
        (
          p_account_id,
          'Horarios de atención',
          $faq$Nuestra clínica dental GutiDental atiende de 9:00 AM a 7:00 PM. Escríbenos por WhatsApp para confirmar disponibilidad para hoy o los próximos días.$faq$
        ),
        (
          p_account_id,
          'Cómo agendar una cita',
          $faq$Hacemos citas por WhatsApp. El paciente nos escribe su nombre y el motivo de la visita y, si el horario solicitado está disponible, reservamos la cita y la confirmamos con recordatorio automático el día anterior y dos horas antes.$faq$
        ),
        (
          p_account_id,
          'Atención sin seguro',
          $faq$Sí, atendemos pacientes sin seguro. Pueden agendar una cita normal por WhatsApp; el pago se coordina directamente en la clínica.$faq$
        ),
        (
          p_account_id,
          'Seguros dentales',
          $faq$Aceptamos la mayoría de los seguros dentales, pero hay que chequear qué beneficios tiene el paciente para la parte dental antes de la cita. Pedimos los datos de la póliza por WhatsApp y verificamos la cobertura sin compromiso.$faq$
        ),
        (
          p_account_id,
          'Servicios de la clínica',
          $faq$Ofrecemos 4 servicios principales: 1) Exámenes dentales, 2) Limpieza dental, 3) Tratamiento de caries y 4) Empastes y reparación. También realizamos endodoncia y odontología cosmética.$faq$
        ),
        (
          p_account_id,
          'Urgencias dentales',
          $faq$Si un paciente tiene dolor intenso, inflamación, fractura o sangrado, que nos escriba por WhatsApp de inmediato con una descripción del problema. Priorizamos las urgencias dentro de nuestro horario de 9:00 AM a 7:00 PM.$faq$
        ),
        (
          p_account_id,
          'Ubicación de la clínica',
          $faq$Estamos en Hialeah, FL. Enviamos la ubicación exacta y las indicaciones por WhatsApp al confirmar la cita.$faq$
        ),
        (
          p_account_id,
          'Cuidados después de una extracción',
          $faq$Después de una extracción dental: mantener una gasa sobre la zona durante 30-45 minutos, evitar enjuagues fuertes y bebidas calientes las primeras 24 horas, no fumar y evitar ejercicio intenso. Aplicar hielo en la mejilla si hay inflamación y tomar los analgésicos indicados. Si el sangrado continúa o hay fiebre, contactar a la clínica de inmediato.$faq$
        ),
        (
          p_account_id,
          'Recomendaciones generales',
          $faq$Recomendamos una revisión dental cada seis meses para detectar problemas a tiempo. Entre visitas: cepillarse al menos dos veces al día, usar hilo dental a diario y limitar el consumo de azúcar. Los niños deben comenzar sus revisiones con su primer diente o antes de cumplir un año.$faq$
        )
      RETURNING id, account_id, content
    )
    INSERT INTO ai_knowledge_chunks (document_id, account_id, chunk_index, content)
    SELECT id, account_id, 0, content FROM docs;
  END IF;
END;
$$;

-- Trigger wrapper stays unchanged; the function above now carries the
-- richer document set for new accounts.
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

DROP TRIGGER IF EXISTS accounts_seed_dental_clinic ON accounts;
CREATE TRIGGER accounts_seed_dental_clinic
AFTER INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION seed_dental_clinic_content_trigger();

-- Backfill existing accounts (the function guards on empty content).
SELECT seed_dental_clinic_content(id) FROM accounts;
