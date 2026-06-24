-- ============================================================
-- Habilitar RLS en todas las tablas + política de acceso completo
-- para usuarios autenticados. El rol "anon" (sin login) queda sin
-- ningún acceso a partir de esta migración.
--
-- Requisito: la app ya debe tener login funcionando (Supabase Auth)
-- y al menos un usuario creado, o quedarás sin acceso a tus propios
-- datos. Verificado en esta sesión antes de aplicar esto.
--
-- Ejecutar en Supabase → SQL Editor → New query
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'categorias',
    'proveedores',
    'materiales',
    'herramientas',
    'proyectos',
    'proyectos_materiales',
    'movimientos',
    'trabajadores',
    'entregas_herramientas',
    'entregas_herramientas_items',
    'vales_despacho',
    'vales_despacho_items',
    'solicitudes_compra',
    'solicitudes_compra_items'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %I;', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t
    );
  END LOOP;
END $$;
