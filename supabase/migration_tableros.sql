-- =====================================================================
--  Tableros — entidad propia dentro de una obra (Taller)
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE (IF NOT EXISTS / ON CONFLICT DO NOTHING): se puede
--  re-ejecutar sin romper nada. Requiere haber corrido antes
--  migration_permisos_granulares.sql y migration_piramide_roles.sql
--  (columna `eliminar` de permisos_puesto).
--
--  Un proyecto (obra) puede tener muchos tableros; un tablero pertenece
--  a un solo proyecto (proyecto_id NOT NULL, no es opcional como en
--  solicitudes_compra). Lo crea el Encargado de taller o alguien de
--  Oficina Técnica (cubicación); el estado avanza a medida que Taller lo
--  arma y, si aplica, se prueba.
--
--  Ciclo de estados (por_cubicar → por_armar → armado → en_pruebas →
--  terminado): "en_pruebas" solo aplica si `requiere_fat_sat = true`
--  (tableros sobre 100A según el pliego RIC N°2 que ya tenía
--  app/checklist/page.tsx) — un tablero sin esa exigencia pasa de
--  "armado" directo a "terminado".
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Tablas
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tableros (
  id                BIGSERIAL PRIMARY KEY,
  proyecto_id       BIGINT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  amperaje          NUMERIC(10,2),
  requiere_fat_sat  BOOLEAN NOT NULL DEFAULT FALSE,
  estado            TEXT NOT NULL DEFAULT 'por_cubicar'
                      CHECK (estado IN ('por_cubicar', 'por_armar', 'armado', 'en_pruebas', 'terminado')),
  creado_por        UUID REFERENCES auth.users(id),
  creado_por_nombre TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tableros_proyecto ON tableros(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_tableros_estado   ON tableros(estado);

CREATE OR REPLACE TRIGGER trg_tableros_actualizado_en
  BEFORE UPDATE ON tableros
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Checklist RIC N°2 de armado — 1:1 con el tablero. `checks` guarda el
-- mismo shape `{ "<seccion>_<indice>": boolean }` que ya usaba el estado
-- de React en app/checklist/page.tsx (SECTIONS: mecánico/cableado/pruebas,
-- 26 ítems fijos) — se persiste tal cual en vez de crear 26 filas por
-- tablero para una lista que hoy no varía entre obras.
CREATE TABLE IF NOT EXISTS tableros_checklist (
  id                BIGSERIAL PRIMARY KEY,
  tablero_id        BIGINT NOT NULL UNIQUE REFERENCES tableros(id) ON DELETE CASCADE,
  checks            JSONB NOT NULL DEFAULT '{}'::jsonb,
  tecnico           TEXT,
  fecha_inspeccion  DATE,
  observaciones     TEXT,
  completado_en     TIMESTAMPTZ,
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_tableros_checklist_actualizado_en
  BEFORE UPDATE ON tableros_checklist
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · RLS — mismo patrón permisivo que avances_obra/
--  verificaciones_ric: el candado real es el módulo `tableros` en
--  permisos_puesto (Sección 3), no RLS.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['tableros', 'tableros_checklist'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %I;', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · Permisos — crea Encargado de taller y Oficina Técnica
--  (Jefe + Proyectista/ingeniero, que es quien cubica); el resto de
--  Taller ve y puede modificar (avanzar estado, marcar checklist) pero
--  no crear ni eliminar tableros.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar) VALUES
  ('taller', 'Encargado de taller',    'tableros', true, true,  true,  true),
  ('taller', 'Ayudante de encargado',  'tableros', true, false, true,  false),
  ('taller', 'Maestro Mayor',          'tableros', true, false, true,  false),
  ('taller', 'Maestro 1',              'tableros', true, false, true,  false),
  ('taller', 'Maestro 2',              'tableros', true, false, true,  false),
  ('taller', 'Ayudante de maestro',    'tableros', true, false, false, false),
  ('oficina_tecnica', 'Jefe de oficina técnica',            'tableros', true, true,  true,  true),
  ('oficina_tecnica', 'Proyectista / ingeniero',            'tableros', true, true,  true,  false),
  ('oficina_tecnica', 'Ayudante de jefe de oficina técnica','tableros', true, false, false, false),
  ('oficina_tecnica', 'Técnico junior / ingeniero junior',  'tableros', true, false, false, false)
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
