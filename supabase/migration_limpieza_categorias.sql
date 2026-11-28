-- ============================================================================
-- Limpieza de categorías de materiales  (Ola 2 de la auditoría UX · 2026-11-28)
-- ============================================================================
--
-- CONTEXTO (verificado en producción el 2026-11-28):
-- La tabla `categorias` tenía 26 filas mezclando DOS taxonomías:
--   • Esquema NUMERADO — el que usa el catálogo real. Los 2.339 materiales
--     están TODOS aquí: "1- BANDEJAS" (662), "3 - CANALIZACION" (433), etc.
--   • Esquema con NOMBRE (seed por defecto de la app: Protecciones, Conductores
--     y Cables, Riel DIN…): quedó con 0 materiales.
--   • "3 - CANALIZACION" estaba DUPLICADA — y con una trampa: las dos filas NO
--     tenían el nombre idéntico, una terminaba con un ESPACIO invisible
--     ("3 - CANALIZACION" id 26 con 433, vs "3 - CANALIZACION " id 27 con 45).
--
-- QUÉ HACE (idempotente: correrla de nuevo no cambia nada):
--   1. Fusiona categorías con el mismo nombre NORMALIZADO (ignora espacios
--      sobrantes), conservando la de menor id. Resuelve "3 - CANALIZACION".
--   2. Normaliza (TRIM) los nombres para que no reaparezcan duplicados invisibles.
--   3. A los materiales YA ELIMINADOS (soft-delete) que aún apuntan a una
--      categoría del seed con nombre, les quita la categoría (para poder borrarla).
--   4. Elimina las categorías del seed con nombre que quedaron sin NINGÚN
--      material (activo o inactivo).
--
-- SEGURIDAD: transacción única. Solo reasigna `categoria_id` (de duplicados y de
-- materiales ya eliminados) y borra categorías sin materiales. Si algo falla,
-- revierte todo. Resultado esperado: 14 categorías, todas con material, sin
-- nombres repetidos.
--
-- EJECUTAR MANUALMENTE en Supabase → SQL Editor.
-- ============================================================================

BEGIN;

-- 1) Fusionar categorías cuyo nombre es igual salvo espacios (conserva menor id).
--    El GROUP BY por TRIM(nombre) sí junta "3 - CANALIZACION" y "3 - CANALIZACION ".
WITH canonicos AS (
  SELECT TRIM(nombre) AS tnombre, MIN(id) AS keep_id
  FROM categorias
  GROUP BY TRIM(nombre)
  HAVING COUNT(*) > 1
),
duplicados AS (
  SELECT c.id AS dup_id, k.keep_id
  FROM categorias c
  JOIN canonicos k ON k.tnombre = TRIM(c.nombre)
  WHERE c.id <> k.keep_id
)
UPDATE materiales m
SET categoria_id = d.keep_id
FROM duplicados d
WHERE m.categoria_id = d.dup_id;

DELETE FROM categorias c
USING (
  SELECT TRIM(nombre) AS tnombre, MIN(id) AS keep_id
  FROM categorias
  GROUP BY TRIM(nombre)
  HAVING COUNT(*) > 1
) k
WHERE TRIM(c.nombre) = k.tnombre
  AND c.id <> k.keep_id;

-- 2) Normalizar nombres (quita espacios sobrantes que crean duplicados invisibles).
UPDATE categorias
SET nombre = TRIM(nombre)
WHERE nombre <> TRIM(nombre);

-- 3) Materiales ya eliminados (soft-delete) que aún apuntan a una categoría del
--    seed con nombre: se les quita la categoría para poder borrarla.
UPDATE materiales m
SET categoria_id = NULL
WHERE m.activo = false
  AND EXISTS (
    SELECT 1 FROM categorias c
    WHERE c.id = m.categoria_id
      AND c.nombre !~ '^[[:space:]]*[0-9]+[[:space:]]*-'
  );

-- 4) Eliminar las categorías del seed con nombre que quedaron SIN materiales.
--    El NOT EXISTS (sobre activos e inactivos) evita borrar cualquiera en uso.
DELETE FROM categorias c
WHERE c.nombre !~ '^[[:space:]]*[0-9]+[[:space:]]*-'
  AND NOT EXISTS (SELECT 1 FROM materiales m WHERE m.categoria_id = c.id);

COMMIT;

-- ── Verificación (opcional, correr aparte) ───────────────────────────────────
-- Debería dar 14 categorías, todas con materiales > 0 y sin nombres repetidos:
-- SELECT c.id, c.nombre, COUNT(m.id) AS materiales
-- FROM categorias c
-- LEFT JOIN materiales m ON m.categoria_id = c.id AND m.activo = true
-- GROUP BY c.id, c.nombre
-- ORDER BY materiales DESC;
