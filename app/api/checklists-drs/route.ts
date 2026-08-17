import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireCrear, getPerfil } from '@/lib/auth/permisos.server'
import { ITEMS_PLANTILLA_DRS } from '@/lib/checklistDrs/plantilla'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams } = new URL(req.url)
  const proyectoId = searchParams.get('proyecto')

  let query = sb.from('checklists_drs').select('*').order('fecha_visita', { ascending: false })
  if (proyectoId) query = query.eq('proyecto_id', proyectoId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const denegado = await requireCrear('checklist_drs')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const body = await req.json()

  if (!body.proyecto_id) return NextResponse.json({ error: 'Selecciona una obra' }, { status: 400 })

  let proyectoNombre: string | null = null
  const { data: proyecto } = await sb.from('proyectos').select('nombre').eq('id', body.proyecto_id).maybeSingle()
  proyectoNombre = proyecto?.nombre ?? null

  // Correlativo DRS-YYYY-NNN — mismo patrón robusto (reintento ante
  // colisión de UNIQUE) que /api/verificacion-ric.
  const year = new Date().getFullYear()
  const { data: last } = await sb
    .from('checklists_drs')
    .select('numero')
    .like('numero', `DRS-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const baseSeq = last?.[0]?.numero ? parseInt(last[0].numero.split('-')[2] ?? '0', 10) : 0

  let checklist: any = null
  let numero = ''
  let err: { message: string; code?: string } | null = null
  for (let i = 0; i <= 3; i++) {
    numero = `DRS-${year}-${String(baseSeq + 1 + i).padStart(3, '0')}`
    const res = await sb
      .from('checklists_drs')
      .insert({
        numero,
        proyecto_id: body.proyecto_id,
        proyecto_nombre: proyectoNombre,
        cliente_mandante: body.cliente_mandante || null,
        ubicacion: body.ubicacion || null,
        fecha_visita: body.fecha_visita || new Date().toISOString().slice(0, 10),
        inspectores: body.inspectores || null,
        num_tableros: body.num_tableros ? parseInt(body.num_tableros, 10) : null,
        creado_por: perfil?.id ?? null,
      })
      .select()
      .single()
    if (!res.error) { checklist = res.data; err = null; break }
    err = res.error
    if (res.error.code !== '23505') break
  }

  if (err || !checklist) return NextResponse.json({ error: err?.message ?? 'Error al crear el checklist' }, { status: 500 })

  // Sembrar ítems desde la plantilla — se copia etiqueta/referencia, no se
  // referencia, para que un checklist ya creado no cambie si la plantilla
  // se edita después.
  const itemsRows = ITEMS_PLANTILLA_DRS.map(it => ({
    checklist_id: checklist.id,
    seccion: it.seccion,
    tipo: it.tipo,
    orden: it.orden,
    etiqueta: it.etiqueta,
    referencia: it.referencia ?? null,
  }))
  const { error: itemsErr } = await sb.from('checklists_drs_items').insert(itemsRows)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ id: checklist.id, numero }, { status: 201 })
}
