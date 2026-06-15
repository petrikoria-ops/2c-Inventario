-- ============================================================
-- Módulo: Solicitudes de Compra
-- Ejecutar en Supabase SQL Editor (Settings → SQL Editor → New query)
-- ============================================================

-- Tabla principal de solicitudes
CREATE TABLE IF NOT EXISTS solicitudes_compra (
  id              BIGSERIAL PRIMARY KEY,
  numero          TEXT NOT NULL UNIQUE,          -- SC-2025-001
  fecha           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente', 'comprado')),
  observaciones   TEXT,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

-- Ítems de cada solicitud (detalle)
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

-- Trigger para actualizar actualizado_en en cambios de estado
CREATE TRIGGER trg_solicitudes_actualizado_en
  BEFORE UPDATE ON solicitudes_compra
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Deshabilitar RLS (uso interno)
ALTER TABLE solicitudes_compra       DISABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_compra_items DISABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_sc_items_solicitud  ON solicitudes_compra_items (solicitud_id);
CREATE INDEX IF NOT EXISTS idx_sc_items_material   ON solicitudes_compra_items (material_id);
CREATE INDEX IF NOT EXISTS idx_sc_estado           ON solicitudes_compra (estado);
CREATE INDEX IF NOT EXISTS idx_sc_fecha            ON solicitudes_compra (fecha DESC);
