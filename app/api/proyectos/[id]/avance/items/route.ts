import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

// Agrega una etapa a un plan de avance ya existente para este proyecto.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denegado = await requireEditable('avance_obra')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  if (!body.etapa?.trim()) return NextResponse.json({ error: 'La etapa es obligatoria' }, { status: 400 })

  const { data: avance } = await sb
    .from('avances_obra')
    .select('id')
    .eq('proyecto_id', params.id)
    .single()

  if (!avance) return NextResponse.json({ error: 'Esta obra no tiene plan de avance' }, { status: 404 })

  const { count } = await sb
    .from('avances_obra_items')
    .select('*', { count: 'exact', head: true })
    .eq('avance_id', avance.id)

  const { data, error } = await sb
    .from('avances_obra_items')
    .insert({
      avance_id: avance.id,
      orden: count ?? 0,
      etapa: body.etapa.trim(),
      descripcion: body.descripcion || null,
      fecha_estimada: body.fecha_estimada || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
