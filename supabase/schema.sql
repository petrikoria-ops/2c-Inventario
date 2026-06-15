-- ══════════════════════════════════════════════════════════════
-- Esquema 2C Electricidad — Inventario
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════

-- ─── CATEGORÍAS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id     BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  color  TEXT NOT NULL DEFAULT '#6c757d'
);

-- ─── PROVEEDORES ───────────────────────────────────────────────
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

-- ─── MATERIALES ────────────────────────────────────────────────
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

-- ─── HERRAMIENTAS ──────────────────────────────────────────────
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

-- ─── PROYECTOS ─────────────────────────────────────────────────
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

-- ─── MOVIMIENTOS ───────────────────────────────────────────────
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

-- ─── ÍNDICES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mat_codigo      ON materiales(codigo);
CREATE INDEX IF NOT EXISTS idx_mat_categoria   ON materiales(categoria_id);
CREATE INDEX IF NOT EXISTS idx_mat_activo      ON materiales(activo);
CREATE INDEX IF NOT EXISTS idx_mov_material    ON movimientos(material_id);
CREATE INDEX IF NOT EXISTS idx_mov_proyecto    ON movimientos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_mov_fecha       ON movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_her_estado      ON herramientas(estado);

-- ─── FUNCIÓN: actualiza updated_at automáticamente ─────────────
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

-- ─── HABILITAR REALTIME ────────────────────────────────────────
-- Permite que el frontend reciba cambios en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE materiales;
ALTER PUBLICATION supabase_realtime ADD TABLE movimientos;

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────
-- Deshabilitado para app interna sin autenticación.
-- Para producción pública: habilitar RLS y crear políticas.
ALTER TABLE categorias   DISABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores  DISABLE ROW LEVEL SECURITY;
ALTER TABLE materiales   DISABLE ROW LEVEL SECURITY;
ALTER TABLE herramientas DISABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos    DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos  DISABLE ROW LEVEL SECURITY;
