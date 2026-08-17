import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireModificar } from '@/lib/auth/permisos.server'
import { SECCIONES_DRS } from '@/lib/checklistDrs/plantilla'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// Agrega una fila dinámica (circuito, punto de termografía, sala de
// iluminación, etc.) dentro de una sección que lo permite — ver
// SeccionPlantilla.permiteAgregar en lib/checklistDrs/plantilla.ts.
export async function POST(req: NextRequest, { params }: Ctx) {
  const denegado = await requireModificar('checklist_drs')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const body = await req.json()
  const seccion = SECCIONES_DRS.find(s => s.id === body.seccion)

  if (!seccion) return NextResponse.json({ error: 'Sección inválida' }, { status: 400 })
  if (!seccion.permiteAgregar) return NextResponse.json({ error: 'Esta sección no admite filas nuevas' }, { status: 400 })

  const { data: existentes } = await sb
    .from('checklists_drs_items')
    .select('orden')
    .eq('checklist_id', params.id)
    .eq('seccion', seccion.id)
    .order('orden', { ascending: false })
    .limit(1)
  const orden = (existentes?.[0]?.orden ?? -1) + 1

  const { data, error } = await sb
    .from('checklists_drs_items')
    .insert({
      checklist_id: params.id,
      seccion: seccion.id,
      tipo: 'medicion',
      orden,
      etiqueta: body.etiqueta || 'Nuevo punto',
      editable_fila: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
