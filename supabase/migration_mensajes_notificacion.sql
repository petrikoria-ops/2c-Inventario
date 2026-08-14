-- =====================================================================
--  Mensajería → solo notificación (Gerencia/Admin de software envían, el
--  resto de la empresa solo recibe — no es un chat entre pares).
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Requiere haber corrido antes migration_mensajeria.sql y
--  migration_roles_y_perfiles.sql (usa la función mi_nivel_acceso()).
--  Idempotente: DROP POLICY IF EXISTS + CREATE POLICY.
-- =====================================================================

-- La política vieja dejaba insertar a CUALQUIER usuario autenticado como
-- remitente de sí mismo — el candado de "solo Gerencia/Admin envían" vivía
-- nada más en la ruta API, que no es el gate real (RLS es lo que de verdad
-- controla el INSERT, incluso desde la API, porque usa el cliente atado a
-- la sesión del usuario, no service_role).
DROP POLICY IF EXISTS "enviar_como_uno_mismo" ON mensajes;
CREATE POLICY "enviar_como_uno_mismo" ON mensajes
  FOR INSERT TO authenticated
  WITH CHECK (remitente_id = auth.uid() AND mi_nivel_acceso() IN ('master', 'admin_software'));

-- =====================================================================
--  FIN.
-- =====================================================================
