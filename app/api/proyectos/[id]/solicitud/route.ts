import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

type Ctx = { params: { id: string } }

// Genera una solicitud de compra con los ítems faltantes del BOM de un proyecto
export async function POST(req: NextRequest, { params }: Ctx) {
  const sb = getSupabaseServer()
  const { faltantes, observaciones } = await req.json() as {
    faltantes: { codigo: string; descripcion: string; unidad: string; faltante: number; material_id: number | null }[]
    observaciones?: string
  }

  if (!faltantes?.length) {
    return NextResponse.json({ error: 'No hay ítems faltantes' }, { status: 400 })
  }

  // Obtener info del proyecto para la observación
  const { data: proy } = await sb.from('proyectos').select('ot,nombre').eq('id', params.id).single()

  // Obtener precios de los materiales
  const materialIds = faltantes.map(f => f.material_id).filter((id): id is number => id != null)
  const { data: mats } = materialIds.length
    ? await sb.from('materiales').select('id,precio_unitario,proveedores(nombre)').in('id', materialIds)
    : { data: [] as any[] }
  const matMap: Record<number, any> = {}
  ;(mats ?? []).forEach((m: any) => { matMap[m.id] = m })

  // Generar número SC-YYYY-NNN
  const year = new Date().getFullYear()
  const { data: lastSol } = await sb
    .from('solicitudes_compra')
    .select('numero')
    .like('numero', `SC-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)
  const lastSeq = lastSol?.[0]?.numero
    ? parseInt(lastSol[0].numero.split('-')[2] ?? '0', 10) : 0
  const numero = `SC-${year}-${String(lastSeq + 1).padStart(3, '0')}`

  // Crear solicitud
  const obs = observaciones || (proy ? `Generada desde proyecto ${proy.ot} — ${proy.nombre}` : 'Generada desde factibilidad')
  const { data: sol, error: solErr } = await sb
    .from('solicitudes_compra')
    .insert({ numero, observaciones: obs })
    .select()
    .single()

  if (solErr) return NextResponse.json({ error: solErr.message }, { status: 500 })

  // Crear ítems
  const solItems = faltantes.map(f => {
    const mat = f.material_id ? matMap[f.material_id] : null
    return {
      solicitud_id:       sol.id,
      material_id:        f.material_id,
      codigo:             f.codigo,
      descripcion:        f.descripcion,
      unidad:             f.unidad,
      cantidad_pedida:    f.faltante,
      proveedor_sugerido: mat?.proveedores?.nombre ?? null,
      precio_unitario:    mat?.precio_unitario ?? null,
    }
  })

  const { error: itemsErr } = await sb.from('solicitudes_compra_items').insert(solItems)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ id: sol.id, numero }, { status: 201 })
}
