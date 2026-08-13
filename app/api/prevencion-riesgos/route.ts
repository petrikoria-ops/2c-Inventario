import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { requireCrear, getPerfil } from '@/lib/auth/permisos.server'
import { CHECKLIST_FAENA_DS594 } from '@/lib/prevencion/checklistFaena'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer()
  const { searchParams } = new URL(req.url)
  const proyectoId = searchParams.get('proyecto')

  let query = sb.from('inspecciones_prevencion').select('*').order('fecha', { ascending: false })
  if (proyectoId) query = query.eq('proyecto_id', proyectoId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Conteo de hallazgos abiertos por inspección — una sola query extra,
  // agregada en JS (Supabase no soporta count agrupado en el select).
  const ids = (data ?? []).map(i => i.id)
  let conteos: Record<number, number> = {}
  if (ids.length) {
    const { data: hallazgos } = await sb
      .from('inspecciones_prevencion_items')
      .select('inspeccion_id')
      .in('inspeccion_id', ids)
      .eq('resultado', 'no_cumple')
    hallazgos?.forEach(h => { conteos[h.inspeccion_id] = (conteos[h.inspeccion_id] ?? 0) + 1 })
  }

  const conConteo = (data ?? []).map(i => ({ ...i, hallazgos_count: conteos[i.id] ?? 0 }))
  return NextResponse.json(conConteo)
}

export async function POST(req: NextRequest) {
  const denegado = await requireCrear('prevencion_riesgos')
  if (denegado) return denegado

  const sb = getSupabaseServer()
  const perfil = await getPerfil()
  const body = await req.json()

  if (!body.centro_trabajo?.trim()) {
    return NextResponse.json({ error: 'El centro de trabajo / faena es obligatorio' }, { status: 400 })
  }

  // Correlativo INSP-YYYY-NNN — mismo patrón de reintento ante colisión
  // de UNIQUE que /api/verificacion-ric.
  const year = new Date().getFullYear()
  const { data: last } = await sb
    .from('inspecciones_prevencion')
    .select('numero')
    .like('numero', `INSP-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const baseSeq = last?.[0]?.numero ? parseInt(last[0].numero.split('-')[2] ?? '0', 10) : 0

  let inspeccion: any = null
  let numero = ''
  let err: { message: string; code?: string } | null = null
  for (let i = 0; i <= 3; i++) {
    numero = `INSP-${year}-${String(baseSeq + 1 + i).padStart(3, '0')}`
    const res = await sb
      .from('inspecciones_prevencion')
      .insert({
        numero,
        proyecto_id: body.proyecto_id || null,
        centro_trabajo: body.centro_trabajo.trim(),
        direccion: body.direccion || null,
        comuna: body.comuna || null,
        mandante: body.mandante || null,
        lugares_inspeccionados: body.lugares_inspeccionados || null,
        fecha: body.fecha || new Date().toISOString().slice(0, 10),
        prevencionista: body.prevencionista || perfil?.nombre_completo || null,
        dirigido_a: body.dirigido_a || null,
        n_trabajadores: body.n_trabajadores || null,
        creado_por: perfil?.id ?? null,
      })
      .select()
      .single()
    if (!res.error) { inspeccion = res.data; err = null; break }
    err = res.error
    if (res.error.code !== '23505') break
  }

  if (err || !inspeccion) return NextResponse.json({ error: err?.message ?? 'Error al crear la inspección' }, { status: 500 })

  // Sembrar los 33 ítems del checklist DS 594 — se copian los valores
  // por defecto (nivel/norma/medidas), no se referencia la plantilla,
  // para que una inspección ya creada no cambie si se edita después.
  const itemsRows = CHECKLIST_FAENA_DS594.map(it => ({
    inspeccion_id: inspeccion.id,
    n: it.n,
    item: it.item,
    categoria: it.categoria,
    nivel: it.nivel_default,
    norma: it.norma.join(','),
    medidas_mp: it.mp,
    medida_texto: it.hallazgo,
    orden: it.n,
  }))
  const { error: itemsErr } = await sb.from('inspecciones_prevencion_items').insert(itemsRows)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ id: inspeccion.id, numero }, { status: 201 })
}
