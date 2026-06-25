-- ============================================================
-- Log de errores — captura centralizada de excepciones
-- ============================================================
-- Cualquier usuario autenticado puede insertar (cuando algo le falla
-- en su sesión), pero solo Administrador de software/master pueden
-- ver y resolver el listado completo.
--
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS error_log (
  id          BIGSERIAL PRIMARY KEY,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario     TEXT,
  departamento TEXT,
  archivo     TEXT,
  mensaje     TEXT NOT NULL,
  stack       TEXT,
  resuelto    BOOLEAN NOT NULL DEFAULT FALSE,
  resuelto_en TIMESTAMPTZ,
  resuelto_por UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_error_log_creado   ON error_log(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_resuelto ON error_log(resuelto);

ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cualquiera_loguea_error" ON error_log;
CREATE POLICY "cualquiera_loguea_error" ON error_log
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_ve_errores" ON error_log;
CREATE POLICY "admin_ve_errores" ON error_log
  FOR SELECT TO authenticated
  USING (es_admin_o_master());

DROP POLICY IF EXISTS "admin_resuelve_errores" ON error_log;
CREATE POLICY "admin_resuelve_errores" ON error_log
  FOR UPDATE TO authenticated
  USING (es_admin_o_master())
  WITH CHECK (es_admin_o_master());
