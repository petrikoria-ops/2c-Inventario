-- =====================================================================
--  Pirámide de roles cross-departamento + licencia SEC + permiso "eliminar"
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Antes de correr esto en producción: respalda la base (cambia el CHECK de
--  nivel_acceso en una tabla con filas reales) y corre
--  `SELECT DISTINCT departamento, puesto, nivel_acceso FROM perfiles;`
--  para comparar contra la tabla de mapeo del plan.
--
--  Todo es IDEMPOTENTE donde se puede (IF NOT EXISTS / ON CONFLICT DO
--  NOTHING) — las secciones 4/5/7 (UPDATE de datos) son re-ejecutables sin
--  romper nada porque vuelven a dejar todo en el mismo estado final, pero
--  no vuelvas a correr la Sección 3 (backfill de `eliminar`) si el dueño ya
--  ajustó manualmente esa columna desde /admin/permisos — se salta sola si
--  detecta que ya hay algún `eliminar` distinto de `modificar`.
--
--  Corre las 10 secciones EN ORDEN.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Quitar el CHECK de nivel_acceso (búsqueda dinámica del
--  nombre real del constraint — no se asume "perfiles_nivel_acceso_check"
--  porque no hay ningún .sql en el repo que lo haya nombrado a mano).
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE c TEXT;
BEGIN
  SELECT conname INTO c
    FROM pg_constraint
    WHERE conrelid = 'perfiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%nivel_acceso%';
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE perfiles DROP CONSTRAINT %I', c);
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Columnas nuevas
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE permisos_puesto
  ADD COLUMN IF NOT EXISTS eliminar BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE permisos_usuario_overrides
  ADD COLUMN IF NOT EXISTS eliminar BOOLEAN;  -- NULL = hereda del puesto, igual que ver/crear/modificar

ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS sec_licencia_numero TEXT,
  ADD COLUMN IF NOT EXISTS sec_licencia_clase TEXT,
  ADD COLUMN IF NOT EXISTS sec_licencia_vencimiento DATE;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · Backfill de `eliminar` — preserva el comportamiento actual
--  (hoy todo DELETE ya está gateado por requireModificar, así que "quien
--  podía modificar, podía borrar"). Se salta sola si ya corrió antes.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE ya_ajustado BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM permisos_puesto WHERE eliminar <> modificar) INTO ya_ajustado;
  IF NOT ya_ajustado THEN
    UPDATE permisos_puesto SET eliminar = modificar WHERE modificar = true AND eliminar = false;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 4 · Renombres de puesto (perfiles + permisos_puesto, mismo
--  puesto en ambas tablas)
-- ─────────────────────────────────────────────────────────────────────
UPDATE perfiles SET puesto = 'Visitador de obra'
  WHERE departamento = 'directiva' AND puesto = 'Ingeniero visitante';
UPDATE permisos_puesto SET puesto = 'Visitador de obra'
  WHERE departamento = 'directiva' AND puesto = 'Ingeniero visitante';

UPDATE perfiles SET puesto = 'Maestro 1'
  WHERE departamento = 'taller' AND puesto = 'Maestro tablerista';
UPDATE permisos_puesto SET puesto = 'Maestro 1'
  WHERE departamento = 'taller' AND puesto = 'Maestro tablerista';


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 5 · Remapeo de nivel_acceso en perfiles (un UPDATE por fila de
--  la tabla de mapeo del plan). Se fuerza el valor según el puesto —no se
--  asume que nivel_acceso ya esté "bien" para ningún puesto, ni siquiera
--  Dueño/Jefe directivo/Administrador de software— porque el panel admin
--  deja elegir puesto y nivel_acceso por separado y en producción ya había
--  filas con esa combinación desincronizada (ej. puesto='Dueño' con
--  nivel_acceso='directiva' en vez de 'master').
-- ─────────────────────────────────────────────────────────────────────
UPDATE perfiles SET nivel_acceso = 'master' WHERE departamento = 'directiva' AND puesto IN ('Dueño', 'Jefe directivo');
UPDATE perfiles SET nivel_acceso = 'admin_software' WHERE departamento = 'admin_software' AND puesto = 'Administrador de software';

UPDATE perfiles SET nivel_acceso = 'administrador' WHERE departamento = 'bodega' AND puesto = 'Encargado de bodega';
UPDATE perfiles SET nivel_acceso = 'maestro'       WHERE departamento = 'bodega' AND puesto = 'Ayudante de bodega';
UPDATE perfiles SET nivel_acceso = 'modificador'   WHERE departamento = 'bodega' AND puesto = 'Chofer-bodeguero';
UPDATE perfiles SET nivel_acceso = 'modificador'   WHERE departamento = 'bodega' AND puesto = 'Ayudante de encargado';

UPDATE perfiles SET nivel_acceso = 'administrador' WHERE departamento = 'taller' AND puesto = 'Encargado de taller';
UPDATE perfiles SET nivel_acceso = 'maestro'       WHERE departamento = 'taller' AND puesto = 'Maestro 1';
UPDATE perfiles SET nivel_acceso = 'maestro'       WHERE departamento = 'taller' AND puesto = 'Ayudante de maestro';
UPDATE perfiles SET nivel_acceso = 'modificador'   WHERE departamento = 'taller' AND puesto = 'Ayudante de encargado';

UPDATE perfiles SET nivel_acceso = 'administrador' WHERE departamento = 'oficina_tecnica' AND puesto = 'Jefe de oficina técnica';
UPDATE perfiles SET nivel_acceso = 'modificador'   WHERE departamento = 'oficina_tecnica' AND puesto = 'Proyectista / ingeniero';
UPDATE perfiles SET nivel_acceso = 'modificador'   WHERE departamento = 'oficina_tecnica' AND puesto = 'Ayudante de jefe de oficina técnica';
UPDATE perfiles SET nivel_acceso = 'maestro'       WHERE departamento = 'oficina_tecnica' AND puesto = 'Técnico junior / ingeniero junior';

UPDATE perfiles SET nivel_acceso = 'administrador' WHERE departamento = 'prevencion' AND puesto = 'Prevencionista';

UPDATE perfiles SET nivel_acceso = 'administrador' WHERE departamento = 'rrhh' AND puesto = 'Jefe de Recursos Humanos';
UPDATE perfiles SET nivel_acceso = 'modificador'   WHERE departamento = 'rrhh' AND puesto = 'Asistente de Recursos Humanos';
UPDATE perfiles SET nivel_acceso = 'maestro'       WHERE departamento = 'rrhh' AND puesto = 'Practicante';

UPDATE perfiles SET nivel_acceso = 'administrador' WHERE departamento = 'directiva' AND puesto = 'Jefe ejecutivo';
UPDATE perfiles SET nivel_acceso = 'modificador'   WHERE departamento = 'directiva' AND puesto = 'Supervisor eléctrico';
UPDATE perfiles SET nivel_acceso = 'administrador' WHERE departamento = 'directiva' AND puesto = 'Visitador de obra';


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 6 · Puestos nuevos en permisos_puesto (sin fila previa que
--  remapear — se copian los grants del puesto más parecido).
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar)
SELECT departamento, 'Bodeguero', modulo, ver, crear, modificar, eliminar
FROM permisos_puesto WHERE departamento = 'bodega' AND puesto = 'Ayudante de bodega'
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar)
SELECT departamento, 'Maestro 2', modulo, ver, crear, modificar, eliminar
FROM permisos_puesto WHERE departamento = 'taller' AND puesto = 'Maestro 1'
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar)
SELECT departamento, 'Maestro Mayor', modulo, ver, crear, modificar, false
FROM permisos_puesto WHERE departamento = 'taller' AND puesto = 'Encargado de taller'
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 7 · Maestro de terreno (Taller) puede crear directamente en sus
--  3 módulos de campo, sin aprobación — acotado a Maestro 1/Maestro 2, no a
--  todo nivel_acceso='maestro' de la empresa.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar) VALUES
  ('taller', 'Maestro 1', 'pruebas_alimentadores', true, true, false, false),
  ('taller', 'Maestro 1', 'verificacion_ric',      true, true, false, false),
  ('taller', 'Maestro 1', 'prevencion_riesgos',    true, true, false, false),
  ('taller', 'Maestro 2', 'pruebas_alimentadores', true, true, false, false),
  ('taller', 'Maestro 2', 'verificacion_ric',      true, true, false, false),
  ('taller', 'Maestro 2', 'prevencion_riesgos',    true, true, false, false)
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 8 · (Deliberadamente sin acción) — el recorte de `eliminar`
--  para el tier Supervisor NO se aplica en este deploy. Queda tal cual el
--  backfill de la Sección 3 (eliminar = modificar, cero regresión de
--  capacidad el día de hoy) — el dueño lo va angostando módulo por módulo
--  desde /admin/permisos cuando quiera, ahora que la columna es visible.
-- ─────────────────────────────────────────────────────────────────────


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 9 · Guard de seguridad — aborta si algo quedó sin remapear en
--  vez de dejar una fila corrupta en silencio.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM perfiles
    WHERE nivel_acceso NOT IN ('maestro', 'modificador', 'administrador', 'admin_software', 'master');
  IF n > 0 THEN
    RAISE EXCEPTION 'Migración detenida: % fila(s) en perfiles quedaron con nivel_acceso fuera del nuevo modelo — revísalas (SELECT * FROM perfiles WHERE nivel_acceso NOT IN (...)) antes de continuar.', n;
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 10 · Repone el CHECK, ahora angosto a los 5 valores nuevos.
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE perfiles ADD CONSTRAINT perfiles_nivel_acceso_check
    CHECK (nivel_acceso IN ('maestro', 'modificador', 'administrador', 'admin_software', 'master'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
--  FIN. Tras ejecutar, correr en Supabase:
--    SELECT departamento, puesto, nivel_acceso FROM perfiles ORDER BY departamento;
--  y verificar que todas las filas quedaron en los 5 valores nuevos y con
--  los puestos renombrados (Visitador de obra, Maestro 1).
-- =====================================================================
