-- =====================================================================
--  Presencia en vivo + Mensajería directa 1:1
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada.
--
--  A diferencia del resto del proyecto (RLS permisiva, la autorización real
--  vive en las rutas /api/*), esta tabla SÍ necesita RLS real: Supabase
--  Realtime lee directo de la réplica de Postgres, sin pasar por ninguna
--  ruta API — si `mensajes` tuviera RLS permisiva, cualquier usuario podría
--  suscribirse a la conversación de cualquier otro.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  1 · Tabla de mensajes 1:1
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensajes (
  id               BIGSERIAL PRIMARY KEY,
  remitente_id     UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  destinatario_id  UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  contenido        TEXT NOT NULL,
  leido_en         TIMESTAMPTZ,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para traer una conversación completa (A→B y B→A) ordenada por
-- fecha en una sola consulta, sin importar quién le escribió a quién primero.
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion
  ON mensajes(LEAST(remitente_id, destinatario_id), GREATEST(remitente_id, destinatario_id), creado_en);

CREATE INDEX IF NOT EXISTS idx_mensajes_no_leidos ON mensajes(destinatario_id) WHERE leido_en IS NULL;

-- ─────────────────────────────────────────────────────────────────────
--  2 · RLS real (no el patrón permisivo del resto del proyecto)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leer_propias_conversaciones" ON mensajes;
CREATE POLICY "leer_propias_conversaciones" ON mensajes
  FOR SELECT TO authenticated
  USING (remitente_id = auth.uid() OR destinatario_id = auth.uid());

DROP POLICY IF EXISTS "enviar_como_uno_mismo" ON mensajes;
CREATE POLICY "enviar_como_uno_mismo" ON mensajes
  FOR INSERT TO authenticated
  WITH CHECK (remitente_id = auth.uid());

DROP POLICY IF EXISTS "marcar_leido_propio" ON mensajes;
CREATE POLICY "marcar_leido_propio" ON mensajes
  FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid()) WITH CHECK (destinatario_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
--  3 · Directorio básico — SECURITY DEFINER para no tener que abrir una
--  política de SELECT nueva sobre toda `perfiles` (hoy solo se ve la fila
--  propia o, si eres admin, todas — eso expondría email/nivel_acceso/
--  licencia SEC a cualquier perfil con sesión). Mismo patrón que
--  mi_nivel_acceso()/es_admin_o_master() en migration_roles_y_perfiles.sql.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION perfiles_directorio()
RETURNS TABLE(id UUID, nombre_completo TEXT, departamento TEXT, puesto TEXT)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT id, nombre_completo, departamento, puesto FROM perfiles
  WHERE activo = true AND id != auth.uid()
  ORDER BY nombre_completo;
$$;

-- ─────────────────────────────────────────────────────────────────────
--  4 · Realtime — mismo guard idempotente que schema.sql ya usa para
--  materiales/movimientos (ADD TABLE sin guarda falla si ya es miembro).
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensajes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;
  END IF;
END $$;

-- =====================================================================
--  FIN.
-- =====================================================================
