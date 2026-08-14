-- =====================================================================
--  Documentos por trabajador — base compartida RRHH + Prevención
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE: se puede re-ejecutar sin romper nada.
--
--  Una sola tabla para los dos departamentos en vez de dos sistemas de
--  documentos separados — lo que distingue "es de RRHH" de "es de
--  Prevención" es la `categoria`, no un módulo nuevo:
--    · RRHH            (módulo 'trabajadores'):      contrato, finiquito,
--      licencia_medica, certificado
--    · Prevención (módulo 'prevencion_riesgos'): charla_diaria,
--      entrega_epp, examen_ocupacional, induccion_seguridad
--  El gateo real de quién ve qué categoría vive en la app
--  (lib/departamentos/documentosTrabajador.ts), no acá — por eso no hace
--  falta ningún permisos_puesto nuevo, ambos módulos ya existen.
--
--  `proyecto_id` es opcional: charla_diaria/induccion_seguridad suelen
--  ser de una obra puntual, contrato/finiquito/licencia_medica no.
-- =====================================================================

CREATE TABLE IF NOT EXISTS documentos_trabajador (
  id                BIGSERIAL PRIMARY KEY,
  trabajador_id     BIGINT NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  proyecto_id       BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  categoria         TEXT NOT NULL CHECK (categoria IN (
                       'contrato', 'finiquito', 'licencia_medica', 'certificado',
                       'charla_diaria', 'entrega_epp', 'examen_ocupacional', 'induccion_seguridad'
                     )),
  titulo            TEXT NOT NULL,
  archivo_url       TEXT NOT NULL,          -- path en Storage, nunca URL firmada (expiran)
  archivo_nombre    TEXT,
  fecha_documento   DATE,
  fecha_vencimiento DATE,                    -- NULL = no vence (charla_diaria, entrega_epp, etc.)
  notas             TEXT,
  subido_por        UUID REFERENCES auth.users(id),
  subido_por_nombre TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_trab_trabajador   ON documentos_trabajador(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_doc_trab_proyecto     ON documentos_trabajador(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_doc_trab_categoria    ON documentos_trabajador(categoria);
CREATE INDEX IF NOT EXISTS idx_doc_trab_vencimiento  ON documentos_trabajador(fecha_vencimiento);

ALTER TABLE documentos_trabajador ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON documentos_trabajador;
CREATE POLICY "authenticated_full_access" ON documentos_trabajador
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
--  Storage — bucket privado, mismo patrón que verificaciones-ric /
--  prevencion-riesgos / pruebas-alimentadores (lib/supabase/storage.ts).
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-trabajador', 'documentos-trabajador', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_select_documentos_trabajador" ON storage.objects;
CREATE POLICY "authenticated_select_documentos_trabajador" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documentos-trabajador');

DROP POLICY IF EXISTS "authenticated_insert_documentos_trabajador" ON storage.objects;
CREATE POLICY "authenticated_insert_documentos_trabajador" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos-trabajador');

DROP POLICY IF EXISTS "authenticated_update_documentos_trabajador" ON storage.objects;
CREATE POLICY "authenticated_update_documentos_trabajador" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'documentos-trabajador') WITH CHECK (bucket_id = 'documentos-trabajador');

DROP POLICY IF EXISTS "authenticated_delete_documentos_trabajador" ON storage.objects;
CREATE POLICY "authenticated_delete_documentos_trabajador" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'documentos-trabajador');

-- =====================================================================
--  FIN.
-- =====================================================================
