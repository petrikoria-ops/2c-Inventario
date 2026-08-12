import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable, getPerfil } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('avances_obra')
    .select('*,avances_obra_items(*)')
    .eq('proyecto_id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('avance_obra')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const body = await req.json()
  const etapas: { etapa: string; descripcion?: string; fecha_estimada?: string }[] = body.etapas ?? []

  const { data: avance, error } = await sb
    .from('avances_obra')
    .insert({
      proyecto_id: parseInt(params.id, 10),
      creado_por: perfil?.id ?? null,
      creado_por_nombre: perfil?.nombre_completo ?? null,
      notas: body.notas ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya existe un plan de avance para esta obra' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (etapas.length) {
    const toInsert = etapas.map((e, i) => ({
      avance_id: avance.id,
      orden: i,
      etapa: String(e.etapa ?? '').trim(),
      descripcion: e.descripcion ?? null,
      fecha_estimada: e.fecha_estimada ?? null,
    })).filter(e => e.etapa)

    const { error: itemsError } = await sb.from('avances_obra_items').insert(toInsert)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  const { data: completo } = await sb
    .from('avances_obra')
    .select('*,avances_obra_items(*)')
    .eq('id', avance.id)
    .single()

  return NextResponse.json(completo, { status: 201 })
}
