import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken, tocarEnlace } from '@/lib/enlacesPublicos/token.server'
import { filasItemsTablero } from '@/lib/verificacionRic/anexoSat'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string } }

// Agrega un tablero al Anexo SAT desde el enlace público — el Anexo SAT
// solo existe en Verificación RIC. A propósito NO acepta `tablero_id`: quien
// llena por enlace público no tiene por qué ver la lista interna de
// tableros de Taller (nombres/amperajes) — ese vínculo se hace después,
// desde adentro, si hace falta.
export async function POST(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  if (enlace.modulo !== 'verificacion_ric') {
    return NextResponse.json({ error: 'Este módulo no tiene Anexo SAT.' }, { status: 400 })
  }

  const body = await req.json()
  const nombre = (body.nombre ?? '').trim()
  if (!nombre) return NextResponse.json({ error: 'El tablero necesita un nombre' }, { status: 400 })

  const sb = getSupabaseAdmin()
  const { count } = await sb
    .from('verificaciones_ric_tableros')
    .select('*', { count: 'exact', head: true })
    .eq('verificacion_id', enlace.registro_id)

  const { data: tablero, error } = await sb
    .from('verificaciones_ric_tableros')
    .insert({
      verificacion_id: enlace.registro_id,
      orden: count ?? 0,
      numero_tablero: body.numero_tablero || null,
      nombre,
      tipo: body.tipo || null,
      tipo_tablero_id: body.tipo_tablero_id || null,
      fabricante: body.fabricante || null,
      ui: body.ui || null,
      in_nominal: body.in_nominal || null,
    })
    .select()
    .single()

  if (error || !tablero) return NextResponse.json({ error: error?.message ?? 'Error al crear el tablero' }, { status: 500 })

  const itemsRows = filasItemsTablero(tablero.id, body.tipo_tablero_id || null)
  const { data: items, error: itemsErr } = await sb.from('verificaciones_ric_tableros_items').insert(itemsRows).select()
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  tocarEnlace(enlace.id)
  return NextResponse.json({ ...tablero, verificaciones_ric_tableros_items: items ?? [] }, { status: 201 })
}
