import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'
import { esModuloPublico, CONFIG_MODULOS_PUBLICOS } from '@/lib/enlacesPublicos/modulos'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Revocar (activo:false) o extender la fecha de vencimiento (expira_en) de
// un enlace ya creado. El permiso se valida contra el módulo del enlace, no
// contra el body — así nadie puede reactivar un enlace de un módulo al que
// no tiene acceso mandando otro `modulo` en el PATCH.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data: enlace } = await sb.from('enlaces_publicos').select('modulo').eq('id', params.id).maybeSingle()
  if (!enlace || !esModuloPublico(enlace.modulo)) return NextResponse.json({ error: 'Enlace no encontrado.' }, { status: 404 })

  const denegado = await requireModificar(CONFIG_MODULOS_PUBLICOS[enlace.modulo].permisoModulo)
  if (denegado) return denegado

  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (typeof body.activo === 'boolean') patch.activo = body.activo
  if (body.expira_en) patch.expira_en = body.expira_en

  const { data, error } = await sb.from('enlaces_publicos').update(patch).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
