import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'
import { filasItemsAlimentador } from '@/lib/pruebasAlimentadores/plantilla'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Agrega un alimentador más a un informe ya creado — el mismo informe
// puede ir sumando alimentadores a medida que se avanza en la obra, todo
// queda en el mismo pruebas_alimentadores.
export async function POST(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('pruebas_alimentadores')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const nombre = (body.nombre ?? '').trim()
  if (!nombre) return NextResponse.json({ error: 'El alimentador necesita un nombre' }, { status: 400 })

  const pruebaId = parseInt(params.id, 10)

  const { count } = await sb
    .from('pruebas_alimentadores_alimentadores')
    .select('*', { count: 'exact', head: true })
    .eq('prueba_id', pruebaId)

  const { data: alimentador, error: alimentadorErr } = await sb
    .from('pruebas_alimentadores_alimentadores')
    .insert({
      prueba_id: pruebaId,
      orden: count ?? 0,
      nombre,
      proteccion_aguas_arriba: body.proteccion_aguas_arriba || null,
      largo: body.largo || null,
    })
    .select()
    .single()

  if (alimentadorErr || !alimentador) {
    return NextResponse.json({ error: alimentadorErr?.message ?? 'Error al crear el alimentador' }, { status: 500 })
  }

  const itemsRows = filasItemsAlimentador(pruebaId, alimentador.id)
  const { data: items, error: itemsErr } = await sb.from('pruebas_alimentadores_items').insert(itemsRows).select()
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ ...alimentador, pruebas_alimentadores_items: items ?? [] }, { status: 201 })
}
