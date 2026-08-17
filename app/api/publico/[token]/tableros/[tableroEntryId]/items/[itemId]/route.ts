import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken, tocarEnlace } from '@/lib/enlacesPublicos/token.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string; tableroEntryId: string; itemId: string } }

// Un punto de verificación itemizado del Anexo SAT, vía enlace público —
// mismo criterio que app/api/verificacion-ric/[id]/tableros/[tableroEntryId]/items/[itemId]/route.ts,
// solo que valida el enlace en vez de la sesión.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  if (enlace.modulo !== 'verificacion_ric') {
    return NextResponse.json({ error: 'Este módulo no tiene Anexo SAT.' }, { status: 400 })
  }

  const body = await req.json()
  if (body.resultado === undefined) return NextResponse.json({ error: 'Nada para guardar.' }, { status: 400 })

  const sb = getSupabaseAdmin()

  // El ítem no tiene FK directa a verificacion_id — se valida en dos
  // pasos: el tablero pertenece a este enlace, y el ítem pertenece a ese
  // tablero (mismo criterio de ownership que la ruta de tableros).
  const { data: tablero } = await sb.from('verificaciones_ric_tableros')
    .select('id').eq('id', params.tableroEntryId).eq('verificacion_id', enlace.registro_id).maybeSingle()
  if (!tablero) return NextResponse.json({ error: 'Ese tablero no pertenece a este enlace.' }, { status: 404 })

  const { data, error } = await sb
    .from('verificaciones_ric_tableros_items')
    .update({ resultado: body.resultado })
    .eq('id', params.itemId)
    .eq('tablero_entry_id', params.tableroEntryId)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ese ítem no pertenece a este tablero.' }, { status: 404 })

  tocarEnlace(enlace.id)
  return NextResponse.json(data)
}
