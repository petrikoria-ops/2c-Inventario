-- =====================================================================
--  EJECUTAR TODO — 2C Inventario · script consolidado
--  Ejecutar en: Supabase → SQL Editor → New query → Run (una sola vez,
--  de arriba a abajo). 100% IDEMPOTENTE: si algo de esto ya se corrió
--  antes, esa parte se salta sola — es seguro volver a correr el
--  archivo completo aunque tu base ya tenga todo esto aplicado.
--
--  Qué es esto: la unión, en el orden correcto de dependencias, de
--  schema.sql + las 10 migration_*.sql que había sueltas en esta
--  carpeta (schema.sql, migration_pendiente_para_push.sql,
--  migration_solicitudes.sql, migration_salidas.sql,
--  migration_factibilidad.sql, migration_habilitar_rls.sql,
--  migration_unique_entregas.sql, migration_unique_skus.sql,
--  migration_avance_obra_y_verificacion_ric.sql,
--  migration_prevencion_riesgos.sql). Los archivos originales se
--  dejan tal cual, como historial — este es el que conviene correr de
--  ahora en adelante cuando haya que dejar una base nueva al día, o
--  cuando no se sepa con certeza qué se corrió ya.
--
--  Deliberadamente NO incluidas (quedaron subsumidas por completo en
--  migration_pendiente_para_push.sql — mismas tablas, funciones y
--  políticas, sin nada adicional):
--    · migration_roles_y_perfiles.sql
--    · migration_error_log.sql
--
--  3 arreglos de idempotencia respecto a los archivos originales
--  (sin ellos, el script se corta a mitad de camino si ya corriste
--  antes las migraciones sueltas):
--    · schema.sql: ALTER PUBLICATION ... ADD TABLE ahora verifica
--      antes de agregar (fallaba si la tabla ya estaba en la
--      publicación realtime).
--    · migration_solicitudes.sql: CREATE TRIGGER → CREATE OR REPLACE
--      TRIGGER (fallaba si el trigger ya existía).
--    · migration_unique_entregas.sql / migration_unique_skus.sql:
--      ALTER TABLE ADD CONSTRAINT envuelto en el mismo bloque
--      "EXCEPTION WHEN duplicate_object" que ya usan
--      migration_pendiente_para_push.sql y migration_avance_obra_y_
--      verificacion_ric.sql (fallaban si el constraint ya existía).
--
--  ⚠️  Antes de correr: en la sección de perfiles/roles, al final,
--      hay un INSERT que deja a bchavarria@2celectricidad.com como
--      "master" — el email real usado la última vez que se corrió
--      esta parte (visto en migration_roles_y_perfiles.sql). Si esa
--      ya no es la cuenta correcta, reemplázalo antes de ejecutar.
-- =====================================================================


-- ═══════════════════════════════════════════════════════════════════
--  1 · ESQUEMA BASE (schema.sql)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categorias (
  id     BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  color  TEXT NOT NULL DEFAULT '#6c757d'
);

CREATE TABLE IF NOT EXISTS proveedores (
  id         BIGSERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  rut        TEXT,
  contacto   TEXT,
  telefono   TEXT,
  email      TEXT,
  direccion  TEXT,
  plazo_dias INTEGER NOT NULL DEFAULT 7,
  notas      TEXT,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materiales (
  id              BIGSERIAL PRIMARY KEY,
  codigo          TEXT NOT NULL UNIQUE,
  descripcion     TEXT NOT NULL,
  categoria_id    BIGINT REFERENCES categorias(id) ON DELETE SET NULL,
  unidad          TEXT NOT NULL DEFAULT 'UN',
  stock_actual    NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_minimo    NUMERIC(12,3) NOT NULL DEFAULT 0,
  ubicacion       TEXT,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  proveedor_id    BIGINT REFERENCES proveedores(id) ON DELETE SET NULL,
  codigo_barras   TEXT,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  notas           TEXT,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS herramientas (
  id                   BIGSERIAL PRIMARY KEY,
  codigo               TEXT NOT NULL UNIQUE,
  descripcion          TEXT NOT NULL,
  marca                TEXT,
  modelo               TEXT,
  numero_serie         TEXT,
  estado               TEXT NOT NULL DEFAULT 'operativa'
                         CHECK (estado IN ('operativa','en_reparacion','extraviada','dada_de_baja')),
  responsable          TEXT,
  ubicacion            TEXT,
  fecha_ultima_mant    DATE,
  frecuencia_mant_dias INTEGER,
  notas                TEXT,
  activo               BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proyectos (
  id            BIGSERIAL PRIMARY KEY,
  ot            TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  cliente       TEXT,
  descripcion   TEXT,
  estado        TEXT NOT NULL DEFAULT 'en_proceso'
                  CHECK (estado IN ('presupuesto','en_proceso','terminado','entregado','cancelado')),
  fecha_inicio  DATE,
  fecha_entrega DATE,
  notas         TEXT,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos (
  id            BIGSERIAL PRIMARY KEY,
  material_id   BIGINT NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
  tipo          TEXT NOT NULL
                  CHECK (tipo IN ('entrada','salida','ajuste','devolucion')),
  cantidad      NUMERIC(12,3) NOT NULL,
  stock_antes   NUMERIC(12,3) NOT NULL,
  stock_despues NUMERIC(12,3) NOT NULL,
  proyecto_id   BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  usuario       TEXT NOT NULL DEFAULT 'admin',
  motivo        TEXT,
  precio_unit   NUMERIC(12,2),
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas         TEXT
);

CREATE INDEX IF NOT EXISTS idx_mat_codigo      ON materiales(codigo);
CREATE INDEX IF NOT EXISTS idx_mat_categoria   ON materiales(categoria_id);
CREATE INDEX IF NOT EXISTS idx_mat_activo      ON materiales(activo);
CREATE INDEX IF NOT EXISTS idx_mov_material    ON movimientos(material_id);
CREATE INDEX IF NOT EXISTS idx_mov_proyecto    ON movimientos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_mov_fecha       ON movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_her_estado      ON herramientas(estado);

CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_materiales_updated
  BEFORE UPDATE ON materiales
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Realtime — verifica antes de agregar (ADD TABLE sin guarda falla si
-- la tabla ya es miembro de la publicación).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'materiales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE materiales;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'movimientos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE movimientos;
  END IF;
END $$;

-- RLS de estas 6 tablas se decide más abajo en la Sección 6
-- (migration_habilitar_rls.sql) — acá se dejan como estén.


-- ═══════════════════════════════════════════════════════════════════
--  2 · TRABAJADORES, ENTREGAS, ROLES/PERFILES, LOG DE ERRORES
--  (migration_pendiente_para_push.sql completo — ya incluye todo el
--  contenido de migration_roles_y_perfiles.sql y migration_error_log.sql)
-- ═══════════════════════════════════════════════════════════════════
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

DO $$ BEGIN
  ALTER TABLE entregas_herramientas
    ADD CONSTRAINT uq_entregas_herramientas_numero UNIQUE (numero);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ver_propio_perfil" ON perfiles;
CREATE POLICY "ver_propio_perfil" ON perfiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR es_admin_o_master());
DROP POLICY IF EXISTS "admin_gestiona_perfiles" ON perfiles;
CREATE POLICY "admin_gestiona_perfiles" ON perfiles
  FOR ALL TO authenticated USING (es_admin_o_master()) WITH CHECK (es_admin_o_master());

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

-- ⚠️ Email real usado la última vez (ver migration_roles_y_perfiles.sql).
-- Cambiar si ya no corresponde a la cuenta que debe quedar como "master".
INSERT INTO perfiles (id, nombre_completo, email, departamento, puesto, nivel_acceso)
SELECT id, 'Administración', email, 'directiva', 'Dueño', 'master'
FROM auth.users
WHERE email = 'bchavarria@2celectricidad.com'
ON CONFLICT (id) DO UPDATE SET nivel_acceso = 'master', departamento = 'directiva';

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


-- ═══════════════════════════════════════════════════════════════════
--  3 · SOLICITUDES DE COMPRA (migration_solicitudes.sql)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS solicitudes_compra (
  id              BIGSERIAL PRIMARY KEY,
  numero          TEXT NOT NULL UNIQUE,
  fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'comprado')),
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_compra_items (
  id                  BIGSERIAL PRIMARY KEY,
  solicitud_id        BIGINT NOT NULL REFERENCES solicitudes_compra(id) ON DELETE CASCADE,
  material_id         BIGINT REFERENCES materiales(id),
  codigo              TEXT NOT NULL,
  descripcion         TEXT NOT NULL,
  unidad              TEXT,
  cantidad_pedida     NUMERIC NOT NULL DEFAULT 1 CHECK (cantidad_pedida > 0),
  proveedor_sugerido  TEXT,
  precio_unitario     NUMERIC
);

-- Original: CREATE TRIGGER (sin OR REPLACE) — fallaba si ya existía.
CREATE OR REPLACE TRIGGER trg_solicitudes_actualizado_en
  BEFORE UPDATE ON solicitudes_compra
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE INDEX IF NOT EXISTS idx_sc_items_solicitud  ON solicitudes_compra_items (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_sc_items_material   ON solicitudes_compra_items (material_id);
CREATE INDEX IF NOT EXISTS idx_sc_estado           ON solicitudes_compra (estado);
CREATE INDEX IF NOT EXISTS idx_sc_fecha            ON solicitudes_compra (fecha DESC);

-- RLS de solicitudes_compra/items se decide en la Sección 6
-- (migration_habilitar_rls.sql) — acá se dejan como estén.


-- ═══════════════════════════════════════════════════════════════════
--  4 · VALE DE DESPACHO / SALIDAS (migration_salidas.sql)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vales_despacho (
  id            BIGSERIAL PRIMARY KEY,
  numero        TEXT NOT NULL UNIQUE,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proyecto_id   BIGINT REFERENCES proyectos(id),
  usuario       TEXT NOT NULL DEFAULT 'admin',
  motivo        TEXT,
  observaciones TEXT,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vales_despacho_items (
  id                 BIGSERIAL PRIMARY KEY,
  vale_id            BIGINT NOT NULL REFERENCES vales_despacho(id) ON DELETE CASCADE,
  material_id        BIGINT NOT NULL REFERENCES materiales(id),
  codigo             TEXT NOT NULL,
  descripcion        TEXT NOT NULL,
  unidad             TEXT,
  cantidad_entregada NUMERIC NOT NULL CHECK (cantidad_entregada > 0),
  precio_unit        NUMERIC
);


-- ═══════════════════════════════════════════════════════════════════
--  5 · BOM DE PROYECTOS / FACTIBILIDAD (migration_factibilidad.sql)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS proyectos_materiales (
  id                 BIGSERIAL PRIMARY KEY,
  proyecto_id        BIGINT NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  material_id        BIGINT REFERENCES materiales(id),
  codigo             TEXT NOT NULL,
  descripcion        TEXT NOT NULL,
  unidad             TEXT NOT NULL DEFAULT 'UN',
  cantidad_requerida NUMERIC NOT NULL DEFAULT 1 CHECK (cantidad_requerida > 0),
  notas              TEXT
);


-- ═══════════════════════════════════════════════════════════════════
--  6 · HABILITAR RLS (migration_habilitar_rls.sql) — corre al final de
--  este bloque para que todas las tablas que referencia ya existan.
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'categorias',
    'proveedores',
    'materiales',
    'herramientas',
    'proyectos',
    'proyectos_materiales',
    'movimientos',
    'trabajadores',
    'entregas_herramientas',
    'entregas_herramientas_items',
    'vales_despacho',
    'vales_despacho_items',
    'solicitudes_compra',
    'solicitudes_compra_items'
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


-- ═══════════════════════════════════════════════════════════════════
--  7 · UNICIDAD (migration_unique_entregas.sql + migration_unique_skus.sql)
--  Originales: ALTER TABLE ADD CONSTRAINT sin guarda — fallaban si el
--  constraint ya existía. Envueltos en el mismo patrón "EXCEPTION WHEN
--  duplicate_object" que ya usa el resto del proyecto.
-- ═══════════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE entregas_herramientas
    ADD CONSTRAINT uq_entregas_herramientas_numero UNIQUE (numero);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE materiales
    ADD CONSTRAINT uq_materiales_codigo UNIQUE (codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE herramientas
    ADD CONSTRAINT uq_herramientas_codigo UNIQUE (codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════
--  8 · Verificación RIC N°18/19 + Avance de obra
--  (migration_avance_obra_y_verificacion_ric.sql — ya era idempotente,
--  se incluye tal cual)
-- ═══════════════════════════════════════════════════════════════════
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

CREATE OR REPLACE TRIGGER trg_avances_obra_actualizado_en
  BEFORE UPDATE ON avances_obra
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TABLE IF NOT EXISTS verificaciones_ric (
  id                      BIGSERIAL PRIMARY KEY,
  numero                  TEXT NOT NULL UNIQUE,
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
  bloque          TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('verificacion', 'foto', 'nota')),
  orden           INTEGER NOT NULL DEFAULT 0,
  texto           TEXT NOT NULL,
  resultado       TEXT CHECK (resultado IN ('pasa', 'no_pasa', 'na')),
  foto_tomada     BOOLEAN NOT NULL DEFAULT FALSE,
  foto_url        TEXT,
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


-- ═══════════════════════════════════════════════════════════════════
--  9 · Prevención de Riesgos — Inspección de faena (checklist DS 594)
--  (migration_prevencion_riesgos.sql — ya era idempotente, se incluye
--  tal cual; ver ese archivo para más detalle/comentarios)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inspecciones_prevencion (
  id                      BIGSERIAL PRIMARY KEY,
  numero                  TEXT NOT NULL UNIQUE,
  proyecto_id             BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  centro_trabajo          TEXT NOT NULL,
  direccion               TEXT,
  comuna                  TEXT,
  mandante                TEXT,
  lugares_inspeccionados  TEXT,
  fecha                   DATE NOT NULL DEFAULT CURRENT_DATE,
  prevencionista          TEXT,
  dirigido_a              TEXT,
  n_trabajadores          TEXT,
  introduccion            TEXT,
  observaciones_generales TEXT,
  firma_prevencionista    TEXT,
  firma_encargado         TEXT,
  estado                  TEXT NOT NULL DEFAULT 'en_progreso'
                            CHECK (estado IN ('en_progreso', 'completa')),
  creado_por              UUID REFERENCES auth.users(id),
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalogo_hallazgos (
  id            TEXT PRIMARY KEY,
  checklist_n   INTEGER,
  categoria     TEXT,
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  diagnostico   TEXT NOT NULL,
  tipo          TEXT,
  riesgo        TEXT,
  nivel         TEXT CHECK (nivel IN ('CRITICO', 'ALTO', 'MEDIO', 'BAJO')),
  norma         TEXT,
  medidas_mp    TEXT[] NOT NULL DEFAULT '{}',
  medida_texto  TEXT,
  origen        TEXT,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspecciones_prevencion_items (
  id              BIGSERIAL PRIMARY KEY,
  inspeccion_id   BIGINT NOT NULL REFERENCES inspecciones_prevencion(id) ON DELETE CASCADE,
  n               INTEGER,
  item            TEXT NOT NULL,
  categoria       TEXT,
  resultado       TEXT CHECK (resultado IN ('cumple', 'no_cumple', 'na')),
  detalle         TEXT,
  nivel           TEXT CHECK (nivel IN ('CRITICO', 'ALTO', 'MEDIO', 'BAJO')),
  norma           TEXT,
  medidas_mp      TEXT[] NOT NULL DEFAULT '{}',
  medida_texto    TEXT,
  responsable     TEXT,
  plazo           TEXT,
  catalogo_id     TEXT REFERENCES catalogo_hallazgos(id) ON DELETE SET NULL,
  foto_url        TEXT,
  orden           INTEGER NOT NULL DEFAULT 0,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insp_prev_items_inspeccion ON inspecciones_prevencion_items(inspeccion_id);
CREATE INDEX IF NOT EXISTS idx_insp_prev_items_orden      ON inspecciones_prevencion_items(inspeccion_id, orden);
CREATE INDEX IF NOT EXISTS idx_insp_prev_proyecto         ON inspecciones_prevencion(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_hallazgos_checklist_n ON catalogo_hallazgos(checklist_n);

CREATE OR REPLACE TRIGGER trg_inspecciones_prevencion_actualizado_en
  BEFORE UPDATE ON inspecciones_prevencion
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE OR REPLACE TRIGGER trg_inspecciones_prevencion_items_actualizado_en
  BEFORE UPDATE ON inspecciones_prevencion_items
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

INSERT INTO storage.buckets (id, name, public)
VALUES ('prevencion-riesgos', 'prevencion-riesgos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_select_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_select_prevencion_riesgos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'prevencion-riesgos');
DROP POLICY IF EXISTS "authenticated_insert_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_insert_prevencion_riesgos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prevencion-riesgos');
DROP POLICY IF EXISTS "authenticated_update_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_update_prevencion_riesgos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'prevencion-riesgos') WITH CHECK (bucket_id = 'prevencion-riesgos');
DROP POLICY IF EXISTS "authenticated_delete_prevencion_riesgos" ON storage.objects;
CREATE POLICY "authenticated_delete_prevencion_riesgos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'prevencion-riesgos');

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'inspecciones_prevencion', 'inspecciones_prevencion_items', 'catalogo_hallazgos'
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

INSERT INTO catalogo_hallazgos (id, checklist_n, categoria, keywords, diagnostico, tipo, riesgo, nivel, norma, medidas_mp, medida_texto, origen) VALUES
('HZ-001', 1, 'Riesgo eléctrico', ARRAY['toma','tomacorriente','enchufe pared','deteriorado'], 'Tomas de corriente en mal estado / deterioradas', 'Condición subestándar', 'Contacto eléctrico directo o indirecto; cortocircuito e incendio.', 'ALTO', 'Normativa eléctrica SEC (Pliegos RIC) y DS 594 (MINSAL) (verificar versión/artículo vigente).', ARRAY['MP-15','MP-13'], 'Reparar o reemplazar las tomas de corriente dañadas y señalizar/restringir el punto hasta su corrección.', NULL),
('HZ-002', 2, 'Riesgo eléctrico', ARRAY['enchufe','cableado','equipo','deteriorado'], 'Enchufes o cableado de equipos deteriorados', 'Condición subestándar', 'Contacto eléctrico e incendio por falla en el equipo.', 'ALTO', 'Normativa eléctrica SEC (Pliegos RIC) y DS 594 (MINSAL) (verificar versión/artículo vigente).', ARRAY['MP-15','MP-12'], 'Reparar o reemplazar enchufes y cableado deteriorados; retirar de servicio el equipo hasta su corrección.', NULL),
('HZ-003', 3, 'Riesgo eléctrico', ARRAY['cable','a la vista','expuesto','tropiezo'], 'Cables a la vista que generan riesgo', 'Condición subestándar', 'Contacto eléctrico y/o tropiezo y caída a nivel.', 'ALTO', 'Normativa eléctrica SEC (Pliegos RIC) y DS 594 (MINSAL) (verificar versión/artículo vigente).', ARRAY['MP-12','MP-13'], 'Canalizar u ordenar el cableado expuesto y demarcar la zona mientras se corrige.', NULL),
('HZ-004', 4, 'Infraestructura', ARRAY['techo','filtracion','gotera','humedad'], 'Techo con filtraciones', 'Condición subestándar', 'Piso húmedo (caída a nivel), contacto agua-electricidad y daño a materiales.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reparar la filtración del techo y proteger equipos e instalaciones bajo la zona afectada.', NULL),
('HZ-005', 5, 'Orden y aseo', ARRAY['piso','irregular','sobresale','desnivel'], 'Piso irregular o con elementos que sobresalen', 'Condición subestándar', 'Caída a nivel / tropiezo.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12','MP-16'], 'Nivelar o reparar el piso, retirar los elementos que sobresalen y mantener despejada la superficie de tránsito.', NULL),
('HZ-006', 6, 'Orden y aseo', ARRAY['desorden','obstaculo','transito','pasillo'], 'Interior con desorden u obstáculos que impiden el tránsito', 'Condición subestándar', 'Caída a nivel, golpes y obstrucción de vías de tránsito/evacuación.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16','MP-13'], 'Despejar y ordenar las vías de tránsito; demarcar pasillos y mantener el orden y aseo del área.', NULL),
('HZ-007', 7, 'Orden y aseo', ARRAY['exterior','basura','acumulacion','residuos'], 'Exterior con acumulación de basura / desorden', 'Condición subestándar', 'Proliferación de vectores, caídas y riesgo de incendio.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Retirar la basura y mantener el aseo del área exterior según programa.', NULL),
('HZ-008', 8, 'Infraestructura', ARRAY['iluminacion','luz','luminaria','oscuro'], 'Iluminación interior deficiente', 'Condición subestándar', 'Caídas, golpes y fatiga visual por baja iluminación.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reponer o reforzar luminarias hasta alcanzar el nivel de iluminación adecuado a la tarea.', NULL),
('HZ-009', 9, 'Trabajo en altura', ARRAY['contenedor','segundo piso','escalera','baranda','altura'], 'Acceso a contenedor en altura sin escalera y/o baranda', 'Condición subestándar', 'Caída de distinto nivel (altura).', 'ALTO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12','MP-13'], 'Habilitar escalera y baranda de acceso normalizadas; señalizar el riesgo de caída de altura.', NULL),
('HZ-010', 10, 'Agua y saneamiento', ARRAY['agua potable','suministro','sin agua'], 'Sin suministro de agua potable en la faena', 'Condición subestándar', 'Afectación a la salud e higiene; incumplimiento sanitario.', 'ALTO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12','MP-08'], 'Gestionar el suministro de agua potable en la faena y notificar a jefatura para su provisión inmediata.', NULL),
('HZ-011', 11, 'Bienestar', ARRAY['ducha','sexo','agua caliente','insuficiente'], 'Duchas insuficientes, sin separación por sexo o sin agua caliente', 'Condición subestándar', 'Condición sanitaria y de bienestar deficiente.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Habilitar duchas separadas por sexo, con agua fría y caliente, en cantidad suficiente.', NULL),
('HZ-012', 12, 'Bienestar', ARRAY['ducha','artefacto','llave','cortina'], 'Artefactos de ducha en mal estado', 'Condición subestándar', 'Condición sanitaria deficiente; cortes o resbalones.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reparar o reponer los artefactos de ducha (llave, ducha, cortina).', NULL),
('HZ-013', 13, 'Higiene', ARRAY['ducha','limpieza','aseo','sucia'], 'Duchas en condiciones deficientes de aseo', 'Condición subestándar', 'Condición higiénica deficiente; proliferación de vectores.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Establecer rutina de limpieza y mantener las duchas en condiciones de aseo.', NULL),
('HZ-014', 14, 'Gas / seguridad', ARRAY['calentador','gas','ventilacion','recinto','CO'], 'Calentador a gas dentro de recinto o sin ventilación', 'Condición subestándar', 'Intoxicación por monóxido de carbono (CO) o explosión.', 'ALTO', 'DS 594 (MINSAL) y normativa SEC (instalaciones de gas/eléctricas) (verificar versión/artículo vigente).', ARRAY['MP-12','MP-13'], 'Reubicar el calentador a gas fuera del recinto, con ventilación adecuada; verificar hermeticidad y señalizar.', NULL),
('HZ-015', 15, 'Agua y saneamiento', ARRAY['baño','sexo','vectores','separacion'], 'Baños sin separación por sexo o expuestos a vectores', 'Condición subestándar', 'Condición sanitaria deficiente.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Separar los baños por sexo y protegerlos del ingreso de vectores.', NULL),
('HZ-016', 16, 'Higiene', ARRAY['baño','jabon','papel','agua'], 'Baños sin agua, jabón o papel', 'Condición subestándar', 'Condición higiénica deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Dotar los baños de agua, jabón y papel de forma permanente.', NULL),
('HZ-017', 17, 'Higiene', ARRAY['baño','artefacto','wc','lavamanos','cadena'], 'Artefactos de baño en mal estado', 'Condición subestándar', 'Condición sanitaria deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Reparar o reponer los artefactos de baño (WC, cadena, llave, lavamanos).', NULL),
('HZ-018', 18, 'Higiene', ARRAY['baño','limpieza','aseo','sucio'], 'Baños en condiciones deficientes de aseo', 'Condición subestándar', 'Condición higiénica deficiente; proliferación de vectores.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Establecer rutina de limpieza y mantener los baños en condiciones de aseo.', NULL),
('HZ-019', 19, 'Señalética', ARRAY['señaletica','lavado de manos','higiene'], 'Sin señalética de correcto lavado de manos', 'Condición subestándar', 'Higiene deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-13'], 'Instalar señalética de correcto lavado de manos en los servicios higiénicos.', NULL),
('HZ-020', 20, 'Agua y saneamiento', ARRAY['baño quimico','descarga','vaciado','programa'], 'Baños químicos sin programa de descarga/vaciado', 'Condición subestándar', 'Condición sanitaria deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-19'], 'Definir y registrar la frecuencia de descarga/vaciado de los baños químicos.', NULL),
('HZ-021', 21, 'Bienestar', ARRAY['vestidor','sexo','clima','desprotegido'], 'Vestidores insuficientes o desprotegidos', 'Condición subestándar', 'Condición de bienestar deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Habilitar vestidores por sexo, limpios y protegidos del clima.', NULL),
('HZ-022', 22, 'Bienestar', ARRAY['casillero','ventilado','insuficiente'], 'Casilleros insuficientes o en mal estado', 'Condición subestándar', 'Condición de bienestar deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Proveer casilleros ventilados en número igual al total de trabajadores.', NULL),
('HZ-023', 23, 'Comedor', ARRAY['comedor','aislado','vectores','contaminacion'], 'Comedor no aislado o expuesto a contaminación/vectores', 'Condición subestándar', 'Contaminación de alimentos; proliferación de vectores.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Aislar el comedor de las áreas de trabajo y protegerlo del ingreso de vectores.', NULL),
('HZ-024', 24, 'Higiene', ARRAY['comedor','limpieza','aseo','sucio'], 'Comedor en condiciones deficientes de aseo', 'Condición subestándar', 'Condición higiénica deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-16'], 'Establecer rutina de limpieza y mantener el comedor aseado.', NULL),
('HZ-025', 25, 'Comedor', ARRAY['comedor','mesa','silla','piso','lavable'], 'Mobiliario o piso del comedor inadecuado', 'Condición subestándar', 'Condición higiénica deficiente.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Dotar el comedor de mesas y sillas lavables y piso sólido de fácil limpieza.', NULL),
('HZ-026', 26, 'Comedor', ARRAY['comedor','refrigerador','lavaplatos'], 'Comedor sin refrigerador y/o lavaplatos', 'Condición subestándar', 'Condición de bienestar deficiente; conservación de alimentos.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-12'], 'Proveer refrigerador y lavaplatos en el comedor.', NULL),
('HZ-027', 27, 'Emergencia', ARRAY['evacuacion','señaletica','via de escape','emergencia'], 'Sin señalética de vías de evacuación', 'Condición subestándar', 'Demora o confusión en la evacuación ante una emergencia.', 'ALTO', 'DS 594 (MINSAL) y NCh 2189 — señalización de vías de evacuación (verificar versión/artículo vigente).', ARRAY['MP-13'], 'Instalar señalética de vías de evacuación conforme a la norma de señalización de seguridad.', NULL),
('HZ-028', 28, 'Señalética', ARRAY['epp','señaletica','uso obligatorio','proteccion'], 'Sin señalética de uso obligatorio de EPP', 'Condición subestándar', 'Exposición por no uso de elementos de protección personal.', 'MEDIO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-13'], 'Instalar señalética de uso obligatorio de EPP en accesos y áreas de trabajo.', NULL),
('HZ-029', 29, 'Emergencia', ARRAY['extintor','obstruido','acceso','operativo'], 'Extintores obstruidos, en mal estado o de difícil acceso', 'Condición subestándar', 'Demora en el control de un amago de incendio.', 'ALTO', 'NCh 1433 y DS 594 (MINSAL) — extintores portátiles (verificar versión/artículo vigente).', ARRAY['MP-12','MP-13'], 'Despejar y dejar operativos los extintores, con acceso libre y señalizado.', NULL),
('HZ-030', 30, 'Emergencia', ARRAY['extintor','cantidad','insuficiente','dotacion'], 'Cantidad de extintores insuficiente para la faena', 'Condición subestándar', 'Cobertura insuficiente ante un incendio.', 'ALTO', 'NCh 1433 y DS 594 (MINSAL) — extintores portátiles (verificar versión/artículo vigente).', ARRAY['MP-12'], 'Completar la dotación de extintores según la carga de fuego y la superficie de la faena.', NULL),
('HZ-031', 31, 'Emergencia', ARRAY['extintor','mantencion','certificacion','vencido','recarga'], 'Extintores con mantención/certificación vencida', 'Condición subestándar', 'Falla del extintor al momento de una emergencia.', 'MEDIO', 'NCh 1433 y DS 594 (MINSAL) — extintores portátiles (verificar versión/artículo vigente).', ARRAY['MP-15'], 'Gestionar la recarga y certificación vigente de los extintores.', NULL),
('HZ-032', 32, 'Emergencia', ARRAY['extintor','señaletica','ubicacion'], 'Extintores sin señalética de ubicación', 'Condición subestándar', 'Dificultad para localizar el extintor ante una emergencia.', 'MEDIO', 'NCh 1433 — ubicación y señalización de extintores portátiles (verificar versión vigente).', ARRAY['MP-13'], 'Instalar la señalética de ubicación de los extintores a la altura reglamentaria.', NULL),
('HZ-033', 33, 'Orden y aseo', ARRAY['fumadores','zona','colillas','comedor'], 'Zona de fumadores sin señalizar, sin depósito o cercana al comedor', 'Condición subestándar', 'Incendio y contaminación del comedor.', 'BAJO', 'DS 594 (MINSAL) — condiciones sanitarias y ambientales básicas (verificar artículo y versión vigente).', ARRAY['MP-13'], 'Señalizar la zona de fumadores, dotarla de depósito de colillas y alejarla del comedor.', NULL),
('HZ-034', 9, 'Trabajo en altura', ARRAY['puerta','vacio','altura','segundo piso','caida'], 'Puerta abierta hacia el vacío en altura sin señalética ni protección', 'Condición subestándar', 'Caída de distinto nivel (altura).', 'ALTO', 'DS 594 (MINSAL) — prevención de caídas de altura y señalización (verificar artículo y versión vigente).', ARRAY['MP-13','MP-12','MP-01'], 'Instalar señalética de peligro de caída de altura, uso obligatorio de arnés y de casco con barbiquejo, y de mantener la puerta cerrada; habilitar baranda o resguardo. Reinstruir al personal.', 'demo-inspeccion 2026-06-25'),
('HZ-035', NULL, 'Almacenamiento', ARRAY['carga','apilada','carrete','estiba','caida de objetos'], 'Cargas en altura mal apiladas o carretes mal estibados', 'Condición subestándar', 'Caída de objetos sobre personas.', 'MEDIO', 'DS 594 (MINSAL) — almacenamiento seguro y orden (verificar artículo y versión vigente).', ARRAY['MP-16','MP-12'], 'Apilar y estibar de forma segura, ubicar los carretes a baja altura, usar film de contención y ordenar los materiales sueltos.', 'demo-inspeccion 2026-06-25'),
('HZ-036', 32, 'Emergencia', ARRAY['extintor','piso','suelo','sin soporte','altura'], 'Extintores ubicados en el piso', 'Condición subestándar', 'Demora en el acceso al extintor ante una emergencia; deterioro del equipo.', 'BAJO', 'NCh 1433 — ubicación y señalización de extintores (verificar versión vigente; base no inferior a 0,20 m y parte superior máx. 1,30 m).', ARRAY['MP-12','MP-13'], 'Montar los extintores en soporte a la altura reglamentaria e instalar la señalética de ubicación correspondiente.', 'demo-inspeccion 2026-06-25'),
('HZ-037', 28, 'Almacenamiento', ARRAY['rack','bodega','señaletica','casco','calzado','caida de objetos'], 'Falta de señalética en racks de bodega (riesgo de caída de objetos y uso de EPP)', 'Condición subestándar', 'Caída de materiales almacenados en altura — lesiones en cabeza, cara y/o pies.', 'MEDIO', 'DS 594 (MINSAL) — condiciones de seguridad y señalización (verificar artículo y versión vigente).', ARRAY['MP-13','MP-01'], 'Instalar señalética en racks y accesos de bodega indicando el riesgo de caída de materiales y el uso obligatorio de casco y calzado de seguridad. Reinstruir al personal sobre el uso de EPP.', 'demo-inspeccion 2026-06-25')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
