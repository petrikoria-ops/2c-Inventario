-- =====================================================================
--  Solicitudes de compra — vínculo real a la obra
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE (ADD COLUMN IF NOT EXISTS): se puede re-ejecutar sin
--  romper nada.
--
--  Hasta ahora una solicitud de compra no tenía ninguna referencia real a
--  la obra que la originó (el campo `obra` que aparece en types/index.ts y
--  en app/api/solicitudes/route.ts es texto libre y hoy ningún formulario
--  lo completa). Esto agrega `proyecto_id` como referencia real a
--  `proyectos`, para que el panel de una obra pueda listar sus propias
--  solicitudes de compra en vez de depender de que alguien tipeé el
--  nombre correcto.
--
--  Nullable a propósito: una solicitud sigue pudiendo no estar ligada a
--  ninguna obra (compra general de bodega), igual que antes.
-- =====================================================================

ALTER TABLE solicitudes_compra
  ADD COLUMN IF NOT EXISTS proyecto_id BIGINT REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_solicitudes_compra_proyecto ON solicitudes_compra(proyecto_id);

-- =====================================================================
--  FIN.
-- =====================================================================
