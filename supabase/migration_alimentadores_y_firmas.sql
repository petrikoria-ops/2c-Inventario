-- =====================================================================
--  Test de Alimentadores + Firma táctil (imagen dibujada) en RIC y
--  Prevención de Riesgos
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada. Corre las 4 secciones EN ORDEN.
--
--  Después de correr esto en Supabase, hay que crear el bucket de
--  Storage "pruebas-alimentadores" (Sección 3) — si el INSERT directo a
--  storage.buckets falla por permisos, crearlo a mano desde
--  Dashboard → Storage → New bucket → nombre "pruebas-alimentadores",
--  Public = NO, y luego correr solo las policies de la Sección 3.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Firma dibujada (imagen) en Verificación RIC y Prevención
--  de Riesgos — los campos de texto (firma_nombre, firma_prevencionista,
--  firma_encargado) se mantienen como el nombre impreso; estas columnas
--  nuevas guardan el PATH (nunca URL firmada) del PNG dibujado a mano,
--  en el mismo bucket privado que ya usa cada módulo para sus fotos.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE verificaciones_ric
  ADD COLUMN IF NOT EXISTS firma_imagen_url TEXT;

ALTER TABLE inspecciones_prevencion
  ADD COLUMN IF NOT EXISTS firma_prevencionista_imagen_url TEXT,
  ADD COLUMN IF NOT EXISTS firma_encargado_imagen_url TEXT;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Test de Alimentadores — 10 mediciones fijas (continuidad/
--  aislamiento entre fases, neutro y tierra) + foto de respaldo cada una
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pruebas_alimentadores (
  id                       BIGSERIAL PRIMARY KEY,
  numero                   TEXT NOT NULL UNIQUE,          -- ALIM-2026-001
  proyecto_id              BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  proyecto_nombre          TEXT,
  cliente_mandante         TEXT,
  ubicacion                TEXT,
  fecha_visita             DATE NOT NULL DEFAULT CURRENT_DATE,
  inspectores              TEXT,
  identificacion_alimentador TEXT,
  instrumento              TEXT,
  observaciones            TEXT,
  estado                   TEXT NOT NULL DEFAULT 'en_progreso'
                             CHECK (estado IN ('en_progreso', 'completa')),
  firma_nombre             TEXT,
  firma_rut                TEXT,
  firma_cargo              TEXT,
  firma_imagen_url         TEXT,
  creado_por               UUID REFERENCES auth.users(id),
  creado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pruebas_alimentadores_items (
  id              BIGSERIAL PRIMARY KEY,
  prueba_id       BIGINT NOT NULL REFERENCES pruebas_alimentadores(id) ON DELETE CASCADE,
  orden           INTEGER NOT NULL DEFAULT 0,
  texto           TEXT NOT NULL,        -- 'Medición Neutro – Fase R'
  valor           TEXT,                 -- lectura libre (Ω, MΩ o V según el par medido)
  foto_url        TEXT,                 -- path en Storage, nunca URL firmada
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alim_items_prueba ON pruebas_alimentadores_items(prueba_id);
CREATE INDEX IF NOT EXISTS idx_alim_items_orden   ON pruebas_alimentadores_items(prueba_id, orden);
CREATE INDEX IF NOT EXISTS idx_alim_proyecto       ON pruebas_alimentadores(proyecto_id);

CREATE OR REPLACE TRIGGER trg_pruebas_alimentadores_actualizado_en
  BEFORE UPDATE ON pruebas_alimentadores
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE OR REPLACE TRIGGER trg_pruebas_alimentadores_items_actualizado_en
  BEFORE UPDATE ON pruebas_alimentadores_items
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · Storage para evidencia fotográfica de Test de Alimentadores
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('pruebas-alimentadores', 'pruebas-alimentadores', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_select_pruebas_alimentadores" ON storage.objects;
CREATE POLICY "authenticated_select_pruebas_alimentadores" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'pruebas-alimentadores');

DROP POLICY IF EXISTS "authenticated_insert_pruebas_alimentadores" ON storage.objects;
CREATE POLICY "authenticated_insert_pruebas_alimentadores" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pruebas-alimentadores');

DROP POLICY IF EXISTS "authenticated_update_pruebas_alimentadores" ON storage.objects;
CREATE POLICY "authenticated_update_pruebas_alimentadores" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'pruebas-alimentadores') WITH CHECK (bucket_id = 'pruebas-alimentadores');

DROP POLICY IF EXISTS "authenticated_delete_pruebas_alimentadores" ON storage.objects;
CREATE POLICY "authenticated_delete_pruebas_alimentadores" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pruebas-alimentadores');


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 4 · RLS en las 2 tablas nuevas
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pruebas_alimentadores', 'pruebas_alimentadores_items'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %I;', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;

-- =====================================================================
--  FIN.
-- =====================================================================
