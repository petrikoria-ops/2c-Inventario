-- =====================================================================
--  Visitador de obra / Supervisor de obra + Verificación RIC N°18/19
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada. Corre las 4 secciones EN ORDEN.
--
--  Después de correr esto en Supabase, hay que crear el bucket de
--  Storage "verificaciones-ric" (Sección 3) — si el INSERT directo a
--  storage.buckets falla por permisos, crearlo a mano desde
--  Dashboard → Storage → New bucket → nombre "verificaciones-ric",
--  Public = NO, y luego correr solo las policies de la Sección 3.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Trabajadores por obra (puente proyectos ↔ trabajadores)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proyectos_trabajadores (
  id               BIGSERIAL PRIMARY KEY,
  proyecto_id      BIGINT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  trabajador_id    BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  rol_en_obra      TEXT,
  fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE proyectos_trabajadores
    ADD CONSTRAINT uq_proyecto_trabajador UNIQUE (proyecto_id, trabajador_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_pt_proyecto   ON proyectos_trabajadores(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_pt_trabajador ON proyectos_trabajadores(trabajador_id);


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Avance de obra (plan de etapas por proyecto)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avances_obra (
  id                BIGSERIAL PRIMARY KEY,
  proyecto_id       BIGINT NOT NULL UNIQUE REFERENCES proyectos(id) ON DELETE CASCADE,
  creado_por        UUID REFERENCES auth.users(id),
  creado_por_nombre TEXT,
  notas             TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS avances_obra_items (
  id                    BIGSERIAL PRIMARY KEY,
  avance_id             BIGINT NOT NULL REFERENCES avances_obra(id) ON DELETE CASCADE,
  orden                 INTEGER NOT NULL DEFAULT 0,
  etapa                 TEXT NOT NULL,
  descripcion           TEXT,
  fecha_estimada        DATE,
  completado            BOOLEAN NOT NULL DEFAULT FALSE,
  completado_por        UUID REFERENCES auth.users(id),
  completado_por_nombre TEXT,
  completado_en         TIMESTAMPTZ,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avance_items_avance ON avances_obra_items(avance_id);
CREATE INDEX IF NOT EXISTS idx_avance_items_orden   ON avances_obra_items(avance_id, orden);

-- set_actualizado_en() ya existe (definida en schema.sql)
CREATE OR REPLACE TRIGGER trg_avances_obra_actualizado_en
  BEFORE UPDATE ON avances_obra
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · Verificación RIC N°18/19 — Sección A (verificación
--  inicial y puesta en marcha) + Storage para evidencia fotográfica
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verificaciones_ric (
  id                      BIGSERIAL PRIMARY KEY,
  numero                  TEXT NOT NULL UNIQUE,          -- RIC-2026-001
  proyecto_id             BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  proyecto_nombre         TEXT,
  cliente_mandante        TEXT,
  ubicacion               TEXT,
  fecha_visita            DATE NOT NULL DEFAULT CURRENT_DATE,
  inspectores             TEXT,
  num_tableros            INTEGER,
  estado                  TEXT NOT NULL DEFAULT 'en_progreso'
                            CHECK (estado IN ('en_progreso', 'completa')),
  declaracion_conformidad BOOLEAN NOT NULL DEFAULT FALSE,
  firma_nombre            TEXT,
  firma_rut               TEXT,
  firma_cargo             TEXT,
  creado_por              UUID REFERENCES auth.users(id),
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verificaciones_ric_items (
  id              BIGSERIAL PRIMARY KEY,
  verificacion_id BIGINT NOT NULL REFERENCES verificaciones_ric(id) ON DELETE CASCADE,
  bloque          TEXT NOT NULL,        -- 'A.0' … 'A.11' | 'CIERRE'
  tipo            TEXT NOT NULL CHECK (tipo IN ('verificacion', 'foto', 'nota')),
  orden           INTEGER NOT NULL DEFAULT 0,
  texto           TEXT NOT NULL,
  resultado       TEXT CHECK (resultado IN ('pasa', 'no_pasa', 'na')),  -- solo tipo='verificacion'
  foto_tomada     BOOLEAN NOT NULL DEFAULT FALSE,                       -- solo tipo='foto'
  foto_url        TEXT,                                                 -- path en Storage, solo tipo='foto'
  notas           TEXT,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vric_items_verificacion ON verificaciones_ric_items(verificacion_id);
CREATE INDEX IF NOT EXISTS idx_vric_items_bloque       ON verificaciones_ric_items(verificacion_id, bloque, orden);
CREATE INDEX IF NOT EXISTS idx_vric_proyecto           ON verificaciones_ric(proyecto_id);

CREATE OR REPLACE TRIGGER trg_verificaciones_ric_actualizado_en
  BEFORE UPDATE ON verificaciones_ric
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE OR REPLACE TRIGGER trg_verificaciones_ric_items_actualizado_en
  BEFORE UPDATE ON verificaciones_ric_items
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Bucket privado para evidencia fotográfica (fotos de instalaciones de
-- clientes — no es catálogo público). Si el INSERT directo falla por
-- permisos del rol usado en el SQL Editor, crear el bucket a mano desde
-- Dashboard → Storage → New bucket → "verificaciones-ric", Public = NO.
INSERT INTO storage.buckets (id, name, public)
VALUES ('verificaciones-ric', 'verificaciones-ric', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_select_verificaciones_ric" ON storage.objects;
CREATE POLICY "authenticated_select_verificaciones_ric" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'verificaciones-ric');

DROP POLICY IF EXISTS "authenticated_insert_verificaciones_ric" ON storage.objects;
CREATE POLICY "authenticated_insert_verificaciones_ric" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'verificaciones-ric');

DROP POLICY IF EXISTS "authenticated_update_verificaciones_ric" ON storage.objects;
CREATE POLICY "authenticated_update_verificaciones_ric" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'verificaciones-ric') WITH CHECK (bucket_id = 'verificaciones-ric');

DROP POLICY IF EXISTS "authenticated_delete_verificaciones_ric" ON storage.objects;
CREATE POLICY "authenticated_delete_verificaciones_ric" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'verificaciones-ric');


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 4 · RLS en las 5 tablas nuevas
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'proyectos_trabajadores', 'avances_obra', 'avances_obra_items',
    'verificaciones_ric', 'verificaciones_ric_items'
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
