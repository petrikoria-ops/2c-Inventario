-- =====================================================================
--  Prevención puede ver Obras activas (solo lectura)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE (ON CONFLICT DO NOTHING): se puede re-ejecutar sin romper
--  nada. Requiere haber corrido antes migration_permisos_granulares.sql.
--
--  Quedaba anotado como pendiente en docs/departamentos/prevencion.md:
--  Prevención necesita saber qué obras están activas para poder planear
--  sus inspecciones, pero el único puesto del departamento
--  (Prevencionista) no tenía el módulo `proyectos` habilitado. Solo
--  ver — crear/modificar/eliminar quedan en false a propósito, Prevención
--  no gestiona obras, solo las consulta.
-- =====================================================================

INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar) VALUES
  ('prevencion', 'Prevencionista', 'proyectos', true, false, false, false)
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
