-- =====================================================================
--  Permisos granulares por puesto (ver / crear / modificar) + excepciones
--  por usuario individual
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / ON CONFLICT DO NOTHING): se puede
--  re-ejecutar sin romper nada. Corre las 3 secciones EN ORDEN.
--
--  Reemplaza la tabla estática MODULOS_POR_DEPARTAMENTO que vivía en
--  lib/auth/permisos.ts: antes el permiso era por departamento (6 grupos,
--  'no'/'lectura'/'completo'); ahora es por PUESTO específico (~20 roles)
--  y con 3 acciones independientes (ver/crear/modificar), editable desde
--  /admin/permisos sin tocar código.
--
--  El seed de abajo preserva el comportamiento efectivo que existía antes
--  de esta migración — es el punto de partida, no el diseño final. La
--  gracia de /admin/permisos es que el dueño del negocio pueda ahora
--  diferenciar 'operador' de 'encargado' puesto por puesto sin pedirlo
--  por chat. Los puestos con nivel_acceso 'master' o 'admin_software'
--  (Dueño, Jefe directivo, Administrador de software) NO tienen filas acá
--  a propósito: siguen con bypass total en código (NIVELES_TOTALES),
--  igual que antes.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 1 · Tablas
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permisos_puesto (
  id             BIGSERIAL PRIMARY KEY,
  departamento   TEXT NOT NULL,
  puesto         TEXT NOT NULL,
  modulo         TEXT NOT NULL,
  ver            BOOLEAN NOT NULL DEFAULT FALSE,
  crear          BOOLEAN NOT NULL DEFAULT FALSE,
  modificar      BOOLEAN NOT NULL DEFAULT FALSE,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE permisos_puesto
    ADD CONSTRAINT uq_permisos_puesto UNIQUE (departamento, puesto, modulo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_permisos_puesto_lookup ON permisos_puesto(departamento, puesto);

CREATE TABLE IF NOT EXISTS permisos_usuario_overrides (
  id           BIGSERIAL PRIMARY KEY,
  usuario_id   UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  modulo       TEXT NOT NULL,
  ver          BOOLEAN,   -- NULL = hereda del puesto; TRUE/FALSE = override explícito
  crear        BOOLEAN,
  modificar    BOOLEAN,
  notas        TEXT,
  creado_por   UUID REFERENCES auth.users(id),
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE permisos_usuario_overrides
    ADD CONSTRAINT uq_permisos_override UNIQUE (usuario_id, modulo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_permisos_override_usuario ON permisos_usuario_overrides(usuario_id);

CREATE OR REPLACE TRIGGER trg_permisos_puesto_actualizado_en
  BEFORE UPDATE ON permisos_puesto
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();


-- ─────────────────────────────────────────────────────────────────────
--  SECCIÓN 2 · RLS — mismo patrón permisivo que el resto del proyecto.
--  La autorización real la dan las API routes /api/admin/permisos/* con
--  requireAdmin() (solo admin_software/master pueden tocar estas tablas).
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['permisos_puesto', 'permisos_usuario_overrides'])
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
--  SECCIÓN 3 · Seed — preserva el comportamiento efectivo previo a esta
--  migración, expresado ahora por puesto. ON CONFLICT DO NOTHING para
--  que re-ejecutar la migración no pise ajustes ya hechos desde
--  /admin/permisos.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar) VALUES

-- BODEGA — materiales/herramientas/movimientos/proveedores/compras/etiquetas/agente
-- eran 'completo'; proyectos era 'lectura'.
('bodega', 'Ayudante de bodega', 'materiales',   true,  false, false),
('bodega', 'Ayudante de bodega', 'herramientas', true,  false, false),
('bodega', 'Ayudante de bodega', 'movimientos',  true,  false, false),
('bodega', 'Ayudante de bodega', 'proveedores',  true,  false, false),
('bodega', 'Ayudante de bodega', 'compras',      true,  false, false),
('bodega', 'Ayudante de bodega', 'proyectos',    true,  false, false),
('bodega', 'Ayudante de bodega', 'etiquetas',    true,  false, false),
('bodega', 'Ayudante de bodega', 'agente',       true,  false, false),

('bodega', 'Chofer-bodeguero', 'materiales',   true, true, true),
('bodega', 'Chofer-bodeguero', 'herramientas', true, true, true),
('bodega', 'Chofer-bodeguero', 'movimientos',  true, true, true),
('bodega', 'Chofer-bodeguero', 'proveedores',  true, true, true),
('bodega', 'Chofer-bodeguero', 'compras',      true, true, true),
('bodega', 'Chofer-bodeguero', 'etiquetas',    true, true, true),
('bodega', 'Chofer-bodeguero', 'agente',       true, true, true),
('bodega', 'Chofer-bodeguero', 'proyectos',    true, false, false),

('bodega', 'Encargado de bodega', 'materiales',   true, true, true),
('bodega', 'Encargado de bodega', 'herramientas', true, true, true),
('bodega', 'Encargado de bodega', 'movimientos',  true, true, true),
('bodega', 'Encargado de bodega', 'proveedores',  true, true, true),
('bodega', 'Encargado de bodega', 'compras',      true, true, true),
('bodega', 'Encargado de bodega', 'etiquetas',    true, true, true),
('bodega', 'Encargado de bodega', 'agente',       true, true, true),
('bodega', 'Encargado de bodega', 'proyectos',    true, false, false),

('bodega', 'Ayudante de encargado', 'materiales',   true, true, true),
('bodega', 'Ayudante de encargado', 'herramientas', true, true, true),
('bodega', 'Ayudante de encargado', 'movimientos',  true, true, true),
('bodega', 'Ayudante de encargado', 'proveedores',  true, true, true),
('bodega', 'Ayudante de encargado', 'compras',      true, true, true),
('bodega', 'Ayudante de encargado', 'etiquetas',    true, true, true),
('bodega', 'Ayudante de encargado', 'agente',       true, true, true),
('bodega', 'Ayudante de encargado', 'proyectos',    true, false, false),

-- TALLER — herramientas/proyectos/recursos_tecnicos/checklist/etiquetas/agente
-- eran 'completo'; movimientos/materiales eran 'lectura'.
('taller', 'Ayudante de maestro', 'herramientas',      true, false, false),
('taller', 'Ayudante de maestro', 'movimientos',       true, false, false),
('taller', 'Ayudante de maestro', 'proyectos',         true, false, false),
('taller', 'Ayudante de maestro', 'recursos_tecnicos', true, false, false),
('taller', 'Ayudante de maestro', 'checklist',         true, false, false),
('taller', 'Ayudante de maestro', 'etiquetas',         true, false, false),
('taller', 'Ayudante de maestro', 'agente',            true, false, false),
('taller', 'Ayudante de maestro', 'materiales',        true, false, false),

('taller', 'Maestro tablerista', 'herramientas',      true, true, true),
('taller', 'Maestro tablerista', 'proyectos',         true, true, true),
('taller', 'Maestro tablerista', 'recursos_tecnicos', true, true, true),
('taller', 'Maestro tablerista', 'checklist',         true, true, true),
('taller', 'Maestro tablerista', 'etiquetas',         true, true, true),
('taller', 'Maestro tablerista', 'agente',            true, true, true),
('taller', 'Maestro tablerista', 'movimientos',       true, false, false),
('taller', 'Maestro tablerista', 'materiales',        true, false, false),

('taller', 'Encargado de taller', 'herramientas',      true, true, true),
('taller', 'Encargado de taller', 'proyectos',         true, true, true),
('taller', 'Encargado de taller', 'recursos_tecnicos', true, true, true),
('taller', 'Encargado de taller', 'checklist',         true, true, true),
('taller', 'Encargado de taller', 'etiquetas',         true, true, true),
('taller', 'Encargado de taller', 'agente',            true, true, true),
('taller', 'Encargado de taller', 'movimientos',       true, false, false),
('taller', 'Encargado de taller', 'materiales',        true, false, false),

('taller', 'Ayudante de encargado', 'herramientas',      true, true, true),
('taller', 'Ayudante de encargado', 'proyectos',         true, true, true),
('taller', 'Ayudante de encargado', 'recursos_tecnicos', true, true, true),
('taller', 'Ayudante de encargado', 'checklist',         true, true, true),
('taller', 'Ayudante de encargado', 'etiquetas',         true, true, true),
('taller', 'Ayudante de encargado', 'agente',            true, true, true),
('taller', 'Ayudante de encargado', 'movimientos',       true, false, false),
('taller', 'Ayudante de encargado', 'materiales',        true, false, false),

-- OFICINA TÉCNICA — compras/proyectos/recursos_tecnicos/agente eran
-- 'completo'; materiales/proveedores eran 'lectura'. metricas es aparte
-- (ver disponible desde nivel jefe_departamento hacia arriba, en
-- cualquier departamento).
('oficina_tecnica', 'Jefe de oficina técnica', 'compras',            true, true, true),
('oficina_tecnica', 'Jefe de oficina técnica', 'proyectos',          true, true, true),
('oficina_tecnica', 'Jefe de oficina técnica', 'recursos_tecnicos',  true, true, true),
('oficina_tecnica', 'Jefe de oficina técnica', 'agente',             true, true, true),
('oficina_tecnica', 'Jefe de oficina técnica', 'materiales',         true, false, false),
('oficina_tecnica', 'Jefe de oficina técnica', 'proveedores',        true, false, false),
('oficina_tecnica', 'Jefe de oficina técnica', 'metricas',           true, false, false),

('oficina_tecnica', 'Proyectista / ingeniero', 'compras',           true, true, true),
('oficina_tecnica', 'Proyectista / ingeniero', 'proyectos',         true, true, true),
('oficina_tecnica', 'Proyectista / ingeniero', 'recursos_tecnicos', true, true, true),
('oficina_tecnica', 'Proyectista / ingeniero', 'agente',            true, true, true),
('oficina_tecnica', 'Proyectista / ingeniero', 'materiales',        true, false, false),
('oficina_tecnica', 'Proyectista / ingeniero', 'proveedores',       true, false, false),

('oficina_tecnica', 'Ayudante de jefe de oficina técnica', 'compras',           true, true, true),
('oficina_tecnica', 'Ayudante de jefe de oficina técnica', 'proyectos',         true, true, true),
('oficina_tecnica', 'Ayudante de jefe de oficina técnica', 'recursos_tecnicos', true, true, true),
('oficina_tecnica', 'Ayudante de jefe de oficina técnica', 'agente',            true, true, true),
('oficina_tecnica', 'Ayudante de jefe de oficina técnica', 'materiales',        true, false, false),
('oficina_tecnica', 'Ayudante de jefe de oficina técnica', 'proveedores',       true, false, false),

('oficina_tecnica', 'Técnico junior / ingeniero junior', 'compras',           true, false, false),
('oficina_tecnica', 'Técnico junior / ingeniero junior', 'proyectos',         true, false, false),
('oficina_tecnica', 'Técnico junior / ingeniero junior', 'recursos_tecnicos', true, false, false),
('oficina_tecnica', 'Técnico junior / ingeniero junior', 'agente',            true, false, false),
('oficina_tecnica', 'Técnico junior / ingeniero junior', 'materiales',        true, false, false),
('oficina_tecnica', 'Técnico junior / ingeniero junior', 'proveedores',       true, false, false),

-- PREVENCIÓN — recursos_tecnicos/checklist/prevencion_riesgos eran
-- 'completo'; herramientas era 'lectura'.
('prevencion', 'Prevencionista', 'herramientas',       true, false, false),
('prevencion', 'Prevencionista', 'recursos_tecnicos',  true, true,  true),
('prevencion', 'Prevencionista', 'checklist',          true, true,  true),
('prevencion', 'Prevencionista', 'prevencion_riesgos', true, true,  true),

-- RECURSOS HUMANOS — trabajadores era 'completo'.
('rrhh', 'Jefe de Recursos Humanos',     'trabajadores', true, true, true),
('rrhh', 'Jefe de Recursos Humanos',     'metricas',     true, false, false),
('rrhh', 'Asistente de Recursos Humanos', 'trabajadores', true, true, true),
('rrhh', 'Practicante',                   'trabajadores', true, false, false),

-- DIRECTIVA — agente/metricas/avance_obra/verificacion_ric/pruebas_alimentadores
-- eran 'completo'; materiales/herramientas/movimientos/proveedores/compras/
-- proyectos/trabajadores/prevencion_riesgos eran 'lectura'.
('directiva', 'Jefe ejecutivo', 'agente',               true, true, true),
('directiva', 'Jefe ejecutivo', 'metricas',             true, true, true),
('directiva', 'Jefe ejecutivo', 'avance_obra',          true, true, true),
('directiva', 'Jefe ejecutivo', 'verificacion_ric',     true, true, true),
('directiva', 'Jefe ejecutivo', 'pruebas_alimentadores', true, true, true),
('directiva', 'Jefe ejecutivo', 'materiales',           true, false, false),
('directiva', 'Jefe ejecutivo', 'herramientas',         true, false, false),
('directiva', 'Jefe ejecutivo', 'movimientos',          true, false, false),
('directiva', 'Jefe ejecutivo', 'proveedores',          true, false, false),
('directiva', 'Jefe ejecutivo', 'compras',              true, false, false),
('directiva', 'Jefe ejecutivo', 'proyectos',            true, false, false),
('directiva', 'Jefe ejecutivo', 'trabajadores',         true, false, false),
('directiva', 'Jefe ejecutivo', 'prevencion_riesgos',   true, false, false),

('directiva', 'Supervisor eléctrico', 'agente',               true, true, true),
('directiva', 'Supervisor eléctrico', 'metricas',             true, true, true),
('directiva', 'Supervisor eléctrico', 'avance_obra',          true, true, true),
('directiva', 'Supervisor eléctrico', 'verificacion_ric',     true, true, true),
('directiva', 'Supervisor eléctrico', 'pruebas_alimentadores', true, true, true),
('directiva', 'Supervisor eléctrico', 'materiales',           true, false, false),
('directiva', 'Supervisor eléctrico', 'herramientas',         true, false, false),
('directiva', 'Supervisor eléctrico', 'movimientos',          true, false, false),
('directiva', 'Supervisor eléctrico', 'proveedores',          true, false, false),
('directiva', 'Supervisor eléctrico', 'compras',              true, true, true),
('directiva', 'Supervisor eléctrico', 'proyectos',            true, false, false),
('directiva', 'Supervisor eléctrico', 'trabajadores',         true, false, false),
('directiva', 'Supervisor eléctrico', 'prevencion_riesgos',   true, false, false),

-- 'Ingeniero visitante' (nivel visualización): ve todo lo de directiva
-- salvo métricas (reservada a jefe_departamento+), y además puede
-- crear/modificar en compras, avance_obra, verificación RIC y test de
-- alimentadores — excepción que antes vivía hardcodeada en
-- EXCEPCIONES_EDICION_POR_PUESTO y ahora es dato editable en /admin/permisos.
('directiva', 'Ingeniero visitante', 'materiales',            true, false, false),
('directiva', 'Ingeniero visitante', 'herramientas',          true, false, false),
('directiva', 'Ingeniero visitante', 'movimientos',           true, false, false),
('directiva', 'Ingeniero visitante', 'proveedores',           true, false, false),
('directiva', 'Ingeniero visitante', 'proyectos',             true, false, false),
('directiva', 'Ingeniero visitante', 'trabajadores',          true, false, false),
('directiva', 'Ingeniero visitante', 'prevencion_riesgos',    true, false, false),
('directiva', 'Ingeniero visitante', 'agente',                true, false, false),
('directiva', 'Ingeniero visitante', 'compras',               true, true, true),
('directiva', 'Ingeniero visitante', 'avance_obra',           true, true, true),
('directiva', 'Ingeniero visitante', 'verificacion_ric',      true, true, true),
('directiva', 'Ingeniero visitante', 'pruebas_alimentadores', true, true, true)

ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
