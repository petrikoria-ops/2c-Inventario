-- ============================================================
-- Unicidad de SKU en materiales y herramientas
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

-- ⚠️  ANTES DE EJECUTAR: verificar que no existen duplicados
-- SELECT codigo, COUNT(*) n FROM materiales   GROUP BY codigo HAVING COUNT(*) > 1;
-- SELECT codigo, COUNT(*) n FROM herramientas GROUP BY codigo HAVING COUNT(*) > 1;
-- Si devuelven filas, deberás fusionar o eliminar esos duplicados primero.

ALTER TABLE materiales
  ADD CONSTRAINT uq_materiales_codigo UNIQUE (codigo);

ALTER TABLE herramientas
  ADD CONSTRAINT uq_herramientas_codigo UNIQUE (codigo);

-- ============================================================
-- Nota sobre unicidad GLOBAL (entre ambas tablas)
-- ============================================================
-- Los SKU no son únicos entre materiales Y herramientas por defecto.
-- La app garantiza unicidad global mediante la API:
--   antes de insertar, consulta AMBAS tablas (ver /api/importar/analyze).
--
-- Si quieres garantía a nivel de base de datos también, puedes crear
-- una tabla de códigos globales y referencias, o usar un trigger:
--
-- CREATE TABLE codigos_globales (
--   codigo TEXT PRIMARY KEY,
--   tabla  TEXT NOT NULL CHECK (tabla IN ('materiales','herramientas'))
-- );
-- (luego: trigger INSERT en materiales/herramientas que inserta en codigos_globales)
--
-- Para la mayoría de talleres, la validación de la app es suficiente.
-- ============================================================
