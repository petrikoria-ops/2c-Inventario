-- =====================================================================
--  Permiso individual "puede enviar mensajes" — otorgable a cualquier
--  persona desde el panel de Usuarios, sin tener que subirla a nivel
--  master/admin_software.
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Requiere haber corrido antes migration_mensajeria.sql y
--  migration_mensajes_notificacion.sql.
--  Idempotente: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION,
--  DROP POLICY IF EXISTS + CREATE POLICY.
-- =====================================================================

ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS puede_enviar_mensajes BOOLEAN NOT NULL DEFAULT FALSE;

-- Reemplaza el chequeo de mi_nivel_acceso() IN (...) que usaba la política
-- de INSERT — ahora también deja pasar a quien tenga el flag individual
-- activado, sin importar su nivel_acceso.
CREATE OR REPLACE FUNCTION mi_puede_enviar_mensajes()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT nivel_acceso IN ('master', 'admin_software') OR puede_enviar_mensajes
     FROM perfiles WHERE id = auth.uid() AND activo = true),
    false
  );
$$;

DROP POLICY IF EXISTS "enviar_como_uno_mismo" ON mensajes;
CREATE POLICY "enviar_como_uno_mismo" ON mensajes
  FOR INSERT TO authenticated
  WITH CHECK (remitente_id = auth.uid() AND mi_puede_enviar_mensajes());

-- =====================================================================
--  FIN.
-- =====================================================================
