import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken } from '@/lib/enlacesPublicos/token.server'
import { CONFIG_MODULOS_PUBLICOS } from '@/lib/enlacesPublicos/modulos'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string } }

// Marca el registro como 'completa' y deja constancia en enlaces_publicos de
// quién lo llenó (nombre/RUT tipeados por la persona externa — no hay
// usuario/sesión de la que sacarlo). El enlace sigue activo hasta que venza
// o alguien lo revoque a mano — no es de un solo uso — así que esto se
// puede volver a llamar si hace falta corregir algo y reenviar.
export async function POST(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  const config = CONFIG_MODULOS_PUBLICOS[enlace.modulo]
  const body = await req.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const rut = typeof body.rut === 'string' ? body.rut.trim() : ''
  if (!nombre) return NextResponse.json({ error: 'Ingresa tu nombre para enviar.' }, { status: 400 })

  const sb = getSupabaseAdmin()

  const { error: estadoError } = await sb.from(config.tabla).update({ estado: 'completa' }).eq('id', enlace.registro_id)
  if (estadoError) return NextResponse.json({ error: estadoError.message }, { status: 500 })

  const { error: enlaceError } = await sb
    .from('enlaces_publicos')
    .update({
      completado_en: enlace.completado_en ?? new Date().toISOString(),
      completado_por_nombre: nombre,
      completado_por_rut: rut || null,
      ultima_actividad_en: new Date().toISOString(),
    })
    .eq('id', enlace.id)
  if (enlaceError) return NextResponse.json({ error: enlaceError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
