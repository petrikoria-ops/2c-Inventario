-- ============================================================
-- Vale de Despacho (Salida de Materiales)
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

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
