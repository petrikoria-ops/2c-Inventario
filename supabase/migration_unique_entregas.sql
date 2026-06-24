-- ============================================================
-- Unicidad de numero en entregas_herramientas
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================
-- A diferencia de vales_despacho.numero y solicitudes_compra.numero,
-- entregas_herramientas.numero no tenía UNIQUE: dos entregas creadas casi
-- al mismo tiempo podían terminar con el mismo número EH-YYYY-NNN sin que
-- la base lo rechazara. La app ya reintenta ante una colisión
-- (app/api/herramientas/entregar/route.ts), esto la respalda a nivel de BD.

-- Verificar primero que no haya duplicados (no debería haberlos):
-- SELECT numero, COUNT(*) FROM entregas_herramientas GROUP BY numero HAVING COUNT(*) > 1;

ALTER TABLE entregas_herramientas
  ADD CONSTRAINT uq_entregas_herramientas_numero UNIQUE (numero);
