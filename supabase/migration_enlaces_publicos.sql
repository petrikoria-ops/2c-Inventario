-- =====================================================================
--  Enlaces públicos para verificaciones — permite compartir un link (sin
--  login) para que alguien externo (contratista, mandante, DRS...) llene
--  o firme una verificación ya creada por alguien interno, y quede
--  registro de quién y cuándo la completó.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Cubre los 4 módulos tipo "cabecera + ítems": Verificación RIC,
--  Checklist DRS, Prevención de riesgos y Test de Alimentadores.
--  Es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS).
--
--  Nota: es una solución provisoria mientras se termina de afinar el
--  sistema de usuarios — el control de acceso real de las rutas
--  /api/publico/[token]/* vive en el código (token válido, activo y no
--  vencido), no en RLS, porque esas rutas usan el cliente service_role
--  (ver lib/supabase/admin.ts) para poder leer/escribir sin sesión.
-- =====================================================================

CREATE TABLE IF NOT EXISTS enlaces_publicos (
  id                     BIGSERIAL PRIMARY KEY,
  token                  TEXT NOT NULL UNIQUE,
  modulo                 TEXT NOT NULL CHECK (modulo IN (
                           'verificacion_ric', 'checklist_drs',
                           'prevencion_riesgos', 'pruebas_alimentadores'
                         )),
  registro_id            BIGINT NOT NULL,
  descripcion            TEXT,                  -- ej. "Para: Juan Pérez, DRS"
  activo                 BOOLEAN NOT NULL DEFAULT TRUE,
  expira_en              TIMESTAMPTZ NOT NULL,
  creado_por             UUID REFERENCES auth.users(id),
  creado_por_nombre      TEXT,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_actividad_en    TIMESTAMPTZ,
  completado_en          TIMESTAMPTZ,
  completado_por_nombre  TEXT,
  completado_por_rut     TEXT
);

CREATE INDEX IF NOT EXISTS idx_enlaces_publicos_registro ON enlaces_publicos(modulo, registro_id);

ALTER TABLE enlaces_publicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON enlaces_publicos;
CREATE POLICY "authenticated_full_access" ON enlaces_publicos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================================
--  FIN. Las rutas /api/publico/[token]/* usan getSupabaseAdmin() (bypassea
--  RLS) — la tabla no necesita policy para `anon`.
-- =====================================================================
