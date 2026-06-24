import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = getSupabaseServer()
  const { data, error } = await sb
    .from('solicitudes_compra')
    .select('*, solicitudes_compra_items(id)')
    .order('creado_en', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map(s => ({
    ...s,
    items_count: (s.solicitudes_compra_items as any[])?.length ?? 0,
    solicitudes_compra_items: undefined,
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer()
  const { items, observaciones, obra, supervisor, visitador, fecha_entrega } = await req.json()

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un ítem' }, { status: 400 })
  }

  // Generar número correlativo SC-YYYY-NNN
  const year = new Date().getFullYear()
  const { data: lastSol } = await sb
    .from('solicitudes_compra')
    .select('numero')
    .like('numero', `SC-${year}-%`)
    .order('numero', { ascending: false })
    .limit(1)

  const lastSeq = lastSol?.[0]?.numero
    ? parseInt(lastSol[0].numero.split('-')[2] ?? '0', 10)
    : 0
  const numero = `SC-${year}-${String(lastSeq + 1).padStart(3, '0')}`

  // Crear solicitud
  // obra/supervisor/visitador/fecha_entrega solo se incluyen si vienen con
  // valor — así esta ruta sigue funcionando aunque esas columnas todavía no
  // existan en una base de datos donde no se haya corrido la migración.
  const insertPayload: Record<string, unknown> = { numero, observaciones: observaciones || null }
  if (obra)          insertPayload.obra = obra
  if (supervisor)    insertPayload.supervisor = supervisor
  if (visitador)     insertPayload.visitador = visitador
  if (fecha_entrega) insertPayload.fecha_entrega = fecha_entrega

  const { data: sol, error: errSol } = await sb
    .from('solicitudes_compra')
    .insert(insertPayload)
    .select()
    .single()

  if (errSol) return NextResponse.json({ error: errSol.message }, { status: 500 })

  // Insertar ítems
  const rows = items.map((item: any) => ({
    solicitud_id:       (sol as any).id,
    material_id:        item.material_id ?? null,
    codigo:             item.codigo,
    descripcion:        item.descripcion,
    unidad:             item.unidad || null,
    cantidad_pedida:    Number(item.cantidad_pedida) || 1,
    proveedor_sugerido: item.proveedor_sugerido || null,
    precio_unitario:    item.precio_unitario ? Number(item.precio_unitario) : null,
  }))

  const { error: errItems } = await sb.from('solicitudes_compra_items').insert(rows)
  if (errItems) return NextResponse.json({ error: errItems.message }, { status: 500 })

  return NextResponse.json({ id: (sol as any).id, numero }, { status: 201 })
}
