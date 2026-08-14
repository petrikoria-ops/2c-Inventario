-- =====================================================================
--  Asignación de tareas + itinerario personal
--  Ejecutar en: Supabase → SQL Editor → New query → Run
--
--  Todo es IDEMPOTENTE (IF NOT EXISTS / DROP POLICY IF EXISTS): se puede
--  re-ejecutar sin romper nada.
--
--  Igual que `mensajes` (migration_mensajeria.sql), esta tabla necesita
--  RLS real (no la permisiva del resto del proyecto): Realtime lee directo
--  de la réplica de Postgres, sin pasar por ninguna ruta API.
--
--  Requiere haber corrido antes migration_mensajes_notificacion.sql (usa
--  el mismo patrón de función SECURITY DEFINER que mi_puede_enviar_mensajes()).
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
--  1 · Tabla de tareas asignadas
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tareas_asignadas (
  id             BIGSERIAL PRIMARY KEY,
  asignado_por   UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  asignado_a     UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  titulo         TEXT NOT NULL,
  descripcion    TEXT,
  proyecto_id    BIGINT REFERENCES proyectos(id) ON DELETE SET NULL,
  proyecto_nombre TEXT,
  modulo         TEXT CHECK (modulo IN ('pruebas_alimentadores', 'verificacion_ric', 'prevencion_riesgos', 'avance_obra')),
  fecha_limite   DATE,
  estado         TEXT NOT NULL DEFAULT 'pendiente'
                   CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'completada')),
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respondido_en  TIMESTAMPTZ,
  completado_en  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tareas_asignado_a   ON tareas_asignadas(asignado_a);
CREATE INDEX IF NOT EXISTS idx_tareas_asignado_por ON tareas_asignadas(asignado_por);


-- ─────────────────────────────────────────────────────────────────────
--  2 · Permiso individual "puede asignar tareas" — el dueño se lo otorga
--  puntualmente a cualquier persona, sin subirla a nivel administrador+.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS puede_asignar_tareas BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION mi_puede_asignar_tareas()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT nivel_acceso IN ('master', 'admin_software', 'administrador') OR puede_asignar_tareas
     FROM perfiles WHERE id = auth.uid() AND activo = true),
    false
  );
$$;

-- Resolver el correo del destinatario para el aviso por email (POST
-- /api/tareas) — perfiles_directorio() lo excluye a propósito (ver
-- migration_mensajeria.sql), así que esto es aparte y acotado a quien ya
-- puede asignar: cualquier RPC SECURITY DEFINER es alcanzable directo por
-- cualquier usuario autenticado vía PostgREST, no solo desde esta app, así
-- que el chequeo de mi_puede_asignar_tareas() va DENTRO de la función, no
-- solo en la ruta API.
CREATE OR REPLACE FUNCTION perfil_email(target_id UUID)
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT CASE WHEN mi_puede_asignar_tareas() THEN
    (SELECT email FROM perfiles WHERE id = target_id AND activo = true)
  ELSE NULL END;
$$;


-- ─────────────────────────────────────────────────────────────────────
--  3 · RLS real
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE tareas_asignadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leer_mis_tareas" ON tareas_asignadas;
CREATE POLICY "leer_mis_tareas" ON tareas_asignadas
  FOR SELECT TO authenticated
  USING (asignado_por = auth.uid() OR asignado_a = auth.uid());

DROP POLICY IF EXISTS "asignar_si_puedo" ON tareas_asignadas;
CREATE POLICY "asignar_si_puedo" ON tareas_asignadas
  FOR INSERT TO authenticated
  WITH CHECK (asignado_por = auth.uid() AND mi_puede_asignar_tareas());

-- Fila-nivel amplia a propósito (RLS no filtra por columna) — qué campos
-- puede tocar cada lado lo controla app/api/tareas/[id]/route.ts: el
-- destinatario solo cambia `estado`/`respondido_en`/`completado_en`; quien
-- asignó solo edita título/descripción/fecha mientras siga pendiente.
DROP POLICY IF EXISTS "responder_mi_tarea" ON tareas_asignadas;
CREATE POLICY "responder_mi_tarea" ON tareas_asignadas
  FOR UPDATE TO authenticated
  USING (asignado_a = auth.uid() OR asignado_por = auth.uid())
  WITH CHECK (asignado_a = auth.uid() OR asignado_por = auth.uid());

-- Cancelar — solo quien asignó, y solo mientras el destinatario no la haya
-- respondido (una vez aceptada/rechazada queda como historial).
DROP POLICY IF EXISTS "cancelar_mi_tarea" ON tareas_asignadas;
CREATE POLICY "cancelar_mi_tarea" ON tareas_asignadas
  FOR DELETE TO authenticated
  USING (asignado_por = auth.uid() AND estado = 'pendiente');


-- ─────────────────────────────────────────────────────────────────────
--  4 · Realtime — mismo guard idempotente que ya usa schema.sql/mensajería.
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tareas_asignadas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tareas_asignadas;
  END IF;
END $$;

-- =====================================================================
--  FIN.
-- =====================================================================
