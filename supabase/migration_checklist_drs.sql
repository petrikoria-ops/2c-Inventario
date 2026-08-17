-- =====================================================================
--  Checklist DRS — Protocolo de pruebas de verificación inicial e
--  informe de imágenes (exigido por DRS, empresa externa de inspección
--  técnica) — independiente de Verificación RIC N°18/19.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada.
--
--  Después de correr esto hay que crear el bucket de Storage
--  "checklists-drs" (Sección 2) — si el INSERT directo a storage.buckets
--  falla por permisos, crearlo a mano desde Dashboard → Storage → New
--  bucket → nombre "checklists-drs", Public = NO, y luego correr solo
--  las policies de la Sección 2.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Cabecera + ítems (mediciones y registro fotográfico)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklists_drs (
  id              BIGSERIAL PRIMARY KEY,
  numero          TEXT NOT NULL UNIQUE,          -- DRS-2026-001
  proyecto_id     BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  proyecto_nombre TEXT,
  cliente_mandante TEXT,
  ubicacion       TEXT,
  fecha_visita    DATE NOT NULL DEFAULT CURRENT_DATE,
  inspectores     TEXT,
  num_tableros    INTEGER,
  estado          TEXT NOT NULL DEFAULT 'en_progreso'
                    CHECK (estado IN ('en_progreso', 'completa')),
  firma_nombre    TEXT,
  firma_rut       TEXT,
  firma_cargo     TEXT,
  firma_imagen_url TEXT,
  creado_por      UUID REFERENCES auth.users(id),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklists_drs_items (
  id              BIGSERIAL PRIMARY KEY,
  checklist_id    BIGINT NOT NULL REFERENCES checklists_drs(id) ON DELETE CASCADE,
  -- 'aislacion' | 'malla_tierra' | 'generales_tablero_aplica' |
  -- 'generales_tablero' | 'diferenciales_tablero' | 'enchufes' |
  -- 'iluminacion' | 'termografia' | 'imagenes'
  seccion         TEXT NOT NULL,
  tipo            TEXT NOT NULL DEFAULT 'medicion' CHECK (tipo IN ('medicion', 'foto')),
  orden           INTEGER NOT NULL DEFAULT 0,
  etiqueta        TEXT NOT NULL,        -- punto/sistema/prueba/circuito/ubicación
  referencia      TEXT,                 -- texto guía (ej. "1000 V · 60 s", "<30 mA") — solo informativo
  valor           TEXT,                 -- valor medido, tipeado libre (numérico o texto)
  estado          TEXT CHECK (estado IN ('pasa', 'no_pasa', 'na')),  -- solo tipo='medicion' donde aplique
  foto_tomada     BOOLEAN NOT NULL DEFAULT FALSE,                    -- solo tipo='foto'
  foto_url        TEXT,                                              -- path en Storage, solo tipo='foto'
  -- true = fila agregada/renombrable por el usuario (circuitos, puntos de
  -- termografía, salas de iluminación, etc. — varían por proyecto).
  -- false = punto fijo del protocolo, no se borra ni se renombra.
  editable_fila   BOOLEAN NOT NULL DEFAULT FALSE,
  notas           TEXT,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cdrs_items_checklist ON checklists_drs_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_cdrs_items_seccion   ON checklists_drs_items(checklist_id, seccion, orden);
CREATE INDEX IF NOT EXISTS idx_cdrs_proyecto        ON checklists_drs(proyecto_id);

-- set_actualizado_en() ya existe (definida en schema.sql)
CREATE OR REPLACE TRIGGER trg_checklists_drs_actualizado_en
  BEFORE UPDATE ON checklists_drs
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE OR REPLACE TRIGGER trg_checklists_drs_items_actualizado_en
  BEFORE UPDATE ON checklists_drs_items
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Storage para evidencia fotográfica (bucket privado)
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('checklists-drs', 'checklists-drs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_select_checklists_drs" ON storage.objects;
CREATE POLICY "authenticated_select_checklists_drs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'checklists-drs');

DROP POLICY IF EXISTS "authenticated_insert_checklists_drs" ON storage.objects;
CREATE POLICY "authenticated_insert_checklists_drs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'checklists-drs');

DROP POLICY IF EXISTS "authenticated_update_checklists_drs" ON storage.objects;
CREATE POLICY "authenticated_update_checklists_drs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'checklists-drs') WITH CHECK (bucket_id = 'checklists-drs');

DROP POLICY IF EXISTS "authenticated_delete_checklists_drs" ON storage.objects;
CREATE POLICY "authenticated_delete_checklists_drs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'checklists-drs');


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · RLS
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['checklists_drs', 'checklists_drs_items'])
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
--  FIN. Después de correr esto: agregar el módulo 'checklist_drs' a
--  algún puesto desde /admin/permisos — por defecto nadie lo ve.
-- =====================================================================
