import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireEditable, getPerfil } from '@/lib/auth/permisos.server'
import { ITEMS_PLANTILLA_ALIMENTADORES } from '@/lib/pruebasAlimentadores/plantilla'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams } = new URL(req.url)
  const proyectoId = searchParams.get('proyecto')

  let query = sb.from('pruebas_alimentadores').select('*').order('fecha_visita', { ascending: false })
  if (proyectoId) query = query.eq('proyecto_id', proyectoId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const denegado = await requireEditable('pruebas_alimentadores')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const body = await req.json()

  if (!body.proyecto_id) return NextResponse.json({ error: 'Selecciona una obra' }, { status: 400 })

  let proyectoNombre: string | null = null
  const { data: proyecto } = await sb.from('proyectos').select('nombre').eq('id', body.proyecto_id).maybeSingle()
  proyectoNombre = proyecto?.nombre ?? null

  // Correlativo ALIM-YYYY-NNN — mismo patrón robusto (reintento ante
  // colisión de UNIQUE) que /api/verificacion-ric.
  const year = new Date().getFullYear()
  const { data: last } = await sb
    .from('pruebas_alimentadores')
    .select('numero')
    .like('numero', `ALIM-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const baseSeq = last?.[0]?.numero ? parseInt(last[0].numero.split('-')[2] ?? '0', 10) : 0

  let prueba: any = null
  let numero = ''
  let err: { message: string; code?: string } | null = null
  for (let i = 0; i <= 3; i++) {
    numero = `ALIM-${year}-${String(baseSeq + 1 + i).padStart(3, '0')}`
    const res = await sb
      .from('pruebas_alimentadores')
      .insert({
        numero,
        proyecto_id: body.proyecto_id,
        proyecto_nombre: proyectoNombre,
        cliente_mandante: body.cliente_mandante || null,
        ubicacion: body.ubicacion || null,
        fecha_visita: body.fecha_visita || new Date().toISOString().slice(0, 10),
        inspectores: body.inspectores || null,
        identificacion_alimentador: body.identificacion_alimentador || null,
        instrumento: body.instrumento || null,
        creado_por: perfil?.id ?? null,
      })
      .select()
      .single()
    if (!res.error) { prueba = res.data; err = null; break }
    err = res.error
    if (res.error.code !== '23505') break
  }

  if (err || !prueba) return NextResponse.json({ error: err?.message ?? 'Error al crear la prueba' }, { status: 500 })

  // Sembrar los 10 ítems fijos desde la plantilla — se copia el texto, no se
  // referencia, para que una prueba ya creada no cambie si la plantilla se
  // edita después.
  const itemsRows = ITEMS_PLANTILLA_ALIMENTADORES.map(it => ({
    prueba_id: prueba.id,
    orden: it.orden,
    texto: it.texto,
  }))
  const { error: itemsErr } = await sb.from('pruebas_alimentadores_items').insert(itemsRows)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ id: prueba.id, numero }, { status: 201 })
}
