-- =====================================================================
--  Solicitudes de ajuste de inventario — con aprobación
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE: se puede re-ejecutar sin romper nada. Requiere haber
--  corrido antes migration_permisos_granulares.sql y
--  migration_piramide_roles.sql.
--
--  Hoy cualquiera con `modificar` en `movimientos` puede ajustar stock
--  directo vía /api/movimientos (tipo='ajuste') — eso sigue existiendo
--  tal cual, esta tabla NO lo reemplaza. Esto es un circuito paralelo
--  para el caso puntual que describiste: un bodeguero nota que algo no
--  queda (ej. debería quedar stock y no hay), pide dejarlo en la
--  cantidad real, y el jefe de bodega (o Gerencia) aprueba antes de que
--  se toque el stock. Al aprobar, el servidor genera el mismo
--  movimiento tipo='ajuste' que generaría /api/movimientos manualmente
--  (mismo cálculo de stock_antes/stock_despues) — la solicitud queda
--  enlazada a ese movimiento para trazabilidad.
-- =====================================================================

CREATE TABLE IF NOT EXISTS solicitudes_ajuste_inventario (
  id                    BIGSERIAL PRIMARY KEY,
  numero                TEXT NOT NULL UNIQUE,        -- SA-2026-001
  material_id           BIGINT NOT NULL REFERENCES materiales(id),
  codigo                TEXT NOT NULL,
  descripcion           TEXT NOT NULL,
  stock_actual_sistema  NUMERIC NOT NULL,            -- lo que el sistema decía al momento de pedir
  cantidad_reportada    NUMERIC NOT NULL,             -- lo que hay de verdad (ej. 0)
  motivo                TEXT NOT NULL
                          CHECK (motivo IN ('conteo_fisico', 'perdida', 'dano', 'error_registro', 'otro')),
  observaciones         TEXT,
  solicitante_id        UUID REFERENCES auth.users(id),
  solicitante_nombre    TEXT NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'pendiente'
                          CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  aprobado_por          UUID REFERENCES auth.users(id),
  aprobado_por_nombre   TEXT,
  aprobado_en           TIMESTAMPTZ,
  movimiento_id         BIGINT REFERENCES movimientos(id) ON DELETE SET NULL,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sol_ajuste_material ON solicitudes_ajuste_inventario(material_id);
CREATE INDEX IF NOT EXISTS idx_sol_ajuste_estado   ON solicitudes_ajuste_inventario(estado);

CREATE OR REPLACE TRIGGER trg_sol_ajuste_actualizado_en
  BEFORE UPDATE ON solicitudes_ajuste_inventario
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

ALTER TABLE solicitudes_ajuste_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON solicitudes_ajuste_inventario;
CREATE POLICY "authenticated_full_access" ON solicitudes_ajuste_inventario
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────
--  Permisos — cualquiera de bodega puede pedirlo (`crear`); la
--  aprobación en sí la exige app-level esJefeDeBodegaOGerencia(), igual
--  que pedidos_bodega.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar) VALUES
  ('bodega', 'Encargado de bodega',    'solicitudes_ajuste', true, true, true,  true),
  ('bodega', 'Ayudante de encargado',  'solicitudes_ajuste', true, true, false, false),
  ('bodega', 'Chofer-bodeguero',       'solicitudes_ajuste', true, true, false, false),
  ('bodega', 'Bodeguero',              'solicitudes_ajuste', true, true, false, false),
  ('bodega', 'Ayudante de bodega',     'solicitudes_ajuste', true, true, false, false)
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
