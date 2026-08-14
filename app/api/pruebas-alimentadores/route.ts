import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireCrear, getPerfil } from '@/lib/auth/permisos.server'
import { filasItemsAlimentador } from '@/lib/pruebasAlimentadores/plantilla'

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
  const denegado = await requireCrear('pruebas_alimentadores')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const body = await req.json()

  if (!body.proyecto_id) return NextResponse.json({ error: 'Selecciona una obra' }, { status: 400 })

  const alimentadoresInput: { nombre?: string; proteccion_aguas_arriba?: string; largo?: string }[] =
    Array.isArray(body.alimentadores) ? body.alimentadores : []
  const alimentadoresValidos = alimentadoresInput
    .map(a => ({ ...a, nombre: (a.nombre ?? '').trim() }))
    .filter(a => a.nombre)
  if (!alimentadoresValidos.length) {
    return NextResponse.json({ error: 'Agrega al menos un alimentador con nombre' }, { status: 400 })
  }

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

  // Un informe puede traer varios alimentadores de la misma obra — cada
  // uno se guarda como su propia fila con sus 10 mediciones fijas
  // sembradas desde la plantilla (se copia el texto, no se referencia,
  // para que un alimentador ya creado no cambie si la plantilla se edita
  // después).
  for (let i = 0; i < alimentadoresValidos.length; i++) {
    const a = alimentadoresValidos[i]
    const { data: alimentador, error: alimentadorErr } = await sb
      .from('pruebas_alimentadores_alimentadores')
      .insert({
        prueba_id: prueba.id,
        orden: i,
        nombre: a.nombre,
        proteccion_aguas_arriba: a.proteccion_aguas_arriba || null,
        largo: a.largo || null,
      })
      .select()
      .single()
    if (alimentadorErr || !alimentador) {
      return NextResponse.json({ error: alimentadorErr?.message ?? 'Error al crear el alimentador' }, { status: 500 })
    }

    const itemsRows = filasItemsAlimentador(prueba.id, alimentador.id)
    const { error: itemsErr } = await sb.from('pruebas_alimentadores_items').insert(itemsRows)
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ id: prueba.id, numero }, { status: 201 })
}
