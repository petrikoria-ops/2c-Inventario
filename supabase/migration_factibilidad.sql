-- ============================================================
-- BOM de Proyectos (Factibilidad)
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

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
