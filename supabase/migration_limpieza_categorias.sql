-- ============================================================================
-- Limpieza de categorías de materiales  (Ola 2 de la auditoría UX · 2026-11-28)
-- ============================================================================
--
-- CONTEXTO (verificado en producción el 2026-11-28):
-- La tabla `categorias` tenía 26 filas mezclando DOS taxonomías:
--   • Esquema NUMERADO — el que usa el catálogo real. Los 2.339 materiales
--     están TODOS aquí: "1- BANDEJAS" (662), "3 - CANALIZACION" (433), etc.
--   • Esquema con NOMBRE (ids 1–11) — el seed por defecto de la app
--     (Protecciones, Conductores y Cables, Riel DIN…): quedó con 0 materiales.
--   • "3 - CANALIZACION" estaba DUPLICADA: dos filas con el mismo nombre
--     (una con 433 materiales y otra con 45).
--
-- QUÉ HACE esta migración (idempotente: correrla de nuevo no cambia nada):
--   1. Fusiona cualquier categoría con nombre repetido en una sola fila,
--      reapuntando sus materiales. Resuelve el duplicado "3 - CANALIZACION".
--   2. Elimina las categorías VACÍAS que no siguen el patrón numerado
--      ("N - …") del catálogo real — las 11 del seed que nunca se usaron.
--
-- SEGURIDAD: va en una transacción. No modifica ningún material salvo
-- reasignar `categoria_id` de los duplicados; y solo borra categorías SIN
-- materiales (doble resguardo con NOT EXISTS). Si algo falla, revierte todo.
--
-- EJECUTAR MANUALMENTE en Supabase → SQL Editor. Resultado esperado: 14
-- categorías, todas con al menos 1 material y sin nombres repetidos.
-- ============================================================================

BEGIN;

-- 1a) Reasignar los materiales de las filas duplicadas a la fila "canónica"
--     de cada nombre (se conserva la de menor id). Para "3 - CANALIZACION"
--     conserva la id 26 (433 materiales) y le suma los 45 de la id 27.
WITH canonicos AS (
  SELECT nombre, MIN(id) AS keep_id
  FROM categorias
  GROUP BY nombre
  HAVING COUNT(*) > 1
),
duplicados AS (
  SELECT c.id AS dup_id, k.keep_id
  FROM categorias c
  JOIN canonicos k ON k.nombre = c.nombre
  WHERE c.id <> k.keep_id
)
UPDATE materiales m
SET categoria_id = d.keep_id
FROM duplicados d
WHERE m.categoria_id = d.dup_id;

-- 1b) Borrar las filas duplicadas ya vaciadas (toda fila con nombre repetido
--     que no sea la de menor id).
DELETE FROM categorias c
USING (
  SELECT nombre, MIN(id) AS keep_id
  FROM categorias
  GROUP BY nombre
  HAVING COUNT(*) > 1
) k
WHERE c.nombre = k.nombre
  AND c.id <> k.keep_id;

-- 2) Eliminar las categorías del seed con nombre que están VACÍAS: las que NO
--    siguen el patrón numerado "N - …" del catálogo real y no tienen ningún
--    material. El NOT EXISTS evita borrar cualquier categoría que sí se use.
DELETE FROM categorias c
WHERE c.nombre !~ '^[[:space:]]*[0-9]+[[:space:]]*-'
  AND NOT EXISTS (SELECT 1 FROM materiales m WHERE m.categoria_id = c.id);

COMMIT;

-- ── Verificación (opcional, correr aparte después del COMMIT) ────────────────
-- Debería listar 14 categorías, todas con materiales > 0 y sin nombres repetidos:
-- SELECT c.id, c.nombre, COUNT(m.id) AS materiales
-- FROM categorias c
-- LEFT JOIN materiales m ON m.categoria_id = c.id AND m.activo = true
-- GROUP BY c.id, c.nombre
-- ORDER BY materiales DESC;
