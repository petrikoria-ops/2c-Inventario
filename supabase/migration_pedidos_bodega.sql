-- =====================================================================
--  Pedidos internos de bodega — Supervisor/Visitador piden material que
--  YA existe en stock; el jefe de bodega aprueba; bodega arma y despacha.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  IDEMPOTENTE: se puede re-ejecutar sin romper nada. Requiere haber
--  corrido antes migration_permisos_granulares.sql y
--  migration_piramide_roles.sql.
--
--  Distinto de `solicitudes_compra` a propósito: esto NO es comprarle a
--  un proveedor, es pedir contra el stock que ya está en bodega. Si al
--  armar el pedido falta algo, eso genera una solicitud de compra aparte
--  (tabla separada, sin acoplar ambos flujos).
--
--  Ciclo: pendiente → aprobado (jefe de bodega o Gerencia) → despachado
--  (bodega generó el vale de despacho) | rechazado en cualquier momento
--  antes de despachado | cancelado por quien lo pidió.
-- =====================================================================

CREATE TABLE IF NOT EXISTS pedidos_bodega (
  id                  BIGSERIAL PRIMARY KEY,
  numero              TEXT NOT NULL UNIQUE,          -- PB-2026-001
  proyecto_id         BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  solicitante_id      UUID REFERENCES auth.users(id),
  solicitante_nombre  TEXT NOT NULL,
  estado              TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'despachado', 'cancelado')),
  observaciones       TEXT,
  aprobado_por        UUID REFERENCES auth.users(id),
  aprobado_por_nombre TEXT,
  aprobado_en         TIMESTAMPTZ,
  vale_despacho_id    BIGINT REFERENCES vales_despacho(id) ON DELETE SET NULL,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedidos_bodega_items (
  id              BIGSERIAL PRIMARY KEY,
  pedido_id       BIGINT NOT NULL REFERENCES pedidos_bodega(id) ON DELETE CASCADE,
  material_id     BIGINT REFERENCES materiales(id),
  codigo          TEXT NOT NULL,
  descripcion     TEXT NOT NULL,
  unidad          TEXT,
  cantidad_pedida NUMERIC NOT NULL CHECK (cantidad_pedida > 0)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_bodega_proyecto ON pedidos_bodega(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_bodega_estado   ON pedidos_bodega(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_bodega_items    ON pedidos_bodega_items(pedido_id);

CREATE OR REPLACE TRIGGER trg_pedidos_bodega_actualizado_en
  BEFORE UPDATE ON pedidos_bodega
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['pedidos_bodega', 'pedidos_bodega_items'])
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
--  Permisos — crean Supervisor eléctrico y Visitador de obra (Directiva);
--  Bodega ve y gestiona (arma/despacha), pero la aprobación en sí la
--  exige app-level esJefeDeBodegaOGerencia() en lib/auth/permisos.ts,
--  no esta tabla — un Bodeguero con `modificar` puede marcar
--  "despachado" pero no puede aprobar/rechazar un pedido pendiente.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO permisos_puesto (departamento, puesto, modulo, ver, crear, modificar, eliminar) VALUES
  ('bodega', 'Encargado de bodega',    'pedidos_bodega', true, false, true,  true),
  ('bodega', 'Ayudante de encargado',  'pedidos_bodega', true, false, true,  false),
  ('bodega', 'Chofer-bodeguero',       'pedidos_bodega', true, false, true,  false),
  ('bodega', 'Bodeguero',              'pedidos_bodega', true, false, true,  false),
  ('bodega', 'Ayudante de bodega',     'pedidos_bodega', true, false, false, false),
  ('directiva', 'Supervisor eléctrico', 'pedidos_bodega', true, true, false, false),
  ('directiva', 'Visitador de obra',    'pedidos_bodega', true, true, false, false)
ON CONFLICT (departamento, puesto, modulo) DO NOTHING;

-- =====================================================================
--  FIN.
-- =====================================================================
