-- =====================================================================
--  PENDIENTE PARA EL PUSH — 2C Inventario
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada; lo que ya exista se omite.
--  Corre las 4 secciones EN ORDEN (la 2 crea funciones que usan la 3 y 4).
--
--  ⚠️  ANTES DE EJECUTAR: en la SECCIÓN 2, al final, reemplaza el email
--      por el de TU cuenta de login real (la que ya usas para entrar),
--      o quedarás sin acceso al activar el sistema de roles.
--
--  NOTA: las funciones nuevas que se agregaron en la app (vista "Ver como"
--  por departamento y la carga progresiva de listas) NO necesitan tablas
--  nuevas — usan una cookie y las tablas existentes. Este script es para
--  dejar operativo el sistema de departamentos/roles del que dependen.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Trabajadores y Entrega de Herramientas
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trabajadores (
  id          BIGSERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  rut         TEXT,
  cargo       TEXT,
  telefono    TEXT,
  activo      BOOLEAN DEFAULT true,
  creado_en   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entregas_herramientas (
  id                BIGSERIAL PRIMARY KEY,
  numero            TEXT NOT NULL,
  trabajador_id     BIGINT REFERENCES trabajadores(id),
  trabajador_nombre TEXT NOT NULL,
  usuario           TEXT,
  observaciones     TEXT,
  fecha             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entregas_herramientas_items (
  id             BIGSERIAL PRIMARY KEY,
  entrega_id     BIGINT REFERENCES entregas_herramientas(id) ON DELETE CASCADE,
  herramienta_id BIGINT REFERENCES herramientas(id),
  codigo         TEXT,
  descripcion    TEXT,
  notas          TEXT
);

-- UNIQUE en numero (evita dos EH-AAAA-NNN iguales). Envuelto para no
-- fallar si la restricción ya existe.
DO $$ BEGIN
  ALTER TABLE entregas_herramientas
    ADD CONSTRAINT uq_entregas_herramientas_numero UNIQUE (numero);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · Roles y perfiles (control de acceso por departamento)
-- ─────────────────────────────────────────────────────────────────────
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

CREATE TABLE IF NOT EXISTS solicitudes_enrolamiento (
  id                      BIGSERIAL PRIMARY KEY,
  nombre_completo         TEXT NOT NULL,
  email                   TEXT NOT NULL,
  departamento_solicitado TEXT NOT NULL,
  puesto_solicitado       TEXT NOT NULL,
  codigo_verificacion     TEXT NOT NULL,
  estado                  TEXT NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resuelto_en             TIMESTAMPTZ,
  resuelto_por            UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_perfiles_departamento ON perfiles(departamento);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado     ON solicitudes_enrolamiento(estado);

-- Funciones helper (SECURITY DEFINER para poder leer perfiles bajo RLS)
CREATE OR REPLACE FUNCTION mi_nivel_acceso()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT nivel_acceso FROM perfiles WHERE id = auth.uid() AND activo = true;
$$;

CREATE OR REPLACE FUNCTION mi_departamento()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT departamento FROM perfiles WHERE id = auth.uid() AND activo = true;
$$;

CREATE OR REPLACE FUNCTION es_admin_o_master()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(mi_nivel_acceso() IN ('admin_software', 'master'), false);
$$;

-- RLS: perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ver_propio_perfil" ON perfiles;
CREATE POLICY "ver_propio_perfil" ON perfiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR es_admin_o_master());
DROP POLICY IF EXISTS "admin_gestiona_perfiles" ON perfiles;
CREATE POLICY "admin_gestiona_perfiles" ON perfiles
  FOR ALL TO authenticated USING (es_admin_o_master()) WITH CHECK (es_admin_o_master());

-- RLS: solicitudes_enrolamiento
ALTER TABLE solicitudes_enrolamiento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cualquiera_solicita" ON solicitudes_enrolamiento;
CREATE POLICY "cualquiera_solicita" ON solicitudes_enrolamiento
  FOR INSERT TO anon, authenticated WITH CHECK (estado = 'pendiente');
DROP POLICY IF EXISTS "admin_revisa_solicitudes" ON solicitudes_enrolamiento;
CREATE POLICY "admin_revisa_solicitudes" ON solicitudes_enrolamiento
  FOR SELECT TO authenticated USING (es_admin_o_master());
DROP POLICY IF EXISTS "admin_resuelve_solicitudes" ON solicitudes_enrolamiento;
CREATE POLICY "admin_resuelve_solicitudes" ON solicitudes_enrolamiento
  FOR UPDATE TO authenticated USING (es_admin_o_master()) WITH CHECK (es_admin_o_master());

-- ⚠️  REEMPLAZA el email por el de TU cuenta real antes de ejecutar.
--     Esto te deja como "master" (Dueño) — el único nivel que ve el
--     selector "Ver como" para previsualizar cada departamento.
INSERT INTO perfiles (id, nombre_completo, email, departamento, puesto, nivel_acceso)
SELECT id, 'Administración', email, 'directiva', 'Dueño', 'master'
FROM auth.users
WHERE email = 'CAMBIA_ESTO@tu-correo.com'
ON CONFLICT (id) DO UPDATE SET nivel_acceso = 'master', departamento = 'directiva';


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 3 · Log de errores
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_log (
  id           BIGSERIAL PRIMARY KEY,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario      TEXT,
  departamento TEXT,
  archivo      TEXT,
  mensaje      TEXT NOT NULL,
  stack        TEXT,
  resuelto     BOOLEAN NOT NULL DEFAULT FALSE,
  resuelto_en  TIMESTAMPTZ,
  resuelto_por UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS idx_error_log_creado   ON error_log(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_resuelto ON error_log(resuelto);

ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cualquiera_loguea_error" ON error_log;
CREATE POLICY "cualquiera_loguea_error" ON error_log
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin_ve_errores" ON error_log;
CREATE POLICY "admin_ve_errores" ON error_log
  FOR SELECT TO authenticated USING (es_admin_o_master());
DROP POLICY IF EXISTS "admin_resuelve_errores" ON error_log;
CREATE POLICY "admin_resuelve_errores" ON error_log
  FOR UPDATE TO authenticated USING (es_admin_o_master()) WITH CHECK (es_admin_o_master());


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 4 · RLS en las tablas nuevas (acceso para usuarios con login)
--  Si ya corriste migration_habilitar_rls.sql con éxito, esto solo
--  re-asegura las 3 tablas de la Sección 1.
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'trabajadores', 'entregas_herramientas', 'entregas_herramientas_items'
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
--  FIN. Tras ejecutar:
--   1) Entra a la app con la cuenta del email de la Sección 2.
--   2) Verás el selector "Ver como" (barra lateral + inicio) para
--      previsualizar cada departamento.
--   3) Aprueba al resto del personal desde /admin/solicitudes.
-- =====================================================================
