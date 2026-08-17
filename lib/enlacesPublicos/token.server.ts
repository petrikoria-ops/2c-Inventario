// Generación y validación del token de los enlaces públicos. La validación
// es el único punto de control de acceso de /api/publico/[token]/* — esas
// rutas usan getSupabaseAdmin() (service_role, sin RLS), así que todo el
// aislamiento entre registros depende de chequear acá que el token exista,
// esté activo y no haya vencido.
import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { EnlacePublico } from '@/types'

export function generarToken(): string {
  return randomBytes(24).toString('base64url')
}

type ResultadoValidacion =
  | { ok: true; enlace: EnlacePublico }
  | { ok: false; error: NextResponse }

export async function validarToken(token: string): Promise<ResultadoValidacion> {
  const sb = getSupabaseAdmin()
  const { data: enlace } = await sb.from('enlaces_publicos').select('*').eq('token', token).maybeSingle()

  if (!enlace) {
    return { ok: false, error: NextResponse.json({ error: 'Este enlace no existe.' }, { status: 404 }) }
  }
  if (!enlace.activo) {
    return { ok: false, error: NextResponse.json({ error: 'Este enlace fue desactivado.' }, { status: 410 }) }
  }
  if (new Date(enlace.expira_en) < new Date()) {
    return { ok: false, error: NextResponse.json({ error: 'Este enlace venció.' }, { status: 410 }) }
  }
  return { ok: true, enlace: enlace as EnlacePublico }
}

// Se llama (sin bloquear la respuesta) después de cada escritura exitosa
// vía un enlace público, para que el panel interno (CompartirEnlaceModal)
// muestre cuándo fue la última vez que alguien tocó el formulario.
export function tocarEnlace(enlaceId: number) {
  const sb = getSupabaseAdmin()
  sb.from('enlaces_publicos').update({ ultima_actividad_en: new Date().toISOString() }).eq('id', enlaceId).then(
    () => {}, () => {},
  )
}
