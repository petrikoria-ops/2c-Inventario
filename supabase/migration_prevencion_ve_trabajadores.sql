-- =====================================================================
--  Prevención puede ver Trabajadores (solo lectura)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE (ON CONFLICT DO NOTHING): se puede re-ejecutar sin romper
--  nada. Requiere haber corrido antes migration_permisos_granulares.sql.
--
--  docs/departamentos/prevencion.md documentaba esto como "a propósito
--  fuera de alcance salvo que el dueño del negocio confirme que lo
--  necesita" — con la gestión documental de trabajadores
--  (migration_documentos_trabajador.sql) confirmado que sí. Sin este
--  permiso, Prevención no tiene forma de llegar a /trabajadores/[id]
--  para subir/ver sus propios documentos (charla diaria, EPP, examen
--  ocupacional, inducción), aunque esas categorías ya están gateadas
--  aparte por el módulo prevencion_riesgos.
--
--  Solo ver — crear/modificar/eliminar quedan en false: Prevención no
--  gestiona la ficha del trabajador (nombre/RUT/cargo), solo sus propios
--  documentos.
-- =====================================================================

INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar) VALUES
  ('prevencion', 'Prevencionista', 'trabajadores', true, false, false, false)
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
