import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getPerfil, requireCrear } from '@/lib/auth/permisos.server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams: p } = new URL(req.url)
  const proyectoId = p.get('proyecto_id')

  let query = sb
    .from('tableros')
    .select('*, proyectos(id,ot,nombre), tableros_checklist(checks,completado_en)')
    .order('creado_en', { ascending: false })

  if (proyectoId) query = query.eq('proyecto_id', proyectoId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const denegado = await requireCrear('tableros')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const body = await req.json()

  const proyectoId = parseInt(body.proyecto_id, 10)
  const nombre = (body.nombre ?? '').trim()
  if (!proyectoId) return NextResponse.json({ error: 'proyecto_id es obligatorio' }, { status: 400 })
  if (!nombre)      return NextResponse.json({ error: 'El nombre del tablero es obligatorio' }, { status: 400 })

  const { data: tablero, error: errTab } = await sb
    .from('tableros')
    .insert({
      proyecto_id: proyectoId,
      nombre,
      amperaje: body.amperaje ? Number(body.amperaje) : null,
      requiere_fat_sat: !!body.requiere_fat_sat,
      creado_por: perfil?.id ?? null,
      creado_por_nombre: perfil?.nombre_completo ?? null,
    })
    .select('*, proyectos(id,ot,nombre)')
    .single()

  if (errTab) return NextResponse.json({ error: errTab.message }, { status: 500 })

  // Checklist vacío desde ya — evita tener que distinguir "sin checklist
  // creado" de "checklist en 0%" en la UI del detalle.
  const { error: errChk } = await sb.from('tableros_checklist').insert({ tablero_id: tablero.id })
  if (errChk) return NextResponse.json({ error: errChk.message }, { status: 500 })

  return NextResponse.json(tablero, { status: 201 })
}
