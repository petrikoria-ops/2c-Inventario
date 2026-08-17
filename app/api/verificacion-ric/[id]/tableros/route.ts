import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'
import { filasItemsTablero } from '@/lib/verificacionRic/anexoSat'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Agrega un tablero más al Anexo Opcional SAT de una verificación ya
// creada — el anexo es repetible, se va sumando un tablero a la vez a
// medida que se revisan en terreno. Al crearlo se siembra de una vez el
// checklist itemizado (ver lib/verificacionRic/anexoSat.ts) — igual de
// guiado desde el primer momento que un alimentador nuevo.
export async function POST(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('verificacion_ric')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const nombre = (body.nombre ?? '').trim()
  if (!nombre) return NextResponse.json({ error: 'El tablero necesita un nombre' }, { status: 400 })

  const verificacionId = parseInt(params.id, 10)

  const { count } = await sb
    .from('verificaciones_ric_tableros')
    .select('*', { count: 'exact', head: true })
    .eq('verificacion_id', verificacionId)

  const { data: tablero, error } = await sb
    .from('verificaciones_ric_tableros')
    .insert({
      verificacion_id: verificacionId,
      orden: count ?? 0,
      tablero_id: body.tablero_id || null,
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

  return NextResponse.json({ ...tablero, verificaciones_ric_tableros_items: items ?? [] }, { status: 201 })
}
