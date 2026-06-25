-- ============================================================
-- Roles y perfiles — control de acceso por departamento
-- ============================================================
-- Hasta ahora cualquier usuario autenticado tenía acceso total
-- (ver migration_habilitar_rls.sql: "FOR ALL TO authenticated
-- USING (true)"). Esta migración agrega el concepto de
-- departamento/nivel_acceso sin tocar esas políticas existentes
-- — el ajuste fino de cada módulo se hace en sesiones futuras,
-- departamento por departamento.
--
-- IMPORTANTE: antes de ejecutar, reemplaza el email en la última
-- sección por el del usuario real que ya usa la app, para que no
-- quede bloqueado al activar este sistema.
--
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ─── PERFILES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email           TEXT NOT NULL,
  departamento    TEXT NOT NULL CHECK (departamento IN (
                    'bodega', 'taller', 'oficina_tecnica', 'prevencion',
                    'rrhh', 'directiva', 'admin_software'
                  )),
  puesto          TEXT NOT NULL,
  nivel_acceso    TEXT NOT NULL CHECK (nivel_acceso IN (
                    'visualizacion', 'operador', 'encargado',
                    'jefe_departamento', 'directiva', 'admin_software', 'master'
                  )),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SOLICITUDES DE ENROLAMIENTO ───────────────────────────────
CREATE TABLE IF NOT EXISTS solicitudes_enrolamiento (
  id                    BIGSERIAL PRIMARY KEY,
  nombre_completo       TEXT NOT NULL,
  email                 TEXT NOT NULL,
  departamento_solicitado TEXT NOT NULL,
  puesto_solicitado     TEXT NOT NULL,
  codigo_verificacion   TEXT NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_en           TIMESTAMPTZ,
  resuelto_por          UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_perfiles_departamento ON perfiles(departamento);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado     ON solicitudes_enrolamiento(estado);

-- ─── FUNCIONES HELPER (para políticas RLS futuras) ─────────────
-- SECURITY DEFINER: corre con permisos del dueño de la función, no
-- del usuario que llama — necesario porque el propio acceso a
-- "perfiles" también está restringido por RLS (ver más abajo).
CREATE OR REPLACE FUNCTION mi_nivel_acceso()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT nivel_acceso FROM perfiles WHERE id = auth.uid() AND activo = true;
$$;

CREATE OR REPLACE FUNCTION mi_departamento()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT departamento FROM perfiles WHERE id = auth.uid() AND activo = true;
$$;

CREATE OR REPLACE FUNCTION es_admin_o_master()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(mi_nivel_acceso() IN ('admin_software', 'master'), false);
$$;

-- ─── RLS: perfiles ──────────────────────────────────────────────
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver_propio_perfil" ON perfiles;
CREATE POLICY "ver_propio_perfil" ON perfiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR es_admin_o_master());

DROP POLICY IF EXISTS "admin_gestiona_perfiles" ON perfiles;
CREATE POLICY "admin_gestiona_perfiles" ON perfiles
  FOR ALL TO authenticated
  USING (es_admin_o_master())
  WITH CHECK (es_admin_o_master());

-- ─── RLS: solicitudes_enrolamiento ──────────────────────────────
ALTER TABLE solicitudes_enrolamiento ENABLE ROW LEVEL SECURITY;

-- El formulario de /solicitar-acceso es público (sin login) — solo
-- puede INSERTAR, nunca leer ni editar solicitudes ajenas.
DROP POLICY IF EXISTS "cualquiera_solicita" ON solicitudes_enrolamiento;
CREATE POLICY "cualquiera_solicita" ON solicitudes_enrolamiento
  FOR INSERT TO anon, authenticated
  WITH CHECK (estado = 'pendiente');

DROP POLICY IF EXISTS "admin_revisa_solicitudes" ON solicitudes_enrolamiento;
CREATE POLICY "admin_revisa_solicitudes" ON solicitudes_enrolamiento
  FOR SELECT TO authenticated
  USING (es_admin_o_master());

DROP POLICY IF EXISTS "admin_resuelve_solicitudes" ON solicitudes_enrolamiento;
CREATE POLICY "admin_resuelve_solicitudes" ON solicitudes_enrolamiento
  FOR UPDATE TO authenticated
  USING (es_admin_o_master())
  WITH CHECK (es_admin_o_master());

-- ─── Migrar al usuario actual a master ──────────────────────────
-- Reemplaza el email si corresponde a otro usuario en tu proyecto.
INSERT INTO perfiles (id, nombre_completo, email, departamento, puesto, nivel_acceso)
SELECT id, 'Administración', email, 'directiva', 'Dueño', 'master'
FROM auth.users
WHERE email = 'bchavarria@2celectricidad.com'
ON CONFLICT (id) DO UPDATE SET nivel_acceso = 'master', departamento = 'directiva';
