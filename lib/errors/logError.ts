import { getSupabaseServer } from '@/lib/supabase/server'

export interface LogErrorInput {
  mensaje: string
  stack?: string | null
  archivo?: string | null
  departamento?: string | null
  usuario?: string | null
}

// Inserta en error_log sin pedir la fila de vuelta (sin .select()) — la
// única política de SELECT de esta tabla es para admin_software/master,
// y el usuario que dispara el error casi nunca lo es. Pedir RETURNING
// rompería el insert por RLS aunque el INSERT en sí esté permitido (ya
// nos pasó exactamente esto con solicitudes_enrolamiento).
//
// Nunca lanza — si falla el log de errores, solo se avisa por consola;
// no debe convertirse en un segundo error que tape al original.
export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const sb = getSupabaseServer()
    const { data: auth } = await sb.auth.getUser().catch(() => ({ data: { user: null } }))

    await sb.from('error_log').insert({
      mensaje: input.mensaje.slice(0, 2000),
      stack: input.stack?.slice(0, 8000) ?? null,
      archivo: input.archivo ?? null,
      departamento: input.departamento ?? null,
      usuario: input.usuario ?? auth.user?.email ?? null,
      usuario_id: auth.user?.id ?? null,
    })
  } catch (err) {
    console.error('[logError] No se pudo registrar el error en error_log:', err)
  }
}
