-- =====================================================================
--  Tareas asignadas — visibilidad de equipo para jefatura
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE (CREATE OR REPLACE / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada. Requiere haber corrido antes
--  migration_tareas_asignadas.sql.
--
--  Qué cambia: hoy la política "leer_mis_tareas" solo deja ver a cada
--  usuario las tareas donde él es asignado_por o asignado_a — un Jefe de
--  departamento no podía ver las tareas abiertas del resto de su equipo,
--  solo las que él mismo asignó o le asignaron a él. Esto amplía el SELECT
--  (nunca el UPDATE/DELETE, que siguen igual de acotados) para que además
--  puedan verse las tareas de:
--    · Gerencia (master) y Administración de software: todas las tareas.
--    · Jefe de departamento (administrador): las de cualquier persona de
--      su mismo departamento (asignada por o hacia esa persona).
--  Supervisor/Maestro/Ayudante (modificador/maestro) no ganan nada nuevo:
--  siguen viendo solo lo propio, igual que antes.
-- =====================================================================

CREATE OR REPLACE FUNCTION mi_equipo_incluye(target_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT
       me.nivel_acceso IN ('master', 'admin_software')
       OR (me.nivel_acceso = 'administrador' AND me.departamento = otro.departamento)
     FROM perfiles me, perfiles otro
     WHERE me.id = auth.uid() AND me.activo = true
       AND otro.id = target_id AND otro.activo = true),
    false
  );
$$;

DROP POLICY IF EXISTS "leer_mis_tareas" ON tareas_asignadas;
CREATE POLICY "leer_mis_tareas" ON tareas_asignadas
  FOR SELECT TO authenticated
  USING (
    asignado_por = auth.uid() OR asignado_a = auth.uid()
    OR mi_equipo_incluye(asignado_a) OR mi_equipo_incluye(asignado_por)
  );

-- =====================================================================
--  FIN.
-- =====================================================================
