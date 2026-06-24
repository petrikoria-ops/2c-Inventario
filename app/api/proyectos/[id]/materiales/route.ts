import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('proyectos_materiales')
    .select('*')
    .eq('proyecto_id', params.id)
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const body = await req.json()

  // Soporta inserción de un solo ítem o de un array (importación bulk)
  const rows: any[] = Array.isArray(body) ? body : [body]

  const toInsert = rows.map(r => ({
    proyecto_id:        parseInt(params.id, 10),
    material_id:        r.material_id ?? null,
    codigo:             String(r.codigo ?? '').trim().toUpperCase(),
    descripcion:        String(r.descripcion ?? '').trim(),
    unidad:             String(r.unidad ?? 'UN').trim(),
    cantidad_requerida: Math.max(parseFloat(r.cantidad_requerida ?? r.cantidad ?? 1) || 1, 0),
    notas:              r.notas ?? null,
  }))

  const invalidRow = toInsert.find(r => !r.codigo || !r.descripcion)
  if (invalidRow) {
    return NextResponse.json({ error: 'Código y descripción son obligatorios' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('proyectos_materiales')
    .insert(toInsert)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
