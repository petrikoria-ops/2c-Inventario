-- =====================================================================
--  Anexo SAT por tablero — capa opcional y repetible dentro de una
--  Verificación RIC N°18/19, más el vínculo a Test de Alimentadores
--  (Informe de Medición N°1) y el toggle de alcance de la verificación.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada. Requiere haber corrido antes
--  migration_avance_obra_y_verificacion_ric.sql (verificaciones_ric),
--  migration_tableros.sql (tableros) y migration_alimentadores_y_firmas.sql
--  + migration_alimentadores_multiples.sql (pruebas_alimentadores).
--
--  v1 de Verificación RIC solo tenía Sección A (A.0–A.11 + cierre),
--  siempre obligatoria y siempre sembrada desde la plantilla. Esta
--  migración agrega:
--   1) incluye_seccion_a / incluye_anexo_sat en verificaciones_ric, para
--      elegir el alcance al crear (antes no existía la opción).
--      incluye_seccion_a queda fijo tras la creación (define si se
--      sembraron o no los ~90 ítems de la plantilla); incluye_anexo_sat
--      sí se puede activar después, porque no siembra nada.
--   2) verificaciones_ric_tableros — el Anexo Opcional SAT, resumen de
--      1 página por tablero (identificación de 6 columnas + checklist
--      consolidado de 5 ítems Pasa/No pasa/N/A + notas + 1 foto), que
--      puede repetirse tantas veces como tableros tenga la visita.
--      `tablero_id` es opcional: puede vincular un tablero real de la
--      tabla `tableros` (Taller) o quedar con datos propios cuando no
--      hay contraparte en esa tabla.
--   3) verificacion_ric_id en pruebas_alimentadores, para reusar ese
--      módulo ya construido como "Informe de Medición N°1 —
--      Alimentadores" de una Verificación RIC, sin duplicar tablas.
--
--  Las 5 columnas de resultado del checklist SAT son fijas (no varían
--  entre proyectos, igual que el criterio ya usado en
--  tableros_checklist), así que van como columnas explícitas y no como
--  filas EAV — más simple de leer/imprimir que una tabla de ítems.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · verificaciones_ric — alcance elegible al crear
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE verificaciones_ric
  ADD COLUMN IF NOT EXISTS incluye_seccion_a BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS incluye_anexo_sat BOOLEAN NOT NULL DEFAULT FALSE;

-- Los defaults (TRUE / FALSE) son exactamente el estado real de TODAS las
-- verificaciones creadas antes de esta migración (v1 = solo Sección A),
-- así que no hace falta backfill: quedan correctas automáticamente.


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Anexo Opcional SAT — repetible, 1 fila por tablero
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verificaciones_ric_tableros (
  id                              BIGSERIAL PRIMARY KEY,
  verificacion_id                 BIGINT NOT NULL REFERENCES verificaciones_ric(id) ON DELETE CASCADE,

  -- Vínculo opcional al tablero real (Taller). Nulo cuando el tablero se
  -- declara solo dentro de este anexo, sin contraparte en `tableros`.
  -- No dispara ningún cambio en tableros.estado ni requiere_fat_sat.
  tablero_id                      BIGINT REFERENCES tableros(id) ON DELETE SET NULL,

  orden                           INTEGER NOT NULL DEFAULT 0,

  -- Fila de identificación de 6 columnas (siempre denormalizada, aunque
  -- tablero_id esté seteado, para que el anexo quede completo aunque el
  -- tablero de Taller se edite o borre después).
  numero_tablero                  TEXT,          -- "Tablero N°", ej. 'TG-1'
  nombre                          TEXT NOT NULL,
  tipo                            TEXT,          -- texto libre mostrado en el anexo
  tipo_tablero_id                 TEXT,          -- id de TIPOS_TABLERO (lib/verificacionRic/anexoSat.ts) — sin CHECK/FK a propósito, la librería vive en TS
  fabricante                      TEXT,
  ui                              TEXT,          -- Ui de placa (tensión), ej. '400 V'
  in_nominal                      TEXT,          -- In de placa (corriente), ej. '250 A'

  -- Checklist consolidado de exactamente 5 ítems (núcleo IEC 61439-1 +
  -- terreno SAT + tipo de tablero + registro fotográfico) — fijo,
  -- columnas en vez de tabla EAV.
  resultado_ensayos_instrumento   TEXT CHECK (resultado_ensayos_instrumento  IN ('pasa', 'no_pasa', 'na')),
  resultado_inspeccion            TEXT CHECK (resultado_inspeccion           IN ('pasa', 'no_pasa', 'na')),
  resultado_requisitos_terreno    TEXT CHECK (resultado_requisitos_terreno   IN ('pasa', 'no_pasa', 'na')),
  resultado_puntos_especificos    TEXT CHECK (resultado_puntos_especificos   IN ('pasa', 'no_pasa', 'na')),
  resultado_registro_fotografico  TEXT CHECK (resultado_registro_fotografico IN ('pasa', 'no_pasa', 'na')),

  notas                           TEXT,

  -- Un único registro fotográfico general por tablero (no galería) — path
  -- en el bucket 'verificaciones-ric' (mismo bucket que Sección A, ya
  -- existe), nunca una URL firmada.
  foto_tomada                     BOOLEAN NOT NULL DEFAULT FALSE,
  foto_url                        TEXT,

  creado_en                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vric_tableros_verificacion ON verificaciones_ric_tableros(verificacion_id);
CREATE INDEX IF NOT EXISTS idx_vric_tableros_tablero       ON verificaciones_ric_tableros(tablero_id);

CREATE OR REPLACE TRIGGER trg_verificaciones_ric_tableros_actualizado_en
  BEFORE UPDATE ON verificaciones_ric_tableros
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · pruebas_alimentadores — vínculo opcional a una
--  Verificación RIC, para reusarlo como Informe de Medición N°1 sin
--  duplicar tablas. ON DELETE SET NULL (no CASCADE): borrar la
--  Verificación RIC no debe borrar mediciones de alimentadores ya
--  tomadas, solo desvincularlas.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE pruebas_alimentadores
  ADD COLUMN IF NOT EXISTS verificacion_ric_id BIGINT REFERENCES verificaciones_ric(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alim_verificacion_ric ON pruebas_alimentadores(verificacion_ric_id);


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 4 · RLS en la tabla nueva — mismo criterio que el resto del
--  módulo: cualquier usuario autenticado tiene acceso completo, el
--  candado real es permisos_puesto vía el módulo 'verificacion_ric'
--  (Sección 5).
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE verificaciones_ric_tableros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON verificaciones_ric_tableros;
CREATE POLICY "authenticated_full_access" ON verificaciones_ric_tableros
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 5 · Permisos — NO se agregan filas nuevas en permisos_puesto
--  a propósito. El Anexo SAT es conceptualmente parte de Verificación
--  RIC, así que sus rutas se gatean con el módulo 'verificacion_ric' que
--  YA existe y ya tiene permisos_puesto sembrados (Directiva, Oficina
--  Técnica, etc. — ver migration_avance_obra_y_verificacion_ric.sql).
--  Vincular/desvincular un Test de Alimentadores exige además
--  'modificar' sobre 'pruebas_alimentadores' (módulo también existente),
--  porque ese PATCH toca esa tabla, no verificaciones_ric.
-- =====================================================================
