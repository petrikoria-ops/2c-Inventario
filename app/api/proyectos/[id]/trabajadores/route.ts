import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export async function GET(_: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('proyectos_trabajadores')
    .select('*,trabajadores(id,nombre,cargo,telefono)')
    .eq('proyecto_id', params.id)
    .eq('activo', true)
    .order('fecha_asignacion', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const denegado = await requireEditable('proyectos')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const proyectoId = parseInt(params.id, 10)
  const trabajadorId = parseInt(body.trabajador_id, 10)
  if (!trabajadorId) return NextResponse.json({ error: 'trabajador_id es obligatorio' }, { status: 400 })

  // Si ya existe (activo o inactivo) reactivar en vez de insertar — la
  // tabla tiene UNIQUE(proyecto_id, trabajador_id), un INSERT duplicado
  // choca con 23505.
  const { data: existente } = await sb
    .from('proyectos_trabajadores')
    .select('id,activo')
    .eq('proyecto_id', proyectoId)
    .eq('trabajador_id', trabajadorId)
    .maybeSingle()

  if (existente?.activo) {
    return NextResponse.json({ error: 'Ese trabajador ya está asignado a esta obra' }, { status: 409 })
  }

  if (existente) {
    const { data, error } = await sb
      .from('proyectos_trabajadores')
      .update({ activo: true, rol_en_obra: body.rol_en_obra ?? null, fecha_asignacion: new Date().toISOString().slice(0, 10) })
      .eq('id', existente.id)
      .select('*,trabajadores(id,nombre,cargo,telefono)')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await sb
    .from('proyectos_trabajadores')
    .insert({ proyecto_id: proyectoId, trabajador_id: trabajadorId, rol_en_obra: body.rol_en_obra ?? null })
    .select('*,trabajadores(id,nombre,cargo,telefono)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
