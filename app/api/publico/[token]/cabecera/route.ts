import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken, tocarEnlace } from '@/lib/enlacesPublicos/token.server'
import { CONFIG_MODULOS_PUBLICOS } from '@/lib/enlacesPublicos/modulos'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  const config = CONFIG_MODULOS_PUBLICOS[enlace.modulo]
  const body = await req.json()

  const patch: Record<string, unknown> = {}
  for (const campo of config.camposCabeceraEditables) {
    if (body[campo] !== undefined) patch[campo] = body[campo]
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada para guardar.' }, { status: 400 })

  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from(config.tabla)
    .update(patch)
    .eq('id', enlace.registro_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  tocarEnlace(enlace.id)
  return NextResponse.json(data)
}
