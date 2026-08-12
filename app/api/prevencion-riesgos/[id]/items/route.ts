import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Agrega un hallazgo libre, fuera de los 33 ítems del checklist DS 594
// (ej. algo detectado en una foto sin pregunta de checklist asociada —
// mismo caso que HZ-035 del catálogo de la skill: checklist_item: null).
export async function POST(req: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('prevencion_riesgos')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()

  if (!body.item?.trim()) {
    return NextResponse.json({ error: 'Describe el hallazgo' }, { status: 400 })
  }

  const { count } = await sb
    .from('inspecciones_prevencion_items')
    .select('*', { count: 'exact', head: true })
    .eq('inspeccion_id', params.id)

  const { data, error } = await sb
    .from('inspecciones_prevencion_items')
    .insert({
      inspeccion_id: params.id,
      n: null,
      item: body.item.trim(),
      categoria: body.categoria || 'Adicional',
      resultado: 'no_cumple',
      detalle: body.detalle || null,
      nivel: body.nivel || null,
      norma: body.norma || null,
      medidas_mp: body.medidas_mp || [],
      medida_texto: body.medida_texto || null,
      catalogo_id: body.catalogo_id || null,
      orden: (count ?? 0) + 1000,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
