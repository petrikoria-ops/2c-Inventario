import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validarToken } from '@/lib/enlacesPublicos/token.server'
import { ITEMS_PLANTILLA_RIC } from '@/lib/verificacionRic/plantilla'
import { ITEMS_PLANTILLA_DRS } from '@/lib/checklistDrs/plantilla'
import { CHECKLIST_FAENA_DS594 } from '@/lib/prevencion/checklistFaena'
import { filasItemsAlimentador } from '@/lib/pruebasAlimentadores/plantilla'

export const dynamic = 'force-dynamic'

type Ctx = { params: { token: string } }

// Correlativo con reintento ante colisión de UNIQUE — mismo patrón que las
// 4 rutas internas de creación, solo parametrizado por tabla/prefijo.
async function siguienteNumero(sb: SupabaseClient, tabla: string, prefijo: string): Promise<string> {
  const year = new Date().getFullYear()
  const { data: last } = await sb.from(tabla).select('numero').like('numero', `${prefijo}-${year}-%`).order('numero', { ascending: false }).limit(1)
  const base = last?.[0]?.numero ? parseInt(last[0].numero.split('-')[2] ?? '0', 10) : 0
  return `${prefijo}-${year}-${String(base + 1).padStart(3, '0')}`
}

// Crea el registro desde cero a partir de un enlace "en blanco" (sin login).
// La obra queda como texto libre (proyecto_nombre / centro_trabajo) — no se
// vincula a un proyecto real del sistema; alguien interno puede vincularla
// después (PATCH proyecto_id en /api/<modulo>/[id]).
export async function POST(req: NextRequest, { params }: Ctx) {
  const validacion = await validarToken(params.token)
  if (!validacion.ok) return validacion.error

  const { enlace } = validacion
  if (enlace.registro_id) {
    return NextResponse.json({ error: 'Este enlace ya tiene una verificación creada.' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const body = await req.json()

  let registroId: number
  let respuesta: Record<string, unknown>

  if (enlace.modulo === 'verificacion_ric') {
    const incluyeSeccionA = body.incluye_seccion_a !== false
    const incluyeAnexoSat = body.incluye_anexo_sat === true
    if (!incluyeSeccionA && !incluyeAnexoSat) {
      return NextResponse.json({ error: 'Selecciona al menos un alcance: Sección A o Anexo SAT.' }, { status: 400 })
    }
    let cabecera: any = null
    for (let i = 0; i < 3; i++) {
      const numero = await siguienteNumero(sb, 'verificaciones_ric', 'RIC')
      const res = await sb.from('verificaciones_ric').insert({
        numero,
        proyecto_nombre: (body.obra ?? '').trim() || null,
        cliente_mandante: body.cliente_mandante || null,
        ubicacion: body.ubicacion || null,
        fecha_visita: body.fecha_visita || new Date().toISOString().slice(0, 10),
        inspectores: body.inspectores || null,
        incluye_seccion_a: incluyeSeccionA,
        incluye_anexo_sat: incluyeAnexoSat,
      }).select().single()
      if (!res.error) { cabecera = res.data; break }
      if (res.error.code !== '23505') return NextResponse.json({ error: res.error.message }, { status: 500 })
    }
    if (!cabecera) return NextResponse.json({ error: 'No se pudo crear la verificación.' }, { status: 500 })
    registroId = cabecera.id

    let items: any[] = []
    if (incluyeSeccionA) {
      const filas = ITEMS_PLANTILLA_RIC.map(it => ({ verificacion_id: registroId, bloque: it.bloque, tipo: it.tipo, orden: it.orden, texto: it.texto }))
      const { data } = await sb.from('verificaciones_ric_items').insert(filas).select()
      items = data ?? []
    }
    respuesta = { cabecera, items, alimentadores: [], tableros: [] }

  } else if (enlace.modulo === 'checklist_drs') {
    let cabecera: any = null
    for (let i = 0; i < 3; i++) {
      const numero = await siguienteNumero(sb, 'checklists_drs', 'DRS')
      const res = await sb.from('checklists_drs').insert({
        numero,
        proyecto_nombre: (body.obra ?? '').trim() || null,
        cliente_mandante: body.cliente_mandante || null,
        ubicacion: body.ubicacion || null,
        fecha_visita: body.fecha_visita || new Date().toISOString().slice(0, 10),
        inspectores: body.inspectores || null,
      }).select().single()
      if (!res.error) { cabecera = res.data; break }
      if (res.error.code !== '23505') return NextResponse.json({ error: res.error.message }, { status: 500 })
    }
    if (!cabecera) return NextResponse.json({ error: 'No se pudo crear el checklist.' }, { status: 500 })
    registroId = cabecera.id

    const filas = ITEMS_PLANTILLA_DRS.map(it => ({
      checklist_id: registroId, seccion: it.seccion, tipo: it.tipo, orden: it.orden, etiqueta: it.etiqueta, referencia: it.referencia ?? null,
    }))
    const { data: items } = await sb.from('checklists_drs_items').insert(filas).select()
    respuesta = { cabecera, items: items ?? [], alimentadores: [], tableros: [] }

  } else if (enlace.modulo === 'prevencion_riesgos') {
    const centroTrabajo = (body.centro_trabajo ?? '').trim()
    if (!centroTrabajo) return NextResponse.json({ error: 'El centro de trabajo / faena es obligatorio' }, { status: 400 })

    let cabecera: any = null
    for (let i = 0; i < 3; i++) {
      const numero = await siguienteNumero(sb, 'inspecciones_prevencion', 'INSP')
      const res = await sb.from('inspecciones_prevencion').insert({
        numero,
        centro_trabajo: centroTrabajo,
        direccion: body.direccion || null,
        comuna: body.comuna || null,
        mandante: body.mandante || null,
        lugares_inspeccionados: body.lugares_inspeccionados || null,
        fecha: body.fecha || new Date().toISOString().slice(0, 10),
        prevencionista: body.prevencionista || null,
        dirigido_a: body.dirigido_a || null,
        n_trabajadores: body.n_trabajadores || null,
      }).select().single()
      if (!res.error) { cabecera = res.data; break }
      if (res.error.code !== '23505') return NextResponse.json({ error: res.error.message }, { status: 500 })
    }
    if (!cabecera) return NextResponse.json({ error: 'No se pudo crear la inspección.' }, { status: 500 })
    registroId = cabecera.id

    const filas = CHECKLIST_FAENA_DS594.map(it => ({
      inspeccion_id: registroId, n: it.n, item: it.item, categoria: it.categoria,
      nivel: it.nivel_default, norma: it.norma.join(','), medidas_mp: it.mp, medida_texto: it.hallazgo, orden: it.n,
    }))
    const { data: items } = await sb.from('inspecciones_prevencion_items').insert(filas).select()
    respuesta = { cabecera, items: items ?? [], alimentadores: [], tableros: [] }

  } else if (enlace.modulo === 'pruebas_alimentadores') {
    const alimentadoresInput: { nombre?: string; proteccion_aguas_arriba?: string; largo?: string }[] = Array.isArray(body.alimentadores) ? body.alimentadores : []
    const alimentadoresValidos = alimentadoresInput.map(a => ({ ...a, nombre: (a.nombre ?? '').trim() })).filter(a => a.nombre)
    if (!alimentadoresValidos.length) return NextResponse.json({ error: 'Agrega al menos un alimentador con nombre' }, { status: 400 })

    let cabecera: any = null
    for (let i = 0; i < 3; i++) {
      const numero = await siguienteNumero(sb, 'pruebas_alimentadores', 'ALIM')
      const res = await sb.from('pruebas_alimentadores').insert({
        numero,
        proyecto_nombre: (body.obra ?? '').trim() || null,
        cliente_mandante: body.cliente_mandante || null,
        ubicacion: body.ubicacion || null,
        fecha_visita: body.fecha_visita || new Date().toISOString().slice(0, 10),
        inspectores: body.inspectores || null,
        instrumento: body.instrumento || null,
      }).select().single()
      if (!res.error) { cabecera = res.data; break }
      if (res.error.code !== '23505') return NextResponse.json({ error: res.error.message }, { status: 500 })
    }
    if (!cabecera) return NextResponse.json({ error: 'No se pudo crear el test.' }, { status: 500 })
    registroId = cabecera.id

    const alimentadores: any[] = []
    for (let i = 0; i < alimentadoresValidos.length; i++) {
      const a = alimentadoresValidos[i]
      const { data: alimentador, error: alimentadorErr } = await sb.from('pruebas_alimentadores_alimentadores').insert({
        prueba_id: registroId, orden: i, nombre: a.nombre, proteccion_aguas_arriba: a.proteccion_aguas_arriba || null, largo: a.largo || null,
      }).select().single()
      if (alimentadorErr || !alimentador) return NextResponse.json({ error: alimentadorErr?.message ?? 'Error al crear el alimentador' }, { status: 500 })

      const filas = filasItemsAlimentador(registroId, alimentador.id)
      const { data: items } = await sb.from('pruebas_alimentadores_items').insert(filas).select()
      alimentadores.push({ ...alimentador, items: items ?? [] })
    }
    respuesta = { cabecera, items: [], alimentadores, tableros: [] }

  } else {
    return NextResponse.json({ error: 'Módulo no soportado.' }, { status: 400 })
  }

  const { error: linkErr } = await sb.from('enlaces_publicos').update({ registro_id: registroId, ultima_actividad_en: new Date().toISOString() }).eq('id', enlace.id)
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 })

  return NextResponse.json(respuesta, { status: 201 })
}
