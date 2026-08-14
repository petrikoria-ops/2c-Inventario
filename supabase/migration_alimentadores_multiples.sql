-- =====================================================================
--  Test de Alimentadores — múltiples alimentadores por informe
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Antes: 1 fila en pruebas_alimentadores = 1 alimentador (campo
--  identificacion_alimentador) con sus 10 mediciones fijas.
--  Ahora: 1 fila en pruebas_alimentadores = 1 informe de una obra, que
--  puede contener VARIOS alimentadores (tabla nueva
--  pruebas_alimentadores_alimentadores), cada uno con nombre, protección
--  aguas arriba, largo y sus propias 10 mediciones. Todo sigue quedando
--  en el mismo informe/PDF.
--
--  IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada.
--
--  Requiere haber corrido antes migration_alimentadores_y_firmas.sql.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  1 · Tabla de alimentadores dentro de un informe
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pruebas_alimentadores_alimentadores (
  id                       BIGSERIAL PRIMARY KEY,
  prueba_id                BIGINT NOT NULL REFERENCES pruebas_alimentadores(id) ON DELETE CASCADE,
  orden                    INTEGER NOT NULL DEFAULT 0,
  nombre                   TEXT NOT NULL,        -- ej. 'Alimentador TG-1 → TS-3'
  proteccion_aguas_arriba  TEXT,                  -- ej. 'Interruptor termomagnético 100A'
  largo                    TEXT,                  -- ej. '45 m'
  creado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alim_alimentadores_prueba ON pruebas_alimentadores_alimentadores(prueba_id);

CREATE OR REPLACE TRIGGER trg_pruebas_alimentadores_alimentadores_actualizado_en
  BEFORE UPDATE ON pruebas_alimentadores_alimentadores
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  2 · pruebas_alimentadores_items pasa a colgar del alimentador, no
--  directamente del informe. Se mantiene prueba_id (denormalizado) para
--  no romper queries existentes.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE pruebas_alimentadores_items
  ADD COLUMN IF NOT EXISTS alimentador_id BIGINT REFERENCES pruebas_alimentadores_alimentadores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_alim_items_alimentador ON pruebas_alimentadores_items(alimentador_id);


-- ─────────────────────────────────────────────────────────────────────
--  3 · Backfill: cada informe existente (creado antes de este cambio)
--  pasa a tener 1 alimentador, usando el viejo identificacion_alimentador
--  como nombre, y sus 10 ítems ya cargados se re-cuelgan de ese
--  alimentador nuevo. Solo toca informes cuyos ítems todavía no tengan
--  alimentador_id — se puede re-correr sin duplicar nada.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE r RECORD; nuevo_id BIGINT;
BEGIN
  FOR r IN
    SELECT DISTINCT p.id, p.identificacion_alimentador
    FROM pruebas_alimentadores p
    JOIN pruebas_alimentadores_items i ON i.prueba_id = p.id
    WHERE i.alimentador_id IS NULL
  LOOP
    INSERT INTO pruebas_alimentadores_alimentadores (prueba_id, orden, nombre)
    VALUES (r.id, 0, COALESCE(NULLIF(r.identificacion_alimentador, ''), 'Alimentador 1'))
    RETURNING id INTO nuevo_id;

    UPDATE pruebas_alimentadores_items
    SET alimentador_id = nuevo_id
    WHERE prueba_id = r.id AND alimentador_id IS NULL;
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────
--  4 · RLS en la tabla nueva (mismo criterio que el resto del módulo:
--  cualquier usuario autenticado tiene acceso completo, el filtro real
--  de crear/editar lo hace la app vía permisos_puesto)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE pruebas_alimentadores_alimentadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON pruebas_alimentadores_alimentadores;
CREATE POLICY "authenticated_full_access" ON pruebas_alimentadores_alimentadores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================================
--  FIN. identificacion_alimentador queda en pruebas_alimentadores sin
--  usarse (dato histórico de informes viejos, ya copiado al alimentador
--  de backfill) — no se borra la columna para no perder ese respaldo.
-- =====================================================================
